const fs = require('fs');
const path = require('path');
const { randomUUID, randomBytes } = require('crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const { User, Expense, AuditLog } = require('./models');
const { auth, manager, issue, clear } = require('./auth');
const { generateUserKeys, signPayload, verifyPayload, canonicalize, sha256hex, ALGORITHM_LABEL } = require('./crypto');
const { notify } = require('./mailer');

const r = express.Router();
const UPLOAD_DIR = process.env.UPLOAD_DIR || '/data/uploads';
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ---------- validação (Zod) e sanitização contra XSS/injeção ----------
const txt = (min, max) => z.string().trim().min(min).max(max).transform((s) => s.replace(/[<>]/g, ''));
const email = z.string().trim().toLowerCase().email().max(254);
const password = z.string().min(10, 'Senha com no mínimo 10 caracteres').max(128);
const schemas = {
  login: z.object({ email, password: z.string().min(1).max(128) }).strict(),
  employeeCreate: z.object({ name: txt(2, 100), email, password, role: z.enum(['manager', 'employee']) }).strict(),
  employeeUpdate: z.object({ name: txt(2, 100), email, role: z.enum(['manager', 'employee']), active: z.boolean() }).partial().strict(),
  expense: z.object({ title: txt(3, 120), description: txt(0, 2000), category: txt(2, 60), amount: z.coerce.number().positive().max(10_000_000) }),
  validate: z.object({ approve: z.boolean(), note: txt(0, 500).optional() }).strict(),
  sign: z.object({ password: z.string().min(1).max(128) }).strict(),
};
const oid = (id) => /^[a-f\d]{24}$/i.test(id);
const audit = (req, action, target, detail) => AuditLog.create({ actor: req.user?.id, action, target, detail, ip: req.ip }).catch(() => {});
const bad = (res, code, error) => res.status(code).json({ error });

// ---------- upload de recibos ----------
const EXT = { 'application/pdf': '.pdf', 'image/png': '.png', 'image/jpeg': '.jpg' };
const upload = multer({
  storage: multer.diskStorage({ destination: UPLOAD_DIR, filename: (_q, f, cb) => cb(null, randomUUID() + (EXT[f.mimetype] || '.bin')) }),
  fileFilter: (_q, f, cb) => (EXT[f.mimetype] ? cb(null, true) : cb(new Error('Tipo de arquivo não permitido (use PDF, PNG ou JPG)'))),
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
});
function sniff(buf) { // confere "magic bytes" (não confia só no Content-Type enviado pelo cliente)
  if (buf.subarray(0, 4).toString() === '%PDF') return 'application/pdf';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
}
const rm = (files) => files.forEach((f) => fs.unlink(f.path, () => {}));

// ---------- autenticação ----------
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false, message: { error: 'Muitas tentativas. Aguarde 15 minutos.' } });
const DUMMY = bcrypt.hashSync('dummy-password', 12);

r.post('/auth/login', loginLimiter, async (req, res) => {
  const { email: e, password: p } = schemas.login.parse(req.body);
  const u = await User.findOne({ email: e }).select('+passwordHash');
  const ok = await bcrypt.compare(p, u?.passwordHash || DUMMY); // tempo constante p/ usuário inexistente
  if (!u || !ok || !u.active) { audit(req, 'login_falhou', e); return bad(res, 401, 'E-mail ou senha inválidos'); }
  const csrf = randomBytes(24).toString('hex');
  issue(res, { sub: String(u._id), role: u.role, name: u.name, csrf });
  audit({ ip: req.ip, user: { id: u._id } }, 'login', String(u._id));
  res.json({ user: { id: u._id, name: u.name, email: u.email, role: u.role }, csrfToken: csrf });
});
r.post('/auth/logout', auth, (req, res) => { clear(res); res.json({ ok: true }); });
r.get('/auth/me', auth, async (req, res) => {
  const u = await User.findById(req.user.id);
  if (!u || !u.active) { clear(res); return bad(res, 401, 'Sessão inválida'); }
  res.json({ user: { id: u._id, name: u.name, email: u.email, role: u.role }, csrfToken: req.user.csrf });
});

// ---------- funcionários (CRUD – somente Gerente) ----------
r.get('/employees', auth, manager, async (_q, res) => res.json(await User.find().sort('name')));
r.post('/employees', auth, manager, async (req, res) => {
  const d = schemas.employeeCreate.parse(req.body);
  if (await User.exists({ email: d.email })) return bad(res, 409, 'E-mail já cadastrado');
  const keys = await generateUserKeys(d.password); // par de chaves RSA-PSS gerado na criação
  const u = await User.create({ name: d.name, email: d.email, role: d.role, passwordHash: await bcrypt.hash(d.password, 12), ...keys });
  audit(req, 'funcionario_criado', String(u._id));
  res.status(201).json(u);
});
r.put('/employees/:id', auth, manager, async (req, res) => {
  if (!oid(req.params.id)) return bad(res, 400, 'ID inválido');
  const d = schemas.employeeUpdate.parse(req.body);
  if (req.params.id === req.user.id && (d.active === false || d.role === 'employee')) return bad(res, 400, 'Você não pode rebaixar ou desativar a si mesmo');
  try {
    const u = await User.findByIdAndUpdate(req.params.id, { $set: d }, { new: true, runValidators: true });
    if (!u) return bad(res, 404, 'Funcionário não encontrado');
    audit(req, 'funcionario_editado', req.params.id);
    res.json(u);
  } catch (e) { if (e.code === 11000) return bad(res, 409, 'E-mail já cadastrado'); throw e; }
});
r.delete('/employees/:id', auth, manager, async (req, res) => {
  if (!oid(req.params.id)) return bad(res, 400, 'ID inválido');
  if (req.params.id === req.user.id) return bad(res, 400, 'Você não pode excluir a si mesmo');
  // Quem já possui documentos/assinaturas não é apagado (preserva o não repúdio): apenas desativado.
  const used = await Expense.exists({ $or: [{ submittedBy: req.params.id }, { 'signature.signer': req.params.id }, { 'validation.by': req.params.id }] });
  if (used) { await User.findByIdAndUpdate(req.params.id, { active: false }); audit(req, 'funcionario_desativado', req.params.id); return res.json({ deactivated: true }); }
  await User.findByIdAndDelete(req.params.id);
  audit(req, 'funcionario_excluido', req.params.id);
  res.json({ deleted: true });
});

// ---------- despesas ----------
const canSee = (req, e) => req.user.role === 'manager' || String(e.submittedBy._id || e.submittedBy) === req.user.id;
const view = (e) => { const o = e.toObject(); o.receipts = o.receipts.map(({ storedName, ...rest }) => rest); if (o.signature) delete o.signature.payload; return o; };
const load = async (req, res) => {
  if (!oid(req.params.id)) { bad(res, 400, 'ID inválido'); return null; }
  const e = await Expense.findById(req.params.id).populate('submittedBy', 'name email').populate('validation.by', 'name').populate('signature.signer', 'name email');
  if (!e || !canSee(req, e)) { bad(res, 404, 'Documento não encontrado'); return null; }
  return e;
};

r.post('/expenses', auth, (req, res, next) => upload.array('receipts', 5)(req, res, (err) => (err ? bad(res, 400, err.message) : next())), async (req, res) => {
  const files = req.files || [];
  try {
    const d = schemas.expense.parse(req.body);
    if (!files.length) throw Object.assign(new Error('Anexe ao menos um recibo'), { status: 400 });
    const receipts = files.map((f) => {
      const buf = fs.readFileSync(f.path);
      if (sniff(buf) !== f.mimetype) throw Object.assign(new Error('Conteúdo do arquivo não corresponde ao tipo informado'), { status: 400 });
      return { originalName: path.basename(f.originalname).replace(/[<>"']/g, ''), storedName: f.filename, mime: f.mimetype, size: f.size, sha256: sha256hex(buf) };
    });
    const e = await Expense.create({ ...d, receipts, submittedBy: req.user.id });
    audit(req, 'despesa_criada', String(e._id));
    const me = await User.findById(req.user.id);
    const gerentes = await User.find({ role: 'manager', active: true });
    gerentes.forEach((g) => notify(g.email, 'Nova despesa pendente de validação', `${me.name} enviou a despesa "${e.title}" (R$ ${e.amount.toFixed(2)}). Acesse o sistema para validar.`));
    notify(me.email, 'Despesa recebida', `Sua despesa "${e.title}" foi registrada e aguarda validação do Gerente.`);
    res.status(201).json(view(e));
  } catch (err) { rm(files); throw err; }
});

r.get('/expenses', auth, async (req, res) => {
  const q = {};
  if (req.user.role !== 'manager') q.submittedBy = req.user.id;
  if (typeof req.query.status === 'string') { if (!['pending', 'validated', 'rejected', 'signed'].includes(req.query.status)) return bad(res, 400, 'Status inválido'); q.status = req.query.status; }
  const list = await Expense.find(q).sort('-createdAt').populate('submittedBy', 'name email').populate('signature.signer', 'name');
  res.json(list.map(view));
});
r.get('/expenses/:id', auth, async (req, res) => { const e = await load(req, res); if (e) res.json(view(e)); });

r.get('/expenses/:id/receipts/:i', auth, async (req, res) => {
  const e = await load(req, res); if (!e) return;
  const rc = e.receipts[Number(req.params.i)];
  if (!rc) return bad(res, 404, 'Recibo não encontrado');
  res.set({ 'Content-Type': rc.mime, 'Content-Disposition': `inline; filename="${rc.storedName}"`, 'X-Content-Type-Options': 'nosniff', 'Cross-Origin-Resource-Policy': 'cross-origin' });
  fs.createReadStream(path.join(UPLOAD_DIR, path.basename(rc.storedName))).on('error', () => res.status(404).end()).pipe(res);
});

// Validação do documento pelo Gerente (segregação de funções: não valida o próprio documento)
r.post('/expenses/:id/validate', auth, manager, async (req, res) => {
  const d = schemas.validate.parse(req.body);
  const e = await load(req, res); if (!e) return;
  if (e.status !== 'pending') return bad(res, 409, 'Documento não está pendente de validação');
  if (String(e.submittedBy._id) === req.user.id) return bad(res, 403, 'Você não pode validar um documento enviado por você mesmo');
  e.status = d.approve ? 'validated' : 'rejected';
  e.validation = { by: req.user.id, at: new Date(), note: d.note || '' };
  await e.save();
  audit(req, d.approve ? 'despesa_validada' : 'despesa_rejeitada', String(e._id), d.note);
  notify(e.submittedBy.email, d.approve ? 'Despesa validada' : 'Despesa rejeitada', `Sua despesa "${e.title}" foi ${d.approve ? 'validada e seguirá para assinatura' : 'rejeitada'}.${d.note ? '\nObservação: ' + d.note : ''}`);
  res.json(view(e));
});

// Conteúdo canônico que é assinado: dados do documento + hash SHA-256 de cada recibo + validação + signatário + data.
const buildPayload = (e, signerId, signedAt) => canonicalize({
  v: 1, expenseId: String(e._id), title: e.title, description: e.description, category: e.category, amount: e.amount,
  submittedBy: String(e.submittedBy._id || e.submittedBy), createdAt: e.createdAt.toISOString(),
  receipts: e.receipts.map((x) => ({ name: x.originalName, sha256: x.sha256, size: x.size })),
  validatedBy: String(e.validation.by._id || e.validation.by), validatedAt: e.validation.at.toISOString(),
  signerId: String(signerId), signedAt: signedAt.toISOString(),
});

r.post('/expenses/:id/sign', auth, manager, async (req, res) => {
  const { password: pw } = schemas.sign.parse(req.body);
  const e = await load(req, res); if (!e) return;
  if (e.status !== 'validated') return bad(res, 409, 'Somente documentos validados podem ser assinados');
  if (String(e.submittedBy._id) === req.user.id) return bad(res, 403, 'Você não pode assinar um documento enviado por você mesmo');
  const u = await User.findById(req.user.id).select('+passwordHash +encryptedPrivateKey');
  if (!(await bcrypt.compare(pw, u.passwordHash))) { audit(req, 'assinatura_senha_invalida', String(e._id)); return bad(res, 401, 'Senha incorreta'); }
  const signedAt = new Date();
  const payload = buildPayload(e, u._id, signedAt);
  let signatureB64;
  try { signatureB64 = await signPayload(u.encryptedPrivateKey, pw, payload); } catch { return bad(res, 500, 'Falha ao acessar a chave privada'); }
  e.signature = { signer: u._id, signedAt, payload, signatureB64, publicKey: u.publicKey, fingerprint: u.fingerprint, algorithm: ALGORITHM_LABEL };
  e.status = 'signed';
  await e.save();
  audit(req, 'despesa_assinada', String(e._id), u.fingerprint);
  notify(e.submittedBy.email, 'Despesa assinada digitalmente', `Sua despesa "${e.title}" foi assinada digitalmente por ${u.name} em ${signedAt.toISOString()}.`);
  res.json(view(await load(req, res)));
});

// Verificação: autenticidade (assinatura confere com a chave do signatário), integridade (dados e arquivos não mudaram) e não repúdio (chave pertence ao signatário).
r.get('/expenses/:id/verify', auth, manager, async (req, res) => {
  const e = await load(req, res); if (!e) return;
  const s = e.signature;
  if (e.status !== 'signed' || !s?.signatureB64) return bad(res, 409, 'Documento ainda não foi assinado');
  const signer = await User.findById(s.signer._id || s.signer);
  const checks = [];
  const add = (key, label, ok, detail) => checks.push({ key, label, ok, detail });

  let sigOk = false;
  try { sigOk = await verifyPayload(s.publicKey, s.payload, s.signatureB64); } catch { /* inválida */ }
  add('signature', 'Assinatura digital válida (autenticidade)', sigOk, sigOk ? 'A assinatura RSA-PSS confere com a chave pública informada.' : 'A assinatura NÃO confere com o conteúdo assinado.');

  const current = buildPayload(e, s.signer._id || s.signer, s.signedAt);
  const dataOk = current === s.payload;
  add('data', 'Dados do documento íntegros', dataOk, dataOk ? 'Os dados atuais são idênticos aos assinados.' : 'Os dados do documento foram alterados após a assinatura.');

  const signedReceipts = JSON.parse(s.payload).receipts;
  const filesOk = e.receipts.every((rc, i) => {
    try { return sha256hex(fs.readFileSync(path.join(UPLOAD_DIR, path.basename(rc.storedName)))) === rc.sha256 && rc.sha256 === signedReceipts[i]?.sha256; } catch { return false; }
  });
  add('files', 'Recibos anexados íntegros (SHA-256)', filesOk, filesOk ? 'O hash de cada arquivo confere com o registrado na assinatura.' : 'Algum recibo foi alterado ou está ausente.');

  const keyOk = !!signer && signer.publicKey === s.publicKey && signer.fingerprint === s.fingerprint;
  add('signer', 'Chave pertence ao signatário (não repúdio)', keyOk, keyOk ? `Chave pública vinculada a ${signer.name} (${signer.email}).` : 'A chave usada não corresponde à registrada para o signatário.');

  audit(req, 'assinatura_verificada', String(e._id), checks.every((c) => c.ok) ? 'valida' : 'invalida');
  res.json({
    valid: checks.every((c) => c.ok), checks,
    document: { id: e._id, title: e.title, amount: e.amount, submittedBy: e.submittedBy.name },
    signature: { signer: s.signer.name, signerEmail: s.signer.email, signedAt: s.signedAt, fingerprint: s.fingerprint, algorithm: s.algorithm, signatureB64: s.signatureB64, payloadSha256: sha256hex(Buffer.from(s.payload)) },
  });
});

module.exports = r;

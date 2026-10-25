const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { ZodError } = require('zod');

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) { console.error('Defina JWT_SECRET com no mínimo 32 caracteres.'); process.exit(1); }
const { User } = require('./models');
const { generateUserKeys } = require('./crypto');
const routes = require('./routes');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
// Helmet: CSP restritiva (API só devolve JSON/arquivos), HSTS, noSniff, frame-ancestors none, etc.
app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } }, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','), credentials: true, methods: ['GET', 'POST', 'PUT', 'DELETE'], allowedHeaders: ['Content-Type', 'X-CSRF-Token'] }));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use(mongoSanitize());          // remove operadores $ e . (injeção NoSQL)
app.get('/health', (_q, res) => res.json({ ok: true }));
app.use('/api', routes);

app.use((err, _req, res, _next) => {
  if (err instanceof ZodError) return res.status(400).json({ error: err.issues.map((i) => i.message).join('; ') });
  if (err instanceof multer.MulterError) return res.status(400).json({ error: err.message });
  if (err.status && err.status < 500) return res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'Erro interno' });
});
// Express 4 não captura rejeições de handlers async: encaminha para o handler acima.
const wrap = (layer) => { const h = layer.handle; if (h.length <= 3) layer.handle = (q, s, n) => Promise.resolve(h(q, s, n)).catch(n); };
routes.stack.forEach((l) => l.route && l.route.stack.forEach(wrap));

async function seed() {
  if (await User.countDocuments()) return;
  const { SEED_MANAGER_NAME = 'Gerente', SEED_MANAGER_EMAIL, SEED_MANAGER_PASSWORD } = process.env;
  if (!SEED_MANAGER_EMAIL || !SEED_MANAGER_PASSWORD) return console.warn('Sem usuários e sem SEED_MANAGER_*: nenhum Gerente criado.');
  const keys = await generateUserKeys(SEED_MANAGER_PASSWORD);
  await User.create({ name: SEED_MANAGER_NAME, email: SEED_MANAGER_EMAIL, role: 'manager', passwordHash: await bcrypt.hash(SEED_MANAGER_PASSWORD, 12), ...keys });
  console.log('Gerente inicial criado:', SEED_MANAGER_EMAIL);
}

mongoose.connect(process.env.MONGODB_URI).then(seed).then(() => app.listen(4000, () => console.log('API em :4000'))).catch((e) => { console.error(e); process.exit(1); });

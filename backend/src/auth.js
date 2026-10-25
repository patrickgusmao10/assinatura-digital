const jwt = require('jsonwebtoken');
const { timingSafeEqual } = require('crypto');

const SECRET = process.env.JWT_SECRET;
const COOKIE = {
  httpOnly: true,                                            // JS não lê o JWT (mitiga XSS)
  secure: process.env.COOKIE_SECURE === 'true',
  sameSite: process.env.COOKIE_SAMESITE || 'lax',            // 'none' (+secure) quando front e API estão em domínios diferentes
  maxAge: 2 * 60 * 60 * 1000,
  path: '/',
};
const safeEq = (a = '', b = '') => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

// Valida JWT (cookie) e, em métodos que alteram estado, o token CSRF embutido no JWT (header X-CSRF-Token).
function auth(req, res, next) {
  let p;
  try { p = jwt.verify(req.cookies.token, SECRET, { algorithms: ['HS256'] }); }
  catch { return res.status(401).json({ error: 'Não autenticado' }); }
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && !safeEq(req.get('X-CSRF-Token') || '', p.csrf))
    return res.status(403).json({ error: 'Token CSRF inválido' });
  req.user = { id: p.sub, role: p.role, name: p.name, csrf: p.csrf };
  next();
}
const manager = (req, res, next) => (req.user.role === 'manager' ? next() : res.status(403).json({ error: 'Acesso restrito ao Gerente' }));
const issue = (res, payload) => { res.cookie('token', jwt.sign(payload, SECRET, { algorithm: 'HS256', expiresIn: '2h' }), COOKIE); };
const clear = (res) => res.clearCookie('token', { ...COOKIE, maxAge: undefined });

module.exports = { auth, manager, issue, clear };

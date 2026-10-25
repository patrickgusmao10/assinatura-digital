// Assinatura digital com Web Cryptography API (crypto.subtle) + AES-256-GCM/scrypt para proteger a chave privada.
const { webcrypto, randomBytes, scryptSync, createCipheriv, createDecipheriv, createHash } = require('crypto');
const { subtle } = webcrypto;

const KEY_ALG = { name: 'RSA-PSS', modulusLength: 3072, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' };
const IMPORT_ALG = { name: 'RSA-PSS', hash: 'SHA-256' };
const SIGN_ALG = { name: 'RSA-PSS', saltLength: 32 };
const ALGORITHM_LABEL = 'RSA-PSS 3072 / SHA-256 (Web Crypto API)';

const b64 = (b) => Buffer.from(b).toString('base64');
const sha256hex = (b) => createHash('sha256').update(b).digest('hex');
const kdf = (password, salt) => scryptSync(password, salt, 32, { N: 2 ** 15, r: 8, p: 1, maxmem: 128 * 1024 * 1024 });

// JSON canônico (chaves ordenadas) => mesma entrada gera sempre os mesmos bytes a serem assinados.
function canonicalize(v) {
  if (Array.isArray(v)) return '[' + v.map(canonicalize).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + canonicalize(v[k])).join(',') + '}';
  return JSON.stringify(v);
}

async function generateUserKeys(password) {
  const kp = await subtle.generateKey(KEY_ALG, true, ['sign', 'verify']);
  const spki = Buffer.from(await subtle.exportKey('spki', kp.publicKey));
  const pkcs8 = Buffer.from(await subtle.exportKey('pkcs8', kp.privateKey));
  const salt = randomBytes(16), iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', kdf(password, salt), iv);
  const data = Buffer.concat([c.update(pkcs8), c.final()]);
  pkcs8.fill(0);
  return {
    publicKey: b64(spki),
    fingerprint: sha256hex(spki),
    encryptedPrivateKey: { salt: b64(salt), iv: b64(iv), tag: b64(c.getAuthTag()), data: b64(data) },
  };
}

// A chave privada só é decifrada em memória, com a senha do próprio usuário, no instante da assinatura.
async function signPayload(enc, password, payload) {
  const d = createDecipheriv('aes-256-gcm', kdf(password, Buffer.from(enc.salt, 'base64')), Buffer.from(enc.iv, 'base64'));
  d.setAuthTag(Buffer.from(enc.tag, 'base64'));
  const pkcs8 = Buffer.concat([d.update(Buffer.from(enc.data, 'base64')), d.final()]);
  const key = await subtle.importKey('pkcs8', pkcs8, IMPORT_ALG, false, ['sign']);
  pkcs8.fill(0);
  return b64(await subtle.sign(SIGN_ALG, key, Buffer.from(payload, 'utf8')));
}

async function verifyPayload(publicKeyB64, payload, signatureB64) {
  const key = await subtle.importKey('spki', Buffer.from(publicKeyB64, 'base64'), IMPORT_ALG, false, ['verify']);
  return subtle.verify(SIGN_ALG, key, Buffer.from(signatureB64, 'base64'), Buffer.from(payload, 'utf8'));
}

module.exports = { generateUserKeys, signPayload, verifyPayload, canonicalize, sha256hex, ALGORITHM_LABEL };

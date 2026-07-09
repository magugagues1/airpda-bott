const bcrypt = require('bcrypt');
const SALT_ROUNDS = 10;

function isBcryptHash(hash) {
  return typeof hash === 'string' && hash.startsWith('$2b$');
}

function oldPinHash(pin) {
  let h = 0;
  for (const c of String(pin)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return String(h);
}

async function hashPin(pin) {
  return bcrypt.hash(String(pin), SALT_ROUNDS);
}

async function verifyPin(pin, storedHash) {
  if (!storedHash) return { ok: false };
  if (isBcryptHash(storedHash)) {
    const ok = await bcrypt.compare(String(pin), storedHash);
    return { ok, needsRehash: false };
  }
  const ok = storedHash === oldPinHash(pin);
  return { ok, needsRehash: ok };
}

module.exports = { hashPin, verifyPin, isBcryptHash };

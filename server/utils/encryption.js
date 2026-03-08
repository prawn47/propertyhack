const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';

function getKey() {
  const key = process.env.SOCIAL_TOKEN_ENCRYPTION_KEY;
  if (!key) throw new Error('SOCIAL_TOKEN_ENCRYPTION_KEY environment variable is required');
  return Buffer.from(key, 'hex');
}

function encrypt(plaintext) {
  if (!plaintext) return null;
  const key = getKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${tag}:${encrypted}`;
}

function decrypt(ciphertext) {
  if (!ciphertext) return null;
  const key = getKey();
  const [ivHex, tagHex, encrypted] = ciphertext.split(':');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

module.exports = { encrypt, decrypt };

const crypto = require('crypto');

function normaliseText(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function generateContentHash(title, content) {
  const normalised = normaliseText(title) + '|' + normaliseText(content).slice(0, 500);
  return crypto.createHash('sha256').update(normalised).digest('hex');
}

module.exports = { generateContentHash, normaliseText };

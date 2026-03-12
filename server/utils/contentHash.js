const crypto = require('crypto');

function normaliseText(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function generateContentHash(title, content) {
  const normalisedTitle = normaliseText(title);
  const normalisedContent = normaliseText((content || '').slice(0, 500));
  return crypto.createHash('sha256')
    .update(normalisedTitle + '|' + normalisedContent)
    .digest('hex');
}

module.exports = { generateContentHash, normaliseText };

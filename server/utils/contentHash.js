import { createHash } from 'crypto';

export function normaliseText(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function generateContentHash(title, content) {
  const normalisedTitle = normaliseText(title);
  const normalisedContent = normaliseText((content || '').slice(0, 500));
  return createHash('sha256')
    .update(normalisedTitle + '|' + normalisedContent)
    .digest('hex');
}

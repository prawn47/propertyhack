const TRACKING_PARAMS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
  'ref', 'fbclid', 'gclid',
]);

function normalizeUrl(url) {
  try {
    const parsed = new URL(url);

    if (parsed.protocol === 'http:') {
      parsed.protocol = 'https:';
    }

    for (const param of TRACKING_PARAMS) {
      parsed.searchParams.delete(param);
    }

    parsed.hash = '';

    let normalized = parsed.toString().toLowerCase();

    if (normalized.endsWith('/') && parsed.pathname !== '/') {
      normalized = normalized.slice(0, -1);
    }

    return normalized;
  } catch {
    return url.toLowerCase().replace(/\/$/, '');
  }
}

module.exports = { normalizeUrl };

'use strict';

const VALID_MARKETS = new Set(['au', 'us', 'uk', 'ca']);

const LEGACY_PATTERNS = [
  { from: /^\/property-news\/(.+)$/, to: '/au/property-news/$1' },
  { from: /^\/article\/(.+)$/, to: '/au/article/$1' },
  { from: /^\/category\/(.+)$/, to: '/au/category/$1' },
];

function legacyRedirects(req, res, next) {
  const url = req.path;

  // Skip API, admin, and already-country-prefixed paths
  if (url.startsWith('/api/') || url.startsWith('/admin/')) {
    return next();
  }

  // Skip paths that already have a valid country prefix: /au/... /us/... etc.
  const firstSegment = url.split('/')[1];
  if (firstSegment && VALID_MARKETS.has(firstSegment.toLowerCase())) {
    return next();
  }

  for (const pattern of LEGACY_PATTERNS) {
    if (pattern.from.test(url)) {
      const newPath = url.replace(pattern.from, pattern.to);
      const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
      return res.redirect(301, newPath + qs);
    }
  }

  next();
}

module.exports = { legacyRedirects };

const express = require('express');
const router = express.Router();

const SITE_URL = 'https://propertyhack.com';
const SUPPORTED_COUNTRIES = ['au', 'us', 'uk', 'ca', 'nz'];

let cache = {};
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

function cached(key, generator) {
  return async (req, res) => {
    const now = Date.now();
    res.set('Cache-Control', 'public, s-maxage=3600');
    if (cache[key] && now - cache[key].time < CACHE_TTL) {
      res.set('Content-Type', 'application/xml');
      res.set('Cache-Control', 'public, s-maxage=3600');
      return res.send(cache[key].data);
    }
    const data = await generator(req);
    cache[key] = { data, time: now };
    res.set('Content-Type', 'application/xml');
    res.set('Cache-Control', 'public, s-maxage=3600');
    res.send(data);
  };
}

// Sitemap index
router.get('/sitemap.xml', cached('index', async () => {
  const sitemaps = [
    ...SUPPORTED_COUNTRIES.map(c => `${SITE_URL}/${c}/sitemap.xml`),
    ...SUPPORTED_COUNTRIES.map(c => `${SITE_URL}/${c}/news-sitemap.xml`),
    `${SITE_URL}/sitemap-pages.xml`,
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps.map(loc => `  <sitemap><loc>${loc}</loc></sitemap>`).join('\n')}
</sitemapindex>`;
}));

// Country article sitemap
router.get('/:country/sitemap.xml', async (req, res) => {
  const country = req.params.country.toLowerCase();
  if (!SUPPORTED_COUNTRIES.includes(country)) {
    return res.status(404).send('Not found');
  }

  const cacheKey = `country-sitemap-${country}`;
  const now = Date.now();
  if (cache[cacheKey] && now - cache[cacheKey].time < CACHE_TTL) {
    res.set('Content-Type', 'application/xml');
    res.set('Cache-Control', 'public, s-maxage=3600');
    return res.send(cache[cacheKey].data);
  }

  const marketUpper = country.toUpperCase();

  const [articles, locationPages] = await Promise.all([
    req.prisma.article.findMany({
      where: {
        status: 'PUBLISHED',
        OR: [{ market: marketUpper }, { isEvergreen: true }, { isGlobal: true }],
      },
      select: { slug: true, updatedAt: true, publishedAt: true },
      orderBy: { publishedAt: 'desc' },
    }),
    req.prisma.locationSeo.findMany({
      where: { country: marketUpper, isActive: true },
      select: { slug: true, updatedAt: true },
    }),
  ]);

  const articleUrls = articles.map(a => `  <url>
    <loc>${SITE_URL}/${country}/article/${a.slug}</loc>
    <lastmod>${(a.updatedAt || a.publishedAt).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`);

  const locationUrls = locationPages.map(l => `  <url>
    <loc>${SITE_URL}/${country}/property-news/${l.slug}</loc>
    <lastmod>${l.updatedAt.toISOString()}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.8</priority>
  </url>`);

  const data = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...articleUrls, ...locationUrls].join('\n')}
</urlset>`;

  cache[cacheKey] = { data, time: now };
  res.set('Content-Type', 'application/xml');
  res.set('Cache-Control', 'public, s-maxage=3600');
  res.send(data);
});

// Country Google News sitemap (last 48 hours)
router.get('/:country/news-sitemap.xml', async (req, res) => {
  const country = req.params.country.toLowerCase();
  if (!SUPPORTED_COUNTRIES.includes(country)) {
    return res.status(404).send('Not found');
  }

  const cacheKey = `country-news-${country}`;
  const now = Date.now();
  if (cache[cacheKey] && now - cache[cacheKey].time < CACHE_TTL) {
    res.set('Content-Type', 'application/xml');
    res.set('Cache-Control', 'public, s-maxage=3600');
    return res.send(cache[cacheKey].data);
  }

  const marketUpper = country.toUpperCase();
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);

  const articles = await req.prisma.article.findMany({
    where: {
      status: 'PUBLISHED',
      publishedAt: { gte: cutoff },
      OR: [{ market: marketUpper }, { isEvergreen: true }, { isGlobal: true }],
    },
    select: { slug: true, title: true, publishedAt: true },
    orderBy: { publishedAt: 'desc' },
  });

  const data = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${articles.map(a => `  <url>
    <loc>${SITE_URL}/${country}/article/${a.slug}</loc>
    <news:news>
      <news:publication>
        <news:name>PropertyHack</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${a.publishedAt.toISOString()}</news:publication_date>
      <news:title>${escapeXml(a.title)}</news:title>
    </news:news>
  </url>`).join('\n')}
</urlset>`;

  cache[cacheKey] = { data, time: now };
  res.set('Content-Type', 'application/xml');
  res.set('Cache-Control', 'public, s-maxage=3600');
  res.send(data);
});

// Static pages sitemap
router.get('/sitemap-pages.xml', cached('pages', async (req) => {
  const categories = await req.prisma.article.findMany({
    where: { status: 'PUBLISHED' },
    select: { category: true },
    distinct: ['category'],
  });

  const urls = [
    { loc: '/', priority: '1.0', changefreq: 'hourly' },
    { loc: '/about', priority: '0.5', changefreq: 'monthly' },
    { loc: '/contact', priority: '0.3', changefreq: 'monthly' },
    { loc: '/tools', priority: '0.7', changefreq: 'monthly' },
    { loc: '/tools/mortgage-calculator', priority: '0.8', changefreq: 'monthly' },
    { loc: '/tools/stamp-duty-calculator', priority: '0.8', changefreq: 'monthly' },
    { loc: '/tools/rental-yield-calculator', priority: '0.8', changefreq: 'monthly' },
    { loc: '/tools/borrowing-power-calculator', priority: '0.8', changefreq: 'monthly' },
    { loc: '/tools/rent-vs-buy-calculator', priority: '0.8', changefreq: 'monthly' },
    { loc: '/tools/ca/land-transfer-tax-calculator', priority: '0.8', changefreq: 'monthly' },
  ];

  for (const { category } of categories) {
    if (category) {
      const slug = category.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      urls.push({ loc: `/category/${slug}`, priority: '0.7', changefreq: 'daily' });
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${SITE_URL}${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;
}));

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

module.exports = router;

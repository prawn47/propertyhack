const express = require('express');
const router = express.Router();

const SITE_URL = 'https://propertyhack.com.au';
const LOCATIONS = ['sydney', 'melbourne', 'brisbane', 'perth', 'adelaide', 'canberra', 'hobart', 'darwin', 'gold-coast'];

let cache = {};
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

function cached(key, generator) {
  return async (req, res) => {
    const now = Date.now();
    res.set('Cache-Control', 'public, s-maxage=3600');
    if (cache[key] && now - cache[key].time < CACHE_TTL) {
      res.set('Content-Type', 'application/xml');
      return res.send(cache[key].data);
    }
    const data = await generator(req);
    cache[key] = { data, time: now };
    res.set('Content-Type', 'application/xml');
    res.send(data);
  };
}

// Sitemap index
router.get('/sitemap.xml', cached('index', async () => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>${SITE_URL}/sitemap-pages.xml</loc></sitemap>
  <sitemap><loc>${SITE_URL}/sitemap-articles.xml</loc></sitemap>
  <sitemap><loc>${SITE_URL}/sitemap-news.xml</loc></sitemap>
</sitemapindex>`;
}));

// Static pages + location pages
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
  ];

  for (const loc of LOCATIONS) {
    urls.push({ loc: `/property-news/${loc}`, priority: '0.8', changefreq: 'hourly' });
  }

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

// All published articles
router.get('/sitemap-articles.xml', cached('articles', async (req) => {
  const articles = await req.prisma.article.findMany({
    where: { status: 'PUBLISHED' },
    select: { slug: true, updatedAt: true, publishedAt: true },
    orderBy: { publishedAt: 'desc' },
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${articles.map(a => `  <url>
    <loc>${SITE_URL}/articles/${a.slug}</loc>
    <lastmod>${(a.updatedAt || a.publishedAt).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`).join('\n')}
</urlset>`;
}));

// Google News sitemap (last 48 hours only)
router.get('/sitemap-news.xml', cached('news', async (req) => {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const articles = await req.prisma.article.findMany({
    where: {
      status: 'PUBLISHED',
      publishedAt: { gte: cutoff },
    },
    select: { slug: true, title: true, publishedAt: true, category: true },
    orderBy: { publishedAt: 'desc' },
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${articles.map(a => `  <url>
    <loc>${SITE_URL}/articles/${a.slug}</loc>
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

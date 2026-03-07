const express = require('express');
const router = express.Router();

const SITE_URL = 'https://propertyhack.com.au';

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

router.get('/feed.xml', async (req, res) => {
  try {
    const articles = await req.prisma.article.findMany({
      where: { status: 'PUBLISHED' },
      select: {
        title: true,
        slug: true,
        shortBlurb: true,
        category: true,
        publishedAt: true,
        imageUrl: true,
      },
      orderBy: { publishedAt: 'desc' },
      take: 50,
    });

    const lastBuildDate = articles[0]?.publishedAt
      ? new Date(articles[0].publishedAt).toUTCString()
      : new Date().toUTCString();

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>PropertyHack - Australian Property News</title>
    <link>${SITE_URL}</link>
    <description>Agenda-free Australian property news, market updates, and analysis.</description>
    <language>en-au</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
${articles.map(a => `    <item>
      <title>${escapeXml(a.title)}</title>
      <link>${SITE_URL}/articles/${a.slug}</link>
      <guid isPermaLink="true">${SITE_URL}/articles/${a.slug}</guid>
      <description>${escapeXml(a.shortBlurb || '')}</description>
      <pubDate>${a.publishedAt ? new Date(a.publishedAt).toUTCString() : ''}</pubDate>
      ${a.category ? `<category>${escapeXml(a.category)}</category>` : ''}
    </item>`).join('\n')}
  </channel>
</rss>`;

    res.set('Content-Type', 'application/rss+xml');
    res.send(xml);
  } catch (err) {
    console.error('RSS feed error:', err);
    res.status(500).send('Error generating feed');
  }
});

module.exports = router;

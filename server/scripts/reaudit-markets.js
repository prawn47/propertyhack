/**
 * Re-audit script: Fix AU articles that should be NZ
 * Run once after fixing the AI prompt to include NZ market.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const auArticles = await prisma.article.findMany({
    where: { market: 'AU' },
    select: {
      id: true, title: true, shortBlurb: true, longSummary: true,
      location: true, sourceUrl: true, markets: true,
      source: { select: { name: true, market: true } }
    }
  });

  // Strong NZ signals (any one of these is enough)
  const strongSignals = [
    /\bnew zealand\b/i, /\baotearoa\b/i,
    /interest\.co\.nz/i, /stuff\.co\.nz/i, /nzherald\.co\.nz/i,
    /newshub\.co\.nz/i, /rnz\.co\.nz/i, /oneroof\.co\.nz/i,
    /\brbnz\b/i, /\breserve bank of new zealand\b/i,
    /\breinz\b/i, /\btrade me property\b/i,
    /\bkainga ora\b/i, /\bk\u0101inga ora\b/i,
    /\bhousing new zealand\b/i,
  ];

  // NZ cities
  const nzCities = [
    /\bauckland\b/i, /\bwellington\b/i, /\bchristchurch\b/i,
    /\btauranga\b/i, /\bdunedin\b/i, /\bqueenstown\b/i,
    /\brotorua\b/i, /\bnapier\b/i, /\bpalmerston north\b/i,
    /\bwhangarei\b/i, /\binvercargill\b/i,
  ];

  // NZ regions
  const nzRegions = [
    /\bwaikato\b/i, /\bbay of plenty\b/i, /\bhawke.s bay\b/i,
    /\bcanterbury\b/i, /\botago\b/i, /\bmanawat/i,
  ];

  const toUpdate = [];

  for (const article of auArticles) {
    const text = [
      article.title, article.shortBlurb, article.longSummary,
      article.location, article.sourceUrl, article.source?.name
    ].filter(Boolean).join(' ');

    const hasStrongSignal = strongSignals.some(p => p.test(text));
    const cityMatches = nzCities.filter(p => p.test(text)).length;
    const regionMatches = nzRegions.filter(p => p.test(text)).length;
    const sourceIsNZ = article.source?.market === 'NZ';

    // Criteria: strong signal, OR source is NZ, OR 2+ city/region matches
    const isNZ = hasStrongSignal || sourceIsNZ || (cityMatches + regionMatches >= 2);

    if (isNZ) {
      toUpdate.push({ id: article.id, title: article.title, location: article.location });
    }
  }

  console.log(`AU articles checked: ${auArticles.length}`);
  console.log(`Articles to reassign to NZ: ${toUpdate.length}`);
  console.log();

  let updated = 0;
  for (const article of toUpdate) {
    await prisma.article.update({
      where: { id: article.id },
      data: {
        market: 'NZ',
        markets: { set: ['NZ'] }
      }
    });
    updated++;
    console.log(`  [${updated}] ${article.title} (location: ${article.location || 'none'})`);
  }

  console.log();
  console.log(`Updated: ${updated} articles from AU to NZ`);

  // Show new counts
  const counts = await prisma.article.groupBy({
    by: ['market'],
    _count: true,
    orderBy: { _count: { market: 'desc' } }
  });
  console.log();
  console.log('=== MARKET COUNTS (AFTER RE-AUDIT) ===');
  counts.forEach(r => console.log(`  ${r.market}: ${r._count}`));

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

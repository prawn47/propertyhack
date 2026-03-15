const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Final counts
  const counts = await prisma.article.groupBy({
    by: ['market'],
    _count: true,
    orderBy: { _count: { market: 'desc' } }
  });
  console.log('=== FINAL MARKET COUNTS ===');
  counts.forEach(r => console.log(`  ${r.market}: ${r._count}`));

  // Spot-check: 3 articles per market
  for (const mkt of ['AU', 'NZ', 'US', 'UK', 'CA', 'ALL']) {
    const articles = await prisma.article.findMany({
      where: { market: mkt, status: 'PUBLISHED' },
      select: { title: true, markets: true, source: { select: { name: true } } },
      orderBy: { publishedAt: 'desc' },
      take: 3,
    });
    console.log();
    console.log(`=== ${mkt} (sample) ===`);
    articles.forEach(a => {
      console.log(`  ${a.title} | src: ${a.source?.name || 'none'} | markets: ${JSON.stringify(a.markets)}`);
    });
  }

  // Check: any remaining GLOBAL values?
  const globalCount = await prisma.article.count({ where: { market: 'GLOBAL' } });
  const globalInArray = await prisma.article.count({ where: { markets: { has: 'GLOBAL' } } });
  console.log();
  console.log(`Remaining GLOBAL market: ${globalCount}`);
  console.log(`Remaining GLOBAL in markets array: ${globalInArray}`);

  // Check: articles where primary market not in markets array
  const all = await prisma.article.findMany({
    select: { id: true, market: true, markets: true },
  });
  const inconsistent = all.filter(a => a.market && a.markets.indexOf(a.market) === -1);
  console.log(`Primary market missing from array: ${inconsistent.length}`);

  // Multi-market articles
  const multi = all.filter(a => a.markets.length > 1);
  console.log(`Multi-market articles: ${multi.length}`);

  await prisma.$disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });

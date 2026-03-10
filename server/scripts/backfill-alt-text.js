require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { PrismaClient } = require('@prisma/client');
const { generateImageAltText } = require('../services/articleSummaryService');

const BATCH_SIZE = 10;
const DELAY_MS = 1000;

async function getSeoKeywords(prisma, category, location) {
  const conditions = [];
  if (category) conditions.push({ category });
  if (location) conditions.push({ location });
  conditions.push({ category: null, location: null });

  const keywords = await prisma.seoKeyword.findMany({
    where: { isActive: true, OR: conditions },
    select: { keyword: true },
    orderBy: { priority: 'desc' },
    take: 5,
  });
  return keywords.map(k => k.keyword);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const prisma = new PrismaClient();

  try {
    const articles = await prisma.article.findMany({
      where: {
        status: 'PUBLISHED',
        imageAltText: null,
        imageUrl: { not: null },
        NOT: { imageUrl: { startsWith: '/images/fallbacks/' } },
      },
      select: {
        id: true,
        title: true,
        shortBlurb: true,
        category: true,
        location: true,
      },
    });

    console.log(`Found ${articles.length} articles missing alt text`);

    let updated = 0;
    let failed = 0;

    for (let i = 0; i < articles.length; i += BATCH_SIZE) {
      const batch = articles.slice(i, i + BATCH_SIZE);

      for (const article of batch) {
        try {
          const focusKeywords = await getSeoKeywords(prisma, article.category, article.location);
          const altText = await generateImageAltText(article.title, article.shortBlurb || '', focusKeywords);

          await prisma.article.update({
            where: { id: article.id },
            data: { imageAltText: altText },
          });

          updated++;
          console.log(`[${updated}/${articles.length}] ${article.title.substring(0, 50)}... → ${altText}`);
        } catch (err) {
          failed++;
          console.error(`Failed: ${article.id} — ${err.message}`);
        }
      }

      if (i + BATCH_SIZE < articles.length) {
        await sleep(DELAY_MS);
      }
    }

    console.log(`\nDone. Updated: ${updated}, Failed: ${failed}`);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Backfill failed:', err);
  process.exit(1);
});

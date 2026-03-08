require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { PrismaClient } = require('@prisma/client');
const { fetch: rssFetch } = require('../services/fetchers/rssFetcher');
const { normalizeUrl } = require('../utils/urlNormalizer');
const { generateSlug } = require('../utils/slug');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

async function primeAllFeeds() {
  const sources = await prisma.ingestionSource.findMany({
    where: { isActive: true, type: 'RSS' },
    orderBy: { market: 'asc' },
  });

  console.log(`Priming ${sources.length} RSS feeds...\n`);

  const stats = { total: 0, saved: 0, skipped: 0, errors: 0 };
  const marketStats = {};

  for (const source of sources) {
    const market = source.market;
    if (!marketStats[market]) marketStats[market] = { fetched: 0, saved: 0, skipped: 0, failed: 0 };

    process.stdout.write(`  [${market}] ${source.name}... `);

    let articles;
    try {
      articles = await rssFetch(source.config);
    } catch (err) {
      console.log(`FETCH ERROR: ${err.message}`);
      marketStats[market].failed++;
      stats.errors++;

      await prisma.ingestionSource.update({
        where: { id: source.id },
        data: { lastError: err.message, errorCount: { increment: 1 } },
      });
      continue;
    }

    let savedCount = 0;
    let skippedCount = 0;

    for (const article of articles) {
      if (!article.url) continue;
      stats.total++;
      marketStats[market].fetched++;

      const normalizedUrl = normalizeUrl(article.url);

      const existing = await prisma.article.findFirst({
        where: { sourceUrl: normalizedUrl },
        select: { id: true },
      });

      if (existing) {
        skippedCount++;
        stats.skipped++;
        marketStats[market].skipped++;
        continue;
      }

      let slug;
      try {
        if (!article.title || !article.title.trim()) throw new Error('Empty title');
        slug = generateSlug(article.title);
      } catch {
        slug = `article-${uuidv4()}`;
      }

      try {
        await prisma.article.create({
          data: {
            sourceId: source.id,
            sourceUrl: normalizedUrl,
            title: article.title || 'Untitled',
            slug,
            shortBlurb: '',
            longSummary: '',
            originalContent: article.content || null,
            imageUrl: article.imageUrl || null,
            category: source.category || 'uncategorized',
            market: source.market || 'AU',
            status: 'DRAFT',
            metadata: {
              originalUrl: article.url,
              author: article.author || null,
              date: article.date || null,
              sourceName: article.sourceName || null,
            },
          },
        });

        savedCount++;
        stats.saved++;
        marketStats[market].saved++;
      } catch (err) {
        stats.errors++;
        // Likely a unique constraint on slug — skip silently
      }
    }

    // Update source metadata
    if (savedCount > 0) {
      await prisma.ingestionSource.update({
        where: { id: source.id },
        data: {
          articleCount: { increment: savedCount },
          lastFetchAt: new Date(),
          lastError: null,
          errorCount: 0,
        },
      });
    }

    console.log(`${articles.length} fetched, ${savedCount} saved, ${skippedCount} dupes`);
  }

  console.log('\n── Summary ──');
  console.log(`Total articles fetched: ${stats.total}`);
  console.log(`Saved: ${stats.saved}`);
  console.log(`Duplicates skipped: ${stats.skipped}`);
  console.log(`Errors: ${stats.errors}`);
  console.log('\nPer market:');
  for (const [market, ms] of Object.entries(marketStats).sort()) {
    console.log(`  ${market}: ${ms.saved} saved, ${ms.skipped} dupes, ${ms.failed} feed errors`);
  }
}

primeAllFeeds()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

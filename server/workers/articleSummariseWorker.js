const { Worker } = require('bullmq');
const { connection } = require('../queues/connection');
const { articleImageQueue } = require('../queues/articleImageQueue');
const { generateArticleSummary } = require('../services/articleSummaryService');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const articleSummariseWorker = new Worker('article-summarise', async (job) => {
  const { articleId } = job.data;
  console.log(`[article-summarise] Processing article: ${articleId}`);

  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: {
      id: true,
      title: true,
      originalContent: true,
      sourceUrl: true,
      source: { select: { name: true, market: true } },
    },
  });

  if (!article) {
    throw new Error(`Article not found: ${articleId}`);
  }

  // Small delay between Gemini calls to avoid burst rate limits
  await new Promise(resolve => setTimeout(resolve, 1000));

  const summary = await generateArticleSummary({
    title: article.title,
    content: article.originalContent,
    sourceUrl: article.sourceUrl,
    sourceName: article.source?.name,
    sourceMarket: article.source?.market,
  });

  if (!summary.isPropertyRelated) {
    console.log(`[article-summarise] Rejecting non-property article: ${articleId} "${article.title}"`);
    await prisma.article.delete({ where: { id: articleId } });
    return { articleId, rejected: true };
  }

  // Match suggestedCategory slug to ArticleCategory table
  let categorySlug = summary.suggestedCategory;
  const matchedCategory = await prisma.articleCategory.findUnique({
    where: { slug: categorySlug },
  });
  if (!matchedCategory) {
    const fallback = await prisma.articleCategory.findUnique({
      where: { slug: 'uncategorized' },
    });
    categorySlug = fallback ? 'uncategorized' : categorySlug;
  }

  // Primary market = first in list (or first non-ALL)
  const primaryMarket = summary.markets.find(m => m !== 'ALL') || summary.markets[0] || 'AU';

  await prisma.article.update({
    where: { id: articleId },
    data: {
      shortBlurb: summary.shortBlurb,
      longSummary: summary.longSummary,
      category: categorySlug,
      location: summary.extractedLocation,
      market: primaryMarket,
      markets: summary.markets,
      isEvergreen: summary.isEvergreen,
      status: 'PUBLISHED',
      publishedAt: new Date(),
    },
  });

  await articleImageQueue.add('image-article', { articleId });

  const flags = [categorySlug, ...summary.markets, summary.isEvergreen ? 'evergreen' : 'news'].join(', ');
  console.log(`[article-summarise] Completed: ${articleId} → ${flags}`);
  return { articleId, category: categorySlug, markets: summary.markets, isEvergreen: summary.isEvergreen };
}, {
  connection,
  concurrency: 1,
  lockDuration: 120000,
  stalledInterval: 120000,
});

articleSummariseWorker.on('completed', (job) => {
  console.log(`[article-summarise] Job ${job.id} completed`);
});

articleSummariseWorker.on('failed', (job, err) => {
  console.error(`[article-summarise] Job ${job.id} failed:`, err.message);
});

module.exports = { articleSummariseWorker };

const { Worker } = require('bullmq');
const { connection } = require('../queues/connection');
const { articleImageQueue } = require('../queues/articleImageQueue');
const { generateArticleSummary } = require('../services/articleSummaryService');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

let cachedThresholds = null;
let thresholdsCacheTimestamp = 0;
const THRESHOLDS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getRelevanceThresholds() {
  const now = Date.now();
  if (cachedThresholds && (now - thresholdsCacheTimestamp) < THRESHOLDS_CACHE_TTL) {
    return cachedThresholds;
  }
  try {
    const record = await prisma.systemPrompt.findUnique({ where: { name: 'relevance-thresholds' } });
    if (record && record.isActive) {
      const parsed = JSON.parse(record.content);
      if (typeof parsed.rejectBelow === 'number' && typeof parsed.reviewBelow === 'number') {
        cachedThresholds = parsed;
        thresholdsCacheTimestamp = now;
        return cachedThresholds;
      }
    }
  } catch (err) {
    console.warn('[article-summarise] Could not load thresholds from DB:', err.message);
  }
  return { rejectBelow: 4, reviewBelow: 7 };
}

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

  const thresholds = await getRelevanceThresholds();
  const score = summary.relevanceScore ?? 5;

  if (score < thresholds.rejectBelow) {
    console.log(`[article-summarise] Deleting low-relevance article (score ${score}): ${articleId} "${article.title}"`);
    await prisma.article.delete({ where: { id: articleId } });
    return { articleId, rejected: true, relevanceScore: score };
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

  const isDraft = score < thresholds.reviewBelow;

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
      isGlobal: summary.isGlobal,
      relevanceScore: score,
      status: isDraft ? 'DRAFT' : 'PUBLISHED',
      publishedAt: isDraft ? undefined : new Date(),
    },
  });

  if (!isDraft) {
    await articleImageQueue.add('image-article', { articleId });
  }

  const flags = [categorySlug, ...summary.markets, summary.isEvergreen ? 'evergreen' : 'news', summary.isGlobal ? 'global' : '', isDraft ? `draft(score:${score})` : `published(score:${score})`].filter(Boolean).join(', ');
  console.log(`[article-summarise] Completed: ${articleId} → ${flags}`);
  return { articleId, category: categorySlug, markets: summary.markets, isEvergreen: summary.isEvergreen, isGlobal: summary.isGlobal, relevanceScore: score, isDraft };
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

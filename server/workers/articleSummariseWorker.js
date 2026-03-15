/**
 * Article Summarise Worker — AI summarisation via Gemini
 * Dual-mode: CF Queue consumer (via processJob) or BullMQ worker (local dev)
 * Ref: Beads workspace-8i6
 */
const { connection, isCFWorkers } = require('../queues/connection');
const { articleImageQueue } = require('../queues/articleImageQueue');
const { generateArticleSummary } = require('../services/articleSummaryService');
const { getClient } = require('../lib/prisma');

let cachedThresholds = null;
let thresholdsCacheTimestamp = 0;
const THRESHOLDS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getRelevanceThresholds() {
  const prisma = getClient();
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

async function processJob(data) {
  const prisma = getClient();
  const { articleId } = data;
  console.log(`[article-summarise] Processing article: ${articleId}`);
  
  // Mark article as being summarised
  await prisma.article.update({
    where: { id: articleId },
    data: { status: 'SUMMARISING' },
  });

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

  // Primary market = first in list (or first non-ALL), fall back to source market
  const sourceMarket = article.source?.market;
  const primaryMarket = summary.markets.find(m => m !== 'ALL') || summary.markets[0] || sourceMarket || 'AU';

  const isDraft = score < thresholds.reviewBelow;
  const finalStatus = isDraft ? 'SUMMARISED' : 'PUBLISHED';

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
      status: finalStatus,
      publishedAt: isDraft ? undefined : new Date(),
    },
  });

  if (!isDraft) {
    await articleImageQueue.add('image-article', { articleId });
  }

  const flags = [categorySlug, ...summary.markets, summary.isEvergreen ? 'evergreen' : 'news', summary.isGlobal ? 'global' : '', isDraft ? `draft(score:${score})` : `published(score:${score})`].filter(Boolean).join(', ');
  console.log(`[article-summarise] Completed: ${articleId} → ${flags}`);
  return { articleId, category: categorySlug, markets: summary.markets, isEvergreen: summary.isEvergreen, isGlobal: summary.isGlobal, relevanceScore: score, isDraft };
}

// ── BullMQ Worker (local dev only) ─────────────────────────────────
let articleSummariseWorker = null;

if (!isCFWorkers) {
  const { Worker } = require('bullmq');
  articleSummariseWorker = new Worker('article-summarise', async (job) => {
    return processJob(job.data);
  }, { connection, concurrency: 1, lockDuration: 120000, stalledInterval: 120000 });

  articleSummariseWorker.on('completed', (job) => {
    console.log(`[article-summarise] Job ${job.id} completed`);
  });

  articleSummariseWorker.on('failed', (job, err) => {
    console.error(`[article-summarise] Job ${job.id} failed:`, err.message);
  });
} else {
  articleSummariseWorker = { close: async () => {} };
}

module.exports = { articleSummariseWorker, processJob };

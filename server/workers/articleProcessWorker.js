/**
 * Article Process Worker — deduplicates and creates DRAFT articles
 * Dual-mode: CF Queue consumer (via processJob) or BullMQ worker (local dev)
 * Ref: Beads workspace-8i6
 */
const { connection, isCFWorkers } = require('../queues/connection');
const { v4: uuidv4 } = require('uuid');
const { articleSummariseQueue } = require('../queues/articleSummariseQueue');
const { normalizeUrl } = require('../utils/urlNormalizer');
const { generateContentHash, normaliseText } = require('../utils/contentHash');
const { generateSlug } = require('../utils/slug');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Calculate title similarity using word overlap (Jaccard similarity)
 * @param {string} a - First title (normalised)
 * @param {string} b - Second title (normalised) 
 * @returns {number} - Similarity ratio (0-1)
 */
function titleSimilarity(a, b) {
  const wordsA = new Set(a.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2));
  const wordsB = new Set(b.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2));
  const intersection = [...wordsA].filter(w => wordsB.has(w));
  const union = new Set([...wordsA, ...wordsB]);
  return union.size > 0 ? intersection.length / union.size : 0;
}

async function processJob(data) {
  const { sourceId, article } = data;
  const { title, content, url, imageUrl, date, author, sourceName } = article;

  console.log(`[article-process] Processing: "${title}" (${url})`);

  const normalizedUrl = normalizeUrl(url);

  const existing = await prisma.article.findFirst({
    where: { sourceUrl: normalizedUrl },
    select: { id: true },
  });

  if (existing) {
    console.log(`[article-process] Duplicate article skipped: ${url}`);
    return { skipped: true, reason: 'url_duplicate' };
  }

  const contentHash = generateContentHash(title, content || '');
  const hashMatch = await prisma.article.findFirst({
    where: { contentHash },
    select: { id: true },
  });
  if (hashMatch) {
    console.log(`[article-process] Content duplicate skipped: ${title}`);
    return { skipped: true, reason: 'content_duplicate' };
  }

  const source = await prisma.ingestionSource.findUnique({
    where: { id: sourceId },
    select: { market: true, category: true },
  });

  const normTitle = normaliseText(title);
  const startOfDay = new Date(date || new Date());
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setHours(23, 59, 59, 999);
  const titleMatch = await prisma.article.findFirst({
    where: {
      publishedAt: { gte: startOfDay, lte: endOfDay },
      market: source?.market || undefined,
    },
    select: { id: true, title: true },
  });
  if (titleMatch && normaliseText(titleMatch.title) === normTitle) {
    console.log(`[article-process] Title duplicate skipped: ${title}`);
    return { skipped: true, reason: 'title_duplicate' };
  }

  // Cross-source fuzzy title dedup (v2 enhancement)
  const recentArticles = await prisma.article.findMany({
    where: {
      publishedAt: { 
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) 
      }
    },
    select: { id: true, title: true, sourceUrl: true }
  });

  // Check title similarity across all recent articles
  const currentNormTitle = normaliseText(title);
  for (const existing of recentArticles) {
    const existingNormTitle = normaliseText(existing.title);
    if (titleSimilarity(currentNormTitle, existingNormTitle) > 0.85) {
      console.log(`[article-process] Cross-source duplicate skipped: "${title}" matches "${existing.title}"`);
      return { skipped: true, reason: 'cross_source_duplicate' };
    }
  }

  // URL path dedup for Fairfax network syndication (v2 enhancement) 
  try {
    const urlPath = new URL(url).pathname.replace(/\/$/, '');
    const pathMatch = recentArticles.find(a => {
      try {
        return new URL(a.sourceUrl).pathname.replace(/\/$/, '') === urlPath;
      } catch { return false; }
    });
    if (pathMatch) {
      console.log(`[article-process] URL path duplicate skipped: ${url} matches ${pathMatch.sourceUrl}`);
      return { skipped: true, reason: 'url_path_duplicate' };
    }
  } catch {
    // Invalid URL, continue processing
  }

  let slug;
  try {
    if (!title || !title.trim()) throw new Error('Empty title');
    slug = generateSlug(title);
  } catch {
    slug = `article-${uuidv4()}`;
    console.log(`[article-process] Slug fallback to UUID for article: ${url}`);
  }

  const savedArticle = await prisma.article.create({
    data: {
      sourceId,
      sourceUrl: normalizedUrl,
      contentHash,
      title: title || 'Untitled',
      slug,
      shortBlurb: '',
      longSummary: '',
      originalContent: content || null,
      imageUrl: imageUrl || null,
      category: source?.category || 'uncategorized',
      market: source?.market || 'AU',
      status: 'DRAFT',
      metadata: {
        originalUrl: url,
        author: author || null,
        date: date || null,
        sourceName: sourceName || null,
      },
    },
  });

  console.log(`[article-process] Saved article ${savedArticle.id}: "${title}"`);

  await articleSummariseQueue.add('summarise', { articleId: savedArticle.id });

  await prisma.ingestionSource.update({
    where: { id: sourceId },
    data: { articleCount: { increment: 1 } },
  });

  return { articleId: savedArticle.id };
}

// ── BullMQ Worker (local dev only) ─────────────────────────────────
let articleProcessWorker = null;

if (!isCFWorkers) {
  const { Worker } = require('bullmq');
  articleProcessWorker = new Worker('article-process', async (job) => {
    return processJob(job.data);
  }, { connection, concurrency: 5 });

  articleProcessWorker.on('completed', (job, result) => {
    if (result?.skipped) {
      console.log(`[article-process] Job ${job.id} skipped (duplicate)`);
    } else {
      console.log(`[article-process] Job ${job.id} completed — article ${result?.articleId}`);
    }
  });

  articleProcessWorker.on('failed', (job, err) => {
    console.error(`[article-process] Job ${job.id} failed:`, err.message);
  });
} else {
  articleProcessWorker = { close: async () => {} };
}

module.exports = { articleProcessWorker, processJob };

const { Worker } = require('bullmq');
const { v4: uuidv4 } = require('uuid');
const { connection } = require('../queues/connection');
const { articleSummariseQueue } = require('../queues/articleSummariseQueue');
const { normalizeUrl } = require('../utils/urlNormalizer');
const { generateContentHash, normaliseText } = require('../utils/contentHash');
const { generateSlug } = require('../utils/slug');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const articleProcessWorker = new Worker('article-process', async (job) => {
  const { sourceId, article } = job.data;
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
}, {
  connection,
  concurrency: 5,
});

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

module.exports = { articleProcessWorker };

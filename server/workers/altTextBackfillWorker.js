/**
 * Alt Text Backfill Worker — generates alt text for images missing it
 * Dual-mode: CF Queue consumer (via processJob) or BullMQ worker (local dev)
 * Ref: Beads workspace-8i6
 */
const { connection, isCFWorkers } = require('../queues/connection');
const { generateImageAltText } = require('../services/articleSummaryService');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function getSeoKeywords(category, location) {
  const where = { isActive: true };
  const conditions = [];
  if (category) conditions.push({ category });
  if (location) conditions.push({ location });
  conditions.push({ category: null, location: null });
  where.OR = conditions;

  const keywords = await prisma.seoKeyword.findMany({
    where,
    select: { keyword: true },
    orderBy: { priority: 'desc' },
    take: 5,
  });
  return keywords.map(k => k.keyword);
}

async function processJob(data, job) {
  const articles = await prisma.article.findMany({
    where: {
      status: 'PUBLISHED',
      imageUrl: { not: null },
      NOT: { imageUrl: { startsWith: '/images/fallbacks/' } },
      imageAltText: null,
    },
    select: { id: true, title: true, shortBlurb: true, category: true, location: true },
  });

  const total = articles.length;
  let processed = 0;
  let failures = 0;

  if (job?.updateProgress) await job.updateProgress({ total, processed, failures });

  for (const article of articles) {
    try {
      const focusKeywords = await getSeoKeywords(article.category, article.location);
      const altText = await generateImageAltText(article.title, article.shortBlurb || '', focusKeywords);
      await prisma.article.update({
        where: { id: article.id },
        data: { imageAltText: altText },
      });
      processed++;
    } catch (err) {
      console.warn(`[alt-text-backfill] Failed for article ${article.id}: ${err.message}`);
      failures++;
      processed++;
    }

    if (job?.updateProgress) await job.updateProgress({ total, processed, failures });
  }

  return { total, processed, failures };
}

// ── BullMQ Worker (local dev only) ─────────────────────────────────
let altTextBackfillWorker = null;

if (!isCFWorkers) {
  const { Worker } = require('bullmq');
  altTextBackfillWorker = new Worker('alt-text-backfill', async (job) => {
    return processJob(job.data, job);
  }, { connection, concurrency: 1, lockDuration: 600000 });

  altTextBackfillWorker.on('completed', (job) => {
    console.log(`[alt-text-backfill] Job ${job.id} completed`);
  });

  altTextBackfillWorker.on('failed', (job, err) => {
    console.error(`[alt-text-backfill] Job ${job.id} failed:`, err.message);
  });
} else {
  altTextBackfillWorker = { close: async () => {} };
}

module.exports = { altTextBackfillWorker, processJob };

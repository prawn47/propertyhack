/**
 * Source Fetch Worker — fetches articles from configured news sources
 * Dual-mode: CF Queue consumer (via processJob) or BullMQ worker (local dev)
 * Ref: Beads workspace-8i6
 */
const { connection, isCFWorkers } = require('../queues/connection');
const { articleProcessQueue } = require('../queues/articleProcessQueue');
const { getFetcher } = require('../services/fetchers');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Core job processing logic — called by both CF Queue consumer and BullMQ worker.
 * @param {object} data - { sourceId, sourceType, config }
 */
async function processJob(data) {
  const { sourceId, sourceType, config } = data;
  console.log(`[source-fetch] Processing sourceId: ${sourceId}, type: ${sourceType}`);

  let rawArticles = [];

  try {
    const fetcher = getFetcher(sourceType);
    rawArticles = await fetcher(config);
    console.log(`[source-fetch] Fetched ${rawArticles.length} articles from ${sourceType} source ${sourceId}`);
  } catch (err) {
    console.error(`[source-fetch] Would fetch from ${sourceType} — not yet implemented:`, err.message);
    rawArticles = [];
  }

  await prisma.ingestionSource.update({
    where: { id: sourceId },
    data: { lastFetchAt: new Date() },
  });

  for (const article of rawArticles) {
    await articleProcessQueue.add('process-article', {
      sourceId,
      article,
    });
  }

  console.log(`[source-fetch] Enqueued ${rawArticles.length} articles for processing`);
  return { sourceId, articlesEnqueued: rawArticles.length };
}

// ── BullMQ Worker (local dev only) ─────────────────────────────────
let sourceFetchWorker = null;

if (!isCFWorkers) {
  const { Worker } = require('bullmq');
  sourceFetchWorker = new Worker('source-fetch', async (job) => {
    return processJob(job.data);
  }, { connection, concurrency: 3 });

  sourceFetchWorker.on('completed', (job, result) => {
    console.log(`[source-fetch] Job ${job.id} completed — ${result.articlesEnqueued} articles enqueued`);
  });

  sourceFetchWorker.on('failed', (job, err) => {
    console.error(`[source-fetch] Job ${job.id} failed:`, err.message);
  });
} else {
  // Stub for CF Workers — worker-entry.js handles queue consumption
  sourceFetchWorker = { close: async () => {} };
}

module.exports = { sourceFetchWorker, processJob };

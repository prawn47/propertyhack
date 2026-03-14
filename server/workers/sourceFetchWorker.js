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

// ── Source Locking (KV-based for CF Workers) ──────────────────────

/**
 * Acquire a lock for a source to prevent concurrent fetching
 * @param {string} sourceId - Source identifier
 * @param {object} env - CF Workers environment (contains KV binding)
 * @returns {boolean} - True if lock acquired, false if already locked
 */
async function acquireSourceLock(sourceId, env) {
  const lockKey = `lock:source:${sourceId}`;
  const existing = await env.KV.get(lockKey);
  if (existing) {
    const lockTime = parseInt(existing);
    // Lock expires after 5 minutes (stale lock protection)
    if (Date.now() - lockTime < 5 * 60 * 1000) {
      return false; // Lock held by another worker
    }
  }
  // Claim the lock
  await env.KV.put(lockKey, Date.now().toString(), { expirationTtl: 300 });
  return true;
}

/**
 * Release a source lock
 * @param {string} sourceId - Source identifier
 * @param {object} env - CF Workers environment (contains KV binding)
 */
async function releaseSourceLock(sourceId, env) {
  await env.KV.delete(`lock:source:${sourceId}`);
}

/**
 * Core job processing logic — called by both CF Queue consumer and BullMQ worker.
 * @param {object} data - { sourceId, sourceType, config }
 * @param {object} env - CF Workers environment (contains KV binding, optional for local dev)
 */
async function processJob(data, env = null) {
  const { sourceId, sourceType, config } = data;
  console.log(`[source-fetch] Processing sourceId: ${sourceId}, type: ${sourceType}`);
  
  // Acquire lock (CF Workers only)
  if (env?.KV) {
    const locked = await acquireSourceLock(sourceId, env);
    if (!locked) {
      console.log(`[source-fetch] Source ${sourceId} already being fetched, skipping`);
      return { skipped: true, reason: 'source_locked' };
    }
  }

  try {
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
    
  } finally {
    // Release lock (CF Workers only)
    if (env?.KV) {
      await releaseSourceLock(sourceId, env);
    }
  }
}

// ── BullMQ Worker (local dev only) ─────────────────────────────────
let sourceFetchWorker = null;

if (!isCFWorkers) {
  const { Worker } = require('bullmq');
  sourceFetchWorker = new Worker('source-fetch', async (job) => {
    return processJob(job.data); // No env parameter for local dev (no KV locking)
  }, { connection, concurrency: 3 });

  sourceFetchWorker.on('completed', (job, result) => {
    if (result?.skipped) {
      console.log(`[source-fetch] Job ${job.id} skipped (${result.reason})`);
    } else {
      console.log(`[source-fetch] Job ${job.id} completed — ${result.articlesEnqueued} articles enqueued`);
    }
  });

  sourceFetchWorker.on('failed', (job, err) => {
    console.error(`[source-fetch] Job ${job.id} failed:`, err.message);
  });
} else {
  // Stub for CF Workers — worker-entry.js handles queue consumption
  sourceFetchWorker = { close: async () => {} };
}

module.exports = { sourceFetchWorker, processJob };

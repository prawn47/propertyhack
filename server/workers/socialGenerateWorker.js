/**
 * Social Generate Worker — creates social media posts for articles
 * Dual-mode: CF Queue consumer (via processJob) or BullMQ worker (local dev)
 * Ref: Beads workspace-8i6
 */
const { connection, isCFWorkers } = require('../queues/connection');
const { PrismaClient } = require('@prisma/client');
const { generateSocialPosts } = require('../services/socialGenerationService');

const prisma = new PrismaClient();

async function processJob(data) {
  const { articleId } = data;
  console.log(`[social-generate] Job ${job.id} — articleId: ${articleId}`);

  const article = await prisma.article.findUnique({
    where: { id: articleId },
    include: { source: true },
  });

  if (!article) {
    throw new Error(`Article not found: ${articleId}`);
  }

  if (article.status !== 'PUBLISHED') {
    console.log(`[social-generate] Article ${articleId} not published, skipping`);
    return { articleId, skipped: true };
  }

  const posts = await generateSocialPosts(articleId);
  console.log(`[social-generate] Generated ${posts.length} social posts for article: ${article.title}`);
  return { articleId, postsCreated: posts.length };
}

// ── BullMQ Worker (local dev only) ─────────────────────────────────
let socialGenerateWorker = null;

if (!isCFWorkers) {
  const { Worker } = require('bullmq');
  socialGenerateWorker = new Worker('social-generate', async (job) => {
    return processJob(job.data);
  }, { connection, concurrency: 1, lockDuration: 120000, stalledInterval: 120000 });

  socialGenerateWorker.on('completed', (job) => {
    console.log(`[social-generate] Job ${job.id} completed`);
  });

  socialGenerateWorker.on('failed', (job, err) => {
    console.error(`[social-generate] Job ${job.id} failed:`, err.message);
  });
} else {
  socialGenerateWorker = { close: async () => {} };
}

module.exports = { socialGenerateWorker, processJob };

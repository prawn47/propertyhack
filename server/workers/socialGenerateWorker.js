const { Worker } = require('bullmq');
const { PrismaClient } = require('@prisma/client');
const { connection } = require('../queues/connection');

const prisma = new PrismaClient();

const socialGenerateWorker = new Worker('social-generate', async (job) => {
  const { articleId } = job.data;
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

  // TODO: Call socialGenerationService.generateSocialPosts(articleId)
  // This will be implemented in T6 (orchestrator task)
  console.log(`[social-generate] Stub — would generate social posts for article: ${article.title}`);

  return { articleId, generated: true };
}, {
  connection,
  concurrency: 1,
  lockDuration: 120000,
  stalledInterval: 120000,
});

socialGenerateWorker.on('completed', (job, result) => {
  console.log(`[social-generate] Job ${job.id} completed`);
});

socialGenerateWorker.on('failed', (job, err) => {
  console.error(`[social-generate] Job ${job.id} failed:`, err.message);
});

module.exports = { socialGenerateWorker };

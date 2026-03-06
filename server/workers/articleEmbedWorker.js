const { Worker } = require('bullmq');
const { connection } = require('../queues/connection');

const articleEmbedWorker = new Worker('article-embed', async (job) => {
  const { title } = job.data;
  console.log(`[article-embed] Embedding article: ${title || job.id}`);
  return { embedded: true };
}, {
  connection,
  concurrency: 3,
});

articleEmbedWorker.on('completed', (job) => {
  console.log(`[article-embed] Job ${job.id} completed`);
});

articleEmbedWorker.on('failed', (job, err) => {
  console.error(`[article-embed] Job ${job.id} failed:`, err.message);
});

module.exports = { articleEmbedWorker };

const { Worker } = require('bullmq');
const { connection } = require('../queues/connection');

const articleProcessWorker = new Worker('article-process', async (job) => {
  const { title, url } = job.data;
  console.log(`[article-process] Processing article: ${title || url || job.id}`);
  return { processed: true };
}, {
  connection,
  concurrency: 5,
});

articleProcessWorker.on('completed', (job) => {
  console.log(`[article-process] Job ${job.id} completed`);
});

articleProcessWorker.on('failed', (job, err) => {
  console.error(`[article-process] Job ${job.id} failed:`, err.message);
});

module.exports = { articleProcessWorker };

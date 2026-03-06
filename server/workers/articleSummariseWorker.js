const { Worker } = require('bullmq');
const { connection } = require('../queues/connection');

const articleSummariseWorker = new Worker('article-summarise', async (job) => {
  const { title } = job.data;
  console.log(`[article-summarise] Summarising article: ${title || job.id}`);
  return { summarised: true };
}, {
  connection,
  concurrency: 2,
});

articleSummariseWorker.on('completed', (job) => {
  console.log(`[article-summarise] Job ${job.id} completed`);
});

articleSummariseWorker.on('failed', (job, err) => {
  console.error(`[article-summarise] Job ${job.id} failed:`, err.message);
});

module.exports = { articleSummariseWorker };

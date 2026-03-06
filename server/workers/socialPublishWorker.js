const { Worker } = require('bullmq');
const { connection } = require('../queues/connection');

const socialPublishWorker = new Worker('social-publish', async (job) => {
  const { platforms } = job.data;
  console.log(`[social-publish] Publishing to platforms: ${Array.isArray(platforms) ? platforms.join(', ') : platforms || 'unknown'}`);
  return { published: true };
}, {
  connection,
  concurrency: 1,
});

socialPublishWorker.on('completed', (job) => {
  console.log(`[social-publish] Job ${job.id} completed`);
});

socialPublishWorker.on('failed', (job, err) => {
  console.error(`[social-publish] Job ${job.id} failed:`, err.message);
});

module.exports = { socialPublishWorker };

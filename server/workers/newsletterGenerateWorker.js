const { Worker } = require('bullmq');
const { connection } = require('../queues/connection');
const { generateNewsletter } = require('../services/newsletterService');

const newsletterGenerateWorker = new Worker('newsletter-generate', async (job) => {
  const { jurisdiction } = job.data;
  console.log(`[newsletter-generate] Job ${job.id} — jurisdiction: ${jurisdiction}`);

  try {
    const draft = await generateNewsletter(jurisdiction);
    console.log(`[newsletter-generate] Draft created for ${jurisdiction} — id: ${draft.id}`);
    return { jurisdiction, draftId: draft.id };
  } catch (err) {
    console.error(`[newsletter-generate] Failed for jurisdiction ${jurisdiction}:`, err.message);
    throw err;
  }
}, {
  connection,
  concurrency: 1,
  lockDuration: 300000,
  stalledInterval: 300000,
});

newsletterGenerateWorker.on('completed', (job, result) => {
  console.log(`[newsletter-generate] Job ${job.id} completed — draft: ${result.draftId}`);
});

newsletterGenerateWorker.on('failed', (job, err) => {
  console.error(`[newsletter-generate] Job ${job.id} failed:`, err.message);
});

module.exports = { newsletterGenerateWorker };

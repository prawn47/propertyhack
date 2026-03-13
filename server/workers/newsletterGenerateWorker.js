const { Worker } = require('bullmq');
const { connection } = require('../queues/connection');
const { generateNewsletter } = require('../services/newsletterService');

const newsletterGenerateWorker = new Worker('newsletter-generate', async (job) => {
  const { jurisdiction, cadence = 'DAILY' } = job.data;
  console.log(`[newsletter-generate] Job ${job.id} — jurisdiction: ${jurisdiction}, cadence: ${cadence}`);

  try {
    const draft = await generateNewsletter(jurisdiction, cadence);
    console.log(`[newsletter-generate] Draft created for ${jurisdiction} (${cadence}) — id: ${draft.id}`);
    return { jurisdiction, cadence, draftId: draft.id };
  } catch (err) {
    console.error(`[newsletter-generate] Failed for ${jurisdiction} (${cadence}):`, err.message);
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

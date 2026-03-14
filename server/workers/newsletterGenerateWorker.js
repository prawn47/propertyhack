/**
 * Newsletter Generate Worker — creates newsletter drafts via AI
 * Dual-mode: CF Queue consumer (via processJob) or BullMQ worker (local dev)
 * Ref: Beads workspace-8i6
 */
const { connection, isCFWorkers } = require('../queues/connection');
const { generateNewsletter } = require('../services/newsletterService');

async function processJob(data) {
  const { jurisdiction, cadence = 'DAILY' } = data;
  console.log(`[newsletter-generate] Processing — jurisdiction: ${jurisdiction}, cadence: ${cadence}`);

  try {
    const draft = await generateNewsletter(jurisdiction, cadence);
    console.log(`[newsletter-generate] Draft created for ${jurisdiction} (${cadence}) — id: ${draft.id}`);
    return { jurisdiction, cadence, draftId: draft.id };
  } catch (err) {
    console.error(`[newsletter-generate] Failed for ${jurisdiction} (${cadence}):`, err.message);
    throw err;
  }
}

// ── BullMQ Worker (local dev only) ─────────────────────────────────
let newsletterGenerateWorker = null;

if (!isCFWorkers) {
  const { Worker } = require('bullmq');
  newsletterGenerateWorker = new Worker('newsletter-generate', async (job) => {
    return processJob(job.data);
  }, { connection, concurrency: 1, lockDuration: 300000, stalledInterval: 300000 });

  newsletterGenerateWorker.on('completed', (job, result) => {
    console.log(`[newsletter-generate] Job ${job.id} completed — draft: ${result.draftId}`);
  });

  newsletterGenerateWorker.on('failed', (job, err) => {
    console.error(`[newsletter-generate] Job ${job.id} failed:`, err.message);
  });
} else {
  newsletterGenerateWorker = { close: async () => {} };
}

module.exports = { newsletterGenerateWorker, processJob };

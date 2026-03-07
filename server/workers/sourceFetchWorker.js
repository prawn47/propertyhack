const { Worker } = require('bullmq');
const { connection } = require('../queues/connection');
const { articleProcessQueue } = require('../queues/articleProcessQueue');
const { getFetcher } = require('../services/fetchers');

const sourceFetchWorker = new Worker('source-fetch', async (job) => {
  const { sourceId, sourceType, config } = job.data;
  console.log(`[source-fetch] Processing job ${job.id} — sourceId: ${sourceId}, type: ${sourceType}`);

  let rawArticles = [];

  try {
    const fetcher = getFetcher(sourceType);
    rawArticles = await fetcher(config);
    console.log(`[source-fetch] Fetched ${rawArticles.length} articles from ${sourceType} source ${sourceId}`);
  } catch (err) {
    console.error(`[source-fetch] Would fetch from ${sourceType} — not yet implemented:`, err.message);
    rawArticles = [];
  }

  for (const article of rawArticles) {
    await articleProcessQueue.add('process-article', {
      sourceId,
      article,
    });
  }

  console.log(`[source-fetch] Enqueued ${rawArticles.length} articles for processing`);
  return { sourceId, articlesEnqueued: rawArticles.length };
}, {
  connection,
  concurrency: 3,
});

sourceFetchWorker.on('completed', (job, result) => {
  console.log(`[source-fetch] Job ${job.id} completed — ${result.articlesEnqueued} articles enqueued`);
});

sourceFetchWorker.on('failed', (job, err) => {
  console.error(`[source-fetch] Job ${job.id} failed:`, err.message);
});

module.exports = { sourceFetchWorker };

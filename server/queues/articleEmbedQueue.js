/**
 * article-embed queue — dual-mode for CF Workers and local dev
 * Auto-selects CFQueue adapter on CF Workers, BullMQ locally.
 * Ref: Beads workspace-8i6
 */
const { connection, isCFWorkers } = require('./connection');

let articleEmbedQueue;

if (isCFWorkers) {
  // CF Workers — use CF Queues adapter
  const { CFQueue } = require('./cfAdapter');
  articleEmbedQueue = new CFQueue('article-embed');
} else {
  // Local / traditional server — use BullMQ + Redis
  const { Queue } = require('bullmq');
  articleEmbedQueue = new Queue('article-embed', {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 200 },
    },
  });
}

module.exports = { articleEmbedQueue };

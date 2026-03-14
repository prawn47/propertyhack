/**
 * social-publish queue — dual-mode for CF Workers and local dev
 * Auto-selects CFQueue adapter on CF Workers, BullMQ locally.
 * Ref: Beads workspace-8i6
 */
const { connection, isCFWorkers } = require('./connection');

let socialPublishQueue;

if (isCFWorkers) {
  // CF Workers — use CF Queues adapter
  const { CFQueue } = require('./cfAdapter');
  socialPublishQueue = new CFQueue('social-publish');
} else {
  // Local / traditional server — use BullMQ + Redis
  const { Queue } = require('bullmq');
  socialPublishQueue = new Queue('social-publish', {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 200 },
    },
  });
}

module.exports = { socialPublishQueue };

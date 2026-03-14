/**
 * Queue connection module — dual-mode for CF Workers and local dev
 * ================================================================
 *
 * When running on CF Workers (globalThis.__cf_env is set):
 *   - connection is null (CF Queues don't need a Redis connection)
 *   - Queue class is CFQueue from cfAdapter.js
 *   - Worker class is not used (CF Queue consumers handle this)
 *
 * When running locally or on a traditional server:
 *   - connection is an ioredis instance connecting to Redis
 *   - Queue and Worker classes are from BullMQ
 *
 * Ref: Beads workspace-8i6
 */

const isCFWorkers = !!globalThis.__cf_env;

let connection = null;

if (!isCFWorkers) {
  // Local / traditional server — use Redis + BullMQ
  const IORedis = require('ioredis');

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const isTLS = redisUrl.startsWith('rediss://');

  connection = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    tls: isTLS ? { rejectUnauthorized: false } : undefined,
  });

  connection.on('error', (err) => {
    console.error('[redis] Connection error:', err);
  });

  connection.on('connect', () => {
    console.log('[redis] Connected successfully');
  });
} else {
  console.log('[queues] Running on CF Workers — using CF Queues adapter (no Redis needed)');
}

module.exports = { connection, isCFWorkers };

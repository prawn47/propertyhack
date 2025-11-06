const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');

// Redis connection configuration
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const isTLS = redisUrl.startsWith('rediss://');

const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  tls: isTLS ? { rejectUnauthorized: false } : undefined,
});

// Handle connection errors
connection.on('error', (err) => {
  console.error('[redis] Connection error:', err);
});

connection.on('connect', () => {
  console.log('[redis] Connected successfully');
});

module.exports = { connection };

const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');

// Redis connection configuration
const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

// Handle connection errors
connection.on('error', (err) => {
  console.error('[redis] Connection error:', err);
});

connection.on('connect', () => {
  console.log('[redis] Connected successfully');
});

module.exports = { connection };

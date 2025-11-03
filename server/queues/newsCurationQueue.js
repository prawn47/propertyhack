const { Queue } = require('bullmq');
const { connection } = require('./connection');

// Queue for processing news curation for users
const newsCurationQueue = new Queue('news-curation', {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 100,
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  },
});

// Add event listeners for monitoring
newsCurationQueue.on('error', (err) => {
  console.error('[news-curation-queue] Error:', err);
});

module.exports = { newsCurationQueue };

const { Queue } = require('bullmq');
const { connection } = require('./connection');

// Queue for processing scheduled LinkedIn posts
const scheduledPostsQueue = new Queue('scheduled-posts', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000,
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  },
});

// Add event listeners for monitoring
scheduledPostsQueue.on('error', (err) => {
  console.error('[scheduled-posts-queue] Error:', err);
});

module.exports = { scheduledPostsQueue };

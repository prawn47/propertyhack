const { Queue } = require('bullmq');
const { connection } = require('./connection');

// Queue for processing news articles with AI
const articleProcessingQueue = new Queue('article-processing', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

module.exports = { articleProcessingQueue };

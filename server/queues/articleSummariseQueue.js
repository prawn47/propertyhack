const { Queue } = require('bullmq');
const { connection } = require('./connection');

const articleSummariseQueue = new Queue('article-summarise', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: { count: 200 },
    removeOnFail: { count: 200 },
  },
});

module.exports = { articleSummariseQueue };

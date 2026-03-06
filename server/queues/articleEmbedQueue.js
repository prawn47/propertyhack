const { Queue } = require('bullmq');
const { connection } = require('./connection');

const articleEmbedQueue = new Queue('article-embed', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: { count: 200 },
    removeOnFail: { count: 200 },
  },
});

module.exports = { articleEmbedQueue };

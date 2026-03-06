const { Queue } = require('bullmq');
const { connection } = require('./connection');

const sourceFetchQueue = new Queue('source-fetch', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 200 },
  },
});

module.exports = { sourceFetchQueue };

const { Queue } = require('bullmq');
const { connection } = require('./connection');

const socialGenerateQueue = new Queue('social-generate', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 10000,
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 100 },
  },
});

module.exports = { socialGenerateQueue };

const { Queue } = require('bullmq');
const { connection } = require('./connection');

const newsletterGenerateQueue = new Queue('newsletter-generate', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 30000,
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 100 },
  },
});

module.exports = { newsletterGenerateQueue };

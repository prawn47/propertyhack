const { Queue } = require('bullmq');
const { connection } = require('./connection');

const socialPublishQueue = new Queue('social-publish', {
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

module.exports = { socialPublishQueue };

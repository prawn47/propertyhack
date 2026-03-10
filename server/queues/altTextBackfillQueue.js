const { Queue } = require('bullmq');
const { connection } = require('./connection');

const altTextBackfillQueue = new Queue('alt-text-backfill', {
  connection,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: { count: 10 },
    removeOnFail: { count: 10 },
  },
});

module.exports = { altTextBackfillQueue };

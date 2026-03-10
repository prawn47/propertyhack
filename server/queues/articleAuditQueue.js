const { Queue } = require('bullmq');
const { connection } = require('./connection');

const articleAuditQueue = new Queue('article-audit', {
  connection,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: { count: 10 },
    removeOnFail: { count: 10 },
  },
});

module.exports = { articleAuditQueue };

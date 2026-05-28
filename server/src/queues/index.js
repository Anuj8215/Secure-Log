'use strict';

const { Queue } = require('bullmq');

const connection = {
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  tls: process.env.REDIS_HOST?.includes('upstash') ? {} : undefined,
};

const emailQueue = new Queue('emails', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

const auditArchiveQueue = new Queue('audit-archive', {
  connection,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: 10,
  },
});

module.exports = { emailQueue, auditArchiveQueue };

'use strict';

const { Worker } = require('bullmq');
const mongoose = require('mongoose');
const logger = require('../config/logger');

const connection = {
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  tls: process.env.REDIS_HOST?.includes('upstash') ? {} : undefined,
};

const auditWorker = new Worker(
  'audit-archive',
  async (job) => {
    if (job.data.type === 'archive_old_logs') {
      const AuditLog = require('../models/AuditLog.model');
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

      const db = mongoose.connection.db;
      const oldLogs = await AuditLog.find({ timestamp: { $lt: ninetyDaysAgo } }).lean();

      if (oldLogs.length > 0) {
        await db.collection('auditlogs_archive').insertMany(oldLogs);
        await AuditLog.deleteMany({ timestamp: { $lt: ninetyDaysAgo } });
        logger.info({ count: oldLogs.length }, 'Audit logs archived');
      }
    }
  },
  { connection }
);

auditWorker.on('failed', (job, err) => {
  logger.error({ jobId: job.id, err }, 'Audit archive job failed');
});

module.exports = auditWorker;

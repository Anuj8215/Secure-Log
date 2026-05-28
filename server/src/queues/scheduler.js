'use strict';

const { emailQueue, auditArchiveQueue } = require('./index');
const Incident = require('../models/Incident.model');
const User = require('../models/User.model');
const logger = require('../config/logger');

const scheduleJobs = async () => {
  await emailQueue.add(
    'daily-digest',
    { type: 'daily_digest', data: {} },
    { repeat: { pattern: '0 8 * * *' } }
  );

  await auditArchiveQueue.add(
    'archive-logs',
    { type: 'archive_old_logs' },
    { repeat: { pattern: '0 2 * * 0' } }
  );

  logger.info('Scheduled jobs registered');
};

const processDailyDigest = async () => {
  try {
    const admins = await User.find({ role: 'admin', isActive: true }).select('email');
    if (admins.length === 0) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [openCount, criticalOpen, resolvedToday] = await Promise.all([
      Incident.countDocuments({ status: { $in: ['open', 'investigating'] } }),
      Incident.countDocuments({ severity: 'critical', status: { $in: ['open', 'investigating'] } }),
      Incident.countDocuments({ status: { $in: ['resolved', 'closed'] }, resolvedAt: { $gte: today } }),
    ]);

    const { emailQueue: eq } = require('./index');
    await eq.add('digest', {
      type: 'daily_digest',
      data: {
        adminEmails: admins.map((a) => a.email),
        openCount,
        criticalOpen,
        resolvedToday,
      },
    });
  } catch (err) {
    logger.error({ err }, 'Failed to queue daily digest');
  }
};

module.exports = { scheduleJobs, processDailyDigest };

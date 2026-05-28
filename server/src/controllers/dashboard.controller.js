'use strict';

const Incident = require('../models/Incident.model');
const redis = require('../config/redis');

const getDashboardStats = async (req, res, next) => {
  try {
    const cached = await redis.get('dashboard:stats');
    if (cached) {
      const stats = JSON.parse(cached);
      stats.fromCache = true;
      return res.status(200).json({ status: 'success', data: stats });
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      bySeverityArr,
      byStatusArr,
      last7Days,
      topReporters,
      totalIncidents,
      openIncidents,
      resolvedIncidents,
      criticalOpen,
    ] = await Promise.all([
      Incident.aggregate([{ $group: { _id: '$severity', count: { $sum: 1 } } }]),
      Incident.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Incident.aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Incident.aggregate([
        { $match: { reportedBy: { $ne: null } } },
        { $group: { _id: '$reportedBy', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $unwind: '$user' },
        { $project: { _id: 0, userId: '$_id', name: '$user.name', email: '$user.email', count: 1 } },
      ]),
      Incident.countDocuments(),
      Incident.countDocuments({ status: { $in: ['open', 'investigating'] } }),
      Incident.countDocuments({ status: { $in: ['resolved', 'closed'] } }),
      Incident.countDocuments({ severity: 'critical', status: { $in: ['open', 'investigating'] } }),
    ]);

    const bySeverity = { low: 0, medium: 0, high: 0, critical: 0 };
    for (const entry of bySeverityArr) bySeverity[entry._id] = entry.count;

    const byStatus = { open: 0, investigating: 0, resolved: 0, closed: 0 };
    for (const entry of byStatusArr) byStatus[entry._id] = entry.count;

    const stats = {
      totalIncidents,
      openIncidents,
      resolvedIncidents,
      criticalOpen,
      resolutionRate:
        totalIncidents > 0 ? Math.round((resolvedIncidents / totalIncidents) * 100 * 10) / 10 : 0,
      bySeverity,
      byStatus,
      last7Days,
      topReporters,
    };

    await redis.setex('dashboard:stats', 300, JSON.stringify(stats));

    res.status(200).json({ status: 'success', data: stats });
  } catch (err) {
    next(err);
  }
};

module.exports = { getDashboardStats };

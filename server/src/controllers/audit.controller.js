'use strict';

const AuditLog = require('../models/AuditLog.model');

const getAuditLogs = async (req, res, next) => {
  try {
    const { userId, action, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (userId) filter.userId = userId;
    if (action) filter.action = action;

    const skip = (Number(page) - 1) * Number(limit);

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('userId', 'name email')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(Number(limit)),
      AuditLog.countDocuments(filter),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        logs,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAuditLogs };

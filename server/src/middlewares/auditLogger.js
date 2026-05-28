'use strict';

const AuditLog = require('../models/AuditLog.model');
const logger = require('../config/logger');

const auditLog = async ({ userId, userName, action, resource, ip, userAgent, metadata }) => {
  try {
    await AuditLog.create({ userId, userName, action, resource, ip, userAgent, metadata });
  } catch (err) {
    logger.error({ err }, 'AuditLog write failed');
  }
};

const auditMiddleware = (req, res, next) => {
  res.on('finish', () => {
    if (!req.user) return;
    if (!['POST', 'PATCH', 'DELETE'].includes(req.method)) return;
    auditLog({
      userId: req.user.userId,
      userName: req.user.name,
      action: `${req.method}_${req.route?.path || req.path}`,
      resource: req.originalUrl,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  });
  next();
};

module.exports = { auditLog, auditMiddleware };

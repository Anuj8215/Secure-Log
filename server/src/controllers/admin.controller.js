'use strict';

const redis = require('../config/redis');
const { auditLog } = require('../middlewares/auditLogger');

const blockIp = async (req, res, next) => {
  try {
    const { ip, duration = 3600, reason = 'Manually blocked' } = req.body;
    if (!ip) {
      return res.status(400).json({ status: 'error', message: 'IP address is required' });
    }

    await redis.set(`blocked:${ip}`, reason, 'EX', duration);

    await auditLog({
      userId: req.user.userId,
      userName: req.user.name,
      action: 'BLOCK_IP',
      resource: ip,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { reason, duration },
    });

    res.status(200).json({
      status: 'success',
      message: `IP ${ip} blocked for ${duration} seconds`,
    });
  } catch (err) {
    next(err);
  }
};

const unblockIp = async (req, res, next) => {
  try {
    const { ip } = req.params;
    await redis.del(`blocked:${ip}`);

    await auditLog({
      userId: req.user.userId,
      userName: req.user.name,
      action: 'UNBLOCK_IP',
      resource: ip,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(200).json({ status: 'success', message: `IP ${ip} unblocked` });
  } catch (err) {
    next(err);
  }
};

const getBlockedIps = async (req, res, next) => {
  try {
    const keys = await redis.keys('blocked:*');

    const ips = await Promise.all(
      keys.map(async (key) => {
        const [reason, ttl] = await Promise.all([redis.get(key), redis.ttl(key)]);
        return {
          ip: key.replace('blocked:', ''),
          reason,
          ttlSeconds: ttl,
        };
      })
    );

    res.status(200).json({ status: 'success', data: { ips } });
  } catch (err) {
    next(err);
  }
};

const getSystemStats = async (req, res, next) => {
  try {
    const mem = process.memoryUsage();
    res.status(200).json({
      status: 'success',
      data: {
        uptime: process.uptime(),
        memory: {
          used: Math.round(mem.heapUsed / 1024 / 1024),
          total: Math.round(mem.heapTotal / 1024 / 1024),
          external: Math.round(mem.external / 1024 / 1024),
        },
        node: process.version,
        platform: process.platform,
        pid: process.pid,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { blockIp, unblockIp, getBlockedIps, getSystemStats };

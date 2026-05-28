'use strict';

const redis = require('../config/redis');

const ipBlocklist = async (req, res, next) => {
  try {
    const blocked = await redis.get(`blocked:${req.ip}`);
    if (blocked) {
      return res.status(403).json({ status: 'error', message: 'IP temporarily blocked' });
    }
    next();
  } catch {
    next();
  }
};

module.exports = ipBlocklist;

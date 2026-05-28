'use strict';

const redis = require('../config/redis');

const idempotency = async (req, res, next) => {
  const key = req.headers['idempotency-key'];
  if (!key) return next();

  try {
    const cached = await redis.get(`idem:${key}`);
    if (cached) {
      return res.status(200).json({
        ...JSON.parse(cached),
        idempotent: true,
      });
    }

    const originalJson = res.json.bind(res);
    res.json = async (data) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        await redis.setex(`idem:${key}`, 86400, JSON.stringify(data));
      }
      return originalJson(data);
    };

    next();
  } catch {
    next();
  }
};

module.exports = idempotency;

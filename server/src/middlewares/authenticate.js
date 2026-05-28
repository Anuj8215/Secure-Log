'use strict';

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const redis = require('../config/redis');
const ApiKey = require('../models/ApiKey.model');

const authenticate = async (req, res, next) => {
  try {
    const apiKeyHeader = req.headers['x-api-key'];
    if (apiKeyHeader) {
      const keyHash = crypto.createHash('sha256').update(apiKeyHeader).digest('hex');
      const apiKey = await ApiKey.findOne({ keyHash, isActive: true }).populate('userId');
      if (!apiKey) {
        return res.status(401).json({ status: 'error', message: 'Invalid API key' });
      }
      if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
        return res.status(401).json({ status: 'error', message: 'API key expired' });
      }
      ApiKey.findByIdAndUpdate(apiKey._id, { lastUsedAt: new Date() })
        .exec()
        .catch(() => {});
      req.user = {
        userId: apiKey.userId._id,
        role: apiKey.userId.role,
        name: apiKey.userId.name,
        authMethod: 'api_key',
        scopes: apiKey.scopes,
      };
      return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ status: 'error', message: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const blacklisted = await redis.get(`blacklist:${token}`);
    if (blacklisted) {
      return res.status(401).json({ status: 'error', message: 'Token revoked' });
    }
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ status: 'error', message: 'Invalid or expired token' });
  }
};

module.exports = authenticate;

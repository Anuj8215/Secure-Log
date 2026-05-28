'use strict';

const crypto = require('crypto');
const ApiKey = require('../models/ApiKey.model');
const { auditLog } = require('../middlewares/auditLogger');

const VALID_SCOPES = ['read', 'write', 'admin'];

const generateApiKey = async (req, res, next) => {
  try {
    const { name, scopes } = req.body;

    if (!name) {
      return res.status(400).json({ status: 'error', message: 'Name is required' });
    }
    if (!Array.isArray(scopes) || scopes.length === 0) {
      return res.status(400).json({ status: 'error', message: 'Scopes array is required' });
    }
    const invalid = scopes.filter((s) => !VALID_SCOPES.includes(s));
    if (invalid.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid scopes: ${invalid.join(', ')}. Must be subset of: ${VALID_SCOPES.join(', ')}`,
      });
    }

    const rawKey = `sl_live_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

    const apiKey = await ApiKey.create({
      name,
      keyHash,
      userId: req.user.userId,
      scopes,
      expiresAt,
    });

    await auditLog({
      userId: req.user.userId,
      userName: req.user.name,
      action: 'GENERATE_API_KEY',
      resource: `apikeys/${apiKey._id}`,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { name, scopes },
    });

    res.status(201).json({
      status: 'success',
      data: {
        apiKey: {
          id: apiKey._id,
          name: apiKey.name,
          key: rawKey,
          scopes: apiKey.scopes,
          expiresAt: apiKey.expiresAt,
        },
        message: 'Store this key securely. It will not be shown again.',
      },
    });
  } catch (err) {
    next(err);
  }
};

const getMyApiKeys = async (req, res, next) => {
  try {
    const keys = await ApiKey.find({ userId: req.user.userId }).select('-keyHash');
    res.status(200).json({ status: 'success', data: { keys } });
  } catch (err) {
    next(err);
  }
};

const revokeApiKey = async (req, res, next) => {
  try {
    const apiKey = await ApiKey.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!apiKey) {
      return res.status(404).json({ status: 'error', message: 'API key not found' });
    }

    apiKey.isActive = false;
    await apiKey.save();

    await auditLog({
      userId: req.user.userId,
      userName: req.user.name,
      action: 'REVOKE_API_KEY',
      resource: `apikeys/${req.params.id}`,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { name: apiKey.name },
    });

    res.status(200).json({ status: 'success', message: 'API key revoked' });
  } catch (err) {
    next(err);
  }
};

const getApiKeyUsage = async (req, res, next) => {
  try {
    const apiKey = await ApiKey.findOne({ _id: req.params.id, userId: req.user.userId }).select('-keyHash');
    if (!apiKey) {
      return res.status(404).json({ status: 'error', message: 'API key not found' });
    }

    res.status(200).json({
      status: 'success',
      data: {
        id: apiKey._id,
        name: apiKey.name,
        scopes: apiKey.scopes,
        isActive: apiKey.isActive,
        lastUsedAt: apiKey.lastUsedAt,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { generateApiKey, getMyApiKeys, revokeApiKey, getApiKeyUsage };

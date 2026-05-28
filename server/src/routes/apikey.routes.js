'use strict';

const express = require('express');
const authenticate = require('../middlewares/authenticate');
const { generateApiKey, getMyApiKeys, revokeApiKey, getApiKeyUsage } = require('../controllers/apikey.controller');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: API Keys
 *   description: API key management
 */

/**
 * @swagger
 * /api/v1/keys/generate:
 *   post:
 *     summary: Generate a new API key
 *     tags: [API Keys]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, scopes]
 *             properties:
 *               name:
 *                 type: string
 *                 description: Descriptive label for this key
 *               scopes:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [read, write, admin]
 *     responses:
 *       201:
 *         description: API key created — raw key shown once
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     apiKey:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         key:
 *                           type: string
 *                           description: Raw key — store securely, not shown again
 *                         scopes:
 *                           type: array
 *                           items:
 *                             type: string
 *                         expiresAt:
 *                           type: string
 *                           format: date-time
 *                     message:
 *                       type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/generate', authenticate, generateApiKey);

/**
 * @swagger
 * /api/v1/keys:
 *   get:
 *     summary: List all API keys for the authenticated user
 *     tags: [API Keys]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     responses:
 *       200:
 *         description: List of API keys (keyHash excluded)
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticate, getMyApiKeys);

/**
 * @swagger
 * /api/v1/keys/{id}:
 *   delete:
 *     summary: Revoke an API key
 *     tags: [API Keys]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Key revoked
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Key not found
 */
router.delete('/:id', authenticate, revokeApiKey);

/**
 * @swagger
 * /api/v1/keys/{id}/usage:
 *   get:
 *     summary: Get usage stats for an API key
 *     tags: [API Keys]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: API key usage info
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Key not found
 */
router.get('/:id/usage', authenticate, getApiKeyUsage);

module.exports = router;

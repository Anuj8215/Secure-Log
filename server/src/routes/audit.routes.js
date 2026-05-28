'use strict';

const express = require('express');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');
const { getAuditLogs } = require('../controllers/audit.controller');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Audit
 *   description: Audit log access (admin only)
 */

/**
 * @swagger
 * /api/v1/audit:
 *   get:
 *     summary: Retrieve paginated audit logs (admin only)
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by user ID
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Filter by action string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Paginated audit logs
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — admin role required
 */
router.get('/', authenticate, authorize('admin'), getAuditLogs);

module.exports = router;

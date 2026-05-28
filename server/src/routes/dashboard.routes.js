'use strict';

const express = require('express');
const authenticate = require('../middlewares/authenticate');
const { getDashboardStats } = require('../controllers/dashboard.controller');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Aggregated incident statistics
 */

/**
 * @swagger
 * /api/v1/dashboard/stats:
 *   get:
 *     summary: Get aggregated dashboard statistics (cached 5 min)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard stats
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
 *                     totalIncidents:
 *                       type: integer
 *                     openIncidents:
 *                       type: integer
 *                     resolvedIncidents:
 *                       type: integer
 *                     criticalOpen:
 *                       type: integer
 *                     resolutionRate:
 *                       type: number
 *                     bySeverity:
 *                       type: object
 *                     byStatus:
 *                       type: object
 *                     last7Days:
 *                       type: array
 *                     topReporters:
 *                       type: array
 *                     fromCache:
 *                       type: boolean
 *       401:
 *         description: Unauthorized
 */
router.get('/stats', authenticate, getDashboardStats);

module.exports = router;

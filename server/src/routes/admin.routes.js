'use strict';

const express = require('express');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');
const { blockIp, unblockIp, getBlockedIps, getSystemStats } = require('../controllers/admin.controller');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin-only system management
 */

/**
 * @swagger
 * /api/v1/admin/block-ip:
 *   post:
 *     summary: Block an IP address
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ip]
 *             properties:
 *               ip:
 *                 type: string
 *                 description: IP address to block
 *               duration:
 *                 type: integer
 *                 default: 3600
 *                 description: Block duration in seconds
 *               reason:
 *                 type: string
 *                 description: Reason for blocking
 *     responses:
 *       200:
 *         description: IP blocked
 *       400:
 *         description: IP is required
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin only
 */
router.post('/block-ip', authenticate, authorize('admin'), blockIp);

/**
 * @swagger
 * /api/v1/admin/block-ip/{ip}:
 *   delete:
 *     summary: Unblock an IP address
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ip
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: IP unblocked
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin only
 */
router.delete('/block-ip/:ip', authenticate, authorize('admin'), unblockIp);

/**
 * @swagger
 * /api/v1/admin/blocked-ips:
 *   get:
 *     summary: List all currently blocked IPs
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Blocked IP list with reason and TTL
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
 *                     ips:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           ip:
 *                             type: string
 *                           reason:
 *                             type: string
 *                           ttlSeconds:
 *                             type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin only
 */
router.get('/blocked-ips', authenticate, authorize('admin'), getBlockedIps);

/**
 * @swagger
 * /api/v1/admin/system-stats:
 *   get:
 *     summary: Get system runtime statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System stats
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
 *                     uptime:
 *                       type: number
 *                     memory:
 *                       type: object
 *                     node:
 *                       type: string
 *                     platform:
 *                       type: string
 *                     pid:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin only
 */
router.get('/system-stats', authenticate, authorize('admin'), getSystemStats);

module.exports = router;

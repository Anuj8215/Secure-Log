'use strict';

const express = require('express');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');
const validate = require('../middlewares/validate');
const { validateCreateIncident, validateUpdateStatus } = require('../validators/incident.validators');
const {
  getAllIncidents,
  getIncidentById,
  createIncident,
  updateIncidentStatus,
  deleteIncident,
} = require('../controllers/incident.controller');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Incidents
 *   description: Security incident management
 */

/**
 * @swagger
 * /api/v1/incidents:
 *   get:
 *     summary: List all incidents with optional filters and pagination
 *     tags: [Incidents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [low, medium, high, critical]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [open, investigating, resolved, closed]
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [manual, brute_force, suspicious_login, ddos, other]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Case-insensitive search on title
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Paginated list of incidents
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticate, getAllIncidents);

/**
 * @swagger
 * /api/v1/incidents/{id}:
 *   get:
 *     summary: Get a single incident by ID
 *     tags: [Incidents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Incident found
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Incident not found
 */
router.get('/:id', authenticate, getIncidentById);

/**
 * @swagger
 * /api/v1/incidents:
 *   post:
 *     summary: Create a new incident
 *     tags: [Incidents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, severity]
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 200
 *               description:
 *                 type: string
 *                 maxLength: 2000
 *               severity:
 *                 type: string
 *                 enum: [low, medium, high, critical]
 *               type:
 *                 type: string
 *                 enum: [manual, brute_force, suspicious_login, ddos, other]
 *               affectedSystem:
 *                 type: string
 *                 maxLength: 200
 *     responses:
 *       201:
 *         description: Incident created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — admin or analyst role required
 */
router.post('/', authenticate, authorize('admin', 'analyst'), validateCreateIncident, validate, createIncident);

/**
 * @swagger
 * /api/v1/incidents/{id}/status:
 *   patch:
 *     summary: Update the status of an incident
 *     tags: [Incidents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [open, investigating, resolved, closed]
 *     responses:
 *       200:
 *         description: Status updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — admin or analyst role required
 *       404:
 *         description: Incident not found
 */
router.patch('/:id/status', authenticate, authorize('admin', 'analyst'), validateUpdateStatus, validate, updateIncidentStatus);

/**
 * @swagger
 * /api/v1/incidents/{id}:
 *   delete:
 *     summary: Delete an incident (admin only)
 *     tags: [Incidents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Incident deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — admin role required
 *       404:
 *         description: Incident not found
 */
router.delete('/:id', authenticate, authorize('admin'), deleteIncident);

module.exports = router;

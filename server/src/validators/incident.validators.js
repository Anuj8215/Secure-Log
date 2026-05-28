'use strict';

const { body } = require('express-validator');

const validateCreateIncident = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ min: 3, max: 200 }),
  body('description').optional().trim().isLength({ max: 2000 }),
  body('severity').notEmpty().withMessage('Severity is required').isIn(['low', 'medium', 'high', 'critical']),
  body('type').optional().isIn(['manual', 'brute_force', 'suspicious_login', 'ddos', 'other']),
  body('affectedSystem').optional().trim().isLength({ max: 200 }),
];

const validateUpdateStatus = [
  body('status').notEmpty().withMessage('Status is required').isIn(['open', 'investigating', 'resolved', 'closed']),
];

module.exports = { validateCreateIncident, validateUpdateStatus };

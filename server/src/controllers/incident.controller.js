'use strict';

const Incident = require('../models/Incident.model');
const redis = require('../config/redis');
const { auditLog } = require('../middlewares/auditLogger');

const getAllIncidents = async (req, res, next) => {
  try {
    const { severity, status, type, search, page = 1, limit = 10 } = req.query;
    const filter = {};

    if (severity) filter.severity = severity;
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (search) filter.title = { $regex: search, $options: 'i' };

    const skip = (Number(page) - 1) * Number(limit);

    const [incidents, total] = await Promise.all([
      Incident.find(filter)
        .populate('reportedBy', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Incident.countDocuments(filter),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        incidents,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

const getIncidentById = async (req, res, next) => {
  try {
    const incident = await Incident.findById(req.params.id).populate('reportedBy', 'name email role');
    if (!incident) {
      return res.status(404).json({ status: 'error', message: 'Incident not found' });
    }
    res.status(200).json({ status: 'success', data: { incident } });
  } catch (err) {
    next(err);
  }
};

const createIncident = async (req, res, next) => {
  try {
    const { title, description, severity, type, affectedSystem } = req.body;

    const incident = await Incident.create({
      title,
      description,
      severity,
      type: type || 'manual',
      affectedSystem,
      reportedBy: req.user.userId,
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('incident:new', incident);
      if (severity === 'critical') {
        io.to('admin').emit('incident:critical', incident);
      }
    }

    if (incident.severity === 'critical') {
      const { emailQueue } = require('../queues/index');
      const User = require('../models/User.model');
      const admins = await User.find({ role: 'admin', isActive: true }).select('email');
      if (admins.length > 0) {
        await emailQueue.add('critical-incident', {
          type: 'critical_incident',
          data: {
            id: incident._id,
            title: incident.title,
            severity: incident.severity,
            description: incident.description,
            adminEmails: admins.map((a) => a.email),
          },
        });
      }
    }

    await auditLog({
      userId: req.user.userId,
      userName: req.user.name,
      action: 'CREATE_INCIDENT',
      resource: `incidents/${incident._id}`,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { title: incident.title, severity: incident.severity },
    });

    res.status(201).json({ status: 'success', data: { incident } });
  } catch (err) {
    next(err);
  }
};

const updateIncidentStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const incident = await Incident.findById(req.params.id);
    if (!incident) {
      return res.status(404).json({ status: 'error', message: 'Incident not found' });
    }

    const oldStatus = incident.status;
    incident.status = status;

    if (status === 'resolved' || status === 'closed') {
      incident.resolvedAt = new Date();
    } else {
      incident.resolvedAt = null;
    }

    await incident.save();

    const io = req.app.get('io');
    if (io) io.emit('incident:updated', { id: incident._id, status: incident.status });

    await auditLog({
      userId: req.user.userId,
      userName: req.user.name,
      action: 'UPDATE_INCIDENT_STATUS',
      resource: `incidents/${incident._id}`,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { oldStatus, newStatus: status },
    });

    res.status(200).json({ status: 'success', data: { incident } });
  } catch (err) {
    next(err);
  }
};

const deleteIncident = async (req, res, next) => {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) {
      return res.status(404).json({ status: 'error', message: 'Incident not found' });
    }

    await auditLog({
      userId: req.user.userId,
      userName: req.user.name,
      action: 'DELETE_INCIDENT',
      resource: `incidents/${incident._id}`,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { title: incident.title, severity: incident.severity },
    });

    await incident.deleteOne();
    await redis.del('dashboard:stats');

    const io = req.app.get('io');
    if (io) io.emit('incident:deleted', { id: req.params.id });

    res.status(200).json({ status: 'success', message: 'Incident deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllIncidents, getIncidentById, createIncident, updateIncidentStatus, deleteIncident };

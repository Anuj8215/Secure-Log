'use strict';

const { Worker } = require('bullmq');
const nodemailer = require('nodemailer');
const logger = require('../config/logger');

const connection = {
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  tls: process.env.REDIS_HOST?.includes('upstash') ? {} : undefined,
};

const createTransporter = () =>
  nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

const processJob = async (job) => {
  const { type, data } = job.data;
  const transporter = createTransporter();

  if (type === 'critical_incident') {
    await transporter.sendMail({
      from: `"SecureLog Alerts" <${process.env.EMAIL_USER}>`,
      to: data.adminEmails.join(','),
      subject: `[CRITICAL] New incident: ${data.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <h2 style="color: #dc2626;">🚨 Critical Security Incident</h2>
          <p><strong>Title:</strong> ${data.title}</p>
          <p><strong>Severity:</strong> ${data.severity}</p>
          <p><strong>Description:</strong> ${data.description || 'No description provided'}</p>
          <p><strong>Reported at:</strong> ${new Date().toISOString()}</p>
          <a href="${process.env.FRONTEND_URL}/incidents/${data.id}"
             style="background:#dc2626;color:white;padding:10px 20px;
                    text-decoration:none;border-radius:4px;">
            View Incident
          </a>
        </div>
      `,
    });
    logger.info({ incidentId: data.id }, 'Critical incident email sent');
  }

  if (type === 'new_ip_login') {
    await transporter.sendMail({
      from: `"SecureLog Security" <${process.env.EMAIL_USER}>`,
      to: data.email,
      subject: `Security Alert: New login location detected`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <h2 style="color: #f59e0b;">⚠️ New Login Location Detected</h2>
          <p>Hello ${data.name},</p>
          <p>A login was detected from a new IP address on your account.</p>
          <p><strong>IP Address:</strong> ${data.ip}</p>
          <p><strong>Time:</strong> ${new Date(data.time).toISOString()}</p>
          <p>If this was you, no action is needed.
             If not, please change your password immediately.</p>
        </div>
      `,
    });
    logger.info({ email: data.email }, 'New IP login alert email sent');
  }

  if (type === 'daily_digest') {
    await transporter.sendMail({
      from: `"SecureLog" <${process.env.EMAIL_USER}>`,
      to: data.adminEmails.join(','),
      subject: `SecureLog Daily Digest — ${new Date().toLocaleDateString()}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <h2>📊 Daily Security Digest</h2>
          <p><strong>Open incidents:</strong> ${data.openCount}</p>
          <p><strong>Critical open:</strong> ${data.criticalOpen}</p>
          <p><strong>Resolved today:</strong> ${data.resolvedToday}</p>
          <a href="${process.env.FRONTEND_URL}/dashboard"
             style="background:#7c3aed;color:white;padding:10px 20px;
                    text-decoration:none;border-radius:4px;">
            View Dashboard
          </a>
        </div>
      `,
    });
    logger.info('Daily digest email sent');
  }
};

const emailWorker = new Worker('emails', processJob, {
  connection,
  concurrency: 3,
});

emailWorker.on('completed', (job) => {
  logger.info({ jobId: job.id, type: job.data.type }, 'Email job completed');
});

emailWorker.on('failed', (job, err) => {
  logger.error({ jobId: job.id, err }, 'Email job failed');
});

module.exports = emailWorker;

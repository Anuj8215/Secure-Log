//!SECTION : AUDIT LOG MODEL
const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userName: { type: String },
  action: { type: String, required: true },
  resource: { type: String },
  ip: { type: String },
  userAgent: { type: String },
  metadata: { type: Object },
  timestamp: { type: Date, default: Date.now },
});

auditLogSchema.index({ userId: 1, timestamp: 1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ ip: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);

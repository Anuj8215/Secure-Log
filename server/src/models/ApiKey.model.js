//!SECTION : API KEY MODEL
const mongoose = require('mongoose');

const apiKeySchema = new mongoose.Schema({
  name: { type: String, required: true },
  keyHash: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  scopes: [{ type: String, enum: ['read', 'write', 'admin'] }],
  lastUsedAt: { type: Date },
  expiresAt: { type: Date },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

apiKeySchema.index({ keyHash: 1 });

module.exports = mongoose.model('ApiKey', apiKeySchema);

//!SECTION : LOGIN HISTORY MODEL
const mongoose = require('mongoose');

const loginHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  ip: { type: String },
  userAgent: { type: String },
  success: { type: Boolean },
  createdAt: { type: Date, default: Date.now },
});

loginHistorySchema.index({ userId: 1, createdAt: 1 });
loginHistorySchema.index({ ip: 1 });
loginHistorySchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

module.exports = mongoose.model('LoginHistory', loginHistorySchema);

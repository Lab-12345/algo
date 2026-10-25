import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true // 'KILL_SWITCH_TRIGGERED', 'MODE_SWITCHED', 'STRATEGY_ENABLED', 'ORDER_SUBMITTED', 'RECONCILIATION_FAILED'
  },
  actor: {
    type: String,
    default: 'SYSTEM' // 'OPERATOR', 'WORKER', 'API'
  },
  ipAddress: {
    type: String
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  severity: {
    type: String,
    enum: ['INFO', 'WARN', 'ERROR', 'CRITICAL'],
    default: 'INFO'
  }
}, {
  timestamps: true
});

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);

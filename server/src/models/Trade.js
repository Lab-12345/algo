import mongoose from 'mongoose';

const tradeSchema = new mongoose.Schema({
  strategyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Strategy',
    required: true
  },
  positionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Position'
  },
  tradingMode: {
    type: String,
    enum: ['PAPER', 'LIVE'],
    default: 'PAPER'
  },
  symbol: {
    type: String,
    required: true
  },
  side: {
    type: String,
    enum: ['LONG', 'SHORT'],
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  entryPrice: {
    type: Number,
    required: true
  },
  exitPrice: {
    type: Number,
    required: true
  },
  grossPnl: {
    type: Number,
    required: true
  },
  estimatedCharges: {
    type: Number,
    default: 0 // STT, exchange txn charge, GST, stamp duty
  },
  netPnl: {
    type: Number,
    required: true
  },
  exitReason: {
    type: String, // 'TARGET_HIT', 'STOPLOSS_HIT', 'SIGNAL_REVERSAL', 'MANUAL_EXIT', 'KILL_SWITCH'
    required: true
  },
  entryTime: {
    type: Date,
    required: true
  },
  exitTime: {
    type: Date,
    required: true
  },
  durationMinutes: {
    type: Number
  }
}, {
  timestamps: true
});

export const Trade = mongoose.model('Trade', tradeSchema);

import mongoose from 'mongoose';

const signalSchema = new mongoose.Schema({
  strategyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Strategy',
    required: true,
    index: true
  },
  strategyVersion: {
    type: Number,
    required: true
  },
  symbol: {
    type: String,
    required: true
  },
  action: {
    type: String,
    enum: ['BUY_CALL', 'BUY_PUT', 'EXIT_LONG', 'EXIT_SHORT'],
    required: true
  },
  candleTimestamp: {
    type: Date,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  stopLossPrice: {
    type: Number
  },
  targetPrice: {
    type: Number
  },
  quantity: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    required: true // e.g., "5m candle closed above VWAP with 15m bullish trend confirmation"
  },
  status: {
    type: String,
    enum: ['GENERATED', 'APPROVED_BY_RISK', 'REJECTED_BY_RISK', 'EXECUTED'],
    default: 'GENERATED'
  },
  riskRejectionReason: {
    type: String
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  }
}, {
  timestamps: true
});

signalSchema.index({ strategyId: 1, candleTimestamp: 1, action: 1 }, { unique: true });

export const Signal = mongoose.model('Signal', signalSchema);

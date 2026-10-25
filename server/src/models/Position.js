import mongoose from 'mongoose';

const positionSchema = new mongoose.Schema({
  strategyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Strategy',
    required: false
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
  instrumentToken: {
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
  currentPrice: {
    type: Number,
    default: 0
  },
  unrealizedPnl: {
    type: Number,
    default: 0
  },
  realizedPnl: {
    type: Number,
    default: 0
  },
  stopLossPrice: {
    type: Number
  },
  targetPrice: {
    type: Number
  },
  status: {
    type: String,
    enum: ['OPEN', 'CLOSED'],
    default: 'OPEN'
  },
  openOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  closeOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  openedAt: {
    type: Date,
    default: Date.now
  },
  closedAt: {
    type: Date
  },
  lastReconciledAt: {
    type: Date
  }
}, {
  timestamps: true
});

export const Position = mongoose.model('Position', positionSchema);

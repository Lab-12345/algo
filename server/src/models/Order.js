import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  clientOrderId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  brokerOrderId: {
    type: String, // Angel One returned orderid
    sparse: true,
    index: true
  },
  strategyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Strategy',
    required: false
  },
  signalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Signal'
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
  exchange: {
    type: String,
    default: 'NFO' // NSE, NFO, BSE, MCX
  },
  transactionType: {
    type: String,
    enum: ['BUY', 'SELL'],
    required: true
  },
  orderType: {
    type: String,
    enum: ['LIMIT', 'STOPLOSS_LIMIT'], // Market/IOC prohibited
    required: true
  },
  productType: {
    type: String,
    enum: ['INTRADAY', 'CARRYFORWARD', 'DELIVERY'],
    default: 'INTRADAY'
  },
  price: {
    type: Number,
    required: true
  },
  triggerPrice: {
    type: Number,
    default: 0
  },
  quantity: {
    type: Number,
    required: true
  },
  filledQuantity: {
    type: Number,
    default: 0
  },
  averagePrice: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: [
      'SIGNAL',
      'PENDING_SUBMISSION',
      'ACKNOWLEDGED',
      'PARTIALLY_FILLED',
      'FULLY_FILLED',
      'REJECTED',
      'CANCELLED',
      'CLOSED'
    ],
    default: 'PENDING_SUBMISSION'
  },
  rejectReason: {
    type: String
  },
  egressIpUsed: {
    type: String
  },
  submittedAt: {
    type: Date
  },
  filledAt: {
    type: Date
  }
}, {
  timestamps: true
});

export const Order = mongoose.model('Order', orderSchema);

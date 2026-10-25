import mongoose from 'mongoose';

const strategySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  version: {
    type: Number,
    default: 1
  },
  symbol: {
    type: String,
    required: true,
    uppercase: true // e.g. "NIFTY", "BANKNIFTY", "RELIANCE"
  },
  instrumentToken: {
    type: String, // Angel One token identifier (e.g., "99926000")
    required: true
  },
  timeframe: {
    primary: { type: String, default: '5m' },
    trendFilter: { type: String, default: '15m' }
  },
  tradingMode: {
    type: String,
    enum: ['PAPER', 'LIVE'],
    default: 'PAPER'
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'PAUSED', 'STOPPED'],
    default: 'PAUSED'
  },
  parameters: {
    vwapEnabled: { type: Boolean, default: true },
    trendEmaPeriod: { type: Number, default: 20 },
    atrPeriod: { type: Number, default: 14 },
    stopLossPoints: { type: Number, default: 30 },
    targetPoints: { type: Number, default: 60 },
    lotSize: { type: Number, default: 25 },
    maxLots: { type: Number, default: 1 }
  },
  riskLimits: {
    maxLossPerDay: { type: Number, default: 1500 },
    maxTradesPerDay: { type: Number, default: 5 }
  },
  enabledAt: {
    type: Date
  },
  lastSignalAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Increment version number whenever strategy parameters or timeframe change
strategySchema.pre('save', function (next) {
  if (this.isModified('parameters') || this.isModified('timeframe')) {
    this.version += 1;
  }
  next();
});

export const Strategy = mongoose.model('Strategy', strategySchema);

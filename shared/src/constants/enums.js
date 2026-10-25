/**
 * TradePilot Shared Enums & Constants
 * Standardized across Web UI, Express REST API, and Trading Worker Daemon.
 */

// Execution Mode (Default is ALWAYS Paper)
export const TradingMode = Object.freeze({
  PAPER: 'PAPER',
  LIVE: 'LIVE'
});

// Order Lifecycle State Machine (Section 7.2 of TradePilot specification)
export const OrderState = Object.freeze({
  SIGNAL: 'SIGNAL',
  PENDING_SUBMISSION: 'PENDING_SUBMISSION',
  ACKNOWLEDGED: 'ACKNOWLEDGED',
  PARTIALLY_FILLED: 'PARTIALLY_FILLED',
  FULLY_FILLED: 'FULLY_FILLED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
  CLOSED: 'CLOSED'
});

// Broker Compliant Order Types
// NOTE: Under Angel One 2026 Algorithmic Trading Rules, MARKET and IOC orders are strictly PROHIBITED.
export const OrderType = Object.freeze({
  LIMIT: 'LIMIT',
  STOPLOSS_LIMIT: 'STOPLOSS_LIMIT'
});

export const TransactionType = Object.freeze({
  BUY: 'BUY',
  SELL: 'SELL'
});

export const ProductType = Object.freeze({
  INTRADAY: 'INTRADAY',
  CARRYFORWARD: 'CARRYFORWARD',
  DELIVERY: 'DELIVERY'
});

export const StrategyStatus = Object.freeze({
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  STOPPED: 'STOPPED'
});

export const SignalAction = Object.freeze({
  BUY_CALL: 'BUY_CALL',
  BUY_PUT: 'BUY_PUT',
  EXIT_LONG: 'EXIT_LONG',
  EXIT_SHORT: 'EXIT_SHORT',
  NO_ACTION: 'NO_ACTION'
});

export const PositionStatus = Object.freeze({
  OPEN: 'OPEN',
  CLOSED: 'CLOSED'
});

export const SystemHealthStatus = Object.freeze({
  HEALTHY: 'HEALTHY',
  DEGRADED: 'DEGRADED',
  CRITICAL: 'CRITICAL',
  KILL_SWITCH_ACTIVE: 'KILL_SWITCH_ACTIVE'
});

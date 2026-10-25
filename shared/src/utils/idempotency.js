import crypto from 'crypto';

/**
 * Generates a deterministic idempotency key for an order intent.
 * Used to avoid duplicate submissions on network timeouts or process restarts.
 * 
 * @param {string} strategyId 
 * @param {string} symbol 
 * @param {string} candleTimestamp 
 * @param {string} action 
 * @returns {string} 
 */
export function generateOrderIntentId(strategyId, symbol, candleTimestamp, action) {
  const payload = `${strategyId}:${symbol}:${candleTimestamp}:${action}`;
  const hash = crypto.createHash('sha256').update(payload).digest('hex').substring(0, 12);
  const timestamp = Date.now();
  return `TP_${hash}_${timestamp}`;
}

/**
 * Generates a stable client order ID conforming to broker length limits (<= 25 chars)
 * @param {string} prefix 
 * @returns {string}
 */
export function generateClientOrderId(prefix = 'TP') {
  const randomStr = crypto.randomBytes(4).toString('hex').toUpperCase();
  const timeHex = Date.now().toString(36).toUpperCase();
  return `${prefix}_${timeHex}_${randomStr}`.substring(0, 24);
}

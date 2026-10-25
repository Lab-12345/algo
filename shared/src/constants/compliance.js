/**
 * Angel One SmartAPI 2026 Regulatory Compliance & Rate Limits
 * References: Angel One SmartAPI changes, Exchange Algo Regulations.
 */

export const SMARTAPI_COMPLIANCE = Object.freeze({
  // 2026 Rule: Market and IOC (Immediate-or-Cancel) orders are prohibited for algorithmic trading
  PROHIBITED_ALGO_ORDER_TYPES: ['MARKET', 'IOC'],
  
  // Permitted order varieties
  ALLOWED_VARIETIES: ['NORMAL', 'STOPLOSS'],

  // API rate limits (requests per second thresholds)
  RATE_LIMITS: {
    ORDER_REQUESTS_PER_SECOND: 5,     // Conservative order action limiter
    HISTORICAL_DATA_PER_MINUTE: 180,  // Historical candles
    QUOTE_REQUESTS_PER_SECOND: 10     // Live quote fetch
  },

  // Egress Static IP verification requirement
  STATIC_IP_REQUIRED_OPERATIONS: [
    'PLACE_ORDER',
    'MODIFY_ORDER',
    'CANCEL_ORDER',
    'GTT_CREATE',
    'GTT_MODIFY',
    'GTT_CANCEL'
  ],

  STATIC_IP_OPTIONAL_OPERATIONS: [
    'GET_PROFILE',
    'GET_LTP',
    'GET_CANDLES',
    'WEBSOCKET_MARKET_DATA'
  ]
});

/**
 * Validates that an order payload strictly conforms to 2026 Angel One Algo rules
 * @param {object} orderPayload
 * @returns {{isValid: boolean, error?: string}}
 */
export function validateOrderCompliance(orderPayload) {
  if (!orderPayload) {
    return { isValid: false, error: 'Empty order payload' };
  }

  const { orderType, variety } = orderPayload;

  if (SMARTAPI_COMPLIANCE.PROHIBITED_ALGO_ORDER_TYPES.includes(orderType?.toUpperCase())) {
    return {
      isValid: false,
      error: `Compliance Violation: Angel One 2026 rules prohibit ${orderType} orders for automated trading. Use LIMIT or STOPLOSS_LIMIT.`
    };
  }

  if (variety && !SMARTAPI_COMPLIANCE.ALLOWED_VARIETIES.includes(variety.toUpperCase())) {
    return {
      isValid: false,
      error: `Disallowed order variety: ${variety}. Only NORMAL and STOPLOSS are permitted.`
    };
  }

  return { isValid: true };
}

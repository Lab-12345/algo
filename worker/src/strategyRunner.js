import { SignalAction } from '@tradepilot/shared';

export class StrategyRunner {
  constructor(strategy) {
    this.strategy = strategy;
    this.lastEvaluatedCandleTime = 0;
  }

  /**
   * Evaluates the closed candle and returns a deterministic signal if conditions are met.
   * Section 7.1: 15-minute trend filter + confirmed 5-minute candle close + VWAP directional filter.
   */
  evaluate(closed5mCandle, candleBuilder) {
    if (!closed5mCandle) return null;

    // Idempotency check: don't re-evaluate the same 5-minute closed candle
    if (closed5mCandle.timestamp === this.lastEvaluatedCandleTime) {
      return null;
    }
    this.lastEvaluatedCandleTime = closed5mCandle.timestamp;

    const vwap = candleBuilder.currentVwap;
    const ema15m = candleBuilder.calculateEma('15m', this.strategy.parameters?.trendEmaPeriod || 20);

    const closePrice = closed5mCandle.close;
    const isBullishCandle = closePrice > closed5mCandle.open;
    const isBearishCandle = closePrice < closed5mCandle.open;

    // 15m Trend filter: if EMA is ready, use it; otherwise fallback to VWAP slope
    const is15mTrendBullish = ema15m !== null ? closePrice > ema15m : closePrice > vwap;
    const is15mTrendBearish = ema15m !== null ? closePrice < ema15m : closePrice < vwap;

    const stopLossOffset = this.strategy.parameters?.stopLossPoints || 30;
    const targetOffset = this.strategy.parameters?.targetPoints || 60;
    const lotSize = this.strategy.parameters?.lotSize || 25;
    const maxLots = this.strategy.parameters?.maxLots || 1;
    const quantity = lotSize * maxLots;

    // Bullish Setup: 5m candle closed above VWAP and 15m trend filter is bullish
    if (closePrice > vwap && isBullishCandle && is15mTrendBullish) {
      return {
        strategyId: this.strategy._id,
        strategyVersion: this.strategy.version,
        symbol: this.strategy.symbol,
        action: SignalAction.BUY_CALL,
        candleTimestamp: new Date(closed5mCandle.timestamp),
        price: closePrice,
        stopLossPrice: closePrice - stopLossOffset,
        targetPrice: closePrice + targetOffset,
        quantity,
        reason: `5m candle closed above VWAP (${vwap.toFixed(2)}) with 15m bullish trend confirmation.`
      };
    }

    // Bearish Setup: 5m candle closed below VWAP and 15m trend filter is bearish
    if (closePrice < vwap && isBearishCandle && is15mTrendBearish) {
      return {
        strategyId: this.strategy._id,
        strategyVersion: this.strategy.version,
        symbol: this.strategy.symbol,
        action: SignalAction.BUY_PUT,
        candleTimestamp: new Date(closed5mCandle.timestamp),
        price: closePrice,
        stopLossPrice: closePrice + stopLossOffset,
        targetPrice: closePrice - targetOffset,
        quantity,
        reason: `5m candle closed below VWAP (${vwap.toFixed(2)}) with 15m bearish trend confirmation.`
      };
    }

    return null;
  }
}

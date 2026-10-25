/**
 * Multi-Timeframe Candle Builder & VWAP Calculator
 * Aggregates incoming market ticks into deterministic closed candles (5m, 15m).
 */

export class CandleBuilder {
  constructor(symbol) {
    this.symbol = symbol;
    this.current5mCandle = null;
    this.current15mCandle = null;
    this.completed5mCandles = [];
    this.completed15mCandles = [];
    
    // Intraday VWAP state (Cumulative Typical Price * Volume / Cumulative Volume)
    this.cumulativeTypicalVolume = 0;
    this.cumulativeVolume = 0;
    this.currentVwap = 0;
    this.lastTickTimestamp = 0;
  }

  /**
   * Processes a live tick: { ltp, volume, timestamp }
   */
  processTick(tick) {
    const { ltp, volume = 1, timestamp = Date.now() } = tick;
    this.lastTickTimestamp = timestamp;

    // Update VWAP
    this.cumulativeTypicalVolume += ltp * volume;
    this.cumulativeVolume += volume;
    this.currentVwap = this.cumulativeVolume > 0
      ? this.cumulativeTypicalVolume / this.cumulativeVolume
      : ltp;

    // Aggregate 5-minute candle
    const closed5m = this._aggregateCandle(ltp, volume, timestamp, 5, '5m');
    if (closed5m) {
      this.completed5mCandles.push(closed5m);
      if (this.completed5mCandles.length > 200) this.completed5mCandles.shift();
    }

    // Aggregate 15-minute candle
    const closed15m = this._aggregateCandle(ltp, volume, timestamp, 15, '15m');
    if (closed15m) {
      this.completed15mCandles.push(closed15m);
      if (this.completed15mCandles.length > 200) this.completed15mCandles.shift();
    }

    return {
      newClosed5m: closed5m,
      newClosed15m: closed15m,
      currentVwap: this.currentVwap
    };
  }

  _aggregateCandle(price, volume, timestamp, minuteInterval, type) {
    const intervalMs = minuteInterval * 60 * 1000;
    const bucketTime = Math.floor(timestamp / intervalMs) * intervalMs;
    const currentProp = type === '5m' ? 'current5mCandle' : 'current15mCandle';

    let closed = null;

    if (!this[currentProp]) {
      this[currentProp] = {
        symbol: this.symbol,
        timeframe: type,
        timestamp: bucketTime,
        open: price,
        high: price,
        low: price,
        close: price,
        volume: volume
      };
    } else if (this[currentProp].timestamp === bucketTime) {
      // Update ongoing candle
      const c = this[currentProp];
      if (price > c.high) c.high = price;
      if (price < c.low) c.low = price;
      c.close = price;
      c.volume += volume;
    } else {
      // Time bucket rolled over: close current and start new
      closed = { ...this[currentProp] };
      this[currentProp] = {
        symbol: this.symbol,
        timeframe: type,
        timestamp: bucketTime,
        open: price,
        high: price,
        low: price,
        close: price,
        volume: volume
      };
    }

    return closed;
  }

  /**
   * Calculates Exponential Moving Average (EMA) of closed candles
   */
  calculateEma(timeframe = '15m', period = 20) {
    const candles = timeframe === '15m' ? this.completed15mCandles : this.completed5mCandles;
    if (candles.length < period) return null;

    const k = 2 / (period + 1);
    let ema = candles[0].close;

    for (let i = 1; i < candles.length; i++) {
      ema = (candles[i].close * k) + (ema * (1 - k));
    }

    return ema;
  }

  isDataFresh(maxAgeMs = 15000) {
    return Date.now() - this.lastTickTimestamp < maxAgeMs;
  }
}

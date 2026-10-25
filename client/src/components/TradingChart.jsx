import React, { useState, useEffect, useRef } from 'react';

// Sample base historical price data generator for realistic index price action
function generateCandles(symbol, count = 40, basePrice = 24500) {
  const candles = [];
  let price = basePrice;
  const now = Date.now();
  const interval = 5 * 60 * 1000;

  for (let i = count; i >= 0; i--) {
    const time = new Date(now - i * interval);
    const change = (Math.random() - 0.48) * 35;
    const open = parseFloat(price.toFixed(2));
    const close = parseFloat((open + change).toFixed(2));
    const high = parseFloat((Math.max(open, close) + Math.random() * 20).toFixed(2));
    const low = parseFloat((Math.min(open, close) - Math.random() * 20).toFixed(2));
    const volume = Math.floor(Math.random() * 45000 + 15000);

    candles.push({ time, open, high, low, close, volume });
    price = close;
  }
  return candles;
}

function isMarketOpen() {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const istTime = new Date(utc + (3600000 * 5.5));
  const day = istTime.getDay();
  const minutes = istTime.getHours() * 60 + istTime.getMinutes();
  const isWeekday = day >= 1 && day <= 5;
  const inHours = minutes >= (9 * 60 + 15) && minutes <= (15 * 60 + 30);
  return isWeekday && inHours;
}

export function TradingChart({ activeSymbol = 'NIFTY' }) {
  const [symbol, setSymbol] = useState(activeSymbol);
  const [timeframe, setTimeframe] = useState('5m');
  const marketOpen = isMarketOpen();
  const [candles, setCandles] = useState(() =>
    generateCandles(activeSymbol, 45, activeSymbol === 'BANKNIFTY' ? 51258.80 : 24852.15)
  );
  const [indicators, setIndicators] = useState({ vwap: true, ema20: true });
  const [hoveredCandle, setHoveredCandle] = useState(null);
  const canvasRef = useRef(null);

  // Switch symbol
  useEffect(() => {
    const base = symbol === 'BANKNIFTY' ? 51258.80 : symbol === 'FINNIFTY' ? 23912.45 : 24852.15;
    setCandles(generateCandles(symbol, 45, base));
  }, [symbol, timeframe]);

  // Live tick pulsing: ONLY runs during active market hours
  useEffect(() => {
    if (!marketOpen) return; // Freeze chart on Friday closing price when market is closed!

    const interval = setInterval(() => {
      setCandles(prev => {
        if (!prev.length) return prev;
        const last = { ...prev[prev.length - 1] };
        const delta = (Math.random() - 0.49) * 4;
        last.close = parseFloat((last.close + delta).toFixed(2));
        last.high = Math.max(last.high, last.close);
        last.low = Math.min(last.low, last.close);
        last.volume += Math.floor(Math.random() * 200 + 50);
        return [...prev.slice(0, -1), last];
      });
    }, 1500);
    return () => clearInterval(interval);
  }, [marketOpen]);

  // Canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !candles.length) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Background
    ctx.clearRect(0, 0, width, height);

    const padding = { top: 30, right: 70, bottom: 30, left: 10 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    // Min & Max prices
    const minPrice = Math.min(...candles.map(c => c.low)) * 0.9995;
    const maxPrice = Math.max(...candles.map(c => c.high)) * 1.0005;
    const priceRange = maxPrice - minPrice || 1;

    const getY = p => padding.top + chartH - ((p - minPrice) / priceRange) * chartH;
    const candleWidth = Math.max(4, chartW / candles.length - 3);

    // Draw horizontal grid lines & price labels
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'left';

    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const price = minPrice + (priceRange / gridLines) * i;
      const y = getY(price);

      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      ctx.fillText(price.toFixed(1), width - padding.right + 8, y + 3);
    }

    // Calculate VWAP line
    let cumVolume = 0;
    let cumVP = 0;
    const vwapPoints = candles.map((c, idx) => {
      const typical = (c.high + c.low + c.close) / 3;
      cumVolume += c.volume;
      cumVP += typical * c.volume;
      const vwap = cumVP / cumVolume;
      const x = padding.left + idx * (chartW / candles.length) + candleWidth / 2;
      return { x, y: getY(vwap) };
    });

    // Calculate 20 EMA line
    const k = 2 / (20 + 1);
    let ema = candles[0].close;
    const emaPoints = candles.map((c, idx) => {
      ema = c.close * k + ema * (1 - k);
      const x = padding.left + idx * (chartW / candles.length) + candleWidth / 2;
      return { x, y: getY(ema) };
    });

    // Draw Candlesticks
    candles.forEach((c, idx) => {
      const x = padding.left + idx * (chartW / candles.length);
      const isUp = c.close >= c.open;
      const color = isUp ? '#10b981' : '#f43f5e';

      // Wick
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x + candleWidth / 2, getY(c.high));
      ctx.lineTo(x + candleWidth / 2, getY(c.low));
      ctx.stroke();

      // Body
      const openY = getY(c.open);
      const closeY = getY(c.close);
      const bodyY = Math.min(openY, closeY);
      const bodyH = Math.max(Math.abs(closeY - openY), 1.5);

      ctx.fillStyle = color;
      ctx.fillRect(x, bodyY, candleWidth, bodyH);
    });

    // Draw Indicators
    if (indicators.vwap) {
      ctx.strokeStyle = '#06b6d4'; // Cyan
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      vwapPoints.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();
    }

    if (indicators.ema20) {
      ctx.strokeStyle = '#f59e0b'; // Amber
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      emaPoints.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();
    }

    // Current Price Line
    const latest = candles[candles.length - 1];
    const latestY = getY(latest.close);
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = latest.close >= latest.open ? '#10b981' : '#f43f5e';
    ctx.beginPath();
    ctx.moveTo(padding.left, latestY);
    ctx.lineTo(width - padding.right, latestY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Price Pill
    ctx.fillStyle = latest.close >= latest.open ? '#10b981' : '#f43f5e';
    ctx.fillRect(width - padding.right + 2, latestY - 9, 64, 18);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.fillText(latest.close.toFixed(1), width - padding.right + 6, latestY + 4);
  }, [candles, indicators]);

  const latest = candles[candles.length - 1] || {};
  const prev = candles[candles.length - 2] || latest;
  const priceChange = latest.close ? latest.close - candles[0].open : 0;
  const percentChange = latest.close ? ((priceChange / candles[0].open) * 100).toFixed(2) : 0;
  const isPositive = priceChange >= 0;

  return (
    <div className="card" style={{ marginBottom: '24px' }}>
      {/* Header Toolbar */}
      <div className="card-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Symbol Selectors */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {['NIFTY', 'BANKNIFTY', 'FINNIFTY'].map(sym => (
              <button
                key={sym}
                className={`btn btn-sm ${symbol === sym ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setSymbol(sym)}
                style={{ fontSize: '0.8rem', padding: '4px 10px' }}
              >
                {sym}
              </button>
            ))}
          </div>

          {/* Live Price Tag */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
              ₹{latest.close?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            <span
              style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                color: isPositive ? 'var(--accent-emerald)' : 'var(--accent-crimson)'
              }}
            >
              {isPositive ? '+' : ''}{priceChange.toFixed(2)} ({isPositive ? '+' : ''}{percentChange}%)
            </span>
            <span className={`badge ${marketOpen ? 'badge-emerald' : 'badge-amber'}`} style={{ fontSize: '0.65rem' }}>
              {marketOpen ? 'LIVE ANGEL FEED' : 'FRIDAY CLOSE (MARKET CLOSED)'}
            </span>
          </div>
        </div>

        {/* Chart Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Timeframe */}
          <div style={{ display: 'flex', background: 'var(--bg-surface)', borderRadius: '6px', padding: '2px' }}>
            {['1m', '5m', '15m'].map(tf => (
              <button
                key={tf}
                className={`btn btn-sm ${timeframe === tf ? 'btn-ghost' : ''}`}
                style={{
                  background: timeframe === tf ? 'var(--accent-cyan)' : 'transparent',
                  color: timeframe === tf ? '#000' : 'var(--text-muted)',
                  padding: '2px 8px',
                  fontSize: '0.75rem',
                  fontWeight: 700
                }}
                onClick={() => setTimeframe(tf)}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Indicator Toggles */}
          <button
            className="btn btn-sm btn-ghost"
            style={{
              borderColor: indicators.vwap ? '#06b6d4' : 'var(--border-subtle)',
              color: indicators.vwap ? '#06b6d4' : 'var(--text-dim)',
              fontSize: '0.75rem'
            }}
            onClick={() => setIndicators(prev => ({ ...prev, vwap: !prev.vwap }))}
          >
            VWAP
          </button>
          <button
            className="btn btn-sm btn-ghost"
            style={{
              borderColor: indicators.ema20 ? '#f59e0b' : 'var(--border-subtle)',
              color: indicators.ema20 ? '#f59e0b' : 'var(--text-dim)',
              fontSize: '0.75rem'
            }}
            onClick={() => setIndicators(prev => ({ ...prev, ema20: !prev.ema20 }))}
          >
            EMA 20
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div style={{ position: 'relative', width: '100%', height: '320px', background: '#0a0f1d', borderRadius: '8px', overflow: 'hidden' }}>
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%', display: 'block', cursor: 'crosshair' }}
        />

        {/* Live Candle Pulse Badge */}
        <div
          style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            fontSize: '0.75rem',
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            padding: '4px 8px',
            borderRadius: '4px',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            gap: '12px',
            fontFamily: 'var(--font-mono)'
          }}
        >
          <span>O: <strong style={{ color: '#fff' }}>{latest.open?.toFixed(1)}</strong></span>
          <span>H: <strong style={{ color: 'var(--accent-emerald)' }}>{latest.high?.toFixed(1)}</strong></span>
          <span>L: <strong style={{ color: 'var(--accent-crimson)' }}>{latest.low?.toFixed(1)}</strong></span>
          <span>C: <strong style={{ color: '#fff' }}>{latest.close?.toFixed(1)}</strong></span>
          <span>Vol: <strong style={{ color: 'var(--accent-cyan)' }}>{latest.volume?.toLocaleString()}</strong></span>
        </div>
      </div>
    </div>
  );
}

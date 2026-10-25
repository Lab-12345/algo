import React, { useState } from 'react';

function getMarketStatus() {
  const now = new Date();
  // Convert local client time to Indian Standard Time (UTC + 5:30)
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const istTime = new Date(utc + (3600000 * 5.5));

  const day = istTime.getDay(); // 0 = Sunday, 6 = Saturday
  const hour = istTime.getHours();
  const minute = istTime.getMinutes();
  const timeInMinutes = hour * 60 + minute;

  const isWeekend = day === 0 || day === 6;
  const isMarketHours = timeInMinutes >= (9 * 60 + 15) && timeInMinutes <= (15 * 60 + 30);

  if (isWeekend) {
    const dayName = day === 0 ? 'Sunday' : 'Saturday';
    return {
      isOpen: false,
      reason: `Market is Closed Today (${dayName}). NSE/NFO opens Monday at 9:15 AM IST.`,
      badge: 'MARKET CLOSED (WEEKEND)'
    };
  }

  if (!isMarketHours) {
    return {
      isOpen: false,
      reason: 'Market is Closed (Normal hours: 9:15 AM - 3:30 PM IST).',
      badge: 'AFTER HOURS'
    };
  }

  return {
    isOpen: true,
    reason: 'Market is Live (NSE/NFO)',
    badge: 'MARKET OPEN'
  };
}

export function ManualOrderTerminal({ onOrderPlaced }) {
  const [symbol, setSymbol] = useState('NIFTY');
  const [optionType, setOptionType] = useState('CE');
  const [strike, setStrike] = useState(24500);
  const [lots, setLots] = useState(1);
  const [price, setPrice] = useState(145.50);
  const [stopLoss, setStopLoss] = useState(25);
  const [target, setTarget] = useState(50);
  const [tradingMode, setTradingMode] = useState('PAPER');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const marketStatus = getMarketStatus();

  const lotSize = symbol === 'BANKNIFTY' ? 15 : symbol === 'FINNIFTY' ? 25 : 25;
  const totalQuantity = lots * lotSize;
  const estimatedMargin = (price * totalQuantity).toFixed(2);
  const riskReward = (target / stopLoss).toFixed(1);
  const fullSymbol = `${symbol}24OCT${strike}${optionType}`;

  const handleQuickStrike = (offset) => {
    const base = symbol === 'BANKNIFTY' ? 51200 : 24500;
    const step = symbol === 'BANKNIFTY' ? 100 : 50;
    setStrike(base + offset * step);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback(null);

    // If attempting LIVE order while market is closed
    if (tradingMode === 'LIVE' && !marketStatus.isOpen) {
      setFeedback({
        type: 'error',
        message: `⛔ Today is ${marketStatus.reason} Angel One does not accept live orders right now. Switch to PAPER SIMULATOR to place simulated trades now.`
      });
      return;
    }

    setIsSubmitting(true);

    const orderPayload = {
      symbol: fullSymbol,
      instrumentToken: symbol === 'BANKNIFTY' ? '99926009' : '99926000',
      side: 'BUY',
      orderType: 'LIMIT',
      price: parseFloat(price),
      quantity: totalQuantity,
      tradingMode,
      stopLossPrice: parseFloat((price - stopLoss).toFixed(2)),
      targetPrice: parseFloat((price + target).toFixed(2))
    };

    try {
      if (onOrderPlaced) {
        await onOrderPlaced(orderPayload);
      }
      setFeedback({
        type: 'success',
        message: `✅ ${tradingMode} order for ${totalQuantity} qty (${fullSymbol}) filled @ ₹${price}`
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Execution error'
      });
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setFeedback(null), 8000);
    }
  };

  return (
    <div className="card" style={{ marginBottom: '24px' }}>
      <div className="card-header">
        <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🎯</span>
          <span>Manual Execution Terminal</span>
          <span className={`badge ${marketStatus.isOpen ? 'badge-emerald' : 'badge-amber'}`} style={{ fontSize: '0.65rem' }}>
            {marketStatus.badge}
          </span>
        </h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className={`btn btn-sm ${tradingMode === 'PAPER' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTradingMode('PAPER')}
            style={{ fontSize: '0.75rem', padding: '2px 8px' }}
          >
            PAPER SIMULATOR
          </button>
          <button
            type="button"
            className={`btn btn-sm ${tradingMode === 'LIVE' ? 'btn-danger' : 'btn-ghost'}`}
            onClick={() => setTradingMode('LIVE')}
            style={{ fontSize: '0.75rem', padding: '2px 8px' }}
          >
            LIVE BROKER
          </button>
        </div>
      </div>

      {/* Weekend / Market Closed Advisory Banner */}
      {tradingMode === 'LIVE' && !marketStatus.isOpen && (
        <div style={{
          background: 'rgba(245, 158, 11, 0.12)',
          border: '1px solid var(--accent-amber)',
          borderRadius: 'var(--radius-sm)',
          padding: '10px 14px',
          fontSize: '0.8rem',
          color: 'var(--accent-amber)',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          lineHeight: 1.4
        }}>
          <span style={{ fontSize: '1.1rem' }}>⚠️</span>
          <div>
            <strong>Market is Closed Today:</strong> {marketStatus.reason} Normal LIVE orders cannot be executed until market opens. Please select <strong>PAPER SIMULATOR</strong> above to test your trades!
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Row 1: Symbol & Option Type */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '14px' }}>
          {/* Index Selector */}
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
              Underlying
            </label>
            <select
              value={symbol}
              onChange={(e) => {
                setSymbol(e.target.value);
                setStrike(e.target.value === 'BANKNIFTY' ? 51200 : 24500);
              }}
              style={{
                width: '100%',
                padding: '8px 10px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '0.875rem'
              }}
            >
              <option value="NIFTY">NIFTY 50</option>
              <option value="BANKNIFTY">BANK NIFTY</option>
              <option value="FINNIFTY">FIN NIFTY</option>
            </select>
          </div>

          {/* CE / PE Buttons */}
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
              Option Side
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setOptionType('CE')}
                style={{
                  padding: '7px 0',
                  borderRadius: '6px',
                  border: optionType === 'CE' ? '2px solid var(--accent-emerald)' : '1px solid var(--border-subtle)',
                  background: optionType === 'CE' ? 'rgba(16, 185, 129, 0.2)' : 'var(--bg-surface)',
                  color: optionType === 'CE' ? 'var(--accent-emerald)' : 'var(--text-dim)',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                CALL (CE)
              </button>
              <button
                type="button"
                onClick={() => setOptionType('PE')}
                style={{
                  padding: '7px 0',
                  borderRadius: '6px',
                  border: optionType === 'PE' ? '2px solid var(--accent-crimson)' : '1px solid var(--border-subtle)',
                  background: optionType === 'PE' ? 'rgba(244, 63, 94, 0.2)' : 'var(--bg-surface)',
                  color: optionType === 'PE' ? 'var(--accent-crimson)' : 'var(--text-dim)',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                PUT (PE)
              </button>
            </div>
          </div>

          {/* Strike Price */}
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
              Strike Price
            </label>
            <input
              type="number"
              step={symbol === 'BANKNIFTY' ? '100' : '50'}
              value={strike}
              onChange={(e) => setStrike(parseInt(e.target.value, 10))}
              style={{
                width: '100%',
                padding: '7px 10px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                color: '#fff',
                fontFamily: 'var(--font-mono)'
              }}
            />
          </div>
        </div>

        {/* Lots & Quick Strikes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '12px', marginBottom: '14px' }}>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
              Lots ({lotSize} Qty/Lot)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setLots(Math.max(1, lots - 1))}
              >
                -
              </button>
              <input
                type="number"
                min="1"
                max="20"
                value={lots}
                onChange={(e) => setLots(Math.max(1, parseInt(e.target.value, 10) || 1))}
                style={{
                  width: '60px',
                  textAlign: 'center',
                  padding: '7px 0',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  color: '#fff',
                  fontFamily: 'var(--font-mono)'
                }}
              />
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setLots(lots + 1)}
              >
                +
              </button>
            </div>
          </div>

          {/* Quick Strikes Buttons */}
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
              Quick Strike:
            </label>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {[-2, -1, 0, 1, 2].map((offset) => (
                <button
                  key={offset}
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: '0.7rem', padding: '4px 8px' }}
                  onClick={() => handleQuickStrike(offset)}
                >
                  {offset === 0 ? 'ATM' : offset > 0 ? `+${offset} OTM` : `${offset} ITM`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Limit Price, Stop Loss, Target */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1.2fr', gap: '12px', marginBottom: '16px' }}>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
              Limit Price (₹)
            </label>
            <input
              type="number"
              step="0.05"
              value={price}
              onChange={(e) => setPrice(parseFloat(e.target.value))}
              style={{
                width: '100%',
                padding: '7px 10px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                color: '#fff',
                fontFamily: 'var(--font-mono)'
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
              Stop Loss (pts)
            </label>
            <input
              type="number"
              value={stopLoss}
              onChange={(e) => setStopLoss(parseInt(e.target.value, 10))}
              style={{
                width: '100%',
                padding: '7px 10px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                color: 'var(--accent-crimson)',
                fontFamily: 'var(--font-mono)'
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
              Target (pts)
            </label>
            <input
              type="number"
              value={target}
              onChange={(e) => setTarget(parseInt(e.target.value, 10))}
              style={{
                width: '100%',
                padding: '7px 10px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                color: 'var(--accent-emerald)',
                fontFamily: 'var(--font-mono)'
              }}
            />
          </div>

          {/* Execution Specs Pill */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'var(--bg-card)', padding: '8px 12px', borderRadius: '6px' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Margin: ₹{estimatedMargin}</div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>R:R Ratio: 1:{riskReward}</div>
          </div>
        </div>

        {/* Action Button & Feedback */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
            Selected: <strong style={{ color: '#fff', fontFamily: 'var(--font-mono)' }}>{fullSymbol}</strong> ({totalQuantity} Qty)
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`btn ${tradingMode === 'LIVE' ? 'btn-danger' : 'btn-primary'}`}
            style={{ padding: '10px 24px', fontWeight: 800, fontSize: '0.9rem', letterSpacing: '0.04em' }}
          >
            {isSubmitting ? 'PLACING...' : `EXECUTE ${tradingMode} BUY ORDER`}
          </button>
        </div>

        {feedback && (
          <div
            style={{
              marginTop: '12px',
              padding: '12px',
              borderRadius: '6px',
              fontSize: '0.85rem',
              lineHeight: 1.4,
              background: feedback.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
              border: `1px solid ${feedback.type === 'success' ? 'var(--accent-emerald)' : 'var(--accent-crimson)'}`,
              color: feedback.type === 'success' ? 'var(--accent-emerald)' : 'var(--accent-crimson)'
            }}
          >
            {feedback.message}
          </div>
        )}
      </form>
    </div>
  );
}

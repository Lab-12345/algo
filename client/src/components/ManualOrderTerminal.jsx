import React, { useState } from 'react';

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
    setIsSubmitting(true);
    setFeedback(null);

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
        message: `${tradingMode} order for ${totalQuantity} qty (${fullSymbol}) filled @ ₹${price}`
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Execution error'
      });
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  return (
    <div className="card" style={{ marginBottom: '24px' }}>
      <div className="card-header">
        <h2 className="card-title">
          <span>🎯</span>
          <span>Manual Execution Terminal</span>
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
                fontSize: '0.85rem'
              }}
            >
              <option value="NIFTY">NIFTY 50</option>
              <option value="BANKNIFTY">BANKNIFTY</option>
              <option value="FINNIFTY">FINNIFTY</option>
            </select>
          </div>

          {/* Option Type CE/PE */}
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
              Option Side
            </label>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setOptionType('CE')}
                style={{
                  flex: 1,
                  background: optionType === 'CE' ? 'var(--accent-emerald)' : 'var(--bg-surface)',
                  color: optionType === 'CE' ? '#000' : 'var(--text-muted)',
                  fontWeight: 700
                }}
              >
                CALL (CE)
              </button>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setOptionType('PE')}
                style={{
                  flex: 1,
                  background: optionType === 'PE' ? 'var(--accent-crimson)' : 'var(--bg-surface)',
                  color: optionType === 'PE' ? '#fff' : 'var(--text-muted)',
                  fontWeight: 700
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
              step={symbol === 'BANKNIFTY' ? 100 : 50}
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

          {/* Lots Stepper */}
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
              Lots ({lotSize} Qty/Lot)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => setLots(Math.max(1, lots - 1))}
                style={{ padding: '6px 10px' }}
              >
                -
              </button>
              <input
                type="number"
                min="1"
                max="10"
                value={lots}
                onChange={(e) => setLots(Math.max(1, parseInt(e.target.value, 10) || 1))}
                style={{
                  width: '50px',
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
                className="btn btn-sm btn-ghost"
                onClick={() => setLots(Math.min(10, lots + 1))}
                style={{ padding: '6px 10px' }}
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Quick Strike Shortcuts */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Quick Strike:</span>
          {[-2, -1, 0, 1, 2].map((off) => (
            <button
              key={off}
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => handleQuickStrike(off)}
              style={{ fontSize: '0.7rem', padding: '2px 8px' }}
            >
              {off === 0 ? 'ATM' : off > 0 ? `+${off} OTM` : `${off} ITM`}
            </button>
          ))}
        </div>

        {/* Row 3: Limit Price, Stop Loss, Target */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '16px' }}>
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
              padding: '10px',
              borderRadius: '6px',
              fontSize: '0.8rem',
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

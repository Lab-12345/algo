import React, { useState } from 'react';

const INSTRUMENT_MAP = {
  NIFTY: { token: '99926000', lotSize: 25 },
  BANKNIFTY: { token: '99926009', lotSize: 15 },
  FINNIFTY: { token: '99926010', lotSize: 25 }
};

export function CreateStrategyModal({ isOpen, onClose, onStrategyCreated }) {
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('NIFTY');
  const [primaryTimeframe, setPrimaryTimeframe] = useState('5m');
  const [trendTimeframe, setTrendTimeframe] = useState('15m');
  const [tradingMode, setTradingMode] = useState('PAPER');
  const [vwapEnabled, setVwapEnabled] = useState(true);
  const [stopLoss, setStopLoss] = useState(25);
  const [target, setTarget] = useState(50);
  const [maxLots, setMaxLots] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const lotSize = INSTRUMENT_MAP[symbol]?.lotSize || 25;
  const instrumentToken = INSTRUMENT_MAP[symbol]?.token || '99926000';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a strategy name');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload = {
      name: name.trim(),
      symbol,
      instrumentToken,
      tradingMode,
      status: 'ACTIVE',
      timeframe: {
        primary: primaryTimeframe,
        trendFilter: trendTimeframe
      },
      parameters: {
        vwapEnabled,
        stopLossPoints: Number(stopLoss),
        targetPoints: Number(target),
        lotSize,
        maxLots: Number(maxLots)
      }
    };

    try {
      await onStrategyCreated(payload);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create strategy');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px'
    }}>
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        width: '100%',
        maxWidth: '540px',
        boxShadow: 'var(--shadow-lg)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🛠️</span>
            <span>Configure New Algorithmic Strategy</span>
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-dim)',
              fontSize: '1.25rem',
              cursor: 'pointer'
            }}
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid var(--accent-crimson)',
              color: 'var(--accent-crimson)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              marginBottom: '16px'
            }}>
              {error}
            </div>
          )}

          {/* Strategy Name */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '6px' }}>
              Strategy Identifier Name
            </label>
            <input
              type="text"
              className="mono-text"
              placeholder="e.g. NIFTY 5m VWAP Supertrend Breakout"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-main)',
                fontSize: '0.9rem'
              }}
              required
            />
          </div>

          {/* Symbol & Mode */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '6px' }}>
                Underlying Symbol
              </label>
              <select
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-main)',
                  fontSize: '0.9rem'
                }}
              >
                <option value="NIFTY">NIFTY (Token: 99926000, Lot: 25)</option>
                <option value="BANKNIFTY">BANKNIFTY (Token: 99926009, Lot: 15)</option>
                <option value="FINNIFTY">FINNIFTY (Token: 99926010, Lot: 25)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '6px' }}>
                Initial Trading Mode
              </label>
              <select
                value={tradingMode}
                onChange={(e) => setTradingMode(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-main)',
                  fontSize: '0.9rem'
                }}
              >
                <option value="PAPER">PAPER (Simulated Sandbox)</option>
                <option value="LIVE">LIVE (Angel One Real Orders)</option>
              </select>
            </div>
          </div>

          {/* Timeframes */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '6px' }}>
                Execution Timeframe
              </label>
              <select
                value={primaryTimeframe}
                onChange={(e) => setPrimaryTimeframe(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-main)',
                  fontSize: '0.9rem'
                }}
              >
                <option value="1m">1 Minute (Fast Scalping)</option>
                <option value="3m">3 Minutes</option>
                <option value="5m">5 Minutes (Recommended)</option>
                <option value="15m">15 Minutes (Swing)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '6px' }}>
                Trend Filter Timeframe
              </label>
              <select
                value={trendTimeframe}
                onChange={(e) => setTrendTimeframe(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-main)',
                  fontSize: '0.9rem'
                }}
              >
                <option value="5m">5 Minutes</option>
                <option value="15m">15 Minutes (Standard)</option>
                <option value="60m">1 Hour (Macro)</option>
              </select>
            </div>
          </div>

          {/* Parameters: Stop Loss, Target, Lots */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '6px' }}>
                Stop Loss (pts)
              </label>
              <input
                type="number"
                min="5"
                max="300"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-main)',
                  fontSize: '0.9rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '6px' }}>
                Target (pts)
              </label>
              <input
                type="number"
                min="10"
                max="600"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-main)',
                  fontSize: '0.9rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '6px' }}>
                Max Lots
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={maxLots}
                onChange={(e) => setMaxLots(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-main)',
                  fontSize: '0.9rem'
                }}
              />
            </div>
          </div>

          {/* VWAP Toggle */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '20px'
          }}>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>VWAP Confirmation Filter</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Only take LONG entries above VWAP and SHORT entries below VWAP</div>
            </div>
            <input
              type="checkbox"
              checked={vwapEnabled}
              onChange={(e) => setVwapEnabled(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: 'var(--accent-cyan)', cursor: 'pointer' }}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
              style={{ minWidth: '130px' }}
            >
              {isSubmitting ? 'Deploying...' : 'Deploy Strategy'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

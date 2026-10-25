import React, { useState } from 'react';

export function StrategyManager({ strategies, onToggleStrategy, onModeChange, onCreateClick, onDeleteStrategy }) {
  const [selectedStrategy, setSelectedStrategy] = useState(null);

  return (
    <div className="card" style={{ marginBottom: '24px' }}>
      <div className="card-header">
        <h2 className="card-title">
          <span>⚡</span>
          <span>Strategy Orchestrator</span>
        </h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span className="badge badge-cyan">{strategies.length} Configured</span>
          {onCreateClick && (
            <button
              className="btn btn-primary"
              style={{ fontSize: '0.8rem', padding: '6px 12px' }}
              onClick={onCreateClick}
            >
              + Create Strategy
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
        {strategies.map((strat) => {
          const isActive = strat.status === 'ACTIVE';
          const isLive = strat.tradingMode === 'LIVE';

          return (
            <div
              key={strat._id || strat.symbol}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '16px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{strat.name}</h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    Symbol: <span className="mono-text" style={{ color: 'var(--text-main)', fontWeight: 600 }}>{strat.symbol}</span> (Token: {strat.instrumentToken})
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span className={`badge ${isLive ? 'badge-crimson' : 'badge-emerald'}`}>
                    {strat.tradingMode}
                  </span>
                  <span className={`badge ${isActive ? 'badge-emerald' : 'badge-amber'}`}>
                    {strat.status}
                  </span>
                  {onDeleteStrategy && (
                    <button
                      title="Delete Strategy"
                      onClick={() => {
                        if (window.confirm(`Delete strategy "${strat.name}"?`)) {
                          onDeleteStrategy(strat._id);
                        }
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--accent-crimson)',
                        cursor: 'pointer',
                        padding: '2px 4px',
                        fontSize: '0.9rem'
                      }}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>

              {/* Strategy Parameters Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                fontSize: '0.75rem',
                margin: '12px 0',
                padding: '10px',
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-sm)'
              }}>
                <div>
                  <span style={{ color: 'var(--text-dim)' }}>Timeframe:</span>{' '}
                  <span className="mono-text">{strat.timeframe?.primary || '5m'} / {strat.timeframe?.trendFilter || '15m'}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-dim)' }}>VWAP Filter:</span>{' '}
                  <span style={{ color: strat.parameters?.vwapEnabled ? 'var(--accent-emerald)' : 'var(--accent-crimson)' }}>
                    {strat.parameters?.vwapEnabled ? 'ENABLED' : 'OFF'}
                  </span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-dim)' }}>Stop Loss:</span>{' '}
                  <span className="mono-text">{strat.parameters?.stopLossPoints || 30} pts</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-dim)' }}>Target:</span>{' '}
                  <span className="mono-text">{strat.parameters?.targetPoints || 60} pts</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-dim)' }}>Lot Size:</span>{' '}
                  <span className="mono-text">{strat.parameters?.lotSize || 25} (x{strat.parameters?.maxLots || 1})</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-dim)' }}>Version:</span>{' '}
                  <span className="mono-text">v{strat.version || 1}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button
                  id={`toggle-strat-${strat._id}`}
                  className={`btn ${isActive ? 'btn-ghost' : 'btn-primary'}`}
                  style={{ flex: 1 }}
                  onClick={() => onToggleStrategy(strat._id, !isActive)}
                >
                  {isActive ? 'Pause Strategy' : 'Enable Strategy'}
                </button>

                <button
                  id={`mode-strat-${strat._id}`}
                  className="btn btn-ghost"
                  style={{
                    borderColor: isLive ? 'var(--accent-crimson)' : 'var(--accent-emerald)',
                    color: isLive ? 'var(--accent-crimson)' : 'var(--accent-emerald)'
                  }}
                  onClick={() => {
                    const newMode = isLive ? 'PAPER' : 'LIVE';
                    if (newMode === 'LIVE') {
                      const confirmLive = window.confirm(
                        'WARNING: Switching to LIVE mode will place real orders on Angel One through the registered static IP VPS. Proceed?'
                      );
                      if (!confirmLive) return;
                    }
                    onModeChange(strat._id, newMode);
                  }}
                >
                  Switch to {isLive ? 'PAPER' : 'LIVE'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

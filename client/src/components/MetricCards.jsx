import React from 'react';

export function MetricCards({ metrics = {}, activeStrategiesCount = 0, openPositionsCount = 0 }) {
  const totalNetPnl = metrics.totalNetPnl || 0;
  const isPnlPositive = totalNetPnl >= 0;
  const winRate = metrics.winRate || 0;
  const totalTrades = metrics.totalTrades || 0;

  return (
    <div className="grid-cols-4" style={{ marginBottom: '24px' }}>
      {/* Net P&L Card */}
      <div className="card">
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Realized Net P&L (Today)
        </div>
        <div
          className={`mono-text ${isPnlPositive ? 'pnl-positive' : 'pnl-negative'}`}
          style={{ fontSize: '1.75rem', fontWeight: 700, margin: '8px 0' }}
        >
          {isPnlPositive ? '+' : ''}₹{totalNetPnl.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
          Estimated charges: ₹{(metrics.totalCharges || 0).toFixed(2)}
        </div>
      </div>

      {/* Win Rate Card */}
      <div className="card">
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Strategy Win Rate
        </div>
        <div className="mono-text" style={{ fontSize: '1.75rem', fontWeight: 700, margin: '8px 0', color: 'var(--accent-cyan)' }}>
          {winRate}%
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
          {metrics.winningTrades || 0} Wins / {metrics.losingTrades || 0} Losses ({totalTrades} Trades)
        </div>
      </div>

      {/* Active Strategies Card */}
      <div className="card">
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Active Strategies
        </div>
        <div className="mono-text" style={{ fontSize: '1.75rem', fontWeight: 700, margin: '8px 0', color: 'var(--text-main)' }}>
          {activeStrategiesCount}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
          Isolated Worker Daemon Active
        </div>
      </div>

      {/* Open Positions Card */}
      <div className="card">
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Open Positions
        </div>
        <div className="mono-text" style={{ fontSize: '1.75rem', fontWeight: 700, margin: '8px 0', color: openPositionsCount > 0 ? 'var(--accent-amber)' : 'var(--text-dim)' }}>
          {openPositionsCount}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
          Managed with Stop-Loss & Target Guards
        </div>
      </div>
    </div>
  );
}

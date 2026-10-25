import React from 'react';

export function PositionsMonitor({ positions = [] }) {
  return (
    <div className="card" style={{ marginBottom: '24px' }}>
      <div className="card-header">
        <h2 className="card-title">
          <span>📊</span>
          <span>Open Positions Monitor</span>
        </h2>
        <span className="badge badge-amber">{positions.length} Active</span>
      </div>

      <div className="table-wrapper">
        {positions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-dim)', fontSize: '0.875rem' }}>
            No open positions currently. System is standing by for new strategy signals.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Mode</th>
                <th>Side</th>
                <th>Quantity</th>
                <th>Entry Price</th>
                <th>LTP</th>
                <th>Stop Loss</th>
                <th>Target</th>
                <th>Unrealized P&L</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((pos) => {
                const isPnlPositive = (pos.unrealizedPnl || 0) >= 0;
                return (
                  <tr key={pos._id || pos.symbol}>
                    <td>
                      <span className="mono-text" style={{ fontWeight: 600 }}>{pos.symbol}</span>
                    </td>
                    <td>
                      <span className={`badge ${pos.tradingMode === 'LIVE' ? 'badge-crimson' : 'badge-emerald'}`}>
                        {pos.tradingMode}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${pos.side === 'LONG' ? 'badge-emerald' : 'badge-crimson'}`}>
                        {pos.side}
                      </span>
                    </td>
                    <td className="mono-text">{pos.quantity}</td>
                    <td className="mono-text">₹{pos.entryPrice?.toFixed(2)}</td>
                    <td className="mono-text">₹{pos.currentPrice?.toFixed(2)}</td>
                    <td className="mono-text" style={{ color: 'var(--accent-crimson)' }}>
                      ₹{pos.stopLossPrice?.toFixed(2) || 'N/A'}
                    </td>
                    <td className="mono-text" style={{ color: 'var(--accent-emerald)' }}>
                      ₹{pos.targetPrice?.toFixed(2) || 'N/A'}
                    </td>
                    <td className={`mono-text ${isPnlPositive ? 'pnl-positive' : 'pnl-negative'}`} style={{ fontWeight: 700 }}>
                      {isPnlPositive ? '+' : ''}₹{(pos.unrealizedPnl || 0).toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

import React from 'react';

export function RiskPanel({ health = {}, openPositionsCount = 0, currentDailyLoss = 0 }) {
  const maxDailyLoss = 2000;
  const maxPositions = 2;
  const isKillSwitch = health?.checks?.killSwitch === 'ACTIVE';

  const lossPercentage = Math.min(100, Math.max(0, (Math.abs(currentDailyLoss) / maxDailyLoss) * 100));

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">
          <span>🛡️</span>
          <span>Risk & Compliance Guard</span>
        </h2>
        <span className={`badge ${isKillSwitch ? 'badge-crimson' : 'badge-emerald'}`}>
          {isKillSwitch ? 'HALTED' : 'ACTIVE'}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Daily Loss Ceiling Bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Daily Loss Limit:</span>
            <span className="mono-text" style={{ fontWeight: 600 }}>
              ₹{Math.abs(currentDailyLoss).toFixed(2)} / ₹{maxDailyLoss.toFixed(2)}
            </span>
          </div>
          <div style={{
            height: '8px',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-full)',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${lossPercentage}%`,
              height: '100%',
              background: lossPercentage > 75 ? 'var(--accent-crimson)' : 'var(--accent-emerald)',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>

        {/* Open Position Capacity */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>Position Capacity:</span>
          <span className="mono-text" style={{ fontWeight: 600 }}>
            {openPositionsCount} / {maxPositions} Open Slots
          </span>
        </div>

        {/* 2026 Regulatory Compliance Box */}
        <div style={{
          background: 'rgba(6, 182, 212, 0.08)',
          border: '1px solid rgba(6, 182, 212, 0.25)',
          borderRadius: 'var(--radius-md)',
          padding: '12px',
          fontSize: '0.75rem',
          lineHeight: '1.4'
        }}>
          <div style={{ fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '4px' }}>
            🔒 2026 Angel One Algo Compliance
          </div>
          <ul style={{ paddingLeft: '16px', color: 'var(--text-muted)' }}>
            <li>Market & IOC orders are strictly prohibited by broker.</li>
            <li>All algo actions execute via verified LIMIT orders.</li>
            <li>Outbound orders restricted to registered static IPv4.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

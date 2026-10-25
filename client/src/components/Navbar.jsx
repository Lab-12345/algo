import React, { useState, useEffect } from 'react';

export function Navbar({ health, onKillSwitchTriggered, onKillSwitchReset }) {
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const isKillSwitchActive = health?.checks?.killSwitch === 'ACTIVE';
  const outboundIp = health?.checks?.egressIp?.currentOutboundIp || 'Checking...';
  const isIpMatch = health?.checks?.egressIp?.isIpMatching;

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <div className="logo-area">
          <div className="logo-icon">TP</div>
          <div>
            <div className="logo-text">TradePilot</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', letterSpacing: '0.04em' }}>
              ANGEL ONE SMARTAPI ENGINE
            </div>
          </div>
        </div>

        {/* Telemetry and Security Indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          {/* Market Clock */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <span>IST:</span>
            <span className="mono-text" style={{ color: 'var(--text-main)', fontWeight: 600 }}>{currentTime}</span>
          </div>

          {/* Static IPv4 Pill */}
          <div className={`badge ${isIpMatch ? 'badge-emerald' : 'badge-amber'}`} title="VPS Outbound IPv4 verified against SmartAPI registration">
            <span className={`pulse-dot ${isIpMatch ? 'dot-emerald' : 'dot-crimson'}`}></span>
            <span>IP: {outboundIp}</span>
          </div>

          {/* Database & Worker State */}
          <div className={`badge ${health?.checks?.database === 'CONNECTED' ? 'badge-cyan' : 'badge-crimson'}`}>
            <span>DB: {health?.checks?.database || 'CONNECTING'}</span>
          </div>

          {/* Kill Switch Controls */}
          {isKillSwitchActive ? (
            <button
              id="reset-kill-switch-btn"
              className="btn btn-ghost"
              style={{ borderColor: 'var(--accent-emerald)', color: 'var(--accent-emerald)' }}
              onClick={onKillSwitchReset}
            >
              Reset Kill-Switch
            </button>
          ) : (
            <button
              id="emergency-kill-switch-btn"
              className="btn btn-danger"
              onClick={() => setShowConfirmModal(true)}
            >
              Emergency Kill-Switch
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Modal for Kill Switch */}
      {showConfirmModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{ maxWidth: '440px', width: '90%', borderColor: 'var(--accent-crimson)' }}>
            <h3 style={{ color: 'var(--accent-crimson)', marginBottom: '12px' }}>⚠️ Trigger Emergency Kill-Switch?</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
              This will immediately halt all automated trade executions, prevent new position entries across all strategies, and alert the operator.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn btn-ghost" onClick={() => setShowConfirmModal(false)}>Cancel</button>
              <button
                className="btn btn-danger"
                onClick={() => {
                  setShowConfirmModal(false);
                  onKillSwitchTriggered('Operator manual button clicked on Web Dashboard');
                }}
              >
                Confirm Halt
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

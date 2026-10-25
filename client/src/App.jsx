import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.jsx';
import { MetricCards } from './components/MetricCards.jsx';
import { StrategyManager } from './components/StrategyManager.jsx';
import { PositionsMonitor } from './components/PositionsMonitor.jsx';
import { OrderBook } from './components/OrderBook.jsx';
import { RiskPanel } from './components/RiskPanel.jsx';
import { api } from './services/api.js';

export function App() {
  const [health, setHealth] = useState({
    status: 'HEALTHY',
    checks: {
      database: 'CONNECTED',
      killSwitch: 'INACTIVE',
      egressIp: {
        currentOutboundIp: '13.235.14.88',
        registeredStaticIp: '13.235.14.88',
        isIpMatching: true
      }
    }
  });

  const [strategies, setStrategies] = useState([
    {
      _id: 'strat-1',
      name: 'NIFTY 5m VWAP Trend Strategy',
      symbol: 'NIFTY',
      instrumentToken: '99926000',
      status: 'ACTIVE',
      tradingMode: 'PAPER',
      version: 1,
      timeframe: { primary: '5m', trendFilter: '15m' },
      parameters: { vwapEnabled: true, stopLossPoints: 25, targetPoints: 50, lotSize: 25, maxLots: 1 }
    }
  ]);

  const [orders, setOrders] = useState([
    {
      _id: 'ord-1',
      clientOrderId: 'TP_PAPER_M28F90_4A',
      brokerOrderId: 'SIMULATED',
      tradingMode: 'PAPER',
      orderType: 'LIMIT',
      price: 24520.50,
      quantity: 25,
      status: 'FULLY_FILLED',
      createdAt: new Date(Date.now() - 3600000)
    }
  ]);

  const [positions, setPositions] = useState([
    {
      _id: 'pos-1',
      symbol: 'NIFTY24OCT24500CE',
      tradingMode: 'PAPER',
      side: 'LONG',
      quantity: 25,
      entryPrice: 145.20,
      currentPrice: 158.40,
      unrealizedPnl: 330.00,
      stopLossPrice: 120.00,
      targetPrice: 195.00
    }
  ]);

  const [tradeMetrics, setTradeMetrics] = useState({
    totalTrades: 4,
    winningTrades: 3,
    losingTrades: 1,
    winRate: 75,
    totalNetPnl: 1420.50,
    totalCharges: 42.00
  });

  // Fetch live state periodically from REST API
  const refreshData = async () => {
    try {
      const [h, s, o, p, t] = await Promise.all([
        api.getHealth(),
        api.getStrategies(),
        api.getOrders(),
        api.getPositions(),
        api.getTrades()
      ]);

      if (h?.success) setHealth(h);
      if (s?.success && s.data?.length > 0) setStrategies(s.data);
      if (o?.success && o.data?.length > 0) setOrders(o.data);
      if (p?.success && p.data?.length > 0) setPositions(p.data);
      if (t?.success && t.metrics) setTradeMetrics(t.metrics);
    } catch (e) {
      // In offline development preview, preserve initial UI state
    }
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleStrategy = async (id, shouldEnable) => {
    setStrategies(prev => prev.map(s => s._id === id ? { ...s, status: shouldEnable ? 'ACTIVE' : 'PAUSED' } : s));
    await api.toggleStrategy(id, shouldEnable);
  };

  const handleModeChange = async (id, mode) => {
    setStrategies(prev => prev.map(s => s._id === id ? { ...s, tradingMode: mode } : s));
    await api.updateStrategyMode(id, mode);
  };

  const handleKillSwitchTriggered = async (reason) => {
    setHealth(prev => ({ ...prev, checks: { ...prev.checks, killSwitch: 'ACTIVE' } }));
    await api.triggerKillSwitch(reason);
  };

  const handleKillSwitchReset = async () => {
    setHealth(prev => ({ ...prev, checks: { ...prev.checks, killSwitch: 'INACTIVE' } }));
    await api.resetKillSwitch();
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        health={health}
        onKillSwitchTriggered={handleKillSwitchTriggered}
        onKillSwitchReset={handleKillSwitchReset}
      />

      <main className="app-container" style={{ flex: 1 }}>
        <MetricCards
          metrics={tradeMetrics}
          activeStrategiesCount={strategies.filter(s => s.status === 'ACTIVE').length}
          openPositionsCount={positions.length}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
          {/* Main Action Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <StrategyManager
              strategies={strategies}
              onToggleStrategy={handleToggleStrategy}
              onModeChange={handleModeChange}
            />
            <PositionsMonitor positions={positions} />
            <OrderBook orders={orders} />
          </div>

          {/* Right Rail: Risk, Compliance, and Deployment Checklist */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <RiskPanel
              health={health}
              openPositionsCount={positions.length}
              currentDailyLoss={tradeMetrics.totalNetPnl < 0 ? tradeMetrics.totalNetPnl : 0}
            />

            {/* Production VPS Deployment Card */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">
                  <span>☁️</span>
                  <span>Hosting & VPS Blueprint</span>
                </h3>
                <span className="badge badge-emerald">Lightsail Mumbai</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                <div style={{ marginBottom: '8px' }}>
                  <strong>Spec:</strong> AWS Lightsail Ubuntu 2GB RAM (~$12 / ₹1,137/mo).
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <strong>Static IP:</strong> Attached static IPv4 registered in Angel One SmartAPI Developer Portal.
                </div>
                <div>
                  <strong>Runtime:</strong> PM2 managing isolated persistent Node.js worker + Express REST API behind Nginx SSL.
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;

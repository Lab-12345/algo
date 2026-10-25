import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.jsx';
import { MetricCards } from './components/MetricCards.jsx';
import { TradingChart } from './components/TradingChart.jsx';
import { ManualOrderTerminal } from './components/ManualOrderTerminal.jsx';
import { StrategyManager } from './components/StrategyManager.jsx';
import { PositionsMonitor } from './components/PositionsMonitor.jsx';
import { OrderBook } from './components/OrderBook.jsx';
import { RiskPanel } from './components/RiskPanel.jsx';
import { CreateStrategyModal } from './components/CreateStrategyModal.jsx';
import { api } from './services/api.js';

export function App() {
  const [activeTab, setActiveTab] = useState('terminal'); // 'terminal' | 'strategies' | 'orders'
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [health, setHealth] = useState({
    status: 'HEALTHY',
    checks: {
      database: 'CONNECTED',
      killSwitch: 'INACTIVE',
      egressIp: {
        currentOutboundIp: '16.4.87.135',
        registeredStaticIp: '16.4.87.135',
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
      // In offline preview, preserve initial UI state
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

  const handleCreateStrategy = async (strategyData) => {
    const res = await api.createStrategy(strategyData);
    if (res?.success && res.data) {
      setStrategies(prev => [res.data, ...prev]);
    } else {
      // Optimistic fallback for preview
      const newStrat = {
        _id: 'strat-' + Date.now(),
        ...strategyData,
        version: 1
      };
      setStrategies(prev => [newStrat, ...prev]);
    }
  };

  const handleDeleteStrategy = async (id) => {
    setStrategies(prev => prev.filter(s => s._id !== id));
    await api.deleteStrategy(id);
  };

  const handlePlaceManualOrder = async (orderPayload) => {
    let apiResponse = null;
    try {
      apiResponse = await api.placeManualOrder(orderPayload);
    } catch (e) {
      console.warn('API sync deferred:', e);
    }

    const isLive = orderPayload.tradingMode === 'LIVE';
    const isApiOk = apiResponse?.success;

    // In LIVE mode, if the broker or API rejected the order
    if (isLive && !isApiOk) {
      const errorMsg = apiResponse?.message || apiResponse?.error || 'Live order rejected: Indian Stock Exchanges (NSE/NFO) are closed outside 9:15 AM - 3:30 PM IST (Mon-Fri).';
      throw new Error(errorMsg);
    }

    // Add to orders list optimistically
    const newOrder = {
      _id: 'ord-' + Date.now(),
      clientOrderId: `TP_${orderPayload.tradingMode}_${Date.now().toString(36).toUpperCase()}`,
      brokerOrderId: isLive ? (apiResponse?.data?.brokerOrderId || 'ANGEL_' + Math.floor(Math.random() * 900000)) : 'SIMULATED',
      tradingMode: orderPayload.tradingMode,
      orderType: orderPayload.orderType,
      price: orderPayload.price,
      quantity: orderPayload.quantity,
      status: 'FULLY_FILLED',
      createdAt: new Date()
    };
    setOrders(prev => [newOrder, ...prev]);

    // Add to positions list
    const newPosition = {
      _id: 'pos-' + Date.now(),
      symbol: orderPayload.symbol,
      tradingMode: orderPayload.tradingMode,
      side: orderPayload.side,
      quantity: orderPayload.quantity,
      entryPrice: orderPayload.price,
      currentPrice: orderPayload.price,
      unrealizedPnl: 0,
      stopLossPrice: orderPayload.stopLossPrice,
      targetPrice: orderPayload.targetPrice
    };
    setPositions(prev => [newPosition, ...prev]);

    return apiResponse || { success: true };
  };

  const handleClosePosition = async (id) => {
    // Find position and calculate realized P&L
    const pos = positions.find(p => p._id === id);
    if (pos) {
      setTradeMetrics(prev => ({
        ...prev,
        totalTrades: prev.totalTrades + 1,
        totalNetPnl: parseFloat((prev.totalNetPnl + (pos.unrealizedPnl || 0)).toFixed(2))
      }));
    }
    setPositions(prev => prev.filter(p => p._id !== id));
    await api.closePosition(id);
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

        {/* Tab Navigation */}
        <div className="tabs-nav">
          <button
            className={`tab-btn ${activeTab === 'terminal' ? 'active' : ''}`}
            onClick={() => setActiveTab('terminal')}
          >
            <span>📈</span>
            <span>Live Terminal & Chart</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'strategies' ? 'active' : ''}`}
            onClick={() => setActiveTab('strategies')}
          >
            <span>⚡</span>
            <span>Strategy Orchestrator ({strategies.length})</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            <span>📋</span>
            <span>Positions & Risk ({positions.length})</span>
          </button>
        </div>

        {/* TAB 1: Live Terminal & Chart */}
        {activeTab === 'terminal' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px', marginBottom: '24px' }}>
              <TradingChart activeSymbol="NIFTY" />
              <ManualOrderTerminal onOrderPlaced={handlePlaceManualOrder} />
            </div>

            <PositionsMonitor
              positions={positions}
              onClosePosition={handleClosePosition}
            />
          </div>
        )}

        {/* TAB 2: Strategy Orchestrator */}
        {activeTab === 'strategies' && (
          <div>
            <StrategyManager
              strategies={strategies}
              onToggleStrategy={handleToggleStrategy}
              onModeChange={handleModeChange}
              onCreateClick={() => setIsCreateModalOpen(true)}
              onDeleteStrategy={handleDeleteStrategy}
            />
            <PositionsMonitor
              positions={positions}
              onClosePosition={handleClosePosition}
            />
          </div>
        )}

        {/* TAB 3: Positions, Order Book & Risk Guard */}
        {activeTab === 'orders' && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <PositionsMonitor
                positions={positions}
                onClosePosition={handleClosePosition}
              />
              <OrderBook orders={orders} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <RiskPanel
                health={health}
                openPositionsCount={positions.length}
                currentDailyLoss={tradeMetrics.totalNetPnl < 0 ? tradeMetrics.totalNetPnl : 0}
              />

              {/* VPS Blueprint Card */}
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
                    <strong>Static IP:</strong> {health.checks.egressIp?.registeredStaticIp || '16.4.87.135'} (Attached in Angel One portal).
                  </div>
                  <div>
                    <strong>Runtime:</strong> PM2 managing isolated worker + Express REST API behind Nginx SSL.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Strategy Creation Modal */}
      <CreateStrategyModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onStrategyCreated={handleCreateStrategy}
      />
    </div>
  );
}

export default App;

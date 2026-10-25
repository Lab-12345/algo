const RAW_URL = import.meta.env.VITE_API_URL || '';
const BASE_URL = RAW_URL ? `${RAW_URL.replace(/\/$/, '')}/api` : '/api';

export const api = {
  // System Health & Telemetry
  async getHealth() {
    try {
      const res = await fetch(`${BASE_URL}/system/health`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      return { success: false, status: 'DISCONNECTED', checks: {} };
    }
  },

  // Emergency Kill Switch
  async triggerKillSwitch(reason) {
    try {
      const res = await fetch(`${BASE_URL}/trading/kill-switch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      return await res.json();
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  async resetKillSwitch() {
    try {
      const res = await fetch(`${BASE_URL}/trading/kill-switch/reset`, {
        method: 'POST'
      });
      return await res.json();
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  // Strategies
  async getStrategies() {
    try {
      const res = await fetch(`${BASE_URL}/strategies`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      return { success: false, data: [] };
    }
  },

  async toggleStrategy(id, shouldEnable) {
    try {
      const endpoint = shouldEnable ? 'enable' : 'disable';
      const res = await fetch(`${BASE_URL}/strategies/${id}/${endpoint}`, {
        method: 'POST'
      });
      return await res.json();
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  async updateStrategyMode(id, mode) {
    try {
      const res = await fetch(`${BASE_URL}/strategies/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tradingMode: mode })
      });
      return await res.json();
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  async createStrategy(strategyData) {
    try {
      const res = await fetch(`${BASE_URL}/strategies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(strategyData)
      });
      return await res.json();
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  async deleteStrategy(id) {
    try {
      const res = await fetch(`${BASE_URL}/strategies/${id}`, {
        method: 'DELETE'
      });
      return await res.json();
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  // Orders & Positions
  async getOrders() {
    try {
      const res = await fetch(`${BASE_URL}/orders`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      return { success: false, data: [] };
    }
  },

  async placeManualOrder(orderData) {
    try {
      const res = await fetch(`${BASE_URL}/orders/manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      const data = await res.json();
      return data;
    } catch (e) {
      return {
        success: false,
        error: 'NETWORK_ERROR',
        message: 'Could not reach trading API: ' + e.message
      };
    }
  },

  async getPositions() {
    try {
      const res = await fetch(`${BASE_URL}/positions`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      return { success: false, data: [] };
    }
  },

  async closePosition(id) {
    try {
      const res = await fetch(`${BASE_URL}/positions/${id}/close`, {
        method: 'POST'
      });
      return await res.json();
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  // Trades & Performance
  async getTrades() {
    try {
      const res = await fetch(`${BASE_URL}/trades`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      return { success: false, data: [], metrics: {} };
    }
  },

  // Angel One Portfolio & Holdings
  async getHoldings() {
    try {
      const res = await fetch(`${BASE_URL}/portfolio/holdings`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      return {
        success: false,
        data: {
          holdings: [],
          totalholding: { totalholdingvalue: 0, totalinvvalue: 0, totalprofitandloss: 0, totalpnlpercentage: 0 }
        }
      };
    }
  },

  async convertPosition(params) {
    try {
      const res = await fetch(`${BASE_URL}/portfolio/convert-position`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      return await res.json();
    } catch (e) {
      return { success: false, message: e.message };
    }
  },

  async getBrokerPositions() {
    try {
      const res = await fetch(`${BASE_URL}/portfolio/positions`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      return { success: false, data: [] };
    }
  }
};

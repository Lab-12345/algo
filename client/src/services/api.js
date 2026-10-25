const RAW_URL = import.meta.env.VITE_API_URL || '';
const BASE_URL = RAW_URL ? `${RAW_URL.replace(/\/$/, '')}/api` : '/api';

export const api = {
  // System Health & Telemetry
  async getHealth() {
    try {
      const res = await fetch(`${BASE_URL}/system/health`);
      return await res.json();
    } catch (e) {
      return { success: false, status: 'DISCONNECTED', checks: {} };
    }
  },

  // Emergency Kill Switch
  async triggerKillSwitch(reason) {
    const res = await fetch(`${BASE_URL}/trading/kill-switch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });
    return await res.json();
  },

  async resetKillSwitch() {
    const res = await fetch(`${BASE_URL}/trading/kill-switch/reset`, {
      method: 'POST'
    });
    return await res.json();
  },

  // Strategies
  async getStrategies() {
    try {
      const res = await fetch(`${BASE_URL}/strategies`);
      return await res.json();
    } catch (e) {
      return { success: false, data: [] };
    }
  },

  async toggleStrategy(id, shouldEnable) {
    const endpoint = shouldEnable ? 'enable' : 'disable';
    const res = await fetch(`${BASE_URL}/strategies/${id}/${endpoint}`, {
      method: 'POST'
    });
    return await res.json();
  },

  async updateStrategyMode(id, mode) {
    const res = await fetch(`${BASE_URL}/strategies/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tradingMode: mode })
    });
    return await res.json();
  },

  // Orders & Positions
  async getOrders() {
    try {
      const res = await fetch(`${BASE_URL}/orders`);
      return await res.json();
    } catch (e) {
      return { success: false, data: [] };
    }
  },

  async getPositions() {
    try {
      const res = await fetch(`${BASE_URL}/positions`);
      return await res.json();
    } catch (e) {
      return { success: false, data: [] };
    }
  },

  // Trades & Performance
  async getTrades() {
    try {
      const res = await fetch(`${BASE_URL}/trades`);
      return await res.json();
    } catch (e) {
      return { success: false, data: [], metrics: {} };
    }
  }
};

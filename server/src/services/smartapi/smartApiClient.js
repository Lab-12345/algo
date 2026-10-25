import axios from 'axios';
import { config } from '../../config/env.js';
import { validateOrderCompliance } from '@tradepilot/shared';

export class SmartApiClient {
  constructor() {
    this.baseUrl = config.smartApi.baseUrl;
    this.jwtToken = null;
    this.refreshToken = null;
    this.feedToken = null;
    this.currentOutboundIp = null;
    this.lastIpCheckTime = 0;
  }

  /**
   * Checks outbound public IPv4 against AWS checkip endpoint.
   * Ensures the worker is running on the whitelisted static IP before placing orders.
   */
  async getOutboundIp() {
    const now = Date.now();
    // Cache outbound IP for 5 minutes
    if (this.currentOutboundIp && now - this.lastIpCheckTime < 300000) {
      return this.currentOutboundIp;
    }

    try {
      const res = await axios.get('https://checkip.amazonaws.com', { timeout: 4000 });
      this.currentOutboundIp = res.data.trim();
      this.lastIpCheckTime = now;
      return this.currentOutboundIp;
    } catch (err) {
      console.warn(`[SmartAPI] Could not check outbound IP via AWS checkip: ${err.message}`);
      return 'UNKNOWN';
    }
  }

  /**
   * Authenticates with Angel One SmartAPI using TOTP
   */
  async login(clientCode = config.smartApi.clientCode, password = config.smartApi.password, totp = '') {
    if (!clientCode || !config.smartApi.apiKey) {
      console.warn('[SmartAPI] Missing API Key or Client Code in environment.');
      return { success: false, message: 'Missing credentials' };
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/rest/auth/angelbroking/user/v1/loginByPassword`,
        {
          clientcode: clientCode,
          password: password,
          totp: totp
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-UserType': 'USER',
            'X-SourceID': 'WEB',
            'X-ClientLocalIP': '127.0.0.1',
            'X-ClientPublicIP': await this.getOutboundIp(),
            'X-MACAddress': 'MAC_PLACEHOLDER',
            'X-PrivateKey': config.smartApi.apiKey
          },
          timeout: 8000
        }
      );

      if (response.data?.status && response.data?.data?.jwtToken) {
        this.jwtToken = response.data.data.jwtToken;
        this.refreshToken = response.data.data.refreshToken;
        this.feedToken = response.data.data.feedToken;
        console.log('[SmartAPI] Logged in successfully. Session active.');
        return { success: true, data: response.data.data };
      } else {
        return { success: false, message: response.data?.message || 'Login failed' };
      }
    } catch (error) {
      const msg = error.response?.data?.message || error.message;
      console.error(`[SmartAPI] Login error: ${msg}`);
      return { success: false, message: msg };
    }
  }

  /**
   * Places an order with strict pre-flight static IP & 2026 Algo compliance validation
   */
  async placeOrder(orderParams) {
    // 1. Compliance check (Section 7.2 of report: Market & IOC orders are prohibited)
    const compliance = validateOrderCompliance({
      orderType: orderParams.ordertype,
      variety: orderParams.variety || 'NORMAL'
    });

    if (!compliance.isValid) {
      throw new Error(`[SmartAPI Compliance] ${compliance.error}`);
    }

    // 2. Static IP check (Section 3.2 of report)
    const outboundIp = await this.getOutboundIp();
    if (config.enforceStaticIpCheck && config.registeredStaticIp) {
      if (outboundIp !== config.registeredStaticIp) {
        throw new Error(
          `[SmartAPI Static IP Failure] Egress IP (${outboundIp}) does not match registered static IP (${config.registeredStaticIp}). Order blocked.`
        );
      }
    }

    // 3. Broker API Call
    if (!this.jwtToken) {
      throw new Error('[SmartAPI] Active broker session token missing. Please authenticate first.');
    }

    const payload = {
      variety: orderParams.variety || 'NORMAL',
      tradingsymbol: orderParams.tradingsymbol,
      symboltoken: orderParams.symboltoken,
      transactiontype: orderParams.transactiontype, // BUY or SELL
      exchange: orderParams.exchange || 'NFO',
      ordertype: orderParams.ordertype, // LIMIT or STOPLOSS_LIMIT
      producttype: orderParams.producttype || 'INTRADAY',
      duration: 'DAY',
      price: orderParams.price.toString(),
      triggerprice: (orderParams.triggerprice || 0).toString(),
      quantity: orderParams.quantity.toString()
    };

    const response = await axios.post(
      `${this.baseUrl}/rest/secure/angelbroking/order/v1/placeOrder`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-UserType': 'USER',
          'X-SourceID': 'WEB',
          'X-ClientLocalIP': '127.0.0.1',
          'X-ClientPublicIP': outboundIp,
          'X-PrivateKey': config.smartApi.apiKey,
          'Authorization': `Bearer ${this.jwtToken}`
        },
        timeout: 8000
      }
    );

    return {
      success: response.data?.status || false,
      orderid: response.data?.data?.orderid,
      outboundIp,
      data: response.data
    };
  }

  /**
   * Fetches current order book for reconciliation and status verification
   */
  async getOrderBook() {
    if (!this.jwtToken) return { success: false, data: [] };

    try {
      const response = await axios.get(
        `${this.baseUrl}/rest/secure/angelbroking/order/v1/getOrderBook`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-UserType': 'USER',
            'X-SourceID': 'WEB',
            'X-PrivateKey': config.smartApi.apiKey,
            'Authorization': `Bearer ${this.jwtToken}`
          },
          timeout: 6000
        }
      );
      return { success: true, data: response.data?.data || [] };
    } catch (err) {
      console.error('[SmartAPI] getOrderBook error:', err.message);
      return { success: false, error: err.message, data: [] };
    }
  }

  /**
   * Fetches current open positions from broker
   */
  async getPositions() {
    if (!this.jwtToken) return { success: false, data: [] };

    try {
      const response = await axios.get(
        `${this.baseUrl}/rest/secure/angelbroking/order/v1/getPosition`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-UserType': 'USER',
            'X-SourceID': 'WEB',
            'X-PrivateKey': config.smartApi.apiKey,
            'Authorization': `Bearer ${this.jwtToken}`
          },
          timeout: 6000
        }
      );
      return { success: true, data: response.data?.data || [] };
    } catch (err) {
      console.error('[SmartAPI] getPositions error:', err.message);
      return { success: false, error: err.message, data: [] };
    }
  }
}

export const smartApiClient = new SmartApiClient();

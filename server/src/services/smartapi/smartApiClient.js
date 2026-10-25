import axios from 'axios';
import crypto from 'crypto';
import { config } from '../../config/env.js';
import { validateOrderCompliance } from '@tradepilot/shared';

/**
 * Converts a base32 encoded string into a Buffer
 */
function base32ToBuffer(base32) {
  const charTable = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = (base32 || '').toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const bytes = [];
  for (let i = 0; i < clean.length; i++) {
    const val = charTable.indexOf(clean[i]);
    if (val === -1) continue;
    value = (value << 5) | val;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/**
 * Generates an RFC 6238 6-digit TOTP code using HMAC-SHA1
 */
export function generateTOTP(secret) {
  if (!secret) return '';
  const key = base32ToBuffer(secret);
  const epoch = Math.floor(Date.now() / 1000);
  const counter = Math.floor(epoch / 30);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1000000;
  return code.toString().padStart(6, '0');
}

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

    const resolvedTotp = totp || (config.smartApi.totpKey ? generateTOTP(config.smartApi.totpKey) : '');

    try {
      const publicIp = await this.getOutboundIp();
      const response = await axios.post(
        `${this.baseUrl}/rest/auth/angelbroking/user/v1/loginByPassword`,
        {
          clientcode: clientCode,
          password: password,
          totp: resolvedTotp
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-UserType': 'USER',
            'X-SourceID': 'WEB',
            'X-ClientLocalIP': '127.0.0.1',
            'X-ClientPublicIP': publicIp,
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
        return { success: false, message: response.data?.message || 'Login failed', data: response.data };
      }
    } catch (error) {
      const msg = error.response?.data?.message || error.message;
      console.error(`[SmartAPI] Login error: ${msg}`);
      return { success: false, message: msg, error: error.response?.data };
    }
  }

  /**
   * Ensures active session, automatically logging in with TOTP if needed
   */
  async ensureAuthenticated() {
    if (this.jwtToken) return true;
    if (config.smartApi.clientCode && config.smartApi.apiKey) {
      const loginRes = await this.login();
      return loginRes.success;
    }
    return false;
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

    // 3. Broker API Call - ensure authenticated
    await this.ensureAuthenticated();
    if (!this.jwtToken) {
      throw new Error('[SmartAPI] Active broker session token missing. Automatic login failed. Please verify API key, Client Code, Password, and TOTP key in .env.');
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
    await this.ensureAuthenticated();
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
    await this.ensureAuthenticated();
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

  /**
   * Fetches trader profile information from broker
   */
  async getProfile() {
    await this.ensureAuthenticated();
    if (!this.jwtToken) return { success: false, message: 'Unauthenticated' };

    try {
      const response = await axios.get(
        `${this.baseUrl}/rest/secure/angelbroking/user/v1/getProfile`,
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
      return { success: response.data?.status || false, data: response.data?.data };
    } catch (err) {
      console.error('[SmartAPI] getProfile error:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Fetches user holdings with overall total holding portfolio summary
   * Endpoint: /rest/secure/angelbroking/portfolio/v1/getAllHolding
   */
  async getAllHoldings() {
    await this.ensureAuthenticated();
    if (!this.jwtToken) return { success: false, message: 'Unauthenticated with broker' };

    try {
      const publicIp = await this.getOutboundIp();
      console.log(`[SmartAPI] Fetching /portfolio/v1/getAllHolding via IP: ${publicIp}...`);
      const response = await axios.get(
        `${this.baseUrl}/rest/secure/angelbroking/portfolio/v1/getAllHolding`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-UserType': 'USER',
            'X-SourceID': 'WEB',
            'X-ClientLocalIP': '127.0.0.1',
            'X-ClientPublicIP': publicIp,
            'X-MACAddress': 'fe80::1',
            'X-PrivateKey': config.smartApi.apiKey,
            'Authorization': `Bearer ${this.jwtToken}`
          },
          timeout: 8000
        }
      );

      console.log('[SmartAPI] getAllHolding status:', response.data?.status, 'message:', response.data?.message);

      return {
        success: response.data?.status || false,
        message: response.data?.message || 'SUCCESS',
        data: response.data?.data || { holdings: [], totalholding: null }
      };
    } catch (err) {
      console.error('[SmartAPI] getAllHoldings error:', err.response?.data || err.message);
      return { success: false, error: err.response?.data?.message || err.message, data: { holdings: [], totalholding: null } };
    }
  }

  /**
   * Fetches raw Demat stock holdings list
   * Endpoint: /rest/secure/angelbroking/portfolio/v1/getHolding
   */
  async getHoldings() {
    await this.ensureAuthenticated();
    if (!this.jwtToken) return { success: false, message: 'Unauthenticated with broker' };

    try {
      const publicIp = await this.getOutboundIp();
      console.log(`[SmartAPI] Fetching /portfolio/v1/getHolding via IP: ${publicIp}...`);
      const response = await axios.get(
        `${this.baseUrl}/rest/secure/angelbroking/portfolio/v1/getHolding`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-UserType': 'USER',
            'X-SourceID': 'WEB',
            'X-ClientLocalIP': '127.0.0.1',
            'X-ClientPublicIP': publicIp,
            'X-MACAddress': 'fe80::1',
            'X-PrivateKey': config.smartApi.apiKey,
            'Authorization': `Bearer ${this.jwtToken}`
          },
          timeout: 8000
        }
      );

      console.log('[SmartAPI] getHolding status:', response.data?.status, 'count:', Array.isArray(response.data?.data) ? response.data.data.length : 'non-array');

      const holdingsArray = Array.isArray(response.data?.data)
        ? response.data.data
        : Array.isArray(response.data)
        ? response.data
        : [];

      return {
        success: response.data?.status || (holdingsArray.length > 0),
        message: response.data?.message || 'SUCCESS',
        data: holdingsArray
      };
    } catch (err) {
      console.error('[SmartAPI] getHoldings error:', err.response?.data || err.message);
      return { success: false, error: err.response?.data?.message || err.message, data: [] };
    }
  }

  /**
   * Converts a position product type (e.g. DELIVERY <-> INTRADAY, CARRYFORWARD <-> INTRADAY)
   * Endpoint: /rest/secure/angelbroking/order/v1/convertPosition
   */
  async convertPosition(params) {
    await this.ensureAuthenticated();
    if (!this.jwtToken) throw new Error('[SmartAPI] Active broker session missing');

    const publicIp = await this.getOutboundIp();
    const payload = {
      exchange: params.exchange || 'NSE',
      symboltoken: params.symboltoken,
      oldproducttype: params.oldproducttype,
      newproducttype: params.newproducttype,
      tradingsymbol: params.tradingsymbol,
      symbolname: params.symbolname || params.tradingsymbol,
      instrumenttype: params.instrumenttype || '',
      priceden: (params.priceden || '1').toString(),
      pricenum: (params.pricenum || '1').toString(),
      genden: (params.genden || '1').toString(),
      gennum: (params.gennum || '1').toString(),
      precision: (params.precision || '2').toString(),
      multiplier: (params.multiplier || '-1').toString(),
      boardlotsize: (params.boardlotsize || '1').toString(),
      buyqty: (params.buyqty || 0).toString(),
      sellqty: (params.sellqty || 0).toString(),
      buyamount: (params.buyamount || '0').toString(),
      sellamount: (params.sellamount || '0').toString(),
      transactiontype: params.transactiontype || 'BUY',
      quantity: parseInt(params.quantity, 10),
      type: params.type || 'DAY'
    };

    const response = await axios.post(
      `${this.baseUrl}/rest/secure/angelbroking/order/v1/convertPosition`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-UserType': 'USER',
          'X-SourceID': 'WEB',
          'X-ClientLocalIP': '127.0.0.1',
          'X-ClientPublicIP': publicIp,
          'X-PrivateKey': config.smartApi.apiKey,
          'Authorization': `Bearer ${this.jwtToken}`
        },
        timeout: 8000
      }
    );

    return {
      success: response.data?.status || false,
      message: response.data?.message || 'SUCCESS',
      data: response.data
    };
  }
}

export const smartApiClient = new SmartApiClient();

import WebSocket from 'ws';
import EventEmitter from 'events';

export class SmartApiWebSocket extends EventEmitter {
  constructor(apiKey, clientCode, feedToken) {
    super();
    this.apiKey = apiKey;
    this.clientCode = clientCode;
    this.feedToken = feedToken;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.isConnected = false;
    this.pingInterval = null;
  }

  /**
   * Connects to Angel One SmartAPI WebSocket streaming endpoint
   */
  connect() {
    if (!this.feedToken) {
      console.warn('[SmartAPI WS] No feed token provided. Switching to synthetic tick simulation mode.');
      this.startSyntheticTickFeed();
      return;
    }

    const wsUrl = `wss://smartapisocket.angelone.in/smart-stream`;
    console.log(`[SmartAPI WS] Connecting to ${wsUrl}...`);

    try {
      this.ws = new WebSocket(wsUrl, {
        headers: {
          'Authorization': `Bearer ${this.feedToken}`,
          'x-api-key': this.apiKey,
          'x-client-code': this.clientCode,
          'x-feed-token': this.feedToken
        }
      });

      this.ws.on('open', () => {
        console.log('[SmartAPI WS] WebSocket connection established successfully.');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.emit('connected');
        this._setupHeartbeat();
      });

      this.ws.on('message', (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          this.emit('tick', parsed);
        } catch (e) {
          // Handle binary tick stream if enabled
          this.emit('rawTick', data);
        }
      });

      this.ws.on('close', (code, reason) => {
        console.warn(`[SmartAPI WS] Connection closed (${code}): ${reason}. Reconnecting...`);
        this.isConnected = false;
        clearInterval(this.pingInterval);
        this._scheduleReconnect();
      });

      this.ws.on('error', (err) => {
        console.error(`[SmartAPI WS] Error: ${err.message}`);
      });
    } catch (err) {
      console.error(`[SmartAPI WS] Init exception: ${err.message}`);
      this._scheduleReconnect();
    }
  }

  _setupHeartbeat() {
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, 20000);
  }

  _scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[SmartAPI WS] Max reconnect attempts reached. Switching to fallback generator.');
      this.startSyntheticTickFeed();
      return;
    }

    const backoffMs = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;
    console.log(`[SmartAPI WS] Reconnecting in ${backoffMs / 1000}s (Attempt ${this.reconnectAttempts})...`);
    setTimeout(() => this.connect(), backoffMs);
  }

  /**
   * Generates realistic simulated market ticks for local testing & development
   */
  startSyntheticTickFeed(basePrice = 24500, symbol = 'NIFTY') {
    console.log(`[SYNTHETIC TICK FEED] Started realistic price simulation for ${symbol} @ ~${basePrice}`);
    let currentPrice = basePrice;

    setInterval(() => {
      // Gaussian random walk with intraday drift
      const delta = (Math.random() - 0.495) * 6;
      currentPrice = parseFloat((currentPrice + delta).toFixed(2));
      const volume = Math.floor(Math.random() * 50) + 1;

      this.emit('tick', {
        symbol,
        ltp: currentPrice,
        volume,
        timestamp: Date.now()
      });
    }, 1000); // 1 tick per second
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
    clearInterval(this.pingInterval);
  }
}

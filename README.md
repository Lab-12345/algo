# TradePilot: Automated Trading Platform
**MERN Stack + Persistent Worker Engine with Angel One SmartAPI Integration**

TradePilot is an institutional-grade, personal algorithmic trading architecture designed to run reliably 24/7 on a Linux VPS with a registered static IPv4 address, decoupling automated order execution from browser or laptop sessions.

---

## 🏗️ System Architecture

```
                                 [ Operator Web UI ]
                                          │
                                          ▼ (HTTPS / WSS)
[ AWS Lightsail VPS (Mumbai) - Static Public IPv4 ]
┌─────────────────────────────────────────────────────────────┐
│  Nginx Reverse Proxy & SSL (Certbot)                        │
│   ├── /       ──> React Client Build (SPA Dashboard)        │
│   └── /api/*  ──> Express REST API (Port 5000)             │
│                                                             │
│  [ PM2 / Systemd Process Manager ]                          │
│   ├── Service 1: tradepilot-api (Express REST API)          │
│   │    └── Auth, Strategy Config, Health, Audit Logs        │
│   │                                                         │
│   └── Service 2: tradepilot-worker (Isolated Daemon)        │
│        ├── Multi-Timeframe Candle Builder (5m, 15m)         │
│        ├── VWAP & Trend Filter Engine                       │
│        ├── Pre-Trade Risk Gates & Kill Switch               │
│        └── Order Manager (Paper Simulator / Live SmartAPI)  │
└────────────────────────────────┬────────────────────────────┘
                                 │ Egress Static IPv4
                                 ▼
                     [ Angel One SmartAPI Gateway ]
                     • REST API: Orders & Positions
                     • WebSocket: Live Ticks / Quotes
```

---

## 📁 Repository Structure

- **`client/`**: React dashboard with dark-mode cyberpunk UI, live P&L, strategy orchestrator, position monitors, and emergency kill-switch.
- **`server/`**: Express REST API with Mongoose schemas (`User`, `Strategy`, `Signal`, `Order`, `Position`, `Trade`, `AuditLog`), authentication, and risk validation.
- **`worker/`**: Long-running background trading daemon: WebSocket streaming, candle aggregation, strategy runner, order state machine, and periodic broker reconciliation.
- **`shared/`**: Shared domain enums (`OrderState`, `TradingMode`), 2026 compliance rules, and deterministic idempotency utilities.
- **`ops/`**: Nginx configuration, PM2 ecosystem files, systemd unit, and automated deployment/backup bash scripts.

---

## 🔒 2026 Angel One Algo Compliance

1. **Static IPv4 Egress Mandatory**: All order placement, modification, cancellation, and GTT actions must originate from the dedicated IPv4 address registered in the SmartAPI portal.
2. **Prohibition of Market and IOC Orders**: Under Angel One 2026 algorithmic trading regulations, `MARKET` and `IOC` order varieties are prohibited. TradePilot strictly enforces `LIMIT` and `STOPLOSS_LIMIT` order execution.
3. **Paper/Live Separation**: Live mode is gated by default (`ALLOW_LIVE_TRADING=false`). All strategies default to `PAPER` execution until explicitly enabled by the operator.
4. **Idempotency & Reconnection**: Every order intent generates a deterministic client order ID to prevent duplicate submissions on timeouts or reconnections.

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: LTS version (v20 or v22)
- **MongoDB**: Local MongoDB instance or MongoDB Atlas connection URI

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in your credentials:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/tradepilot
SMARTAPI_API_KEY=your_api_key
SMARTAPI_CLIENT_CODE=your_client_code
SMARTAPI_PASSWORD=your_password
SMARTAPI_TOTP_KEY=your_totp_secret
DEFAULT_TRADING_MODE=PAPER
ALLOW_LIVE_TRADING=false
```

### 3. Install Dependencies & Run Locally
```bash
npm install

# Run Express REST API
npm run start:server

# Run Persistent Trading Worker
npm run start:worker

# Run React Frontend
npm run start:client
```

---

## ☁️ Production VPS Deployment (AWS Lightsail Mumbai)

1. Provision an **AWS Lightsail Ubuntu 22.04 / 24.04 LTS** instance in the **Mumbai (ap-south-1)** region (Recommended: 2 GB RAM / $12/mo plan).
2. Attach a **Static IPv4 Address** in Lightsail Networking.
3. SSH into the VPS and verify outbound IPv4:
   ```bash
   curl -4 https://checkip.amazonaws.com
   ```
4. Register this static IPv4 address in the **Angel One SmartAPI Developer Portal** under your App credentials.
5. Clone repository and run automated setup:
   ```bash
   chmod +x ops/scripts/*.sh
   ./ops/scripts/deploy.sh
   ```
6. Check service status:
   ```bash
   pm2 status
   pm2 logs tradepilot-worker
   ```

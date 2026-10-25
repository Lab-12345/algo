# 🚀 Deploying TradePilot on AWS Lightsail (Native Node.js + PM2)

This guide walks you through deploying TradePilot on an **AWS Lightsail Ubuntu VPS** with a **dedicated Static IPv4 address** using native Node.js and PM2 (no Docker needed).

---

## 🏛️ Deployment Architecture

```
 [ Cloudflare Pages ]                            [ AWS Lightsail VPS (Mumbai - ap-south-1) ]
 React Frontend Dashboard                        Dedicated Static IPv4: 13.232.230.172
          │                                      ┌──────────────────────────────────────────────┐
          │ (HTTPS /api requests)                │ PM2 Process Manager                          │
          ▼                                      │                                              │
 [ Cloudflare DNS / Proxy ]                      │  Service 1: tradepilot-api (Port 5000)       │
 api.yourdomain.com ──► Attached Static IP ─────►│   └── Express REST API & Health Check        │
                                                 │                                              │
                                                 │  Service 2: tradepilot-worker                │
                                                 │   ├── Multi-Timeframe Candle Aggregator      │
                                                 │   ├── Pre-Trade Risk Gates                   │
                                                 │   └── Order Execution State Machine          │
                                                 └──────────────────────┬───────────────────────┘
                                                                        │ Outbound Egress
                                                                        ▼ (Matches Whitelisted Static IP)
                                                           [ Angel One SmartAPI Gateway ]
                                                           • Order Placement & Modifications
                                                           • Live WebSocket Quotes
```

---

## 📋 Step 1: Create AWS Lightsail VPS in Mumbai

1. Log in to [AWS Lightsail Console](https://lightsail.aws.amazon.com/).
2. Click **Create instance**:
   - **Location**: **Mumbai (`ap-south-1`)** *(closest to NSE/BSE Mumbai)*.
   - **Platform**: **Linux/Unix**.
   - **Blueprint**: **Ubuntu 24.04 LTS** or **Ubuntu 22.04 LTS**.
   - **Plan**: $3.50/mo (512 MB) or $5.00/mo (1 GB RAM - recommended).
3. Once the instance is running:
   - Go to the **Networking** tab.
   - Click **Create static IP** and attach it to your instance.
   - Note down your **Static IPv4** (e.g. `13.232.230.172`).
4. In the Lightsail **IPv4 Firewall** section:
   - Click **Add rule** > Custom > TCP > Port **`5000`** (Allow all).
   - Also allow Port **`80`** (HTTP) and **`443`** (HTTPS) if using Nginx.

---

## 🔒 Step 2: Whitelist Static IP in Angel One

1. Log in to your [Angel One SmartAPI Portal](https://smartapi.angelone.in/).
2. Edit your Trading App.
3. In the **Registered Static IP / Whitelist IP** field, paste your AWS Lightsail static IPv4.
4. Save your changes.

---

## 💻 Step 3: Run Setup on the VPS

1. Open your VPS terminal by clicking the orange terminal icon (`>_`) in the AWS Lightsail console.
2. In the VPS terminal, run the automated setup commands:

```bash
# 1. Update OS and install Node.js 20 & PM2
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw

curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2

# 2. Clone your repository
git clone https://github.com/Lab-12345/algo.git algo
cd algo

# 3. Configure .env file
cp .env.example .env
nano .env
```

3. In `.env`, configure:
```env
NODE_ENV=production
PORT=5000
CLIENT_URL=*
MONGODB_URI=mongodb+srv://laba:3roTOiPmQAHFZRrE@cluster0.l173t.mongodb.net/tradepilot?retryWrites=true&w=majority

# Set your actual Lightsail static IP:
REGISTERED_STATIC_IP=13.232.230.172
ENFORCE_STATIC_IP_CHECK=true

# Angel One Credentials:
SMARTAPI_API_KEY=your_key
SMARTAPI_CLIENT_CODE=your_client_id
SMARTAPI_PASSWORD=your_pin
SMARTAPI_TOTP_KEY=your_totp_secret

DEFAULT_TRADING_MODE=PAPER
ALLOW_LIVE_TRADING=false
```
*(Press `Ctrl+O` then `Enter` to save, and `Ctrl+X` to exit nano)*.

---

## 🔍 Step 4: Verify Static IP Egress

Run the built-in IP verification tool:
```bash
chmod +x ops/scripts/verify-ip.sh
./ops/scripts/verify-ip.sh
```
Expected output:
```
------------------------------------------------------
 TradePilot Static IP Egress Verification Tool
------------------------------------------------------
Detected Outbound IPv4 : 13.232.230.172
Configured Static IP   : 13.232.230.172
 STATUS: MATCH! Egress IP matches your registered SmartAPI IP.
```

---

## 🚀 Step 5: Install Dependencies & Start PM2

```bash
# 1. Install dependencies
npm install

# 2. Start both REST API and Trading Worker using PM2
mkdir -p logs
pm2 start ops/pm2/ecosystem.config.cjs

# 3. Save PM2 list so services auto-restart on VPS reboot
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME
```

Verify your services are running:
```bash
pm2 status
```
You should see:
- `tradepilot-api` (online)
- `tradepilot-worker` (online)

---

## 🌐 Step 6: Connect Cloudflare Pages Frontend

1. Go to your **Cloudflare Pages** dashboard.
2. In your Project Settings > **Environment variables**:
   - `VITE_API_URL` = `http://13.232.230.172:5000` *(or `https://api.yourdomain.com` if using a custom domain)*.
3. Trigger a redeploy. Your Cloudflare frontend is now live and communicating directly with your AWS Lightsail static IP backend!

---

## 🛠️ PM2 Useful Commands

| Command | Action |
| :--- | :--- |
| `pm2 status` | View running status of API and Worker |
| `pm2 logs` | Stream live combined logs |
| `pm2 logs tradepilot-api` | Stream only REST API logs |
| `pm2 logs tradepilot-worker` | Stream trading worker ticks & order logs |
| `pm2 restart all` | Restart all services |
| `pm2 stop all` | Stop all services |

# 🌐 Deploying TradePilot: Cloudflare Pages (Frontend) + Koyeb (Backend)

This production deployment guide covers hosting the **React Frontend** on **Cloudflare Pages** (high-speed global edge CDN) and the **Express REST API Server** on **Koyeb** (containerized serverless microVMs).

---

## 🏛️ Deployment Architecture

```
                 [ User Browser / Mobile ]
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
   [ Cloudflare Pages ]               [ Koyeb Cloud ]
   • Global Anycast CDN               • Node.js REST API Container
   • React Vite SPA                   • Auto-healing, Port 8000
   • Automatic SSL / DDoS             • Region: Singapore (sin) / Frankfurt (fra)
   • SPA Routing (_redirects)                 │
            │                                 │
            │ (API Requests / JWT Auth)       ▼
            └───────────────────────► [ MongoDB Atlas (Cloud) ]
                                      • M0 Free Cluster
                                      • Persistent Audit & Strategy Store
```

---

## 📋 Pre-Flight Checklist

1. **Git Repository**: Push your code to GitHub or GitLab.
2. **MongoDB Atlas Account**: Set up a free MongoDB Atlas M0 cluster ([mongodb.com/atlas](https://www.mongodb.com/atlas)).
3. **Koyeb Account**: Sign up at [koyeb.com](https://www.koyeb.com).
4. **Cloudflare Account**: Sign up at [cloudflare.com](https://www.cloudflare.com).

---

## 🚀 Part 1: Deploy Backend REST API on Koyeb

### Step 1: Database Setup (MongoDB Atlas)
1. In your MongoDB Atlas cluster, create a database user (e.g. `tradepilot_admin`).
2. Go to **Network Access** > **Add IP Address** > Select **Allow Access from Anywhere** (`0.0.0.0/0`). *(Required because Koyeb instances use dynamic cloud IP pools).*
3. Under **Database** > **Connect** > **Drivers**, copy your connection string:
   ```
   mongodb+srv://<username>:<password>@cluster0.mongodb.net/tradepilot?retryWrites=true&w=majority
   ```

### Step 2: Deploy to Koyeb
1. Log in to the [Koyeb Control Panel](https://app.koyeb.com/).
2. Click **Create Service** > Select **GitHub**.
3. Choose your TradePilot repository.
4. In the **Builder** section:
   - **Deployment method**: Select **Dockerfile**.
   - **Dockerfile location**: `Dockerfile` (or leave default `/Dockerfile`).
5. In the **Instance & Region** section:
   - **Instance type**: `nano` (Free tier eligible) or `micro`.
   - **Region**: Select **Singapore (`sin`)** (closest to NSE/BSE Mumbai with lowest latency) or **Frankfurt (`fra`)**.
6. In the **Ports & Routes** section:
   - **Port**: `8000`
   - **Protocol**: `HTTP`
   - **Path**: `/`
7. In the **Health Checks** section:
   - **Type**: `HTTP`
   - **Path**: `/health`
   - **Port**: `8000`
8. In the **Environment Variables** section, add the following:

| Variable | Value | Notes |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Production optimizations |
| `PORT` | `8000` | Port listened by Koyeb container |
| `CLIENT_URL` | `*` | Or your Cloudflare domain once created |
| `MONGODB_URI` | `mongodb+srv://...` | Your MongoDB Atlas connection URI |
| `JWT_SECRET` | `<random-32-char-string>` | Generate a secure secret |
| `DEFAULT_TRADING_MODE` | `PAPER` | Default to PAPER for safety |
| `ALLOW_LIVE_TRADING` | `false` | Gate live trading orders |
| `ENFORCE_STATIC_IP_CHECK` | `false` | Koyeb uses dynamic egress IPs |
| `SMARTAPI_API_KEY` | `<your_api_key>` | Angel One API Key (optional in paper mode) |
| `SMARTAPI_CLIENT_CODE` | `<your_client_id>` | Angel One Client Code |
| `SMARTAPI_PASSWORD` | `<your_password>` | Angel One PIN / Password |
| `SMARTAPI_TOTP_KEY` | `<your_totp_key>` | Angel One TOTP Secret |

9. Click **Deploy**.
10. Once deployed, Koyeb will assign a public HTTPS domain:
    ```
    https://tradepilot-server-<your-org>.koyeb.app
    ```
11. Test the backend in your browser:
    ```bash
    curl https://tradepilot-server-<your-org>.koyeb.app/health
    # Response: {"status":"OK","service":"tradepilot-api","timestamp":"..."}
    ```

---

## ⚡ Part 2: Deploy Frontend on Cloudflare Pages

### Step 1: Create Cloudflare Pages Project
1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. In the left sidebar, navigate to **Compute (Workers) > Workers & Pages**.
3. Click **Create application** > **Pages** tab > **Connect to Git**.
4. Select your GitHub/GitLab account and pick the TradePilot repository.

### Step 2: Configure Build Settings
Fill in the configuration:

| Setting | Value |
| :--- | :--- |
| **Project name** | `tradepilot` (or your choice) |
| **Production branch** | `main` |
| **Framework preset** | `Vite` |
| **Root directory** | `client` |
| **Build command** | `npm run build` |
| **Build output directory** | `dist` |

### Step 3: Add Environment Variables
Under **Environment variables (advanced)**, add:

| Variable Name | Value |
| :--- | :--- |
| `VITE_API_URL` | `https://tradepilot-server-<your-org>.koyeb.app` |

*(Make sure to use the exact Koyeb URL from Part 1, without a trailing slash).*

### Step 4: Deploy
1. Click **Save and Deploy**.
2. Cloudflare will install dependencies, build the React SPA, and distribute it to all 300+ global edge data centers.
3. Your frontend is live at:
   ```
   https://tradepilot.pages.dev
   ```

---

## 🛡️ Part 3: SPA Routing & Proxy Configurations

### 1. SPA Routing Fallback (`_redirects`)
To prevent `404 Not Found` when reloading client-side routes, TradePilot includes [client/public/_redirects](file:///c:/Users/belos/Desktop/algo/client/public/_redirects):
```
/*    /index.html   200
```
This is automatically copied to `client/dist/_redirects` during build.

### 2. Optional: Cloudflare Edge Reverse Proxy (Zero CORS)
If you prefer all `/api` requests to go through the Cloudflare domain (`https://tradepilot.pages.dev/api/...`) and be proxied directly to Koyeb:
1. Update `client/public/_redirects` to:
   ```
   /api/*    https://tradepilot-server-<your-org>.koyeb.app/api/:splat    200
   /*        /index.html                                                  200
   ```
2. Remove or leave `VITE_API_URL` blank in Cloudflare Pages.
3. The frontend will automatically use `/api`, routing seamlessly through Cloudflare's edge proxy with zero CORS preflight overhead.

---

## 🔒 Part 4: Important Regulatory & Trading Considerations (2026)

### ⚠️ Angel One SmartAPI Static IP Egress
- **Paper Trading**: Fully operational on Koyeb + Cloudflare. Strategies simulate fills in real-time.
- **Live Trading**: Under Angel One 2026 regulations, live trade executions (`placeOrder`, `modifyOrder`, `cancelOrder`) must originate from the **dedicated static IPv4** whitelisted in your SmartAPI developer console.
- **Recommendation for Live Trading**:
  - Run the **REST API (`server`)** on Koyeb.
  - Run the **Web UI (`client`)** on Cloudflare Pages.
  - Run the **Execution Worker (`worker`)** on an **AWS Lightsail Mumbai VPS ($3.50-$5/mo)** with an attached static IPv4, connected to the same MongoDB Atlas database.
  - This architecture gives you the best of both worlds: zero server maintenance for the web dashboard, and strict regulatory compliance for trade execution.

---

## 🧪 Local Testing Before Push

To test the production build locally:
```bash
# 1. Build the frontend
npm run build

# 2. Test server in production mode
set NODE_ENV=production
set PORT=8000
npm --workspace=server start
```

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';

import { config } from './config/env.js';
import { connectDB } from './config/db.js';

import authRoutes from './routes/authRoutes.js';
import strategyRoutes from './routes/strategyRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import tradeRoutes from './routes/tradeRoutes.js';
import systemRoutes from './routes/systemRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security and utility middleware
app.use(helmet({
  contentSecurityPolicy: false // Allow modern dashboard assets & charts
}));
// Configure CORS for Cloudflare Pages, custom domain, and local development
const allowedOrigins = [
  config.clientUrl,
  'http://localhost:5173',
  'http://localhost:3000'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests, wildcard mode, local or Cloudflare domains (*.pages.dev, *.workers.dev)
    if (!origin || config.clientUrl === '*' || allowedOrigins.includes(origin) || origin.endsWith('.pages.dev') || origin.endsWith('.workers.dev')) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan(config.env === 'development' ? 'dev' : 'combined'));

// API Routes (Section 6.3 of report)
app.use('/api/auth', authRoutes);
app.use('/api/strategies', strategyRoutes);
app.use('/api', orderRoutes);
app.use('/api/trades', tradeRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/trading', systemRoutes); // For /api/trading/kill-switch

// Serve client build if available (production VPS deployment)
const clientBuildPath = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientBuildPath));

// Base health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'tradepilot-api', timestamp: new Date() });
});

// Fallback for SPA routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'API route not found' });
  }
  res.sendFile(path.join(clientBuildPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('TradePilot API running. Frontend client will be served here once built.');
    }
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]', err.stack || err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Start Server
async function startServer() {
  await connectDB();

  app.listen(config.port, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(` TradePilot REST API running on http://0.0.0.0:${config.port}`);
    console.log(` Mode: ${config.defaultTradingMode} | Live Enabled: ${config.allowLiveTrading}`);
    console.log(` Registered Static IP: ${config.registeredStaticIp || 'NONE'}`);
    console.log(`=======================================================`);
  });
}

startServer();

export default app;

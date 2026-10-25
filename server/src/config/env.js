import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from root if available, otherwise local server directory
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET || 'dev_jwt_secret_change_in_production_key_12345',
  jwtExpiry: process.env.JWT_EXPIRY || '24h',
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/tradepilot',
  
  // Execution Mode Defaults
  defaultTradingMode: process.env.DEFAULT_TRADING_MODE || 'PAPER',
  allowLiveTrading: process.env.ALLOW_LIVE_TRADING === 'true',

  // Angel One SmartAPI Config
  smartApi: {
    apiKey: process.env.SMARTAPI_API_KEY || '',
    clientCode: process.env.SMARTAPI_CLIENT_CODE || '',
    password: process.env.SMARTAPI_PASSWORD || '',
    totpKey: process.env.SMARTAPI_TOTP_KEY || '',
    baseUrl: 'https://apiconnect.angelone.in'
  },

  // Egress Static IP verification
  registeredStaticIp: process.env.REGISTERED_STATIC_IP || '',
  enforceStaticIpCheck: process.env.ENFORCE_STATIC_IP_CHECK === 'true',

  // Global Risk Thresholds
  risk: {
    maxDailyLoss: parseFloat(process.env.MAX_DAILY_LOSS || '2000'),
    maxRiskPerTrade: parseFloat(process.env.MAX_RISK_PER_TRADE || '500'),
    maxOpenPositions: parseInt(process.env.MAX_OPEN_POSITIONS || '2', 10),
    maxLotsPerOrder: parseInt(process.env.MAX_LOTS_PER_ORDER || '2', 10)
  }
};

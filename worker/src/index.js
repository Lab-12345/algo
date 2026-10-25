import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

import { connectDB } from '../../server/src/config/db.js';
import { config } from '../../server/src/config/env.js';
import { Strategy, Signal, AuditLog } from '../../server/src/models/index.js';
import { riskManager } from '../../server/src/services/risk/riskManager.js';
import { CandleBuilder } from './candleBuilder.js';
import { StrategyRunner } from './strategyRunner.js';
import { orderManager } from './orderManager.js';
import { SmartApiWebSocket } from './websocketClient.js';
import { runPositionReconciliation } from './reconciliation.js';

async function bootstrapWorker() {
  console.log('=======================================================');
  console.log(' Starting TradePilot Autonomous Trading Worker Daemon  ');
  console.log('=======================================================');

  await connectDB();

  // Find or create default demo strategy if DB is fresh
  let activeStrategies = await Strategy.find({ status: 'ACTIVE' });

  if (activeStrategies.length === 0) {
    console.log('[Worker] No active strategies found. Bootstrapping default Demo 5m VWAP Trend Strategy...');
    const defaultStrategy = await Strategy.create({
      name: 'NIFTY 5m VWAP Trend Strategy',
      description: '5m candle confirmation with 15m trend filter and VWAP direction',
      symbol: 'NIFTY',
      instrumentToken: '99926000',
      tradingMode: 'PAPER',
      status: 'ACTIVE',
      timeframe: { primary: '5m', trendFilter: '15m' },
      parameters: {
        vwapEnabled: true,
        trendEmaPeriod: 20,
        stopLossPoints: 25,
        targetPoints: 50,
        lotSize: 25,
        maxLots: 1
      },
      riskLimits: {
        maxLossPerDay: 2000,
        maxTradesPerDay: 5
      }
    });
    activeStrategies = [defaultStrategy];
  }

  console.log(`[Worker] Loaded ${activeStrategies.length} active strategy(ies).`);

  // Initialize candle builders and strategy runners for each strategy
  const strategyContexts = new Map();

  for (const strat of activeStrategies) {
    strategyContexts.set(strat.symbol, {
      strategy: strat,
      candleBuilder: new CandleBuilder(strat.symbol),
      runner: new StrategyRunner(strat)
    });
  }

  // Initialize market data WebSocket streaming
  const wsClient = new SmartApiWebSocket(
    config.smartApi.apiKey,
    config.smartApi.clientCode,
    process.env.SMARTAPI_FEED_TOKEN
  );

  wsClient.on('tick', async (tick) => {
    const symbol = tick.symbol || 'NIFTY';
    const ctx = strategyContexts.get(symbol);
    if (!ctx) return;

    // 1. Monitor active open positions for stop-loss and profit target exits
    await orderManager.monitorPositions(tick.ltp, symbol);

    // 2. Process tick in CandleBuilder
    const result = ctx.candleBuilder.processTick(tick);

    // 3. When a 5-minute candle closes, evaluate trading rules
    if (result.newClosed5m) {
      console.log(`[Worker] Closed 5m candle for ${symbol}: O=${result.newClosed5m.open} H=${result.newClosed5m.high} L=${result.newClosed5m.low} C=${result.newClosed5m.close} VWAP=${result.currentVwap.toFixed(2)}`);

      const signalData = ctx.runner.evaluate(result.newClosed5m, ctx.candleBuilder);

      if (signalData) {
        console.log(`[Worker] Signal Detected: ${signalData.action} on ${symbol} @ ${signalData.price}. Reason: ${signalData.reason}`);

        // Evaluate Server-Side Risk Gates
        const riskResult = await riskManager.evaluateSignalRisk(signalData, ctx.strategy);

        const signalRecord = await Signal.create({
          ...signalData,
          status: riskResult.isApproved ? 'APPROVED_BY_RISK' : 'REJECTED_BY_RISK',
          riskRejectionReason: riskResult.issues.join(' | ')
        });

        if (riskResult.isApproved) {
          console.log(`[Worker] Risk gate PASSED. Dispatching order...`);
          const execRes = await orderManager.executeSignal(signalRecord, ctx.strategy);
          signalRecord.orderId = execRes.order._id;
          signalRecord.status = 'EXECUTED';
          await signalRecord.save();
        } else {
          console.warn(`[Worker] Risk gate REJECTED signal: ${riskResult.issues.join(' | ')}`);
        }
      }
    }
  });

  wsClient.connect();

  // Run periodic broker position reconciliation every 60 seconds
  setInterval(async () => {
    await runPositionReconciliation();
  }, 60000);

  console.log('[Worker] Worker lifecycle loop fully established.');
}

bootstrapWorker().catch((err) => {
  console.error('[Worker Fatal Error]', err);
  process.exit(1);
});

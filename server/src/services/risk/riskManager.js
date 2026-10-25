import { validateRiskGate } from '@tradepilot/shared';
import { Position, Trade, AuditLog } from '../../models/index.js';
import { config } from '../../config/env.js';

class RiskManager {
  constructor() {
    this.isKillSwitchActive = false;
    this.killSwitchActivatedAt = null;
    this.killSwitchReason = null;
  }

  /**
   * Evaluates if a proposed signal can proceed to order execution
   */
  async evaluateSignalRisk(signal, strategy) {
    // 1. Fetch current open positions
    const openPositions = await Position.find({ status: 'OPEN' });

    // 2. Calculate daily realized & unrealized P&L
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const closedTradesToday = await Trade.find({
      exitTime: { $gte: startOfDay }
    });

    const dailyRealizedPnl = closedTradesToday.reduce((sum, t) => sum + (t.netPnl || 0), 0);
    const dailyUnrealizedPnl = openPositions.reduce((sum, p) => sum + (p.unrealizedPnl || 0), 0);

    const riskSettings = {
      maxDailyLoss: strategy.riskLimits?.maxLossPerDay || config.risk.maxDailyLoss,
      maxOpenPositions: config.risk.maxOpenPositions,
      maxRiskPerTrade: config.risk.maxRiskPerTrade,
      maxLots: strategy.parameters?.maxLots || config.risk.maxLotsPerOrder,
      isKillSwitchActive: this.isKillSwitchActive
    };

    const validation = validateRiskGate({
      signal,
      currentOpenPositions: openPositions,
      dailyRealizedPnl,
      dailyUnrealizedPnl,
      riskSettings
    });

    return {
      isApproved: validation.isApproved,
      issues: validation.issues,
      metrics: {
        dailyRealizedPnl,
        dailyUnrealizedPnl,
        totalDailyPnl: dailyRealizedPnl + dailyUnrealizedPnl,
        openPositionCount: openPositions.length
      }
    };
  }

  /**
   * Triggers the Emergency Kill Switch
   * Halts all new entries and alerts the operator.
   */
  async triggerKillSwitch(reason = 'Operator Manual Trigger', actor = 'OPERATOR') {
    this.isKillSwitchActive = true;
    this.killSwitchActivatedAt = new Date();
    this.killSwitchReason = reason;

    console.warn(`[RISK CRITICAL] Emergency Kill-Switch Activated by ${actor}. Reason: ${reason}`);

    await AuditLog.create({
      action: 'KILL_SWITCH_TRIGGERED',
      actor,
      details: { reason, timestamp: this.killSwitchActivatedAt },
      severity: 'CRITICAL'
    });

    return {
      success: true,
      isKillSwitchActive: true,
      activatedAt: this.killSwitchActivatedAt,
      reason
    };
  }

  /**
   * Resets the Kill Switch after manual review
   */
  async resetKillSwitch(actor = 'OPERATOR') {
    this.isKillSwitchActive = false;
    this.killSwitchActivatedAt = null;
    this.killSwitchReason = null;

    console.log(`[RISK] Kill-Switch reset by ${actor}`);

    await AuditLog.create({
      action: 'KILL_SWITCH_RESET',
      actor,
      details: { timestamp: new Date() },
      severity: 'WARN'
    });

    return { success: true, isKillSwitchActive: false };
  }

  getStatus() {
    return {
      isKillSwitchActive: this.isKillSwitchActive,
      activatedAt: this.killSwitchActivatedAt,
      reason: this.killSwitchReason
    };
  }
}

export const riskManager = new RiskManager();

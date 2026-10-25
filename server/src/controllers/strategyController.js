import { Strategy, AuditLog } from '../models/index.js';
import { config } from '../config/env.js';

export async function getStrategies(req, res) {
  try {
    const strategies = await Strategy.find().sort({ createdAt: -1 });
    return res.json({ success: true, count: strategies.length, data: strategies });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getStrategyById(req, res) {
  try {
    const strategy = await Strategy.findById(req.params.id);
    if (!strategy) {
      return res.status(404).json({ success: false, message: 'Strategy not found' });
    }
    return res.json({ success: true, data: strategy });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function createStrategy(req, res) {
  try {
    const strategy = await Strategy.create(req.body);
    await AuditLog.create({
      action: 'STRATEGY_CREATED',
      actor: req.user?.email || 'API',
      details: { strategyId: strategy._id, name: strategy.name }
    });
    return res.status(201).json({ success: true, data: strategy });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

export async function updateStrategy(req, res) {
  try {
    const strategy = await Strategy.findById(req.params.id);
    if (!strategy) {
      return res.status(404).json({ success: false, message: 'Strategy not found' });
    }

    Object.assign(strategy, req.body);
    await strategy.save();

    await AuditLog.create({
      action: 'STRATEGY_UPDATED',
      actor: req.user?.email || 'API',
      details: { strategyId: strategy._id, version: strategy.version }
    });

    return res.json({ success: true, data: strategy });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

export async function enableStrategy(req, res) {
  try {
    const strategy = await Strategy.findById(req.params.id);
    if (!strategy) {
      return res.status(404).json({ success: false, message: 'Strategy not found' });
    }

    // Safety check for Live mode
    if (strategy.tradingMode === 'LIVE' && !config.allowLiveTrading) {
      return res.status(403).json({
        success: false,
        message: 'Live trading is disabled on this server. Set ALLOW_LIVE_TRADING=true in environment to permit live orders.'
      });
    }

    strategy.status = 'ACTIVE';
    strategy.enabledAt = new Date();
    await strategy.save();

    await AuditLog.create({
      action: 'STRATEGY_ENABLED',
      actor: req.user?.email || 'API',
      details: { strategyId: strategy._id, mode: strategy.tradingMode },
      severity: strategy.tradingMode === 'LIVE' ? 'WARN' : 'INFO'
    });

    return res.json({ success: true, message: `Strategy enabled in ${strategy.tradingMode} mode`, data: strategy });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function disableStrategy(req, res) {
  try {
    const strategy = await Strategy.findById(req.params.id);
    if (!strategy) {
      return res.status(404).json({ success: false, message: 'Strategy not found' });
    }

    strategy.status = 'PAUSED';
    await strategy.save();

    await AuditLog.create({
      action: 'STRATEGY_PAUSED',
      actor: req.user?.email || 'API',
      details: { strategyId: strategy._id }
    });

    return res.json({ success: true, message: 'Strategy paused. New entries blocked.', data: strategy });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

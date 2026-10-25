import { riskManager } from '../services/risk/riskManager.js';
import { smartApiClient } from '../services/smartapi/smartApiClient.js';
import { isDbConnected } from '../config/db.js';
import { config } from '../config/env.js';

export async function getSystemHealth(req, res) {
  const outboundIp = await smartApiClient.getOutboundIp();
  const dbStatus = isDbConnected();
  const killSwitch = riskManager.getStatus();

  const isIpMatching = config.registeredStaticIp
    ? outboundIp === config.registeredStaticIp
    : true;

  const isHealthy = dbStatus && !killSwitch.isKillSwitchActive && isIpMatching;

  return res.json({
    success: true,
    status: isHealthy ? 'HEALTHY' : 'DEGRADED',
    timestamp: new Date(),
    checks: {
      database: dbStatus ? 'CONNECTED' : 'DISCONNECTED',
      killSwitch: killSwitch.isKillSwitchActive ? 'ACTIVE' : 'INACTIVE',
      egressIp: {
        currentOutboundIp: outboundIp,
        registeredStaticIp: config.registeredStaticIp || 'NOT_CONFIGURED',
        isIpMatching,
        enforceCheck: config.enforceStaticIpCheck
      },
      liveTradingAllowed: config.allowLiveTrading,
      defaultMode: config.defaultTradingMode
    }
  });
}

export async function triggerKillSwitch(req, res) {
  try {
    const { reason = 'Manual trigger from Web UI' } = req.body;
    const result = await riskManager.triggerKillSwitch(reason, req.user?.email || 'OPERATOR');
    return res.json({
      success: true,
      message: 'Emergency Kill-Switch triggered. All automated trade entries halted.',
      details: result
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function resetKillSwitch(req, res) {
  try {
    const result = await riskManager.resetKillSwitch(req.user?.email || 'OPERATOR');
    return res.json({
      success: true,
      message: 'Emergency Kill-Switch reset. Normal risk checks restored.',
      details: result
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

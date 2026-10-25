import { Order, Position, AuditLog } from '../models/index.js';
import { smartApiClient } from '../services/smartapi/smartApiClient.js';

export async function getOrders(req, res) {
  try {
    const { status, tradingMode, limit = 50 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (tradingMode) filter.tradingMode = tradingMode;

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10));

    return res.json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getPositions(req, res) {
  try {
    const { status = 'OPEN' } = req.query;
    const positions = await Position.find({ status }).sort({ createdAt: -1 });
    return res.json({ success: true, count: positions.length, data: positions });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function reconcileBrokerPositions(req, res) {
  try {
    const brokerRes = await smartApiClient.getPositions();
    const brokerPositions = brokerRes.data || [];

    await AuditLog.create({
      action: 'BROKER_RECONCILIATION_RUN',
      actor: req.user?.email || 'OPERATOR',
      details: { brokerItemCount: brokerPositions.length }
    });

    return res.json({
      success: true,
      message: 'Broker position reconciliation query completed',
      brokerPositions
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

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

export async function placeManualOrder(req, res) {
  try {
    const {
      symbol,
      instrumentToken,
      side = 'BUY',
      orderType = 'LIMIT',
      price,
      quantity,
      tradingMode = 'PAPER',
      stopLossPrice,
      targetPrice
    } = req.body;

    const parsedPrice = parseFloat(price) || 150.0;
    const parsedQty = parseInt(quantity, 10) || 25;

    const order = await Order.create({
      clientOrderId: `TP_MANUAL_${Date.now()}_${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
      tradingMode,
      symbol: symbol || 'NIFTY24OCT24500CE',
      transactionType: side,
      orderType,
      price: parsedPrice,
      quantity: parsedQty,
      status: tradingMode === 'PAPER' ? 'FULLY_FILLED' : 'PENDING_SUBMISSION',
      filledQuantity: tradingMode === 'PAPER' ? parsedQty : 0,
      averagePrice: parsedPrice,
      filledAt: tradingMode === 'PAPER' ? new Date() : null,
      submittedAt: new Date()
    });

    let position = null;
    if (tradingMode === 'PAPER') {
      position = await Position.create({
        tradingMode: 'PAPER',
        symbol: symbol || 'NIFTY24OCT24500CE',
        instrumentToken: instrumentToken || '99926000',
        side: side === 'BUY' ? 'LONG' : 'SHORT',
        quantity: parsedQty,
        entryPrice: parsedPrice,
        currentPrice: parsedPrice,
        unrealizedPnl: 0,
        stopLossPrice: stopLossPrice ? parseFloat(stopLossPrice) : parsedPrice - 25,
        targetPrice: targetPrice ? parseFloat(targetPrice) : parsedPrice + 50,
        openOrderId: order._id,
        status: 'OPEN'
      });
    }

    await AuditLog.create({
      action: 'MANUAL_ORDER_PLACED',
      actor: 'OPERATOR',
      details: { orderId: order._id, symbol, mode: tradingMode, price: parsedPrice, quantity: parsedQty }
    });

    return res.status(201).json({
      success: true,
      message: `${tradingMode} order executed successfully`,
      data: { order, position }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function closePosition(req, res) {
  try {
    const position = await Position.findById(req.params.id);
    if (!position) {
      return res.status(404).json({ success: false, message: 'Position not found' });
    }
    position.status = 'CLOSED';
    position.closedAt = new Date();
    await position.save();

    await AuditLog.create({
      action: 'POSITION_MANUALLY_CLOSED',
      actor: 'OPERATOR',
      details: { positionId: position._id, symbol: position.symbol }
    });

    return res.json({ success: true, message: 'Position closed successfully', data: position });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

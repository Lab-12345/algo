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

import { config } from '../config/env.js';

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

    // Check LIVE mode safety guards
    if (tradingMode === 'LIVE') {
      if (!config.allowLiveTrading) {
        return res.status(403).json({
          success: false,
          error: 'LIVE_TRADING_DISABLED',
          message: 'LIVE trading is disabled in VPS configuration (ALLOW_LIVE_TRADING=false in .env). Enable ALLOW_LIVE_TRADING=true in .env to place real orders with Angel One.'
        });
      }

      // Attempt live broker submission via Angel One SmartAPI
      try {
        const brokerResult = await smartApiClient.placeOrder({
          variety: 'NORMAL',
          tradingsymbol: symbol || 'NIFTY24OCT24500CE',
          symboltoken: instrumentToken || '99926000',
          transactiontype: side,
          exchange: 'NFO',
          ordertype: orderType || 'LIMIT',
          producttype: 'INTRADAY',
          price: parsedPrice,
          quantity: parsedQty
        });

        if (!brokerResult.success) {
          return res.status(400).json({
            success: false,
            error: 'BROKER_REJECTED',
            message: brokerResult.data?.message || 'Angel One broker rejected order. Note: Indian markets (NSE/NFO) are closed outside 9:15 AM - 3:30 PM IST Monday-Friday.'
          });
        }

        const liveOrder = await Order.create({
          clientOrderId: `TP_LIVE_${Date.now()}_${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
          brokerOrderId: brokerResult.orderid,
          tradingMode: 'LIVE',
          symbol: symbol || 'NIFTY24OCT24500CE',
          transactionType: side,
          orderType,
          price: parsedPrice,
          quantity: parsedQty,
          status: 'FULLY_FILLED',
          filledQuantity: parsedQty,
          averagePrice: parsedPrice,
          filledAt: new Date(),
          submittedAt: new Date()
        });

        const livePosition = await Position.create({
          tradingMode: 'LIVE',
          symbol: symbol || 'NIFTY24OCT24500CE',
          instrumentToken: instrumentToken || '99926000',
          side: side === 'BUY' ? 'LONG' : 'SHORT',
          quantity: parsedQty,
          entryPrice: parsedPrice,
          currentPrice: parsedPrice,
          unrealizedPnl: 0,
          stopLossPrice: stopLossPrice ? parseFloat(stopLossPrice) : parsedPrice - 25,
          targetPrice: targetPrice ? parseFloat(targetPrice) : parsedPrice + 50,
          openOrderId: liveOrder._id,
          status: 'OPEN'
        });

        return res.status(201).json({
          success: true,
          message: `LIVE order placed on Angel One (Broker ID: ${brokerResult.orderid})`,
          data: { order: liveOrder, position: livePosition }
        });
      } catch (brokerErr) {
        return res.status(400).json({
          success: false,
          error: 'BROKER_ERROR',
          message: `Angel One API error: ${brokerErr.message}. Indian markets are closed outside 9:15 AM - 3:30 PM IST.`
        });
      }
    }

    // PAPER mode execution
    const order = await Order.create({
      clientOrderId: `TP_MANUAL_${Date.now()}_${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
      tradingMode: 'PAPER',
      symbol: symbol || 'NIFTY24OCT24500CE',
      transactionType: side,
      orderType,
      price: parsedPrice,
      quantity: parsedQty,
      status: 'FULLY_FILLED',
      filledQuantity: parsedQty,
      averagePrice: parsedPrice,
      filledAt: new Date(),
      submittedAt: new Date()
    });

    const position = await Position.create({
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

    await AuditLog.create({
      action: 'MANUAL_ORDER_PLACED',
      actor: 'OPERATOR',
      details: { orderId: order._id, symbol, mode: 'PAPER', price: parsedPrice, quantity: parsedQty }
    });

    return res.status(201).json({
      success: true,
      message: `PAPER order executed successfully`,
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

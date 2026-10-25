import { generateClientOrderId, OrderState, OrderType } from '@tradepilot/shared';
import { Order, Position, Trade, AuditLog } from '../../server/src/models/index.js';
import { smartApiClient } from '../../server/src/services/smartapi/smartApiClient.js';

export class OrderManager {
  /**
   * Executes an approved signal in either PAPER or LIVE mode
   */
  async executeSignal(signal, strategy) {
    const isLive = strategy.tradingMode === 'LIVE';
    const clientOrderId = generateClientOrderId(isLive ? 'TP_LIVE' : 'TP_PAPER');

    // Section 7.2: In 2026, algos must use LIMIT orders. Never MARKET or IOC.
    const limitPrice = signal.price;

    const initialOrder = await Order.create({
      clientOrderId,
      strategyId: strategy._id,
      signalId: signal._id,
      tradingMode: strategy.tradingMode,
      symbol: signal.symbol,
      transactionType: 'BUY',
      orderType: OrderType.LIMIT,
      price: limitPrice,
      quantity: signal.quantity,
      status: OrderState.PENDING_SUBMISSION,
      submittedAt: new Date()
    });

    if (!isLive) {
      return this._executePaperOrder(initialOrder, signal, strategy);
    } else {
      return this._executeLiveOrder(initialOrder, signal, strategy);
    }
  }

  /**
   * Simulated paper trade execution with realistic slippage
   */
  async _executePaperOrder(order, signal, strategy) {
    console.log(`[PAPER TRADING] Simulating fill for ${order.symbol} Qty: ${order.quantity} @ ${order.price}`);

    // Simulate 0.05% execution slippage
    const slippage = order.price * 0.0005;
    const filledPrice = parseFloat((order.price + slippage).toFixed(2));

    order.status = OrderState.FULLY_FILLED;
    order.filledQuantity = order.quantity;
    order.averagePrice = filledPrice;
    order.filledAt = new Date();
    await order.save();

    // Create open position
    const position = await Position.create({
      strategyId: strategy._id,
      tradingMode: 'PAPER',
      symbol: order.symbol,
      instrumentToken: strategy.instrumentToken,
      side: signal.action.includes('CALL') ? 'LONG' : 'SHORT',
      quantity: order.quantity,
      entryPrice: filledPrice,
      currentPrice: filledPrice,
      stopLossPrice: signal.stopLossPrice,
      targetPrice: signal.targetPrice,
      openOrderId: order._id,
      status: 'OPEN'
    });

    await AuditLog.create({
      action: 'PAPER_ORDER_FILLED',
      actor: 'WORKER',
      details: {
        orderId: order._id,
        symbol: order.symbol,
        fillPrice: filledPrice,
        positionId: position._id
      }
    });

    return { order, position };
  }

  /**
   * Live broker submission via Angel One SmartAPI
   */
  async _executeLiveOrder(order, signal, strategy) {
    console.log(`[LIVE TRADING] Submitting live order for ${order.symbol} to Angel One SmartAPI...`);

    try {
      const brokerResult = await smartApiClient.placeOrder({
        variety: 'NORMAL',
        tradingsymbol: strategy.symbol,
        symboltoken: strategy.instrumentToken,
        transactiontype: 'BUY',
        exchange: 'NFO',
        ordertype: 'LIMIT', // Enforced 2026 compliance
        producttype: 'INTRADAY',
        price: order.price,
        quantity: order.quantity
      });

      if (brokerResult.success && brokerResult.orderid) {
        order.brokerOrderId = brokerResult.orderid;
        order.status = OrderState.ACKNOWLEDGED;
        order.egressIpUsed = brokerResult.outboundIp;
        await order.save();

        console.log(`[LIVE TRADING] Order acknowledged by broker: ID ${brokerResult.orderid}`);
        return { order };
      } else {
        order.status = OrderState.REJECTED;
        order.rejectReason = brokerResult.data?.message || 'Broker rejected order';
        await order.save();
        return { order, error: order.rejectReason };
      }
    } catch (err) {
      console.error(`[LIVE TRADING ERROR] Exception during submission: ${err.message}`);
      // Unknown state handling (Section 7.2): query order book to verify if order actually went through
      order.status = OrderState.PENDING_SUBMISSION;
      order.rejectReason = `Network/Timeout: ${err.message}. Awaiting reconciliation.`;
      await order.save();
      return { order, error: err.message };
    }
  }

  /**
   * Monitors and manages open positions for stop-loss or profit target triggers
   */
  async monitorPositions(currentLtp, symbol) {
    const openPositions = await Position.find({ symbol, status: 'OPEN' });

    for (const pos of openPositions) {
      pos.currentPrice = currentLtp;

      // Mark-to-Market P&L
      const multiplier = pos.side === 'LONG' ? 1 : -1;
      pos.unrealizedPnl = (currentLtp - pos.entryPrice) * pos.quantity * multiplier;
      await pos.save();

      // Check Stop-Loss
      const isStopTriggered = pos.side === 'LONG'
        ? currentLtp <= pos.stopLossPrice
        : currentLtp >= pos.stopLossPrice;

      // Check Target
      const isTargetTriggered = pos.side === 'LONG'
        ? currentLtp >= pos.targetPrice
        : currentLtp <= pos.targetPrice;

      if (isStopTriggered || isTargetTriggered) {
        const exitReason = isStopTriggered ? 'STOPLOSS_HIT' : 'TARGET_HIT';
        await this._closePosition(pos, currentLtp, exitReason);
      }
    }
  }

  async _closePosition(position, exitPrice, exitReason) {
    console.log(`[EXIT] Closing position ${position.symbol} @ ${exitPrice}. Reason: ${exitReason}`);

    position.status = 'CLOSED';
    position.closedAt = new Date();
    const multiplier = position.side === 'LONG' ? 1 : -1;
    const grossPnl = (exitPrice - position.entryPrice) * position.quantity * multiplier;
    
    // Estimate exchange & STT charges (~0.05% of turnover)
    const turnover = (position.entryPrice + exitPrice) * position.quantity;
    const estimatedCharges = parseFloat((turnover * 0.0006).toFixed(2));
    const netPnl = parseFloat((grossPnl - estimatedCharges).toFixed(2));

    position.realizedPnl = netPnl;
    position.unrealizedPnl = 0;
    await position.save();

    const durationMinutes = Math.round((position.closedAt - position.openedAt) / 60000);

    await Trade.create({
      strategyId: position.strategyId,
      positionId: position._id,
      tradingMode: position.tradingMode,
      symbol: position.symbol,
      side: position.side,
      quantity: position.quantity,
      entryPrice: position.entryPrice,
      exitPrice: exitPrice,
      grossPnl,
      estimatedCharges,
      netPnl,
      exitReason,
      entryTime: position.openedAt,
      exitTime: position.closedAt,
      durationMinutes
    });

    await AuditLog.create({
      action: 'POSITION_CLOSED',
      actor: 'WORKER',
      details: {
        symbol: position.symbol,
        netPnl,
        exitReason,
        mode: position.tradingMode
      }
    });
  }
}

export const orderManager = new OrderManager();

import { Trade } from '../models/index.js';

export async function getTrades(req, res) {
  try {
    const { tradingMode, limit = 100 } = req.query;
    const filter = {};
    if (tradingMode) filter.tradingMode = tradingMode;

    const trades = await Trade.find(filter)
      .sort({ exitTime: -1 })
      .limit(parseInt(limit, 10));

    // Calculate aggregated metrics
    const totalTrades = trades.length;
    const winningTrades = trades.filter(t => t.netPnl > 0).length;
    const losingTrades = trades.filter(t => t.netPnl < 0).length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const totalNetPnl = trades.reduce((sum, t) => sum + (t.netPnl || 0), 0);
    const totalCharges = trades.reduce((sum, t) => sum + (t.estimatedCharges || 0), 0);

    return res.json({
      success: true,
      metrics: {
        totalTrades,
        winningTrades,
        losingTrades,
        winRate: parseFloat(winRate.toFixed(2)),
        totalNetPnl: parseFloat(totalNetPnl.toFixed(2)),
        totalCharges: parseFloat(totalCharges.toFixed(2))
      },
      data: trades
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

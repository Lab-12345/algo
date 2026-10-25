import { smartApiClient } from '../services/smartapi/smartApiClient.js';

/**
 * Controller for retrieving Angel One Demat portfolio holdings
 * GET /api/portfolio/holdings
 */
export async function getHoldings(req, res) {
  try {
    // 1. Fetch Demat stocks from primary getHolding endpoint
    const rawResult = await smartApiClient.getHoldings();
    let holdings = [];

    if (rawResult.success && Array.isArray(rawResult.data) && rawResult.data.length > 0) {
      holdings = rawResult.data;
    } else {
      // 2. If getHoldings is empty, try getAllHoldings
      const allResult = await smartApiClient.getAllHoldings();
      if (allResult.success && allResult.data?.holdings && allResult.data.holdings.length > 0) {
        holdings = allResult.data.holdings;
      } else if (!rawResult.success && !allResult.success) {
        return res.status(400).json({
          success: false,
          message: rawResult.error || allResult.error || 'Could not fetch holdings from Angel One SmartAPI',
          error: rawResult.error || allResult.error
        });
      }
    }

    // 3. Compute portfolio summary totals
    let totalVal = 0;
    let totalInv = 0;
    holdings.forEach(h => {
      const qty = Number(h.quantity || h.realisedquantity || 0) + Number(h.t1quantity || 0);
      const ltp = Number(h.ltp || h.close || 0);
      const avg = Number(h.averageprice || 0);
      totalVal += qty * ltp;
      totalInv += qty * avg;
    });

    const totalPnl = totalVal - totalInv;
    const totalPnlPct = totalInv > 0 ? (totalPnl / totalInv) * 100 : 0;

    return res.json({
      success: true,
      data: {
        holdings,
        totalholding: {
          totalholdingvalue: parseFloat(totalVal.toFixed(2)),
          totalinvvalue: parseFloat(totalInv.toFixed(2)),
          totalprofitandloss: parseFloat(totalPnl.toFixed(2)),
          totalpnlpercentage: parseFloat(totalPnlPct.toFixed(2))
        }
      }
    });
  } catch (error) {
    console.error('[PortfolioController] getHoldings error:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch portfolio holdings'
    });
  }
}

/**
 * Controller for converting position product types (DELIVERY <-> INTRADAY, etc.)
 * POST /api/portfolio/convert-position
 */
export async function convertPosition(req, res) {
  try {
    const {
      exchange,
      symboltoken,
      oldproducttype,
      newproducttype,
      tradingsymbol,
      quantity,
      transactiontype
    } = req.body;

    if (!symboltoken || !oldproducttype || !newproducttype || !tradingsymbol || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'Missing required conversion parameters (symboltoken, oldproducttype, newproducttype, tradingsymbol, quantity)'
      });
    }

    const result = await smartApiClient.convertPosition(req.body);

    return res.json({
      success: result.success,
      message: result.message || 'Position conversion submitted to Angel One',
      data: result.data
    });
  } catch (error) {
    console.error('[PortfolioController] convertPosition error:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to convert position'
    });
  }
}

/**
 * Controller for retrieving broker live positions directly from Angel One
 * GET /api/portfolio/positions
 */
export async function getBrokerPositions(req, res) {
  try {
    const result = await smartApiClient.getPositions();
    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch broker positions'
    });
  }
}

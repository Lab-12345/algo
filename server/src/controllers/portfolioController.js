import { smartApiClient } from '../services/smartapi/smartApiClient.js';

/**
 * Controller for retrieving Angel One Demat portfolio holdings
 * GET /api/portfolio/holdings
 */
export async function getHoldings(req, res) {
  try {
    const result = await smartApiClient.getAllHoldings();

    if (!result.success && !result.data?.holdings) {
      // Fallback to individual holdings or empty default
      const rawHoldings = await smartApiClient.getHoldings();
      if (rawHoldings.success && Array.isArray(rawHoldings.data)) {
        let totalVal = 0;
        let totalInv = 0;
        rawHoldings.data.forEach(h => {
          totalVal += (h.quantity || 0) * (h.ltp || h.close || 0);
          totalInv += (h.quantity || 0) * (h.averageprice || 0);
        });
        const totalPnl = totalVal - totalInv;
        const totalPnlPct = totalInv > 0 ? (totalPnl / totalInv) * 100 : 0;

        return res.json({
          success: true,
          data: {
            holdings: rawHoldings.data,
            totalholding: {
              totalholdingvalue: parseFloat(totalVal.toFixed(2)),
              totalinvvalue: parseFloat(totalInv.toFixed(2)),
              totalprofitandloss: parseFloat(totalPnl.toFixed(2)),
              totalpnlpercentage: parseFloat(totalPnlPct.toFixed(2))
            }
          }
        });
      }

      return res.json({
        success: true,
        data: {
          holdings: [],
          totalholding: {
            totalholdingvalue: 0,
            totalinvvalue: 0,
            totalprofitandloss: 0,
            totalpnlpercentage: 0
          }
        }
      });
    }

    return res.json({
      success: true,
      data: result.data
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

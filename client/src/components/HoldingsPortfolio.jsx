import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';

export function HoldingsPortfolio() {
  const [holdingsData, setHoldingsData] = useState({
    holdings: [],
    totalholding: null
  });
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [convertModal, setConvertModal] = useState(null); // position to convert
  const [convertTargetProduct, setConvertTargetProduct] = useState('INTRADAY');
  const [convertQuantity, setConvertQuantity] = useState(1);
  const [conversionStatus, setConversionStatus] = useState(null);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState(null);

  const fetchHoldings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getHoldings();
      if (res.success && res.data) {
        setHoldingsData({
          holdings: res.data.holdings || [],
          totalholding: res.data.totalholding || null
        });
        setLastUpdated(new Date().toLocaleTimeString('en-IN'));
      } else {
        setError(res.message || 'Could not fetch holdings from Angel One SmartAPI');
      }
    } catch (err) {
      setError(err.message || 'Failed to load portfolio holdings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHoldings();
  }, []);

  const { holdings, totalholding } = holdingsData;

  // Calculate fallbacks if totalholding isn't provided by broker
  const computedTotalVal = holdings.reduce((sum, h) => sum + (h.quantity || 0) * (h.ltp || h.close || 0), 0);
  const computedTotalInv = holdings.reduce((sum, h) => sum + (h.quantity || 0) * (h.averageprice || 0), 0);
  const computedPnl = computedTotalVal - computedTotalInv;
  const computedPnlPct = computedTotalInv > 0 ? (computedPnl / computedTotalInv) * 100 : 0;

  const totalHoldingVal = totalholding?.totalholdingvalue ?? computedTotalVal;
  const totalInvVal = totalholding?.totalinvvalue ?? computedTotalInv;
  const totalPnl = totalholding?.totalprofitandloss ?? computedPnl;
  const totalPnlPct = totalholding?.totalpnlpercentage ?? computedPnlPct;
  const isOverallPositive = totalPnl >= 0;

  const handleOpenConvert = (item) => {
    setConvertModal(item);
    const defaultNewProduct = item.product === 'DELIVERY' ? 'INTRADAY' : 'DELIVERY';
    setConvertTargetProduct(defaultNewProduct);
    setConvertQuantity(item.quantity || 1);
    setConversionStatus(null);
  };

  const handleExecuteConvert = async (e) => {
    e.preventDefault();
    if (!convertModal) return;
    setIsConverting(true);
    setConversionStatus(null);

    const payload = {
      exchange: convertModal.exchange || 'NSE',
      symboltoken: convertModal.symboltoken,
      oldproducttype: convertModal.product || 'DELIVERY',
      newproducttype: convertTargetProduct,
      tradingsymbol: convertModal.tradingsymbol,
      symbolname: convertModal.tradingsymbol,
      quantity: parseInt(convertQuantity, 10),
      transactiontype: 'BUY',
      type: 'DAY'
    };

    try {
      const res = await api.convertPosition(payload);
      if (res.success) {
        setConversionStatus({
          type: 'success',
          message: `✅ Position conversion successful! Converted ${convertQuantity} qty of ${convertModal.tradingsymbol} to ${convertTargetProduct}.`
        });
        setTimeout(() => {
          setConvertModal(null);
          fetchHoldings();
        }, 1800);
      } else {
        setConversionStatus({
          type: 'error',
          message: `❌ ${res.message || 'Broker rejected position conversion.'}`
        });
      }
    } catch (err) {
      setConversionStatus({
        type: 'error',
        message: err.message || 'Conversion execution error'
      });
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="card" style={{ marginBottom: '24px' }}>
      {/* Header */}
      <div className="card-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>💼</span>
            <span>Angel One Demat Portfolio & Holdings</span>
            <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>
              SMARTAPI LIVE
            </span>
          </h2>
          {lastUpdated && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px' }}>
              Last Synced: {lastUpdated}
            </div>
          )}
        </div>

        <button
          className="btn btn-sm btn-ghost"
          onClick={fetchHoldings}
          disabled={loading}
          style={{ fontSize: '0.8rem', padding: '4px 12px' }}
        >
          {loading ? 'Syncing...' : '🔄 Sync Demat'}
        </button>
      </div>

      {/* Error / Connection Notice Banner */}
      {error && (
        <div style={{
          margin: '16px 20px 0',
          padding: '12px 16px',
          borderRadius: '8px',
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid var(--accent-crimson)',
          color: 'var(--accent-crimson)',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          lineHeight: '1.4'
        }}>
          <span style={{ fontSize: '1.25rem' }}>⚠️</span>
          <div>
            <strong>Broker Notice:</strong> {error}
          </div>
        </div>
      )}

      {/* Portfolio Summary Metric Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px',
        padding: '16px 20px',
        background: 'rgba(15, 23, 42, 0.4)',
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        {/* Total Holding Value */}
        <div style={{ padding: '12px', background: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '4px' }}>
            Total Portfolio Value
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
            ₹{totalHoldingVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>

        {/* Total Invested */}
        <div style={{ padding: '12px', background: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '4px' }}>
            Total Invested Capital
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>
            ₹{totalInvVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>

        {/* Total Profit & Loss */}
        <div style={{ padding: '12px', background: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '4px' }}>
            Overall Unrealized P&L
          </div>
          <div style={{
            fontSize: '1.35rem',
            fontWeight: 800,
            fontFamily: 'var(--font-mono)',
            color: isOverallPositive ? 'var(--accent-emerald)' : 'var(--accent-crimson)'
          }}>
            {isOverallPositive ? '+' : ''}₹{totalPnl.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            <span style={{ fontSize: '0.85rem', marginLeft: '6px' }}>
              ({isOverallPositive ? '+' : ''}{totalPnlPct.toFixed(2)}%)
            </span>
          </div>
        </div>

        {/* Assets Count */}
        <div style={{ padding: '12px', background: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '4px' }}>
            Total Assets Held
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
            {holdings.length} {holdings.length === 1 ? 'Script' : 'Scripts'}
          </div>
        </div>
      </div>

      {/* Holdings Table */}
      <div className="table-wrapper">
        {holdings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-dim)', fontSize: '0.875rem' }}>
            {loading ? 'Fetching live portfolio from Angel One SmartAPI...' : 'No equity delivery holdings found in your Demat account.'}
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Instrument</th>
                <th>Exchange</th>
                <th>Qty</th>
                <th>Avg. Buy (₹)</th>
                <th>LTP (₹)</th>
                <th>Current Value (₹)</th>
                <th>P&L (₹)</th>
                <th>P&L (%)</th>
                <th>Product</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((h, idx) => {
                const qty = h.quantity || 0;
                const avgPrice = h.averageprice || 0;
                const ltp = h.ltp || h.close || 0;
                const curVal = qty * ltp;
                const pnl = h.profitandloss ?? (curVal - qty * avgPrice);
                const pnlPct = h.pnlpercentage ?? (avgPrice > 0 ? (pnl / (qty * avgPrice)) * 100 : 0);
                const isPos = pnl >= 0;

                return (
                  <tr key={h.symboltoken || h.isin || idx}>
                    <td>
                      <div style={{ fontWeight: 700, color: '#fff' }}>{h.tradingsymbol}</div>
                      {h.isin && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                          {h.isin}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
                        {h.exchange || 'NSE'}
                      </span>
                    </td>
                    <td className="mono-text" style={{ fontWeight: 700 }}>
                      {qty}
                      {h.t1quantity > 0 && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--accent-amber)', marginLeft: '4px' }}>
                          (+{h.t1quantity} T1)
                        </span>
                      )}
                    </td>
                    <td className="mono-text">₹{avgPrice.toFixed(2)}</td>
                    <td className="mono-text" style={{ fontWeight: 700 }}>₹{ltp.toFixed(2)}</td>
                    <td className="mono-text" style={{ fontWeight: 700 }}>
                      ₹{curVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className={`mono-text ${isPos ? 'pnl-positive' : 'pnl-negative'}`} style={{ fontWeight: 700 }}>
                      {isPos ? '+' : ''}₹{pnl.toFixed(2)}
                    </td>
                    <td>
                      <span className={`badge ${isPos ? 'badge-emerald' : 'badge-crimson'}`} style={{ fontSize: '0.75rem' }}>
                        {isPos ? '+' : ''}{pnlPct.toFixed(2)}%
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-amber" style={{ fontSize: '0.7rem' }}>
                        {h.product || 'DELIVERY'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-ghost"
                        style={{ fontSize: '0.7rem', padding: '3px 8px' }}
                        onClick={() => handleOpenConvert(h)}
                        title="Convert margin product type between Delivery and Intraday"
                      >
                        Convert
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Convert Position Modal */}
      {convertModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            width: '100%',
            maxWidth: '460px',
            boxShadow: 'var(--shadow-lg)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🔄</span>
                <span>Convert Position Product Type</span>
              </h3>
              <button
                onClick={() => setConvertModal(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteConvert} style={{ padding: '20px' }}>
              {conversionStatus && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  marginBottom: '16px',
                  background: conversionStatus.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  border: conversionStatus.type === 'success' ? '1px solid var(--accent-emerald)' : '1px solid var(--accent-crimson)',
                  color: conversionStatus.type === 'success' ? 'var(--accent-emerald)' : 'var(--accent-crimson)'
                }}>
                  {conversionStatus.message}
                </div>
              )}

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '4px' }}>
                  Trading Instrument
                </label>
                <div style={{
                  padding: '9px 12px',
                  background: 'var(--bg-surface)',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '0.95rem'
                }}>
                  {convertModal.tradingsymbol} ({convertModal.exchange || 'NSE'})
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '4px' }}>
                    Current Product
                  </label>
                  <input
                    type="text"
                    disabled
                    value={convertModal.product || 'DELIVERY'}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      background: 'rgba(0,0,0,0.2)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '6px',
                      color: 'var(--text-muted)'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '4px' }}>
                    Convert To
                  </label>
                  <select
                    value={convertTargetProduct}
                    onChange={(e) => setConvertTargetProduct(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '6px',
                      color: '#fff'
                    }}
                  >
                    <option value="INTRADAY">INTRADAY (MIS)</option>
                    <option value="DELIVERY">DELIVERY (CNC)</option>
                    <option value="CARRYFORWARD">CARRYFORWARD (NRML)</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '4px' }}>
                  Quantity to Convert (Max: {convertModal.quantity || 1})
                </label>
                <input
                  type="number"
                  min="1"
                  max={convertModal.quantity || 1}
                  value={convertQuantity}
                  onChange={(e) => setConvertQuantity(Math.min(convertModal.quantity || 1, parseInt(e.target.value, 10) || 1))}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '6px',
                    color: '#fff',
                    fontFamily: 'var(--font-mono)'
                  }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setConvertModal(null)}
                  disabled={isConverting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isConverting}
                  style={{ minWidth: '140px' }}
                >
                  {isConverting ? 'Converting...' : 'Confirm Convert'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

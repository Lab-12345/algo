import React from 'react';

export function OrderBook({ orders = [] }) {
  const getStatusBadge = (status) => {
    switch (status) {
      case 'FULLY_FILLED':
        return <span className="badge badge-emerald">Filled</span>;
      case 'ACKNOWLEDGED':
        return <span className="badge badge-cyan">Ack</span>;
      case 'PENDING_SUBMISSION':
        return <span className="badge badge-amber">Pending</span>;
      case 'REJECTED':
        return <span className="badge badge-crimson">Rejected</span>;
      default:
        return <span className="badge badge-amber">{status}</span>;
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">
          <span>📑</span>
          <span>Order State Machine Stream</span>
        </h2>
        <span className="badge badge-cyan">{orders.length} Logged</span>
      </div>

      <div className="table-wrapper">
        {orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-dim)', fontSize: '0.875rem' }}>
            No orders submitted yet.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Client Order ID</th>
                <th>Broker ID</th>
                <th>Mode</th>
                <th>Type</th>
                <th>Price</th>
                <th>Quantity</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((ord) => (
                <tr key={ord._id || ord.clientOrderId}>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    {new Date(ord.createdAt || Date.now()).toLocaleTimeString()}
                  </td>
                  <td>
                    <span className="mono-text" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {ord.clientOrderId}
                    </span>
                  </td>
                  <td>
                    <span className="mono-text" style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                      {ord.brokerOrderId || 'SIMULATED'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${ord.tradingMode === 'LIVE' ? 'badge-crimson' : 'badge-emerald'}`}>
                      {ord.tradingMode}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-cyan">{ord.orderType || 'LIMIT'}</span>
                  </td>
                  <td className="mono-text">₹{ord.price?.toFixed(2)}</td>
                  <td className="mono-text">{ord.quantity}</td>
                  <td>{getStatusBadge(ord.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

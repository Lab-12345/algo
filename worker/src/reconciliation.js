import { Position, AuditLog } from '../../server/src/models/index.js';
import { smartApiClient } from '../../server/src/services/smartapi/smartApiClient.js';

export async function runPositionReconciliation() {
  try {
    const brokerRes = await smartApiClient.getPositions();
    if (!brokerRes.success) {
      // In paper mode or when offline, nothing to reconcile with broker
      return;
    }

    const brokerPositions = brokerRes.data || [];
    const localLivePositions = await Position.find({ status: 'OPEN', tradingMode: 'LIVE' });

    for (const localPos of localLivePositions) {
      const brokerMatch = brokerPositions.find(
        bp => bp.tradingsymbol === localPos.symbol && parseInt(bp.netqty, 10) !== 0
      );

      if (!brokerMatch) {
        console.warn(`[RECONCILIATION MISMATCH] Local open position ${localPos.symbol} not found on broker.`);
        await AuditLog.create({
          action: 'RECONCILIATION_MISMATCH',
          actor: 'WORKER',
          severity: 'WARN',
          details: {
            symbol: localPos.symbol,
            localQty: localPos.quantity,
            brokerRecord: null
          }
        });
      } else {
        localPos.lastReconciledAt = new Date();
        await localPos.save();
      }
    }
  } catch (err) {
    console.error(`[RECONCILIATION ERROR] ${err.message}`);
  }
}

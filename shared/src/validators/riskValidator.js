/**
 * Pre-Trade Risk Gate Validator
 * Evaluates whether an incoming signal/order violates any safety boundaries.
 */

export function validateRiskGate({
  signal,
  currentOpenPositions = [],
  dailyRealizedPnl = 0,
  dailyUnrealizedPnl = 0,
  riskSettings = {
    maxDailyLoss: 2000,
    maxOpenPositions: 2,
    maxRiskPerTrade: 500,
    maxLots: 2,
    isKillSwitchActive: false
  }
}) {
  const issues = [];

  // 1. Emergency Kill-Switch Guard
  if (riskSettings.isKillSwitchActive) {
    issues.push('Emergency Kill-Switch is active. All new entries blocked.');
  }

  // 2. Daily Loss Ceiling
  const totalDailyPnl = dailyRealizedPnl + dailyUnrealizedPnl;
  if (totalDailyPnl <= -Math.abs(riskSettings.maxDailyLoss)) {
    issues.push(`Daily loss limit reached (Current: ${totalDailyPnl.toFixed(2)}, Cap: -${riskSettings.maxDailyLoss})`);
  }

  // 3. Open Position Limits
  if (currentOpenPositions.length >= riskSettings.maxOpenPositions) {
    issues.push(`Max open positions reached (${currentOpenPositions.length}/${riskSettings.maxOpenPositions})`);
  }

  // 4. Duplicate Symbol/Direction Guard
  const hasExistingPositionInSymbol = currentOpenPositions.some(
    p => p.symbol === signal.symbol && p.status === 'OPEN'
  );
  if (hasExistingPositionInSymbol) {
    issues.push(`Existing open position already detected for symbol ${signal.symbol}. Duplicate entries locked.`);
  }

  // 5. Quantity / Lot Size Bounds
  if (signal.quantity <= 0) {
    issues.push(`Invalid quantity: ${signal.quantity}`);
  }

  return {
    isApproved: issues.length === 0,
    issues
  };
}

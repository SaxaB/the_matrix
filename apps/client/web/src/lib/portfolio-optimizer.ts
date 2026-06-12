import {
  AssetAllocation,
  AssetClass,
  GapItem,
  Holding,
  PerformanceMetrics,
  PortfolioSummary,
  RiskLevel,
} from "./types";

export function calculateRiskLevel(scores: number[]): {
  level: RiskLevel;
  score: number;
} {
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

  if (avgScore <= 33) return { level: "conservative", score: avgScore };
  if (avgScore <= 66) return { level: "moderate", score: avgScore };
  return { level: "aggressive", score: avgScore };
}

export function calculatePortfolioSummary(
  holdings: Holding[]
): PortfolioSummary {
  const totalValue = holdings.reduce(
    (sum, h) => sum + h.currentPrice * h.quantity,
    0
  );
  const totalCost = holdings.reduce(
    (sum, h) => sum + h.avgPrice * h.quantity,
    0
  );

  const allocationValues: Record<AssetClass, number> = {
    stocks: 0,
    bonds: 0,
    cash: 0,
    alternatives: 0,
  };

  for (const h of holdings) {
    allocationValues[h.assetClass] += h.currentPrice * h.quantity;
  }

  const allocation: AssetAllocation = {
    stocks: totalValue > 0 ? (allocationValues.stocks / totalValue) * 100 : 0,
    bonds: totalValue > 0 ? (allocationValues.bonds / totalValue) * 100 : 0,
    cash: totalValue > 0 ? (allocationValues.cash / totalValue) * 100 : 0,
    alternatives:
      totalValue > 0 ? (allocationValues.alternatives / totalValue) * 100 : 0,
  };

  return {
    totalValue,
    totalCost,
    totalReturn: totalValue - totalCost,
    totalReturnPct: totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0,
    allocation,
    holdings,
  };
}

/**
 * Variación desde el primer día del histórico guardado vs valor actual del portafolio.
 * Alineado con la gráfica del dashboard (≥2 puntos en `portfolio_daily_values`).
 * No es rentabilidad vs coste de compra.
 */
export function periodReturnFromPortfolioHistory(
  points: { date: string; value: number }[],
  currentTotalValue: number
): {
  pctVsFirst: number;
  absVsFirst: number;
  firstDate: string;
} | null {
  if (points.length < 2 || currentTotalValue <= 0) return null;
  const first = points[0].value;
  if (first <= 0) return null;
  return {
    pctVsFirst: ((currentTotalValue / first) - 1) * 100,
    absVsFirst: currentTotalValue - first,
    firstDate: points[0].date,
  };
}

export function calculateGapAnalysis(
  currentAllocation: AssetAllocation,
  idealAllocation: AssetAllocation,
  totalValue: number
): GapItem[] {
  const ideal = idealAllocation;
  const assetClasses: AssetClass[] = ["stocks", "bonds", "cash", "alternatives"];

  return assetClasses.map((ac) => {
    const currentPct = currentAllocation[ac];
    const idealPct = Math.round(ideal[ac] * 10) / 10;
    const gapPct = idealPct - currentPct;
    const amountToRebalance = (gapPct / 100) * totalValue;

    let action: "buy" | "sell" | "hold";
    if (Math.abs(gapPct) < 2) {
      action = "hold";
    } else if (gapPct > 0) {
      action = "buy";
    } else {
      action = "sell";
    }

    return {
      assetClass: ac,
      currentPct: Math.round(currentPct * 10) / 10,
      idealPct,
      gapPct: Math.round(gapPct * 10) / 10,
      action,
      amountToRebalance: Math.round(amountToRebalance),
    };
  });
}

/**
 * Simplified performance metrics calculation
 * inspired by QuantStats methodology
 */
export function calculatePerformanceMetrics(
  returns: number[],
  riskFreeRate: number = 0.04
): PerformanceMetrics {
  if (returns.length === 0) {
    return {
      sharpeRatio: 0,
      maxDrawdown: 0,
      annualizedReturn: 0,
      volatility: 0,
      sortinoRatio: 0,
      beta: 0,
    };
  }

  const n = returns.length;
  const mean = returns.reduce((a, b) => a + b, 0) / n;
  const annualizedReturn = mean * 252;

  const variance =
    returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (n - 1);
  const volatility = Math.sqrt(variance) * Math.sqrt(252);

  const sharpeRatio =
    volatility > 0 ? (annualizedReturn - riskFreeRate) / volatility : 0;

  const downsideReturns = returns.filter((r) => r < 0);
  const downsideVariance =
    downsideReturns.length > 0
      ? downsideReturns.reduce((sum, r) => sum + r * r, 0) /
        downsideReturns.length
      : 0;
  const downsideDeviation = Math.sqrt(downsideVariance) * Math.sqrt(252);
  const sortinoRatio =
    downsideDeviation > 0
      ? (annualizedReturn - riskFreeRate) / downsideDeviation
      : 0;

  let peak = 0;
  let maxDrawdown = 0;
  let cumReturn = 1;
  for (const r of returns) {
    cumReturn *= 1 + r;
    if (cumReturn > peak) peak = cumReturn;
    const drawdown = (peak - cumReturn) / peak;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }

  return {
    sharpeRatio: Math.round(sharpeRatio * 100) / 100,
    maxDrawdown: Math.round(maxDrawdown * 10000) / 100,
    annualizedReturn: Math.round(annualizedReturn * 10000) / 100,
    volatility: Math.round(volatility * 10000) / 100,
    sortinoRatio: Math.round(sortinoRatio * 100) / 100,
    beta: 1.0,
  };
}

export function generateMockReturns(days: number = 252): number[] {
  const returns: number[] = [];
  for (let i = 0; i < days; i++) {
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    returns.push(0.0004 + 0.012 * z);
  }
  return returns;
}

/** Peak-to-trough drawdown (%) on an equity curve; matches how users read a value chart. */
export function maxDrawdownPctFromEquityCurve(values: number[]): number {
  if (values.length < 2) return 0;
  let peak = values[0];
  if (peak <= 0) return 0;
  let maxDD = 0;
  for (const v of values) {
    if (v > peak) peak = v;
    if (peak > 0) {
      const dd = ((peak - v) / peak) * 100;
      if (dd > maxDD) maxDD = dd;
    }
  }
  return Math.round(maxDD * 10) / 10;
}

/** Simple daily returns between consecutive stored portfolio values. */
export function dailyReturnsFromValueSeries(values: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < values.length; i++) {
    const prev = values[i - 1];
    out.push(prev > 0 ? (values[i] - prev) / prev : 0);
  }
  return out;
}

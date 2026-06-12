import type { Holding } from "@/lib/types";
import type { TickerRiskBreakdownJson } from "@/lib/ticker-risk-score";

/** Subset of Yahoo snapshot used for deterministic risk heuristics (BD). */
export type YahooSnapshotForRisk = {
  ticker: string;
  beta: number | null;
  fifty_two_week_high: number | null;
  fifty_two_week_low: number | null;
  market_cap: number | null;
  trailing_pe: number | null;
  dividend_yield: number | null;
  fetched_at: string | null;
  /** When set (ETL `etl:ticker-risk`), UI uses this score + breakdown drivers. */
  finai_risk_score: number | null;
  finai_risk_computed_at: string | null;
  finai_risk_breakdown: TickerRiskBreakdownJson | null;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/** When there is no Yahoo row, use sector as a coarse prior (still deterministic). */
function sectorFallbackScore(sector: string): { score: number; drivers: string[] } {
  const s = sector.toLowerCase();
  const drivers: string[] = [
    "Sin snapshot Yahoo en BD (ejecuta npm run etl:yahoo) — prior por sector.",
  ];
  if (/tech|technology|semiconductor/i.test(s))
    return { score: 56, drivers };
  if (/financial|utilities|utility|consumer defensive|healthcare/i.test(s))
    return { score: 46, drivers };
  if (/energy|material|basic materials|real estate|reit/i.test(s))
    return { score: 58, drivers };
  return { score: 52, drivers };
}

/**
 * Heuristic 5–95 risk score for one equity line. Uses beta, drawdown from 52w high,
 * market cap and trailing P/E when available — not a fundamental model or price target.
 */
export function instrumentRiskScore(
  holding: Holding,
  snap: YahooSnapshotForRisk | undefined,
  currentPrice: number
): { score: number; drivers: string[] } {
  const drivers: string[] = [];
  let acc = 48;

  if (!snap) {
    const fb = sectorFallbackScore(holding.sector);
    return {
      score: clamp(fb.score, 5, 95),
      drivers: fb.drivers,
    };
  }

  const persisted = snap.finai_risk_score;
  if (
    persisted != null &&
    Number.isFinite(persisted) &&
    persisted >= 5 &&
    persisted <= 95
  ) {
    const bd = snap.finai_risk_breakdown;
    const fromBd =
      bd?.labels_es?.filter((x): x is string => typeof x === "string") ?? [];
    const drivers =
      fromBd.length > 0
        ? [...fromBd]
        : ["Puntuación Matrix en base de datos (ETL diario)."];
    return { score: Math.round(persisted), drivers };
  }

  const beta = snap.beta;
  if (beta != null && Number.isFinite(beta)) {
    if (beta >= 1.45) {
      acc += 14;
      drivers.push("Beta elevado frente al mercado");
    } else if (beta >= 1.15) {
      acc += 7;
      drivers.push("Beta por encima de 1");
    } else if (beta <= 0.75) {
      acc -= 10;
      drivers.push("Beta contenido");
    }
  }

  const hi = snap.fifty_two_week_high;
  const lo = snap.fifty_two_week_low;
  if (
    hi != null &&
    lo != null &&
    hi > lo &&
    currentPrice > 0 &&
    hi > 0
  ) {
    const drawdownFromPeak = (hi - currentPrice) / hi;
    if (drawdownFromPeak >= 0.45) {
      acc += 18;
      drivers.push("Muy por debajo del máximo de 52 semanas");
    } else if (drawdownFromPeak >= 0.28) {
      acc += 11;
      drivers.push("Alejado del máximo de 52 semanas");
    }
    const posInRange = (currentPrice - lo) / (hi - lo);
    if (posInRange <= 0.12) {
      acc += 8;
      drivers.push("Cerca del mínimo anual (rango 52s)");
    }
  }

  const mcap = snap.market_cap;
  if (mcap != null && mcap > 0) {
    if (mcap < 1_500_000_000) {
      acc += 12;
      drivers.push("Capitalización baja (menor liquidez típica)");
    } else if (mcap > 120_000_000_000) {
      acc -= 8;
      drivers.push("Gran capitalización");
    }
  }

  const pe = snap.trailing_pe;
  if (pe != null && Number.isFinite(pe) && pe > 0) {
    if (pe < 10) {
      acc += 6;
      drivers.push("PER bajo (valoración exigente o ciclo débil)");
    } else if (pe > 55) {
      acc += 7;
      drivers.push("PER alto (expectativas exigentes)");
    }
  }

  const dy = snap.dividend_yield;
  if (dy != null && dy > 0.03) {
    acc -= 4;
    drivers.push("Dividendo relativamente alto");
  }

  if (drivers.length === 0) {
    drivers.push("Métricas dentro de rangos típicos con los datos disponibles");
  }

  return { score: clamp(Math.round(acc), 5, 95), drivers };
}

export type EquityRiskRow = {
  ticker: string;
  name: string;
  value: number;
  weightInEquityPct: number;
  score: number;
  drivers: string[];
};

export function buildEquityRiskBreakdown(
  holdings: Holding[],
  snapByTicker: Record<string, YahooSnapshotForRisk | undefined>
): {
  rows: EquityRiskRow[];
  weightedScore: number | null;
  totalEquityValue: number;
} {
  const stockRows = holdings.filter(
    (h) =>
      h.assetClass === "stocks" &&
      !String(h.ticker).toUpperCase().startsWith("CASH-")
  );
  const total = stockRows.reduce(
    (s, h) => s + h.currentPrice * h.quantity,
    0
  );
  if (total <= 0) {
    return { rows: [], weightedScore: null, totalEquityValue: 0 };
  }

  const rows: EquityRiskRow[] = stockRows.map((h) => {
    const value = h.currentPrice * h.quantity;
    const key = h.ticker.toUpperCase();
    const snap = snapByTicker[key];
    const { score, drivers } = instrumentRiskScore(h, snap, h.currentPrice);
    return {
      ticker: h.ticker,
      name: h.name,
      value,
      weightInEquityPct: Math.round((value / total) * 1000) / 10,
      score,
      drivers,
    };
  });
  rows.sort((a, b) => b.weightInEquityPct - a.weightInEquityPct);

  const weightedScore =
    Math.round(
      (rows.reduce((s, r) => s + r.score * r.value, 0) / total) * 10
    ) / 10;

  return { rows, weightedScore, totalEquityValue: total };
}

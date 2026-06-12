/**
 * Deterministic Matrix ticker risk score (5–95) for equities.
 * Layers: Yahoo snapshot (beta, 52w, capi, PER), optional **SEC** balance-sheet
 * signals (apalancamiento, márgenes), optional **EOD** path (drawdown largo, momentum).
 *
 * Higher score = more “tensión” en analítica de cartera — no recomendación de compra/venta.
 */
import {
  gatherFundamentalFactsFromMetricRows,
  type SecMetricRowInput,
} from "@/lib/sec-edgar/extract-from-sec-metrics";

export const TICKER_RISK_MODEL_VERSION = 2 as const;

function ratio(a: number | null, b: number | null): number | null {
  if (
    a == null ||
    b == null ||
    b === 0 ||
    !Number.isFinite(a) ||
    !Number.isFinite(b)
  ) {
    return null;
  }
  return a / b;
}

/** Ratios anuales US-GAAP recientes (misma lógica que paneles derivados SEC). */
export type TickerRiskSecQualityInput = {
  debtToEquity: number | null;
  debtToAssets: number | null;
  grossMargin: number | null;
  netMargin: number | null;
};

export function secQualityFromMetricRows(
  rows: SecMetricRowInput[] | null | undefined
): TickerRiskSecQualityInput | null {
  if (!rows?.length) return null;
  const f = gatherFundamentalFactsFromMetricRows(rows);
  const hasAny =
    f.rev || f.ni || f.gp || f.assets || f.eq || f.ltd || f.std;
  if (!hasAny) return null;

  const ltd = f.ltd?.value ?? 0;
  const std = f.std?.value ?? 0;
  const hasDebt = f.ltd != null || f.std != null;
  const totalDebt = hasDebt ? ltd + std : null;
  const debtToEquity = ratio(totalDebt, f.eq?.value ?? null);
  const debtToAssets =
    totalDebt != null && f.assets?.value
      ? totalDebt / f.assets.value
      : null;
  const grossMargin = ratio(f.gp?.value ?? null, f.rev?.value ?? null);
  const netMargin = ratio(f.ni?.value ?? null, f.rev?.value ?? null);

  if (
    debtToEquity == null &&
    debtToAssets == null &&
    grossMargin == null &&
    netMargin == null
  ) {
    return null;
  }
  return { debtToEquity, debtToAssets, grossMargin, netMargin };
}

/** Max drawdown (peak to trough) over the close series, oldest → newest. */
export function maxDrawdownFraction(closesOldestFirst: number[]): number | null {
  if (closesOldestFirst.length < 8) return null;
  let peak = closesOldestFirst[0]!;
  let maxDd = 0;
  for (const px of closesOldestFirst) {
    if (!Number.isFinite(px) || px <= 0) continue;
    if (px > peak) peak = px;
    if (peak > 0) {
      const dd = (peak - px) / peak;
      if (dd > maxDd) maxDd = dd;
    }
  }
  return maxDd;
}

function trailingReturn(closesOldestFirst: number[], days: number): number | null {
  const n = closesOldestFirst.length;
  if (n < days + 2 || days < 1) return null;
  const a = closesOldestFirst[n - 1 - days]!;
  const b = closesOldestFirst[n - 1]!;
  if (a <= 0 || !Number.isFinite(a) || !Number.isFinite(b)) return null;
  return (b - a) / a;
}

export type TickerRiskScoreInput = {
  ticker: string;
  beta: number | null;
  fifty_two_week_high: number | null;
  fifty_two_week_low: number | null;
  /** Last regular close (EOD); if null, 52w drawdown signals are skipped. */
  lastClose: number | null;
  market_cap: number | null;
  trailing_pe: number | null;
  dividend_yield: number | null;
  /** Optional SEC-based ratios (annual facts). */
  secQuality?: TickerRiskSecQualityInput | null;
  /** Optional EOD closes, oldest first (e.g. last ~400 sesiones). */
  eodClosesOldestFirst?: number[] | null;
};

export type TickerRiskBreakdownJson = {
  /** Model version stored in JSON (1 legacy, 2 = SEC + EOD layers). */
  v: number;
  labels_es: string[];
  market_stress: number;
  quality_relief: number;
  chart_dampen: number;
  /** Puntos de estrés añadidos por ratios SEC (deuda / márgenes). */
  sec_stress?: number;
  /** Puntos de alivio por estructura financiera sólida (SEC). */
  sec_relief?: number;
  /** Estrés por drawdown máximo en la ventana EOD. */
  eod_drawdown_stress?: number;
  /** Estrés o alivio por momentum multi-horizonte (EOD). */
  eod_momentum_adjust?: number;
};

export type TickerRiskScoreResult = {
  score: number;
  breakdown: TickerRiskBreakdownJson;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function applySecQuality(
  sec: TickerRiskSecQualityInput,
  labels: string[]
): { stress: number; relief: number } {
  let stress = 0;
  let relief = 0;
  const de = sec.debtToEquity;
  if (de != null && Number.isFinite(de) && de > 0) {
    if (de > 3.2) {
      stress += 12;
      labels.push("Deuda muy alta vs patrimonio (SEC)");
    } else if (de > 2.1) {
      stress += 8;
      labels.push("Apalancamiento elevado vs patrimonio (SEC)");
    } else if (de > 1.25) {
      stress += 4;
      labels.push("Deuda relevante vs patrimonio (SEC)");
    } else if (de < 0.45 && de >= 0) {
      relief += 4;
      labels.push("Balance conservador vs patrimonio (SEC)");
    }
  }
  const da = sec.debtToAssets;
  if (da != null && Number.isFinite(da)) {
    if (da > 0.72) {
      stress += 6;
      labels.push("Pasivos altos vs activos (SEC)");
    } else if (da > 0.58) {
      stress += 3;
      labels.push("Pasivos elevados vs activos (SEC)");
    }
  }
  const gm = sec.grossMargin;
  const nm = sec.netMargin;
  if (nm != null && Number.isFinite(nm)) {
    if (nm < -0.12) {
      stress += 10;
      labels.push("Pérdidas netas recientes vs ingresos (SEC)");
    } else if (nm < -0.04) {
      stress += 5;
      labels.push("Márgenes netos débiles (SEC)");
    } else if (nm > 0.16 && gm != null && gm > 0.22) {
      relief += 5;
      labels.push("Rentabilidad neta sólida vs ingresos (SEC)");
    }
  }
  if (gm != null && Number.isFinite(gm)) {
    if (gm < 0.1 && gm >= 0) {
      stress += 5;
      labels.push("Margen bruto muy bajo (SEC)");
    } else if (gm > 0.38 && de != null && de < 1.1) {
      relief += 4;
      labels.push("Margen bruto alto con deuda contenida (SEC)");
    }
  }
  return { stress, relief };
}

function applyEodSeries(
  closes: number[],
  labels: string[]
): { ddStress: number; momAdjust: number } {
  let ddStress = 0;
  let momAdjust = 0;
  const mdd = maxDrawdownFraction(closes);
  if (mdd != null) {
    if (mdd >= 0.55) {
      ddStress += 14;
      labels.push("Drawdown máximo muy severo en ventana histórica (EOD)");
    } else if (mdd >= 0.42) {
      ddStress += 10;
      labels.push("Drawdown máximo elevado (EOD)");
    } else if (mdd >= 0.3) {
      ddStress += 6;
      labels.push("Drawdown máximo notable (EOD)");
    }
  }

  const n = closes.length;
  const longDays = Math.min(220, Math.max(55, n - 6));
  const longRet = trailingReturn(closes, longDays);
  const midRet = trailingReturn(closes, Math.min(63, Math.max(21, n - 6)));
  const shortRet = trailingReturn(closes, Math.min(21, Math.max(5, n - 3)));

  if (longRet != null) {
    if (longRet < -0.38) {
      momAdjust += 10;
      labels.push("Tendencia de precios muy débil en horizonte largo (EOD)");
    } else if (longRet < -0.24) {
      momAdjust += 6;
      labels.push("Tendencia de precios débil en horizonte largo (EOD)");
    } else if (longRet > 0.2) {
      momAdjust -= 5;
      labels.push("Tendencia larga positiva (EOD)");
    }
  }
  if (
    shortRet != null &&
    midRet != null &&
    shortRet > 0.08 &&
    midRet > -0.05 &&
    longRet != null &&
    longRet < 0.08
  ) {
    momAdjust -= 4;
    labels.push("Rebote reciente tras periodo flojo (EOD)");
  }
  if (
    shortRet != null &&
    longRet != null &&
    shortRet < -0.14 &&
    longRet < -0.12
  ) {
    momAdjust += 5;
    labels.push("Presión bajista en corto y largo plazo (EOD)");
  }

  return { ddStress, momAdjust };
}

/**
 * Computes Matrix risk score. Higher = more risk / demand for attention in
 * portfolio analytics — not "bad company" and not a buy/sell signal.
 */
export function computeTickerRiskScore(input: TickerRiskScoreInput): TickerRiskScoreResult {
  const labels: string[] = [];
  let marketStress = 0;

  const beta = input.beta;
  if (beta != null && Number.isFinite(beta)) {
    if (beta >= 1.5) {
      marketStress += 16;
      labels.push("Beta muy elevado");
    } else if (beta >= 1.2) {
      marketStress += 9;
      labels.push("Beta elevado");
    } else if (beta <= 0.72) {
      marketStress -= 8;
      labels.push("Beta bajo vs mercado");
    }
  }

  const hi = input.fifty_two_week_high;
  const lo = input.fifty_two_week_low;
  const px = input.lastClose;
  let drawdownFromPeak = 0;
  if (hi != null && lo != null && hi > lo && px != null && px > 0 && hi > 0) {
    drawdownFromPeak = (hi - px) / hi;
    if (drawdownFromPeak >= 0.45) {
      marketStress += 20;
      labels.push("Precio muy por debajo del máximo de 52 semanas");
    } else if (drawdownFromPeak >= 0.28) {
      marketStress += 12;
      labels.push("Alejado del máximo de 52 semanas");
    }
    const pos = (px - lo) / (hi - lo);
    if (pos <= 0.1) {
      marketStress += 7;
      labels.push("Cerca del mínimo anual (rango 52s)");
    }
  } else if (px == null) {
    labels.push("Sin cierre EOD reciente: sin señal de drawdown 52s");
  }

  const mcap = input.market_cap;
  if (mcap != null && mcap > 0) {
    if (mcap < 1_200_000_000) {
      marketStress += 14;
      labels.push("Capitalización muy baja");
    } else if (mcap < 5_000_000_000) {
      marketStress += 7;
      labels.push("Capitalización reducida");
    }
  }

  const pe = input.trailing_pe;
  if (pe != null && Number.isFinite(pe) && pe > 0) {
    if (pe < 9) {
      marketStress += 7;
      labels.push("PER muy bajo (ciclo o incertidumbre)");
    } else if (pe > 58) {
      marketStress += 8;
      labels.push("PER muy alto");
    }
  }

  const dy = input.dividend_yield;
  if (dy != null && dy > 0.035 && mcap != null && mcap > 5_000_000_000) {
    marketStress -= 5;
    labels.push("Dividendo relevante en valor mediano/grande");
  }

  let secStress = 0;
  let secRelief = 0;
  if (input.secQuality) {
    const s = applySecQuality(input.secQuality, labels);
    secStress = s.stress;
    secRelief = s.relief;
    marketStress += secStress;
  }

  let eodDdStress = 0;
  let eodMomAdjust = 0;
  const series = input.eodClosesOldestFirst;
  if (series && series.length >= 40) {
    const e = applyEodSeries(series, labels);
    eodDdStress = e.ddStress;
    eodMomAdjust = e.momAdjust;
    marketStress += eodDdStress + eodMomAdjust;
  }

  let qualityRelief = 0;
  const mega = mcap != null && mcap >= 85_000_000_000;
  const large = mcap != null && mcap >= 25_000_000_000;
  const peOk =
    pe != null && Number.isFinite(pe) && pe > 10 && pe < 48 && beta != null && beta < 1.42;
  if (mega && peOk) {
    qualityRelief += 14;
    labels.push("Gran capitalización y múltiplo típico: soporte de calidad");
  } else if (large && peOk) {
    qualityRelief += 9;
    labels.push("Capitalización elevada y múltiplo moderado");
  } else if (mega) {
    qualityRelief += 6;
    labels.push("Megacap: algo de soporte por tamaño y liquidez");
  }

  qualityRelief += secRelief;

  let chartDampen = 0;
  if (
    mega &&
    pe != null &&
    pe > 8 &&
    pe < 50 &&
    beta != null &&
    beta < 1.45 &&
    drawdownFromPeak >= 0.2 &&
    px != null
  ) {
    chartDampen = Math.min(16, 8 + drawdownFromPeak * 18);
    labels.push(
      "Corrección fuerte en nombre grande con múltiplos razonables: se amortigua parte del estrés de precio (corto vs largo plazo)"
    );
  }

  const raw = 48 + marketStress - qualityRelief;
  const score = clamp(Math.round(raw - chartDampen), 5, 95);

  if (labels.length === 0) {
    labels.push("Métricas equilibradas con los datos disponibles");
  }

  return {
    score,
    breakdown: {
      v: TICKER_RISK_MODEL_VERSION,
      labels_es: [...new Set(labels)],
      market_stress: Math.round(marketStress * 10) / 10,
      quality_relief: Math.round(qualityRelief * 10) / 10,
      chart_dampen: Math.round(chartDampen * 10) / 10,
      ...(input.secQuality
        ? {
            sec_stress: Math.round(secStress * 10) / 10,
            sec_relief: Math.round(secRelief * 10) / 10,
          }
        : {}),
      ...(series && series.length >= 40
        ? {
            eod_drawdown_stress: Math.round(eodDdStress * 10) / 10,
            eod_momentum_adjust: Math.round(eodMomAdjust * 10) / 10,
          }
        : {}),
    },
  };
}

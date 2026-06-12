import { DEFAULT_US_GAAP_CONCEPT_WHITELIST } from "@/lib/sec-edgar";
import type { DerivedFundamentalsResult } from "@/lib/sec-edgar/derived-fundamentals-panels";
import { labelSecConcept } from "@/lib/sec-metric-labels";
import type { TickerRiskBreakdownJson } from "@/lib/ticker-risk-score";
import type { StockAnalysis } from "@/lib/types";

export type ExplorationSecMetric = {
  concept: string;
  label: string;
  period_end: string;
  value: number;
  unit: string;
};

export type YahooSnapshotView = {
  long_name: string | null;
  sector: string | null;
  industry: string | null;
  market_cap: number | null;
  trailing_pe: number | null;
  forward_pe: number | null;
  dividend_yield: number | null;
  beta: number | null;
  fifty_two_week_high: number | null;
  fifty_two_week_low: number | null;
  average_volume: number | null;
  currency: string | null;
  exchange: string | null;
  regular_market_volume: number | null;
  fetched_at: string;
};

export type YahooEodBar = {
  trade_date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number;
  adj_close: number | null;
  volume: number | null;
};

export type TechnicalSnapshot = {
  rsi14: number | null;
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  return20dPct: number | null;
  return60dPct: number | null;
};

export type YahooRawRow = { path: string; label: string; value: string };

/** Resultados y consenso en vivo (Yahoo); no depende del ETL para mostrarse. */
export type ExplorationEarningsLive = {
  nextEarningsCalendarYmd: string | null;
  dateLabelEs: string | null;
  isEstimate: boolean;
  epsConsensus: number | null;
  revenueConsensus: number | null;
  epsAnalystCount: number | null;
  revenueAnalystCount: number | null;
  trendPeriod: string | null;
  earningsTimeZone: string;
  error: string | null;
};

export type StockExplorationPayload = {
  ticker: string;
  displayName: string;
  hasUsListing: boolean;
  usSymbol: {
    cik: string;
    entity_name: string;
    exchange: string | null;
  } | null;
  alpha: {
    price: number;
    change: number;
    changePct: number;
    currency: string;
    fromCache: boolean;
  } | null;
  alphaError: string | null;
  /** Caché Alpha en `asset_quotes` (misma cotización que usa la app). */
  assetQuoteCache: {
    price: number;
    currency: string;
    fetched_at: string;
  } | null;
  yahoo: YahooSnapshotView | null;
  /** Filas derivadas de `raw_summary` (quoteSummary Yahoo). */
  yahooRawRows: YahooRawRow[];
  /** Serie EOD completa disponible (para gráfico e indicadores). */
  yahooEod: YahooEodBar[];
  technical: TechnicalSnapshot;
  /** SEC: hasta 300 filas (varios periodos por concepto). */
  secRows: ExplorationSecMetric[];
  /** Resumen: un valor reciente por concepto US-GAAP (whitelist). */
  secSummary: ExplorationSecMetric[];
  /** Última descarga de company facts (JSON) en BD. */
  secCompanyFactsFetchedAt: string | null;
  /** Ratios y paneles derivados de `sec_edgar_metrics` + Yahoo + precio. */
  fundamentalPanels: DerivedFundamentalsResult | null;
  /** Próximos resultados + consenso (Yahoo en vivo). */
  earningsLive: ExplorationEarningsLive;
  /** Puntuación Matrix persistida (ETL `etl:ticker-risk`); escala 5–95. */
  finaiRisk: {
    score: number | null;
    computedAt: string | null;
    breakdown: TickerRiskBreakdownJson | null;
  } | null;
  /** Sentiment / recommendation still demo-only */
  demo: Pick<
    StockAnalysis,
    "sentiment" | "sentimentScore" | "recommendation"
  >;
};

type SecRow = {
  concept: string;
  label: string | null;
  period_end: string;
  value: number;
  unit: string;
};

export function mapSecRows(rows: SecRow[]): ExplorationSecMetric[] {
  return rows.map((r) => ({
    concept: r.concept,
    label: labelSecConcept(r.concept, r.label),
    period_end: r.period_end,
    value: r.value,
    unit: r.unit,
  }));
}

export function dedupeLatestSecMetrics(rows: SecRow[]): ExplorationSecMetric[] {
  const seen = new Set<string>();
  const out: ExplorationSecMetric[] = [];
  for (const r of rows) {
    if (!DEFAULT_US_GAAP_CONCEPT_WHITELIST.has(r.concept)) continue;
    if (seen.has(r.concept)) continue;
    seen.add(r.concept);
    out.push({
      concept: r.concept,
      label: labelSecConcept(r.concept, r.label),
      period_end: r.period_end,
      value: r.value,
      unit: r.unit,
    });
  }
  return out;
}

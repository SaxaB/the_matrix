/**
 * Persist FinAI risk score for one ticker (same model as src/jobs/ticker-risk-scores.ts).
 */
import { createServiceRoleClient } from "../db";
import {
  computeTickerRiskScore,
  secQualityFromMetricRows,
} from "./ticker-risk-score";
import type { SecMetricRowInput } from "./sec-edgar/extract-from-sec-metrics";
import { DEFAULT_US_GAAP_CONCEPT_WHITELIST } from "./sec-edgar/concept-whitelist";

const GAAP_CONCEPTS = Array.from(DEFAULT_US_GAAP_CONCEPT_WHITELIST);
const EOD_LOOKBACK_DAYS = 420;

function ymdDaysAgoUtc(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

async function fetchLatestClose(
  supabase: ReturnType<typeof createServiceRoleClient>,
  ticker: string,
  lookbackDays: number
): Promise<number | null> {
  const since = ymdDaysAgoUtc(lookbackDays);
  const { data, error } = await supabase
    .from("yahoo_eod_bars")
    .select("trade_date, close")
    .eq("ticker", ticker)
    .gte("trade_date", since)
    .order("trade_date", { ascending: false })
    .limit(1);

  if (error || !data?.length) return null;
  return Number(data[0]!.close);
}

async function fetchEodSeriesOldestFirst(
  supabase: ReturnType<typeof createServiceRoleClient>,
  ticker: string,
  lookbackDays: number
): Promise<number[] | null> {
  const since = ymdDaysAgoUtc(lookbackDays);
  const { data, error } = await supabase
    .from("yahoo_eod_bars")
    .select("trade_date, close")
    .eq("ticker", ticker)
    .gte("trade_date", since)
    .order("trade_date", { ascending: true });

  if (error || !data?.length) return null;
  return data.map((r) => Number(r.close));
}

async function fetchSecRowsForTicker(
  supabase: ReturnType<typeof createServiceRoleClient>,
  ticker: string
): Promise<SecMetricRowInput[]> {
  const { data, error } = await supabase
    .from("sec_edgar_metrics")
    .select(
      "concept, period_end, value, unit, fiscal_year, fiscal_period, taxonomy"
    )
    .eq("ticker", ticker)
    .eq("taxonomy", "us-gaap")
    .in("concept", GAAP_CONCEPTS)
    .order("period_end", { ascending: false })
    .limit(14_000);

  if (error || !data?.length) return [];
  return data.map((row) => ({
    concept: row.concept,
    period_end: row.period_end,
    value: Number(row.value),
    unit: row.unit,
    fiscal_year: row.fiscal_year,
    fiscal_period: row.fiscal_period,
    taxonomy: row.taxonomy,
  }));
}

/** Writes `finai_risk_*` on `yahoo_asset_snapshot` for one ticker. */
export async function refreshFinaiRiskForTicker(
  ticker: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const sym = ticker.trim().toUpperCase();
  let supabase;
  try {
    supabase = createServiceRoleClient();
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }

  const { data: row, error } = await supabase
    .from("yahoo_asset_snapshot")
    .select(
      "ticker, beta, fifty_two_week_high, fifty_two_week_low, market_cap, trailing_pe, dividend_yield"
    )
    .eq("ticker", sym)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!row) return { ok: false, error: `No Yahoo snapshot row for ${sym}` };

  const lastClose = await fetchLatestClose(supabase, sym, 140);
  const eodSeries = await fetchEodSeriesOldestFirst(
    supabase,
    sym,
    EOD_LOOKBACK_DAYS
  );
  const secRows = await fetchSecRowsForTicker(supabase, sym);
  const secQuality = secRows.length
    ? secQualityFromMetricRows(secRows)
    : null;

  const res = computeTickerRiskScore({
    ticker: sym,
    beta: row.beta != null ? Number(row.beta) : null,
    fifty_two_week_high:
      row.fifty_two_week_high != null ? Number(row.fifty_two_week_high) : null,
    fifty_two_week_low:
      row.fifty_two_week_low != null ? Number(row.fifty_two_week_low) : null,
    lastClose,
    market_cap: row.market_cap != null ? Number(row.market_cap) : null,
    trailing_pe: row.trailing_pe != null ? Number(row.trailing_pe) : null,
    dividend_yield:
      row.dividend_yield != null ? Number(row.dividend_yield) : null,
    secQuality,
    eodClosesOldestFirst:
      eodSeries && eodSeries.length >= 40 ? eodSeries : null,
  });

  const computedAt = new Date().toISOString();
  const { error: upErr } = await supabase
    .from("yahoo_asset_snapshot")
    .update({
      finai_risk_score: res.score,
      finai_risk_computed_at: computedAt,
      finai_risk_breakdown: res.breakdown,
    })
    .eq("ticker", sym);

  if (upErr) return { ok: false, error: upErr.message };
  return { ok: true };
}

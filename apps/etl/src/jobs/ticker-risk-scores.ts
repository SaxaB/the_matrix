/**
 * ETL: recalcula `finai_risk_score` (y breakdown) en `yahoo_asset_snapshot`.
 * Modelo v2: Yahoo + **SEC** (`sec_edgar_metrics`) + serie **EOD** (`yahoo_eod_bars`).
 *
 * Requisitos: SUPABASE_URL, SERVICE_ROLE_KEY
 * Recomendado: ejecutar tras `pnpm etl:yahoo` (y con SEC ingest para capa SEC).
 *
 *   pnpm etl:risk --
 *   pnpm etl:risk -- -- --ticker AAPL
 *   pnpm etl:risk -- -- --limit 200
 */

import { loadEnv } from "../env";
import { createServiceRoleClient } from "../db";
import { DEFAULT_US_GAAP_CONCEPT_WHITELIST } from "../lib/sec-edgar/concept-whitelist";
import type { SecMetricRowInput } from "../lib/sec-edgar/extract-from-sec-metrics";
import {
  computeTickerRiskScore,
  secQualityFromMetricRows,
} from "../lib/ticker-risk-score";

loadEnv();

function ymdDaysAgoUtc(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

const GAAP_CONCEPTS = Array.from(DEFAULT_US_GAAP_CONCEPT_WHITELIST);
const SEC_TICKER_CHUNK = 32;

async function fetchLatestCloses(
  supabase: ReturnType<typeof createServiceRoleClient>,
  tickers: string[],
  lookbackDays: number
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (tickers.length === 0) return out;
  const since = ymdDaysAgoUtc(lookbackDays);
  const lastDate = new Map<string, string>();

  const { data, error } = await supabase
    .from("yahoo_eod_bars")
    .select("ticker, trade_date, close")
    .in("ticker", tickers)
    .gte("trade_date", since);

  if (error) {
    console.error("yahoo_eod_bars (último cierre):", error.message);
    return out;
  }

  for (const row of data ?? []) {
    const t = String(row.ticker).toUpperCase();
    const d = String(row.trade_date);
    const prev = lastDate.get(t);
    if (!prev || d > prev) {
      lastDate.set(t, d);
      out.set(t, Number(row.close));
    }
  }
  return out;
}

/** Cierres regulares, bar más antigua primero (ventana ~ `lookbackDays`). */
async function fetchEodClosesSeriesGrouped(
  supabase: ReturnType<typeof createServiceRoleClient>,
  tickers: string[],
  lookbackDays: number
): Promise<Map<string, number[]>> {
  const map = new Map<string, number[]>();
  if (tickers.length === 0) return map;
  const since = ymdDaysAgoUtc(lookbackDays);

  const { data, error } = await supabase
    .from("yahoo_eod_bars")
    .select("ticker, trade_date, close")
    .in("ticker", tickers)
    .gte("trade_date", since)
    .order("ticker", { ascending: true })
    .order("trade_date", { ascending: true });

  if (error) {
    console.error("yahoo_eod_bars (serie):", error.message);
    return map;
  }

  for (const row of data ?? []) {
    const t = String(row.ticker).toUpperCase();
    const arr = map.get(t) ?? [];
    arr.push(Number(row.close));
    map.set(t, arr);
  }
  return map;
}

async function fetchSecRowsGrouped(
  supabase: ReturnType<typeof createServiceRoleClient>,
  tickers: string[]
): Promise<Map<string, SecMetricRowInput[]>> {
  const out = new Map<string, SecMetricRowInput[]>();
  if (tickers.length === 0) return out;

  for (let i = 0; i < tickers.length; i += SEC_TICKER_CHUNK) {
    const chunk = tickers.slice(i, i + SEC_TICKER_CHUNK);
    const { data, error } = await supabase
      .from("sec_edgar_metrics")
      .select(
        "ticker, concept, period_end, value, unit, fiscal_year, fiscal_period, taxonomy"
      )
      .in("ticker", chunk)
      .eq("taxonomy", "us-gaap")
      .in("concept", GAAP_CONCEPTS)
      .order("period_end", { ascending: false })
      .limit(14_000);

    if (error) {
      console.error("sec_edgar_metrics:", error.message);
      continue;
    }
    for (const row of data ?? []) {
      const t = String(row.ticker).toUpperCase();
      const arr = out.get(t) ?? [];
      arr.push({
        concept: row.concept,
        period_end: row.period_end,
        value: Number(row.value),
        unit: row.unit,
        fiscal_year: row.fiscal_year,
        fiscal_period: row.fiscal_period,
        taxonomy: row.taxonomy,
      });
      out.set(t, arr);
    }
  }
  return out;
}

function computeOne(
  row: {
    ticker: string;
    beta: number | null;
    fifty_two_week_high: number | null;
    fifty_two_week_low: number | null;
    market_cap: number | null;
    trailing_pe: number | null;
    dividend_yield: number | null;
  },
  lastClose: number | null,
  eodSeries: number[] | undefined,
  secRows: SecMetricRowInput[] | undefined
) {
  const t = String(row.ticker).toUpperCase();
  const secQuality = secRows?.length
    ? secQualityFromMetricRows(secRows)
    : null;
  return computeTickerRiskScore({
    ticker: t,
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
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const tIdx = argv.indexOf("--ticker");
  const limIdx = argv.indexOf("--limit");
  const globalLimit =
    limIdx >= 0 && argv[limIdx + 1]
      ? Math.max(1, parseInt(String(argv[limIdx + 1]), 10))
      : null;

  const supabase = createServiceRoleClient();
  const pageSize = 400;
  let processed = 0;
  let updated = 0;
  const computedAt = new Date().toISOString();
  const eodLookback = 420;

  if (tIdx >= 0 && argv[tIdx + 1]) {
    const ticker = String(argv[tIdx + 1]).trim().toUpperCase();
    const { data: row, error } = await supabase
      .from("yahoo_asset_snapshot")
      .select(
        "ticker, beta, fifty_two_week_high, fifty_two_week_low, market_cap, trailing_pe, dividend_yield"
      )
      .eq("ticker", ticker)
      .maybeSingle();

    if (error) {
      console.error(error.message);
      process.exit(1);
    }
    if (!row) {
      console.error(`No hay fila en yahoo_asset_snapshot para ${ticker}`);
      process.exit(1);
    }

    const lastMap = await fetchLatestCloses(supabase, [ticker], 140);
    const seriesMap = await fetchEodClosesSeriesGrouped(
      supabase,
      [ticker],
      eodLookback
    );
    const secMap = await fetchSecRowsGrouped(supabase, [ticker]);

    const res = computeOne(
      row,
      lastMap.get(ticker) ?? null,
      seriesMap.get(ticker),
      secMap.get(ticker)
    );

    const { error: upErr } = await supabase
      .from("yahoo_asset_snapshot")
      .update({
        finai_risk_score: res.score,
        finai_risk_computed_at: computedAt,
        finai_risk_breakdown: res.breakdown,
      })
      .eq("ticker", ticker);

    if (upErr) {
      console.error(upErr.message);
      process.exit(1);
    }
    console.log(`${ticker} → score ${res.score}`, res.breakdown);
    return;
  }

  for (let offset = 0; ; offset += pageSize) {
    const { data: page, error } = await supabase
      .from("yahoo_asset_snapshot")
      .select(
        "ticker, beta, fifty_two_week_high, fifty_two_week_low, market_cap, trailing_pe, dividend_yield"
      )
      .order("ticker", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error(error.message);
      process.exit(1);
    }
    if (!page?.length) break;

    let rows = page;
    if (globalLimit != null && processed + rows.length > globalLimit) {
      rows = rows.slice(0, globalLimit - processed);
    }

    const tickers = rows.map((r) => String(r.ticker).toUpperCase());
    const lastCloses = await fetchLatestCloses(supabase, tickers, 140);
    const seriesMap = await fetchEodClosesSeriesGrouped(
      supabase,
      tickers,
      eodLookback
    );
    const secMap = await fetchSecRowsGrouped(supabase, tickers);

    for (const row of rows) {
      const t = String(row.ticker).toUpperCase();
      const res = computeOne(
        row,
        lastCloses.get(t) ?? null,
        seriesMap.get(t),
        secMap.get(t)
      );

      const { error: upErr } = await supabase
        .from("yahoo_asset_snapshot")
        .update({
          finai_risk_score: res.score,
          finai_risk_computed_at: computedAt,
          finai_risk_breakdown: res.breakdown,
        })
        .eq("ticker", row.ticker);

      if (upErr) console.error(t, upErr.message);
      else updated += 1;
      processed += 1;
    }

    if (globalLimit != null && processed >= globalLimit) break;
    if (page.length < pageSize) break;
  }

  console.log(
    `ETL ticker-risk: filas procesadas=${processed}, actualizaciones OK=${updated}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

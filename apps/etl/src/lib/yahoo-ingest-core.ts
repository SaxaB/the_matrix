import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@matrix/db/types";
import type YahooFinanceCtor from "yahoo-finance2";
import type { QuoteSummaryResult } from "yahoo-finance2/modules/quoteSummary-iface";
import { extractYahooEarningsFromQuoteSummary } from "./yahoo-earnings-extract";

function numish(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "object" && v !== null && "raw" in v) {
    const r = (v as { raw?: number }).raw;
    return typeof r === "number" && Number.isFinite(r) ? r : null;
  }
  return null;
}

function bigintish(v: unknown): number | null {
  const n = numish(v);
  if (n == null) return null;
  return Math.round(n);
}

function strOrNull(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string") return v;
  return null;
}

export type YahooIngestMode = "full" | "incremental";

export async function hasYahooDataForTicker(
  supabase: SupabaseClient<Database, "market">,
  ticker: string
): Promise<boolean> {
  const t = ticker.trim().toUpperCase();
  const { data, error } = await supabase
    .from("yahoo_asset_snapshot")
    .select("ticker")
    .eq("ticker", t)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return !!data;
}

async function upsertYahooSnapshot(
  supabase: SupabaseClient<Database, "market">,
  yf: InstanceType<typeof YahooFinanceCtor>,
  t: string
): Promise<void> {
  const summary = (await yf.quoteSummary(t, {
    modules: [
      "summaryProfile",
      "summaryDetail",
      "defaultKeyStatistics",
      "price",
      "calendarEvents",
      "earningsTrend",
    ],
  })) as QuoteSummaryResult;

  const rawSummary = JSON.parse(JSON.stringify(summary)) as Json;
  const ex = extractYahooEarningsFromQuoteSummary(summary);

  const longName =
    strOrNull(summary.price?.longName) ??
    strOrNull(summary.price?.shortName);
  const sector = strOrNull(summary.summaryProfile?.sector);
  const industry = strOrNull(summary.summaryProfile?.industry);
  const marketCap = bigintish(summary.summaryDetail?.marketCap);
  const trailingPe =
    numish(summary.summaryDetail?.trailingPE) ??
    numish(summary.defaultKeyStatistics?.trailingPE);
  const forwardPe =
    numish(summary.summaryDetail?.forwardPE) ??
    numish(summary.defaultKeyStatistics?.forwardPE);
  const dividendYield = numish(summary.summaryDetail?.dividendYield);
  const beta = numish(summary.defaultKeyStatistics?.beta);
  const fiftyTwoWeekHigh = numish(summary.summaryDetail?.fiftyTwoWeekHigh);
  const fiftyTwoWeekLow = numish(summary.summaryDetail?.fiftyTwoWeekLow);
  const averageVolume = bigintish(summary.summaryDetail?.averageVolume);
  const regularMarketVolume = bigintish(summary.price?.regularMarketVolume);
  const currency =
    strOrNull(summary.price?.currency) ??
    strOrNull(summary.summaryDetail?.currency) ??
    "USD";
  const exchange =
    strOrNull(summary.price?.exchangeName) ??
    strOrNull(summary.summaryProfile?.exchange);

  const { error: snapErr } = await supabase.from("yahoo_asset_snapshot").upsert(
    {
      ticker: t,
      long_name: longName,
      sector,
      industry,
      market_cap: marketCap,
      trailing_pe: trailingPe,
      forward_pe: forwardPe,
      dividend_yield: dividendYield,
      beta,
      fifty_two_week_high: fiftyTwoWeekHigh,
      fifty_two_week_low: fiftyTwoWeekLow,
      average_volume: averageVolume,
      regular_market_volume: regularMarketVolume,
      currency,
      exchange,
      raw_summary: rawSummary,
      earnings_next_date: ex.nextEarningsCalendarYmd,
      earnings_is_estimate: ex.isEstimate,
      earnings_eps_consensus: ex.epsConsensus,
      earnings_revenue_consensus: ex.revenueConsensus,
      fetched_at: new Date().toISOString(),
    },
    { onConflict: "ticker" }
  );
  if (snapErr) throw new Error(snapErr.message);
}

function quotesToRows(
  t: string,
  chart: { quotes?: Array<{
    date?: Date;
    open?: number | null;
    high?: number | null;
    low?: number | null;
    close?: number | null;
    adjclose?: number | null;
    volume?: number | null;
  }> }
): Database["market"]["Tables"]["yahoo_eod_bars"]["Insert"][] {
  const rows: Database["market"]["Tables"]["yahoo_eod_bars"]["Insert"][] = [];
  for (const q of chart.quotes ?? []) {
    if (q.close == null || q.date == null) continue;
    const d = q.date instanceof Date ? q.date : new Date(q.date);
    const tradeDate = d.toISOString().slice(0, 10);
    rows.push({
      ticker: t,
      trade_date: tradeDate,
      open: q.open ?? null,
      high: q.high ?? null,
      low: q.low ?? null,
      close: q.close,
      adj_close: q.adjclose ?? null,
      volume: q.volume != null ? Math.round(q.volume) : null,
    });
  }
  rows.sort((a, b) => a.trade_date.localeCompare(b.trade_date));
  return rows;
}

async function getMaxEodTradeDate(
  supabase: SupabaseClient<Database, "market">,
  ticker: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("yahoo_eod_bars")
    .select("trade_date")
    .eq("ticker", ticker)
    .order("trade_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.trade_date ?? null;
}

/**
 * Yahoo Finance → `yahoo_asset_snapshot` (siempre upsert) + `yahoo_eod_bars`.
 *
 * - **full**: borra velas del ticker y vuelve a cargar `historyYears` (precarga / refresco total).
 * - **incremental**: mantiene histórico; solo pide a Yahoo el rango nuevo y hace **upsert** por (ticker, trade_date) — adecuado para cron diario (último cierre + revisiones).
 */
export async function ingestYahooForTicker(
  supabase: SupabaseClient<Database, "market">,
  yf: InstanceType<typeof YahooFinanceCtor>,
  ticker: string,
  options?: { historyYears?: number; mode?: YahooIngestMode }
): Promise<void> {
  const t = ticker.trim().toUpperCase();
  const mode: YahooIngestMode = options?.mode ?? "incremental";
  const years = options?.historyYears ?? 2;

  const { data: sym, error: se } = await supabase
    .from("us_symbols")
    .select("ticker")
    .eq("ticker", t)
    .maybeSingle();
  if (se) throw new Error(se.message);
  if (!sym) {
    throw new Error(`${t} not in us_symbols (sync SEC symbols first).`);
  }

  await upsertYahooSnapshot(supabase, yf, t);

  const period2 = new Date();
  let period1: Date;

  if (mode === "full") {
    period1 = new Date();
    period1.setFullYear(period1.getFullYear() - years);
  } else {
    const maxDate = await getMaxEodTradeDate(supabase, t);
    if (!maxDate) {
      period1 = new Date();
      period1.setFullYear(period1.getFullYear() - years);
    } else {
      period1 = new Date(`${maxDate}T12:00:00.000Z`);
      period1.setUTCDate(period1.getUTCDate() - 1);
    }
  }

  const chart = await yf.chart(t, {
    period1,
    period2,
    interval: "1d",
  });

  const rows = quotesToRows(t, chart);

  if (mode === "full") {
    const { error: delErr } = await supabase
      .from("yahoo_eod_bars")
      .delete()
      .eq("ticker", t);
    if (delErr) throw new Error(delErr.message);

    const chunk = 400;
    for (let i = 0; i < rows.length; i += chunk) {
      const slice = rows.slice(i, i + chunk);
      const { error: insErr } = await supabase.from("yahoo_eod_bars").insert(slice);
      if (insErr) throw new Error(insErr.message);
    }
    return;
  }

  const chunk = 400;
  for (let i = 0; i < rows.length; i += chunk) {
    const slice = rows.slice(i, i + chunk);
    const { error: upErr } = await supabase.from("yahoo_eod_bars").upsert(slice, {
      onConflict: "ticker,trade_date",
    });
    if (upErr) throw new Error(upErr.message);
  }
}

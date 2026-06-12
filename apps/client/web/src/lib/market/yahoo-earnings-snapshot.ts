import YahooFinance from "yahoo-finance2";
import { extractYahooEarningsFromQuoteSummary } from "@/lib/market/yahoo-earnings-extract";
import type { QuoteSummaryResult } from "yahoo-finance2/modules/quoteSummary-iface";

export type YahooEarningsSnapshot = {
  ticker: string;
  nextEarningsCalendarYmd: string | null;
  nextEarningsAt: Date | null;
  isEstimate: boolean;
  epsConsensus: number | null;
  revenueConsensus: number | null;
  epsAnalystCount: number | null;
  revenueAnalystCount: number | null;
  trendPeriod: string | null;
  error: string | null;
};

/**
 * Live Yahoo quoteSummary for earnings + analyst consensus (Explorar / dashboard).
 */
export async function fetchYahooEarningsSnapshot(
  ticker: string
): Promise<YahooEarningsSnapshot> {
  const sym = ticker.trim().toUpperCase();
  const yf = new YahooFinance();
  try {
    const summary = (await yf.quoteSummary(sym, {
      modules: ["calendarEvents", "earningsTrend", "price"],
    })) as QuoteSummaryResult;

    const ex = extractYahooEarningsFromQuoteSummary(summary);

    return {
      ticker: sym,
      nextEarningsCalendarYmd: ex.nextEarningsCalendarYmd,
      nextEarningsAt: ex.nextEarningsAnchorUtc,
      isEstimate: ex.isEstimate,
      epsConsensus: ex.epsConsensus,
      revenueConsensus: ex.revenueConsensus,
      epsAnalystCount: ex.epsAnalystCount,
      revenueAnalystCount: ex.revenueAnalystCount,
      trendPeriod: ex.trendPeriod,
      error: null,
    };
  } catch (e) {
    return {
      ticker: sym,
      nextEarningsCalendarYmd: null,
      nextEarningsAt: null,
      isEstimate: false,
      epsConsensus: null,
      revenueConsensus: null,
      epsAnalystCount: null,
      revenueAnalystCount: null,
      trendPeriod: null,
      error: e instanceof Error ? e.message : "Error Yahoo Finance",
    };
  }
}

import type { QuoteSummaryResult } from "yahoo-finance2/modules/quoteSummary-iface";
import { normalizeNextEarningsFromYahooDates } from "@/lib/market/yahoo-earnings-normalize";

function numish(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "object" && v !== null && "raw" in v) {
    const r = (v as { raw?: number }).raw;
    return typeof r === "number" && Number.isFinite(r) ? r : null;
  }
  return null;
}

export type ExtractedYahooEarnings = {
  nextEarningsCalendarYmd: string | null;
  nextEarningsAnchorUtc: Date | null;
  isEstimate: boolean;
  epsConsensus: number | null;
  revenueConsensus: number | null;
  epsAnalystCount: number | null;
  revenueAnalystCount: number | null;
  trendPeriod: string | null;
};

/**
 * Derives next earnings date and consensus from quoteSummary (calendarEvents + earningsTrend).
 */
export function extractYahooEarningsFromQuoteSummary(
  summary: QuoteSummaryResult
): ExtractedYahooEarnings {
  const ce = summary.calendarEvents?.earnings;
  const dates = ce?.earningsDate;
  let nextYmd: string | null = null;
  let anchor: Date | null = null;

  if (Array.isArray(dates) && dates.length > 0) {
    const n = normalizeNextEarningsFromYahooDates(dates);
    if (n) {
      nextYmd = n.calendarYmd;
      anchor = n.anchorUtc;
    }
  }

  const isEstimate = ce?.isEarningsDateEstimate === true;

  const trends = summary.earningsTrend?.trend;
  const t0 = Array.isArray(trends) && trends.length > 0 ? trends[0] : null;

  const epsFromCalendar = numish(ce?.earningsAverage);
  const revFromCalendar = numish(ce?.revenueAverage);

  const epsFromTrend = numish(t0?.earningsEstimate?.avg);
  const revFromTrend = numish(t0?.revenueEstimate?.avg);

  const epsConsensus = epsFromTrend ?? epsFromCalendar;
  const revenueConsensus = revFromTrend ?? revFromCalendar;

  const epsAnalystCount =
    t0?.earningsEstimate?.numberOfAnalysts != null
      ? Math.round(Number(t0.earningsEstimate.numberOfAnalysts))
      : null;
  const revenueAnalystCount =
    t0?.revenueEstimate?.numberOfAnalysts != null
      ? Math.round(Number(t0.revenueEstimate.numberOfAnalysts))
      : null;

  const trendPeriod = t0?.period != null ? String(t0.period) : null;

  return {
    nextEarningsCalendarYmd: nextYmd,
    nextEarningsAnchorUtc: anchor,
    isEstimate,
    epsConsensus,
    revenueConsensus,
    epsAnalystCount:
      epsAnalystCount != null && Number.isFinite(epsAnalystCount)
        ? epsAnalystCount
        : null,
    revenueAnalystCount:
      revenueAnalystCount != null && Number.isFinite(revenueAnalystCount)
        ? revenueAnalystCount
        : null,
    trendPeriod,
  };
}

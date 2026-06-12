import { staggerDelay } from "@/lib/market-data";
import { fetchYahooEarningsSnapshot } from "@/lib/market/yahoo-earnings-snapshot";

const CASH_TICKER = /^CASH-/i;

export type PortfolioEarningsInfo = {
  ticker: string;
  /** Canonical calendar day for earnings (America/New_York by default). */
  nextEarningsCalendarYmd: string | null;
  /** Anchor instant for ordering (stable civil day + noon UTC). */
  nextEarningsAt: Date | null;
  isEstimate: boolean;
  error?: string;
};

function normalizeTicker(t: string): string | null {
  const s = t.trim().toUpperCase();
  if (!s || CASH_TICKER.test(s)) return null;
  if (!/^[A-Z0-9.-]{1,20}$/.test(s)) return null;
  return s;
}

/**
 * Fetches next earnings dates for portfolio tickers via Yahoo Finance (quoteSummary).
 */
export async function fetchPortfolioEarningsForTickers(
  tickers: string[]
): Promise<PortfolioEarningsInfo[]> {
  const unique = [...new Set(tickers.map(normalizeTicker).filter(Boolean))] as string[];
  const out: PortfolioEarningsInfo[] = [];

  for (let i = 0; i < unique.length; i++) {
    await staggerDelay(i);
    const sym = unique[i];
    const snap = await fetchYahooEarningsSnapshot(sym);
    if (snap.error) {
      out.push({
        ticker: sym,
        nextEarningsCalendarYmd: null,
        nextEarningsAt: null,
        isEstimate: false,
        error: snap.error,
      });
    } else {
      out.push({
        ticker: sym,
        nextEarningsCalendarYmd: snap.nextEarningsCalendarYmd,
        nextEarningsAt: snap.nextEarningsAt,
        isEstimate: snap.isEstimate,
      });
    }
  }

  return out;
}

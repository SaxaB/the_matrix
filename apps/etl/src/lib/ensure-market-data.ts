import YahooFinance from "yahoo-finance2";
import { createServiceRoleClient } from "../db";
import {
  hasSecDataForTicker,
  ingestCompanyFactsForTicker,
  resolveUsSymbol,
  SEC_REQUEST_GAP_MS,
  sleep,
} from "./sec-edgar-core";
import {
  hasYahooDataForTicker,
  ingestYahooForTicker,
} from "./yahoo-ingest-core";
import { refreshFinaiRiskForTicker } from "./ticker-risk-single";

export type EnsureMarketDataResult =
  | {
      ok: true;
      ticker: string;
      skipped?: boolean;
      reason?: string;
      ranSec?: boolean;
      ranYahoo?: boolean;
      ranRisk?: boolean;
    }
  | {
      ok: false;
      ticker: string;
      /** Machine-readable cause for localized UI */
      code?: "NOT_US_LISTED" | "INVALID_TICKER" | "CONFIG" | "INGEST_FAILED";
      error: string;
      ranSec?: boolean;
      ranYahoo?: boolean;
    };

const TICKER_RE = /^[A-Z0-9.-]{1,20}$/;

/**
 * If SEC metrics and Yahoo snapshot are missing for this US ticker, run both ETLs (service role).
 * Updates FinAI risk score after Yahoo (+ SEC/EOD inputs) when possible.
 * Requires SERVICE_ROLE_KEY and SEC_EDGAR_USER_AGENT when ingest runs.
 */
export async function ensureMarketDataForTicker(
  ticker: string
): Promise<EnsureMarketDataResult> {
  const sym = ticker.trim().toUpperCase();
  if (!TICKER_RE.test(sym)) {
    return {
      ok: false,
      ticker: sym,
      code: "INVALID_TICKER",
      error: "Invalid ticker",
    };
  }

  if (!process.env.SERVICE_ROLE_KEY?.trim()) {
    return {
      ok: false,
      ticker: sym,
      code: "CONFIG",
      error: "SERVICE_ROLE_KEY not set — skipping ETL backfill",
    };
  }

  let supabase;
  try {
    supabase = createServiceRoleClient();
  } catch (e) {
    return {
      ok: false,
      ticker: sym,
      code: "CONFIG",
      error: e instanceof Error ? e.message : String(e),
    };
  }

  let ranSec = false;
  let ranYahoo = false;

  try {
    await resolveUsSymbol(supabase, sym);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/not found in SEC company_tickers/i.test(msg)) {
      return {
        ok: false,
        ticker: sym,
        code: "NOT_US_LISTED",
        error: msg,
      };
    }
    return {
      ok: false,
      ticker: sym,
      code: "INGEST_FAILED",
      error: msg,
    };
  }

  try {
    const needSec = !(await hasSecDataForTicker(supabase, sym));
    if (needSec && process.env.SEC_EDGAR_USER_AGENT?.trim()) {
      await ingestCompanyFactsForTicker(supabase, sym);
      ranSec = true;
      await sleep(SEC_REQUEST_GAP_MS);
    }

    const needYahoo = !(await hasYahooDataForTicker(supabase, sym));
    if (needYahoo) {
      const yf = new YahooFinance({
        suppressNotices: ["yahooSurvey", "ripHistorical"],
      });
      await ingestYahooForTicker(supabase, yf, sym);
      ranYahoo = true;
    }

    let ranRisk = false;
    const riskRes = await refreshFinaiRiskForTicker(sym);
    if (riskRes.ok) {
      ranRisk = true;
    }

    return { ok: true, ticker: sym, ranSec, ranYahoo, ranRisk };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      ticker: sym,
      code: "INGEST_FAILED",
      error: msg,
      ranSec,
      ranYahoo,
    };
  }
}

"use server";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { revalidatePath } from "next/cache";
import type { AssetClass, RiskLevel } from "./types";
import {
  getOrFetchQuote,
  staggerDelay,
  fetchAlphaVantageGlobalQuote,
  fetchAlphaVantageOverview,
  mapAlphaSectorToAppSector,
} from "@/lib/market-data";
import { ALPHA_VANTAGE_SUCCESSIVE_CALL_DELAY_MS } from "@/lib/market-data/constants";

function getAlphaVantageSuccessiveCallDelayMs(): number {
  const raw = process.env.ALPHA_VANTAGE_SUCCESSIVE_CALL_DELAY_MS;
  if (raw !== undefined && raw !== "") {
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n) && n >= 0) {
      return n;
    }
  }
  return ALPHA_VANTAGE_SUCCESSIVE_CALL_DELAY_MS;
}
import {
  getSnapshotCalendarDate,
  getSnapshotWindowStartDate,
  totalPortfolioValueFromRows,
} from "./portfolio-snapshots";
import { generateMockStockAnalysis } from "./mock-data";
import {
  dedupeLatestSecMetrics,
  mapSecRows,
  type ExplorationEarningsLive,
  type StockExplorationPayload,
} from "./stock-exploration";
import { flattenYahooQuoteSummaryForDisplay } from "./yahoo-raw-display";
import {
  computeReturnOverBars,
  computeRsi,
  computeSma,
} from "./technical-indicators";
import { ensureMarketDataForTicker } from "@matrix/etl/lib/ensure-market-data";
import { isUsListedInSecUniverse } from "@matrix/etl/lib/sec-edgar-core";
import { getCachedFinvizEconomicCalendar } from "@/lib/market/cached-finviz-calendar";
import { buildDashboardMarketBrief } from "@/lib/market/dashboard-brief";
import type { DashboardMarketBrief } from "@/lib/market/dashboard-brief";
import { fetchPortfolioEarningsForTickers } from "@/lib/market/portfolio-earnings-events";
import { fetchYahooEarningsSnapshot } from "@/lib/market/yahoo-earnings-snapshot";
import {
  formatYmdEs,
  getEarningsCalendarTimeZone,
} from "@/lib/market/yahoo-earnings-normalize";
import { DEFAULT_US_GAAP_CONCEPT_WHITELIST } from "@/lib/sec-edgar";
import { buildDerivedFundamentalPanelsFromMetrics } from "@/lib/sec-edgar/derived-fundamentals-panels";
import { buildAnonymizedInvestorPayload } from "@/lib/ai/anonymized-investor-payload";
import { generateInvestorProfileReportMarkdown } from "@/lib/ai/investor-profile-report";
import {
  getNextQuestionnaireEditAllowedAfter,
  isQuestionnaireEditAllowed,
} from "@/lib/questionnaire-edit-window";
import type { YahooSnapshotForRisk } from "@/lib/portfolio-position-risk";
import type { TickerRiskBreakdownJson } from "@/lib/ticker-risk-score";
import { generateTickerRiskNarrativeMarkdown } from "@/lib/ai/ticker-risk-narrative";
import type { AppLocale } from "@/lib/i18n/config";
import { getLocale } from "@/lib/i18n/server";
import { translateUi } from "@/lib/i18n/messages";

// ─── Risk Profile ───────────────────────────────────────────

export type SaveRiskProfileResult =
  | {
      success: true;
      /** True when Claude returned a new investor report (edit flow + API key). */
      aiReportRegenerated?: boolean;
      /** Edit flow + no ANTHROPIC_API_KEY: perfil guardado, informe IA no regenerado. */
      aiReportSkippedNoKey?: boolean;
      /** Set when regeneration was requested but Claude failed; profile still saved. */
      aiReportError?: string;
    }
  | { error: string }
  | {
      error: "questionnaire_edit_locked";
      nextEditAllowedAfter: string;
    };

export async function saveRiskProfile(
  riskLevel: RiskLevel,
  riskScore: number,
  answers: Record<string, number>,
  options?: {
    regenerateAiReport?: boolean;
    questionnaireEdit?: boolean;
    /** UI language for the Claude report and anonymized payload. */
    locale?: AppLocale;
  }
): Promise<SaveRiskProfileResult> {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase not configured" };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const locale = options?.locale ?? (await getLocale());

  const isQuestionnaireEdit = options?.questionnaireEdit === true;

  if (isQuestionnaireEdit) {
    const { data: existing } = await supabase
      .schema("finance").from("user_profiles")
      .select("questionnaire_edited_at")
      .eq("user_id", user.id)
      .maybeSingle();

    const lastEdited = existing?.questionnaire_edited_at as string | null | undefined;
    if (
      lastEdited != null &&
      !isQuestionnaireEditAllowed(lastEdited)
    ) {
      return {
        error: "questionnaire_edit_locked",
        nextEditAllowedAfter:
          getNextQuestionnaireEditAllowedAfter(lastEdited).toISOString(),
      };
    }
  }

  const shouldRegen = options?.regenerateAiReport === true;
  let ai_investor_report: string | null = null;
  let ai_investor_report_at: string | null = null;
  let aiReportError: string | undefined;

  if (shouldRegen && process.env.ANTHROPIC_API_KEY?.trim()) {
    try {
      const payload = buildAnonymizedInvestorPayload(
        answers,
        {
          level: riskLevel,
          score: riskScore,
        },
        locale
      );
      ai_investor_report = await generateInvestorProfileReportMarkdown(
        payload,
        locale
      );
      ai_investor_report_at = new Date().toISOString();
    } catch (e) {
      aiReportError =
        e instanceof Error ? e.message : "Error al generar el informe con Claude";
    }
  }

  type UserProfileInsert = Database["finance"]["Tables"]["user_profiles"]["Insert"];
  const upsertRow: UserProfileInsert = {
    user_id: user.id,
    risk_level: riskLevel,
    risk_score: riskScore,
    questionnaire_answers: answers,
    ai_investor_report,
    ai_investor_report_at,
  };
  if (isQuestionnaireEdit) {
    upsertRow.questionnaire_edited_at = new Date().toISOString();
  }

  const { error } = await supabase.schema("finance").from("user_profiles").upsert(upsertRow, {
    onConflict: "user_id",
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/analysis");
  revalidatePath("/perfil");
  revalidatePath("/perfil/encuesta");
  const hasKey = !!process.env.ANTHROPIC_API_KEY?.trim();
  return {
    success: true,
    aiReportRegenerated: shouldRegen && hasKey && !!ai_investor_report,
    ...(shouldRegen && !hasKey ? { aiReportSkippedNoKey: true as const } : {}),
    ...(aiReportError !== undefined ? { aiReportError } : {}),
  };
}

/** Ends Supabase session and clears auth cookies (use from client after calling). */
export async function signOutUser(): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  if (!supabase) return { ok: false };
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function getRiskProfile(): Promise<{
  risk_level: "conservative" | "moderate" | "aggressive";
  risk_score: number;
  questionnaire_answers: Record<string, number>;
  questionnaire_edited_at: string | null;
} | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .schema("finance").from("user_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!data) return null;

  return {
    risk_level: data.risk_level,
    risk_score: Number(data.risk_score),
    questionnaire_answers: data.questionnaire_answers as Record<string, number>,
    questionnaire_edited_at: data.questionnaire_edited_at ?? null,
  };
}

export async function getInvestorProfileAiReport(): Promise<{
  report: string | null;
  generatedAt: string | null;
}> {
  const supabase = await createClient();
  if (!supabase) return { report: null, generatedAt: null };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { report: null, generatedAt: null };

  const { data } = await supabase
    .schema("finance").from("user_profiles")
    .select("ai_investor_report, ai_investor_report_at")
    .eq("user_id", user.id)
    .single();

  if (!data) return { report: null, generatedAt: null };

  return {
    report: data.ai_investor_report as string | null,
    generatedAt: data.ai_investor_report_at as string | null,
  };
}

// ─── Holdings ───────────────────────────────────────────────

export interface HoldingRow {
  id: string;
  ticker: string;
  name: string;
  quantity: number;
  avg_price: number;
  current_price: number;
  asset_class: AssetClass;
  sector: string;
  currency: string;
  price_updated_at: string | null;
}

export async function getHoldings(): Promise<HoldingRow[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data } = await supabase
    .schema("finance").from("holdings")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (!data) return [];

  return data.map((row) => ({
    id: row.id,
    ticker: row.ticker,
    name: row.name,
    quantity: Number(row.quantity),
    avg_price: Number(row.avg_price),
    current_price: Number(row.current_price),
    asset_class: row.asset_class,
    sector: row.sector ?? "Other",
    currency: row.currency ?? "USD",
    price_updated_at: row.price_updated_at ?? null,
  }));
}

/** Yahoo fundamentals snapshot rows for gap / risk heuristics (authenticated read). */
export async function getYahooSnapshotsForTickers(
  tickers: string[]
): Promise<Record<string, YahooSnapshotForRisk>> {
  const supabase = await createClient();
  if (!supabase || tickers.length === 0) return {};

  const unique = [
    ...new Set(
      tickers
        .map((t) => String(t).trim().toUpperCase())
        .filter((t) => t.length > 0 && !t.startsWith("CASH-"))
    ),
  ];
  if (unique.length === 0) return {};

  const { data, error } = await supabase
    .schema("market").from("yahoo_asset_snapshot")
    .select(
      "ticker, beta, fifty_two_week_high, fifty_two_week_low, market_cap, trailing_pe, dividend_yield, fetched_at, finai_risk_score, finai_risk_computed_at, finai_risk_breakdown"
    )
    .in("ticker", unique);

  if (error) {
    console.error("yahoo_asset_snapshot select:", error.message);
    return {};
  }

  const out: Record<string, YahooSnapshotForRisk> = {};
  for (const row of data ?? []) {
    const t = String(row.ticker).toUpperCase();
    out[t] = {
      ticker: t,
      beta: row.beta != null ? Number(row.beta) : null,
      fifty_two_week_high:
        row.fifty_two_week_high != null ? Number(row.fifty_two_week_high) : null,
      fifty_two_week_low:
        row.fifty_two_week_low != null ? Number(row.fifty_two_week_low) : null,
      market_cap: row.market_cap != null ? Number(row.market_cap) : null,
      trailing_pe: row.trailing_pe != null ? Number(row.trailing_pe) : null,
      dividend_yield:
        row.dividend_yield != null ? Number(row.dividend_yield) : null,
      fetched_at: row.fetched_at ?? null,
      finai_risk_score:
        row.finai_risk_score != null ? Number(row.finai_risk_score) : null,
      finai_risk_computed_at: row.finai_risk_computed_at ?? null,
      finai_risk_breakdown:
        row.finai_risk_breakdown != null &&
        typeof row.finai_risk_breakdown === "object"
          ? (row.finai_risk_breakdown as TickerRiskBreakdownJson)
          : null,
    };
  }
  return out;
}

export type ResolveTickerForPortfolioResult =
  | {
      ok: true;
      ticker: string;
      name: string;
      sector: string;
      currentPrice: number;
      currency: string;
      quoteFromCache: boolean;
    }
  | { ok: false; error: string };

/**
 * Resolves live/cached quote + company name and sector via Alpha Vantage (not user input).
 */
export async function resolveTickerForPortfolio(
  ticker: string
): Promise<ResolveTickerForPortfolioResult> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY?.trim();
  if (!apiKey) {
    return {
      ok: false,
      error: "Configura ALPHA_VANTAGE_API_KEY en .env.local",
    };
  }

  const sym = ticker.trim().toUpperCase();
  if (!/^[A-Z0-9.-]{1,20}$/.test(sym)) {
    return { ok: false, error: "Ticker inválido" };
  }

  const supabase = await createClient();

  let price: number;
  let currency: string;
  let quoteFromCache: boolean;

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const q = await getOrFetchQuote(supabase, sym, apiKey);
      if ("error" in q) {
        return { ok: false, error: q.error };
      }
      price = q.price;
      currency = q.currency;
      quoteFromCache = q.fromCache;
    } else {
      const q = await fetchAlphaVantageGlobalQuote(sym, apiKey);
      if ("error" in q) {
        return { ok: false, error: q.error };
      }
      price = q.price;
      currency = q.currency;
      quoteFromCache = false;
    }
  } else {
    const q = await fetchAlphaVantageGlobalQuote(sym, apiKey);
    if ("error" in q) {
      return { ok: false, error: q.error };
    }
    price = q.price;
    currency = q.currency;
    quoteFromCache = false;
  }

  // Second AV call (OVERVIEW) immediately after GLOBAL_QUOTE trips the ~5/min limit unless we wait.
  // If the quote came from DB cache, we only issue one HTTP call here (OVERVIEW).
  if (!quoteFromCache) {
    await new Promise((r) =>
      setTimeout(r, getAlphaVantageSuccessiveCallDelayMs())
    );
  }

  const ov = await fetchAlphaVantageOverview(sym, apiKey);
  if ("error" in ov) {
    return { ok: false, error: ov.error };
  }

  return {
    ok: true,
    ticker: sym,
    name: ov.name,
    sector: mapAlphaSectorToAppSector(ov.sectorRaw),
    currentPrice: price,
    currency,
    quoteFromCache,
  };
}

export type PrepareUsTickerMarketDataResult =
  | {
      ok: true;
      ticker: string;
      ranSec: boolean;
      ranYahoo: boolean;
      ranRisk: boolean;
    }
  | {
      ok: false;
      code:
        | "INVALID_TICKER"
        | "NOT_US_LISTED"
        | "CONFIG"
        | "INGEST_FAILED"
        | "AUTH";
      detail?: string;
    };

const TICKER_PREP_RE = /^[A-Z0-9.-]{1,20}$/;

export type ValidateUsTickerSymbolResult =
  | { ok: true }
  | {
      ok: false;
      code: "INVALID_TICKER" | "NOT_US_LISTED" | "AUTH";
    };

/**
 * Cheap check before showing ingest UI: format + ticker exists in SEC US universe JSON (no DB writes).
 * Caller should run this before prepare / banner.
 */
export async function validateUsTickerSymbol(
  ticker: string
): Promise<ValidateUsTickerSymbolResult> {
  const supabase = await createClient();
  if (!supabase) {
    return { ok: false, code: "INVALID_TICKER" };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, code: "AUTH" };
  }

  const sym = ticker.trim().toUpperCase();
  if (!TICKER_PREP_RE.test(sym)) {
    return { ok: false, code: "INVALID_TICKER" };
  }

  const listed = await isUsListedInSecUniverse(sym);
  if (!listed) {
    return { ok: false, code: "NOT_US_LISTED" };
  }

  return { ok: true };
}

/**
 * Validates US listing (SEC reference), runs Yahoo + SEC ingest when missing, refreshes Matrix risk.
 * Requires authenticated user and server-side ingest env (service role).
 */
export async function prepareUsTickerMarketData(
  ticker: string
): Promise<PrepareUsTickerMarketDataResult> {
  const supabase = await createClient();
  if (!supabase) {
    return { ok: false, code: "CONFIG", detail: "supabase" };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, code: "AUTH" };
  }

  const sym = ticker.trim().toUpperCase();
  if (!TICKER_PREP_RE.test(sym)) {
    return { ok: false, code: "INVALID_TICKER" };
  }

  const res = await ensureMarketDataForTicker(sym);
  if (!res.ok) {
    const code =
      res.code === "INVALID_TICKER"
        ? "INVALID_TICKER"
        : res.code === "NOT_US_LISTED"
          ? "NOT_US_LISTED"
          : res.code === "CONFIG"
            ? "CONFIG"
            : "INGEST_FAILED";
    return { ok: false, code, detail: res.error };
  }

  return {
    ok: true,
    ticker: res.ticker,
    ranSec: !!res.ranSec,
    ranYahoo: !!res.ranYahoo,
    ranRisk: !!res.ranRisk,
  };
}

export async function addHolding(input: {
  ticker: string;
  quantity: number;
  avgPrice: number;
  assetClass: AssetClass;
  currency?: string;
  /** When true, skips post-insert `ensureMarketDataForTicker` (caller ran `prepareUsTickerMarketData`). */
  skipMarketBackfill?: boolean;
}) {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase not configured" };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  if (input.assetClass === "cash") {
    const currency = (input.currency ?? "USD").trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) {
      return { error: "Moneda inválida" };
    }
    const amount = input.quantity;
    if (!Number.isFinite(amount) || amount <= 0) {
      return { error: "Indica un importe mayor que cero" };
    }
    const ticker = `CASH-${currency}`;
    const name = `Efectivo (${currency})`;

    const { data, error } = await supabase
      .schema("finance").from("holdings")
      .insert({
        user_id: user.id,
        ticker,
        name,
        quantity: amount,
        avg_price: 1,
        current_price: 1,
        asset_class: "cash",
        sector: "Efectivo",
        currency,
      })
      .select()
      .single();

    if (error || !data) return { error: error?.message ?? "Insert failed" };

    await syncPortfolioDailySnapshot();

    revalidatePath("/portfolio");
    revalidatePath("/dashboard");
    revalidatePath("/analysis");

    const row: HoldingRow = {
      id: data.id,
      ticker: data.ticker,
      name: data.name,
      quantity: Number(data.quantity),
      avg_price: Number(data.avg_price),
      current_price: Number(data.current_price),
      asset_class: data.asset_class,
      sector: data.sector ?? "Other",
      currency: data.currency ?? "USD",
      price_updated_at: data.price_updated_at ?? null,
    };

    return {
      data: row,
      etl: {
        ranSec: false,
        ranYahoo: false,
        skipped: true,
        message: "Efectivo no requiere cotización de mercado.",
      },
    };
  }

  const resolved = await resolveTickerForPortfolio(input.ticker);
  if (!resolved.ok) return { error: resolved.error };

  const { data, error } = await supabase
    .schema("finance").from("holdings")
    .insert({
      user_id: user.id,
      ticker: resolved.ticker,
      name: resolved.name,
      quantity: input.quantity,
      avg_price: input.avgPrice,
      current_price: resolved.currentPrice,
      asset_class: input.assetClass,
      sector: resolved.sector,
      currency: input.currency ?? resolved.currency,
    })
    .select()
    .single();

  if (error || !data) return { error: error?.message ?? "Insert failed" };

  await syncPortfolioDailySnapshot();

  revalidatePath("/portfolio");
  revalidatePath("/dashboard");
  revalidatePath("/analysis");

  const row: HoldingRow = {
    id: data.id,
    ticker: data.ticker,
    name: data.name,
    quantity: Number(data.quantity),
    avg_price: Number(data.avg_price),
    current_price: Number(data.current_price),
    asset_class: data.asset_class,
    sector: data.sector ?? "Other",
    currency: data.currency ?? "USD",
    price_updated_at: data.price_updated_at ?? null,
  };

  let etl:
    | {
        ranSec: boolean;
        ranYahoo: boolean;
        ranRisk?: boolean;
        skipped?: boolean;
        message?: string;
      }
    | undefined;

  if (!input.skipMarketBackfill) {
    const locale = await getLocale();
    try {
      const backfill = await ensureMarketDataForTicker(resolved.ticker);
      if (backfill.ok) {
        etl = {
          ranSec: !!backfill.ranSec,
          ranYahoo: !!backfill.ranYahoo,
          ranRisk: !!backfill.ranRisk,
          message:
            backfill.ranSec || backfill.ranYahoo || backfill.ranRisk
              ? undefined
              : translateUi(locale, "portfolio.etlAlreadyHadData"),
        };
      } else {
        const msgKey =
          backfill.code === "NOT_US_LISTED"
            ? "tickerPrep.errors.notUsListed"
            : backfill.code === "CONFIG"
              ? "tickerPrep.errors.config"
              : "tickerPrep.errors.ingestFailed";
        etl = {
          ranSec: false,
          ranYahoo: false,
          message: translateUi(locale, msgKey),
        };
      }
    } catch (e) {
      console.error("[ensureMarketDataForTicker]", e);
      etl = {
        ranSec: false,
        ranYahoo: false,
        message:
          e instanceof Error ? e.message : translateUi(locale, "tickerPrep.errors.ingestFailed"),
      };
    }
  }

  return { data: row, etl };
}

export async function deleteHolding(id: string) {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase not configured" };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .schema("finance").from("holdings")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  await syncPortfolioDailySnapshot();

  revalidatePath("/portfolio");
  revalidatePath("/dashboard");
  revalidatePath("/analysis");
  return { success: true };
}

/**
 * Sell part or all of a non-cash position at a given price; proceeds are added
 * to a synthetic cash row (CASH-{currency}) for the same user.
 */
export async function sellHoldingToCash(input: {
  holdingId: string;
  quantitySold: number;
  pricePerUnit: number;
}): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase not configured" };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const sold = input.quantitySold;
  const price = input.pricePerUnit;

  if (!Number.isFinite(sold) || sold <= 0) {
    return { error: "Indica una cantidad vendida mayor que cero" };
  }
  if (!Number.isFinite(price) || price <= 0) {
    return { error: "Indica un precio de venta por título mayor que cero" };
  }

  const { data: row, error: fetchErr } = await supabase
    .schema("finance").from("holdings")
    .select("*")
    .eq("id", input.holdingId)
    .eq("user_id", user.id)
    .single();

  if (fetchErr || !row) return { error: "Posición no encontrada" };
  if (row.asset_class === "cash") {
    return { error: "La venta a efectivo no aplica a posiciones de efectivo" };
  }

  const qty = Number(row.quantity);
  if (sold > qty + 1e-8) {
    return { error: "La cantidad vendida supera tus títulos en cartera" };
  }

  const proceeds = sold * price;
  const currency = (row.currency ?? "USD").trim().toUpperCase() || "USD";
  const cashTicker = `CASH-${currency}`;
  const remaining = qty - sold;
  const fullExit = remaining <= 1e-8;

  if (fullExit) {
    const { error: delErr } = await supabase
      .schema("finance").from("holdings")
      .delete()
      .eq("id", row.id)
      .eq("user_id", user.id);
    if (delErr) return { error: delErr.message };
  } else {
    const { error: upErr } = await supabase
      .schema("finance").from("holdings")
      .update({ quantity: remaining })
      .eq("id", row.id)
      .eq("user_id", user.id);
    if (upErr) return { error: upErr.message };
  }

  const { data: cashRows, error: cashSelErr } = await supabase
    .schema("finance").from("holdings")
    .select("id, quantity")
    .eq("user_id", user.id)
    .eq("ticker", cashTicker)
    .limit(1);

  if (cashSelErr) return { error: cashSelErr.message };

  if (cashRows && cashRows.length > 0) {
    const cid = cashRows[0].id;
    const prev = Number(cashRows[0].quantity);
    const { error: cashUp } = await supabase
      .schema("finance").from("holdings")
      .update({ quantity: prev + proceeds })
      .eq("id", cid)
      .eq("user_id", user.id);
    if (cashUp) return { error: cashUp.message };
  } else {
    const { error: cashIns } = await supabase.schema("finance").from("holdings").insert({
      user_id: user.id,
      ticker: cashTicker,
      name: `Efectivo (${currency})`,
      quantity: proceeds,
      avg_price: 1,
      current_price: 1,
      asset_class: "cash",
      sector: "Efectivo",
      currency,
    });
    if (cashIns) return { error: cashIns.message };
  }

  await syncPortfolioDailySnapshot();

  revalidatePath("/portfolio");
  revalidatePath("/dashboard");
  revalidatePath("/analysis");
  return { success: true };
}

export async function updateHoldingPrice(id: string, currentPrice: number) {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase not configured" };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .schema("finance").from("holdings")
    .update({
      current_price: currentPrice,
      price_updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  await syncPortfolioDailySnapshot();

  revalidatePath("/portfolio");
  revalidatePath("/dashboard");
  return { success: true };
}

/** Persists today's total portfolio value (call after holdings change or on dashboard load). */
export async function syncPortfolioDailySnapshot(): Promise<void> {
  const supabase = await createClient();
  if (!supabase) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const rows = await getHoldings();
  const totalValue = totalPortfolioValueFromRows(rows);
  const snapshotDate = getSnapshotCalendarDate();

  const { error } = await supabase.schema("finance").from("portfolio_daily_values").upsert(
    {
      user_id: user.id,
      snapshot_date: snapshotDate,
      total_value: totalValue,
    },
    { onConflict: "user_id,snapshot_date" }
  );

  if (error) {
    console.error("portfolio_daily_values upsert:", error.message);
  }
}

/**
 * Macro calendar (Finviz embedded JSON, cached) + próximos resultados Yahoo
 * para valores del portafolio (acciones / alternativas). Sin ETL adicional.
 * Vercel: fetch en runtime; Finviz con revalidación ~1 h.
 */
export async function getDashboardMarketBrief(): Promise<DashboardMarketBrief | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: rows } = await supabase
    .schema("finance").from("holdings")
    .select("ticker, name, asset_class")
    .eq("user_id", user.id);

  const holdings = rows ?? [];
  const tickerNames: Record<string, string> = {};
  const earningsSeen = new Set<string>();
  const earningsTickers: string[] = [];
  for (const h of holdings) {
    tickerNames[h.ticker] = h.name;
    if (h.asset_class === "stocks" || h.asset_class === "alternatives") {
      if (!earningsSeen.has(h.ticker)) {
        earningsSeen.add(h.ticker);
        earningsTickers.push(h.ticker);
      }
    }
  }

  const [finviz, portfolio] = await Promise.all([
    getCachedFinvizEconomicCalendar(),
    earningsTickers.length > 0
      ? fetchPortfolioEarningsForTickers(earningsTickers)
      : Promise.resolve([]),
  ]);

  const locale = await getLocale();

  return buildDashboardMarketBrief({
    finviz,
    portfolio,
    tickerNames,
    locale,
  });
}

/** Last ~90 calendar days of stored daily values (no mock filler). */
export async function getPortfolioValueHistory(): Promise<{
  points: { date: string; value: number }[];
}> {
  const supabase = await createClient();
  if (!supabase) return { points: [] };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { points: [] };

  await syncPortfolioDailySnapshot();

  const startDate = getSnapshotWindowStartDate(90);
  const { data, error } = await supabase
    .schema("finance").from("portfolio_daily_values")
    .select("snapshot_date, total_value")
    .eq("user_id", user.id)
    .gte("snapshot_date", startDate)
    .order("snapshot_date", { ascending: true });

  if (error) {
    console.error("portfolio_daily_values select:", error.message);
    return { points: [] };
  }
  if (!data?.length) return { points: [] };

  return {
    points: data.map((row) => ({
      date: row.snapshot_date,
      value: Number(row.total_value),
    })),
  };
}

// ─── User session helper ────────────────────────────────────

export async function getCurrentUser() {
  const supabase = await createClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// ─── Market data (Alpha Vantage) ─────────────────────────────

export async function refreshHoldingsPrices(): Promise<
  | {
      ok: true;
      updatedHoldings: number;
      tickers: string[];
      skippedCache: number;
      messages: string[];
    }
  | { ok: false; error: string }
> {
  const locale = await getLocale();
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey?.trim()) {
    return {
      ok: false,
      error: translateUi(locale, "portfolio.refresh.errNoApiKey"),
    };
  }

  const supabase = await createClient();
  if (!supabase)
    return {
      ok: false,
      error: translateUi(locale, "portfolio.refresh.errNoSupabase"),
    };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return { ok: false, error: translateUi(locale, "portfolio.refresh.errSignIn") };

  const { data: holdings, error: hErr } = await supabase
    .schema("finance").from("holdings")
    .select("id, ticker, asset_class")
    .eq("user_id", user.id);

  if (hErr) return { ok: false, error: hErr.message };
  if (!holdings?.length) {
    return {
      ok: true,
      updatedHoldings: 0,
      tickers: [],
      skippedCache: 0,
      messages: [translateUi(locale, "portfolio.refresh.msgNoHoldings")],
    };
  }

  const refreshable = holdings.filter((h) => h.asset_class !== "cash");
  if (refreshable.length === 0) {
    return {
      ok: true,
      updatedHoldings: 0,
      tickers: [],
      skippedCache: 0,
      messages: [translateUi(locale, "portfolio.refresh.msgCashOnly")],
    };
  }

  // Group by normalized ticker — Postgres string compare is case-sensitive; `.eq(ticker, "AAPL")` misses "aapl".
  const idsByUpperTicker = new Map<string, string[]>();
  for (const h of refreshable) {
    const key = h.ticker.trim().toUpperCase();
    const list = idsByUpperTicker.get(key) ?? [];
    list.push(h.id);
    idsByUpperTicker.set(key, list);
  }

  const tickers = [...idsByUpperTicker.keys()];
  const messages: string[] = [];
  let updatedHoldings = 0;
  let skippedCache = 0;
  const now = new Date().toISOString();

  for (let i = 0; i < tickers.length; i++) {
    await staggerDelay(i);
    const t = tickers[i];
    const quote = await getOrFetchQuote(supabase, t, apiKey, {
      forceRefresh: true,
    });
    if ("error" in quote) {
      messages.push(`${t}: ${quote.error}`);
      continue;
    }
    if (quote.fromCache) skippedCache += 1;

    const ids = idsByUpperTicker.get(t) ?? [];
    if (ids.length === 0) continue;

    const { data: updatedRows, error: uErr } = await supabase
      .schema("finance").from("holdings")
      .update({
        current_price: quote.price,
        price_updated_at: now,
      })
      .in("id", ids)
      .eq("user_id", user.id)
      .select("id");

    if (uErr) {
      messages.push(`${t}: ${uErr.message}`);
      continue;
    }
    updatedHoldings += updatedRows?.length ?? 0;
  }

  await syncPortfolioDailySnapshot();

  revalidatePath("/portfolio");
  revalidatePath("/dashboard");
  revalidatePath("/analysis");

  return {
    ok: true,
    updatedHoldings,
    tickers,
    skippedCache,
    messages,
  };
}

/** Live quote for /stocks explorer (uses same cache + AV). */
export async function fetchQuoteForTicker(ticker: string): Promise<
  | {
      ok: true;
      price: number;
      change: number;
      changePct: number;
      currency: string;
      fromCache: boolean;
    }
  | { ok: false; error: string }
> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey?.trim()) {
    return { ok: false, error: "ALPHA_VANTAGE_API_KEY no configurada" };
  }

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase no configurado" };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Inicia sesión para cotizaciones en vivo" };

  const quote = await getOrFetchQuote(supabase, ticker, apiKey);
  if ("error" in quote) return { ok: false, error: quote.error };

  return {
    ok: true,
    price: quote.price,
    change: quote.change,
    changePct: quote.changePct,
    currency: quote.currency,
    fromCache: quote.fromCache,
  };
}

const EXPLORATION_TICKER_RE = /^[A-Z0-9.-]{1,20}$/;

/**
 * Aggregates Alpha Vantage quote, Yahoo snapshot/EOD (Supabase), and SEC EDGAR metrics for the explorer.
 * Yahoo/SEC rows reference `us_symbols.ticker`; run ETL scripts to populate.
 */
export async function getStockExplorationData(
  ticker: string
): Promise<
  { ok: true; data: StockExplorationPayload } | { ok: false; error: string }
> {
  const locale = await getLocale();
  const sym = ticker.trim().toUpperCase();
  if (!EXPLORATION_TICKER_RE.test(sym)) {
    return {
      ok: false,
      error: translateUi(locale, "stockExplore.errorInvalidTicker"),
    };
  }

  const supabase = await createClient();
  if (!supabase) {
    return {
      ok: false,
      error: translateUi(locale, "stockExplore.errorSupabase"),
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      error: translateUi(locale, "stockExplore.errorExplorerAuth"),
    };
  }

  const { data: usRow } = await supabase
    .schema("market").from("us_symbols")
    .select("cik, entity_name, exchange")
    .eq("ticker", sym)
    .maybeSingle();

  let yahoo: StockExplorationPayload["yahoo"] = null;
  let yahooRawRows: StockExplorationPayload["yahooRawRows"] = [];
  let yahooEod: StockExplorationPayload["yahooEod"] = [];
  let technical: StockExplorationPayload["technical"] = {
    rsi14: null,
    sma20: null,
    sma50: null,
    sma200: null,
    return20dPct: null,
    return60dPct: null,
  };
  let assetQuoteCache: StockExplorationPayload["assetQuoteCache"] = null;
  let secCompanyFactsFetchedAt: StockExplorationPayload["secCompanyFactsFetchedAt"] =
    null;

  const { data: quoteRow } = await supabase
    .schema("market").from("asset_quotes")
    .select("price, currency, fetched_at")
    .eq("ticker", sym)
    .maybeSingle();
  if (quoteRow) {
    assetQuoteCache = {
      price: Number(quoteRow.price),
      currency: quoteRow.currency ?? "USD",
      fetched_at: quoteRow.fetched_at,
    };
  }

  let finaiRisk: StockExplorationPayload["finaiRisk"] = null;

  if (usRow) {
    const { data: snap } = await supabase
      .schema("market").from("yahoo_asset_snapshot")
      .select(
        "long_name, sector, industry, market_cap, trailing_pe, forward_pe, dividend_yield, beta, fifty_two_week_high, fifty_two_week_low, average_volume, currency, exchange, regular_market_volume, raw_summary, fetched_at, finai_risk_score, finai_risk_computed_at, finai_risk_breakdown"
      )
      .eq("ticker", sym)
      .maybeSingle();

    if (snap) {
      yahoo = {
        long_name: snap.long_name,
        sector: snap.sector,
        industry: snap.industry,
        market_cap: snap.market_cap,
        trailing_pe: snap.trailing_pe,
        forward_pe: snap.forward_pe,
        dividend_yield: snap.dividend_yield,
        beta: snap.beta,
        fifty_two_week_high: snap.fifty_two_week_high,
        fifty_two_week_low: snap.fifty_two_week_low,
        average_volume: snap.average_volume,
        currency: snap.currency,
        exchange: snap.exchange,
        regular_market_volume: snap.regular_market_volume,
        fetched_at: snap.fetched_at,
      };
      yahooRawRows = flattenYahooQuoteSummaryForDisplay(snap.raw_summary);
      finaiRisk = {
        score:
          snap.finai_risk_score != null
            ? Number(snap.finai_risk_score)
            : null,
        computedAt: snap.finai_risk_computed_at ?? null,
        breakdown:
          snap.finai_risk_breakdown != null &&
          typeof snap.finai_risk_breakdown === "object"
            ? (snap.finai_risk_breakdown as TickerRiskBreakdownJson)
            : null,
      };
    }

    const { data: eodRows } = await supabase
      .schema("market").from("yahoo_eod_bars")
      .select(
        "trade_date, open, high, low, close, adj_close, volume"
      )
      .eq("ticker", sym)
      .order("trade_date", { ascending: true })
      .limit(400);

    yahooEod = (eodRows ?? []).map((r) => ({
      trade_date: r.trade_date,
      open: r.open != null ? Number(r.open) : null,
      high: r.high != null ? Number(r.high) : null,
      low: r.low != null ? Number(r.low) : null,
      close: Number(r.close),
      adj_close: r.adj_close != null ? Number(r.adj_close) : null,
      volume: r.volume != null ? Number(r.volume) : null,
    }));

    const closes = yahooEod.map((b) => b.close);
    technical = {
      rsi14: computeRsi(closes, 14),
      sma20: computeSma(closes, 20),
      sma50: computeSma(closes, 50),
      sma200: computeSma(closes, 200),
      return20dPct: computeReturnOverBars(closes, 20),
      return60dPct: computeReturnOverBars(closes, 60),
    };

    const { data: secSnap } = await supabase
      .schema("market").from("sec_companyfacts_snapshot")
      .select("fetched_at")
      .eq("cik", usRow.cik)
      .maybeSingle();
    secCompanyFactsFetchedAt = secSnap?.fetched_at ?? null;
  }

  const reportConcepts = Array.from(DEFAULT_US_GAAP_CONCEPT_WHITELIST);
  const { data: secRaw } = await supabase
    .schema("market").from("sec_edgar_metrics")
    .select(
      "concept, label, period_end, value, unit, fiscal_year, fiscal_period, taxonomy"
    )
    .eq("ticker", sym)
    .eq("taxonomy", "us-gaap")
    .in("concept", reportConcepts)
    .order("period_end", { ascending: false })
    .limit(2500);

  const secRows = mapSecRows(secRaw ?? []).slice(0, 300);
  const secSummary = dedupeLatestSecMetrics(secRaw ?? []);

  let alpha: StockExplorationPayload["alpha"] = null;
  let alphaError: string | null = null;
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY?.trim();
  if (!apiKey) {
    alphaError = "ALPHA_VANTAGE_API_KEY no configurada";
  } else {
    const quote = await getOrFetchQuote(supabase, sym, apiKey);
    if ("error" in quote) {
      alphaError = quote.error;
    } else {
      alpha = {
        price: quote.price,
        change: quote.change,
        changePct: quote.changePct,
        currency: quote.currency,
        fromCache: quote.fromCache,
      };
    }
  }

  const mock = generateMockStockAnalysis(sym);
  const displayName =
    yahoo?.long_name?.trim() ||
    usRow?.entity_name?.trim() ||
    mock.name ||
    sym;

  const yahooEarningsSnap = await fetchYahooEarningsSnapshot(sym);
  const earningsLive: ExplorationEarningsLive = {
    nextEarningsCalendarYmd: yahooEarningsSnap.nextEarningsCalendarYmd,
    dateLabelEs: yahooEarningsSnap.nextEarningsCalendarYmd
      ? formatYmdEs(yahooEarningsSnap.nextEarningsCalendarYmd)
      : null,
    isEstimate: yahooEarningsSnap.isEstimate,
    epsConsensus: yahooEarningsSnap.epsConsensus,
    revenueConsensus: yahooEarningsSnap.revenueConsensus,
    epsAnalystCount: yahooEarningsSnap.epsAnalystCount,
    revenueAnalystCount: yahooEarningsSnap.revenueAnalystCount,
    trendPeriod: yahooEarningsSnap.trendPeriod,
    earningsTimeZone: getEarningsCalendarTimeZone(),
    error: yahooEarningsSnap.error,
  };

  const marketPrice =
    alpha?.price ?? assetQuoteCache?.price ?? null;
  const fundamentalPanels = usRow
    ? buildDerivedFundamentalPanelsFromMetrics(
        (secRaw ?? []).map((r) => ({
          concept: r.concept,
          period_end: r.period_end,
          value: Number(r.value),
          unit: r.unit,
          fiscal_year: r.fiscal_year,
          fiscal_period: r.fiscal_period,
          taxonomy: r.taxonomy,
        })),
        yahoo,
        marketPrice
      )
    : null;

  const data: StockExplorationPayload = {
    ticker: sym,
    displayName,
    hasUsListing: !!usRow,
    usSymbol: usRow
      ? {
          cik: usRow.cik,
          entity_name: usRow.entity_name,
          exchange: usRow.exchange,
        }
      : null,
    alpha,
    alphaError,
    assetQuoteCache,
    yahoo,
    yahooRawRows,
    yahooEod,
    technical,
    secRows,
    secSummary,
    secCompanyFactsFetchedAt,
    fundamentalPanels,
    earningsLive,
    finaiRisk,
    demo: {
      sentiment: mock.sentiment,
      sentimentScore: mock.sentimentScore,
      recommendation: mock.recommendation,
    },
  };

  return { ok: true, data };
}

/**
 * Texto interpretativo (Claude) a partir del panel Matrix ya calculado en BD.
 * No recalcula la puntuación. Requiere ANTHROPIC_API_KEY y fila `finai_risk_*` en snapshot.
 */
export async function explainFinAiTickerRisk(
  ticker: string,
  demoSentimentLabel?: string | null,
  localeArg?: AppLocale
): Promise<
  { ok: true; markdown: string } | { ok: false; error: string }
> {
  const locale = localeArg ?? (await getLocale());
  const errInvalid =
    locale === "en" ? "Invalid ticker" : "Ticker inválido";
  const errNoSb =
    locale === "en" ? "Supabase not configured" : "Supabase no configurado";
  const errAuth =
    locale === "en" ? "Sign in required" : "Inicia sesión";
  const errNoScore =
    locale === "en"
      ? "No Matrix score in the database. Run npm run etl:ticker-risk after the Yahoo ETL."
      : "No hay puntuación Matrix en base de datos. Ejecuta npm run etl:ticker-risk tras el ETL Yahoo.";
  const errGen =
    locale === "en" ? "Error generating text" : "Error al generar texto";

  const sym = ticker.trim().toUpperCase();
  if (!EXPLORATION_TICKER_RE.test(sym)) {
    return { ok: false, error: errInvalid };
  }

  const supabase = await createClient();
  if (!supabase) {
    return { ok: false, error: errNoSb };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: errAuth };
  }

  const { data: snap, error } = await supabase
    .schema("market").from("yahoo_asset_snapshot")
    .select("finai_risk_score, finai_risk_breakdown")
    .eq("ticker", sym)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }
  if (
    !snap ||
    snap.finai_risk_score == null ||
    !Number.isFinite(Number(snap.finai_risk_score))
  ) {
    return {
      ok: false,
      error: errNoScore,
    };
  }

  const score = snap.finai_risk_score;
  const breakdown =
    snap.finai_risk_breakdown != null &&
    typeof snap.finai_risk_breakdown === "object"
      ? (snap.finai_risk_breakdown as TickerRiskBreakdownJson)
      : ({
          v: 2,
          labels_es: [],
          market_stress: 0,
          quality_relief: 0,
          chart_dampen: 0,
        } satisfies TickerRiskBreakdownJson);

  try {
    const markdown = await generateTickerRiskNarrativeMarkdown(
      {
        ticker: sym,
        score: Math.round(Number(score)),
        breakdown,
        demoSentimentLabel: demoSentimentLabel?.trim() || null,
      },
      locale
    );
    return { ok: true, markdown };
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : errGen;
    return { ok: false, error: msg };
  }
}

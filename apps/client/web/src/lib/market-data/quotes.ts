import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { fetchAlphaVantageGlobalQuote } from "./alpha-vantage";
import { BETWEEN_TICKER_DELAY_MS, QUOTE_TTL_MS } from "./constants";

export type QuoteOk = {
  price: number;
  change: number;
  changePct: number;
  currency: string;
  fromCache: boolean;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

const TICKER_RE = /^[A-Z0-9.-]{1,20}$/;

export type GetOrFetchQuoteOptions = {
  /**
   * When true, skips `asset_quotes` TTL and calls Alpha Vantage (e.g. user clicked
   * "Actualizar precios"). Otherwise recent cache is reused to respect API limits.
   */
  forceRefresh?: boolean;
};

/**
 * Returns a live or cached quote; upserts `asset_quotes` on API fetch.
 */
export async function getOrFetchQuote(
  supabase: SupabaseClient<Database>,
  ticker: string,
  apiKey: string,
  options?: GetOrFetchQuoteOptions
): Promise<QuoteOk | { error: string }> {
  const sym = ticker.trim().toUpperCase();
  if (!TICKER_RE.test(sym)) {
    return { error: "Ticker inválido" };
  }

  if (!options?.forceRefresh) {
    const { data: cached, error: cacheErr } = await supabase
      .schema("market").from("asset_quotes")
      .select("price, currency, fetched_at")
      .eq("ticker", sym)
      .maybeSingle();

    if (!cacheErr && cached?.fetched_at) {
      const age = Date.now() - new Date(cached.fetched_at).getTime();
      if (age >= 0 && age < QUOTE_TTL_MS) {
        return {
          price: Number(cached.price),
          change: 0,
          changePct: 0,
          currency: cached.currency ?? "USD",
          fromCache: true,
        };
      }
    }
  }

  const av = await fetchAlphaVantageGlobalQuote(sym, apiKey);
  if ("error" in av) return av;

  const now = new Date().toISOString();
  const { error: upErr } = await supabase.schema("market").from("asset_quotes").upsert(
    {
      ticker: sym,
      price: av.price,
      currency: av.currency,
      fetched_at: now,
    },
    { onConflict: "ticker" }
  );

  if (upErr) {
    return { error: upErr.message };
  }

  return {
    price: av.price,
    change: av.change,
    changePct: av.changePct,
    currency: av.currency,
    fromCache: false,
  };
}

export async function staggerDelay(index: number) {
  if (index > 0) await sleep(BETWEEN_TICKER_DELAY_MS);
}

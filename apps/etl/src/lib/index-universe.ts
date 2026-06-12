/**
 * S&P 500 ∪ Nasdaq-100 ∪ Dow (same sources as `preload-indices.ts`).
 * Used by ETL CLIs with `--universe indices` and by the preload script.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@matrix/db/types";

const WIKI_UA =
  "the_matrix/0.1 (https://github.com; ETL index universe; contact in app README)";

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": WIKI_UA, Accept: "text/plain,*/*" },
  });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.text();
}

export async function loadSp500Symbols(): Promise<string[]> {
  const csv = await fetchText(
    "https://raw.githubusercontent.com/datasets/s-and-p-500-companies/main/data/constituents.csv"
  );
  const lines = csv.split(/\r?\n/).filter(Boolean);
  const out: string[] = [];
  for (let i = 1; i < lines.length; i++) {
    const sym = lines[i].split(",")[0]?.trim();
    if (sym) out.push(sym.toUpperCase());
  }
  return out;
}

export async function loadNasdaq100FromWiki(): Promise<string[]> {
  const raw = await fetchText(
    "https://en.wikipedia.org/wiki/Nasdaq-100?action=raw"
  );
  const idx = raw.indexOf("==Current components==");
  if (idx < 0) {
    throw new Error("Wikipedia: Current components section not found");
  }
  const sub = raw.slice(idx, idx + 120_000);
  const re = /^\|\s*([A-Z][A-Z0-9.]{0,9})\s*\|\|/gm;
  const tickers: string[] = [];
  for (const mm of sub.matchAll(re)) {
    if (mm[1]) tickers.push(mm[1].toUpperCase());
  }
  if (tickers.length < 50) {
    throw new Error(`Nasdaq-100 parse too few symbols (${tickers.length})`);
  }
  return tickers;
}

export async function loadDow30FromWiki(): Promise<string[]> {
  const raw = await fetchText(
    "https://en.wikipedia.org/wiki/Dow_Jones_Industrial_Average?action=raw"
  );
  const idx = raw.indexOf("==Components==");
  if (idx < 0) throw new Error("Wikipedia: Components section not found");
  const sub = raw.slice(idx, idx + 40_000);
  const re = /\{\{(?:NASDAQ|NYSE) link\|([A-Z][A-Z0-9.]{0,9})\}\}/g;
  const out: string[] = [];
  let mm: RegExpExecArray | null;
  while ((mm = re.exec(sub)) !== null) {
    out.push(mm[1].toUpperCase());
  }
  if (out.length < 25) {
    throw new Error(`Expected ~30 DJIA symbols, got ${out.length}`);
  }
  return out;
}

export function uniqSorted(symbols: string[]): string[] {
  return [...new Set(symbols.map((s) => s.trim().toUpperCase()))]
    .filter(Boolean)
    .sort();
}

/**
 * Raw union (~500+ tickers) from public index lists (S&P ∪ NDX ∪ Dow).
 */
export async function loadSp500DowNasdaqUnionTickers(): Promise<string[]> {
  const [sp500, ndx, dow] = await Promise.all([
    loadSp500Symbols(),
    loadNasdaq100FromWiki(),
    loadDow30FromWiki(),
  ]);
  return uniqSorted([...sp500, ...ndx, ...dow]);
}

/** Map S&P CSV style (BRK-B) → key in `us_symbols` (BRK.B), etc. */
export async function resolveUsTickerAlias(
  supabase: SupabaseClient<Database, "market">,
  t: string
): Promise<string | null> {
  const candidates = [t, t.replace(/-/g, "."), t.replace(/\./g, "-")];
  const seen = new Set<string>();
  for (const c of candidates) {
    if (seen.has(c)) continue;
    seen.add(c);
    const { data } = await supabase
      .from("us_symbols")
      .select("ticker")
      .eq("ticker", c)
      .maybeSingle();
    if (data?.ticker) return data.ticker;
  }
  return null;
}

export type CanonicalUniverseResult = {
  /** Tickers as stored in `us_symbols`, deduplicated, sorted */
  canonical: string[];
  /** Raw symbols with no row in `us_symbols` */
  skipped: string[];
};

/**
 * Resolves each raw index symbol against `us_symbols` (run `etl:sec -- --sync-symbols` once if needed).
 */
export async function expandIndexUniverseToCanonical(
  supabase: SupabaseClient<Database, "market">,
  rawSymbols: string[]
): Promise<CanonicalUniverseResult> {
  const skipped: string[] = [];
  const seen = new Set<string>();
  const canonical: string[] = [];
  for (const t of uniqSorted(rawSymbols)) {
    const c = await resolveUsTickerAlias(supabase, t);
    if (!c) {
      skipped.push(t);
      continue;
    }
    if (!seen.has(c)) {
      seen.add(c);
      canonical.push(c);
    }
  }
  canonical.sort();
  return { canonical, skipped };
}

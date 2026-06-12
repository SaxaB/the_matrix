import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@matrix/db/types";
import {
  DEFAULT_US_GAAP_CONCEPT_WHITELIST,
  flattenCompanyFactsToMetrics,
} from "./sec-edgar";
import type { SecCompanyFactsApi } from "./sec-edgar/types";

/** Static files (e.g. company_tickers.json) */
export const SEC_WWW = "https://www.sec.gov";
/** XBRL / submissions JSON APIs live on data.sec.gov */
export const SEC_DATA_API = "https://data.sec.gov";
export const SEC_REQUEST_GAP_MS = 150;

/**
 * Oldest `period_end` (YYYY-MM-DD) persisted from SEC companyfacts.
 * The app only surfaces recent fundamentals, so older history is dropped at ingest
 * to keep `sec_edgar_metrics` small. Override with SEC_METRICS_MIN_PERIOD_END.
 */
export function secMetricsMinPeriodEnd(): string {
  const raw = process.env.SEC_METRICS_MIN_PERIOD_END?.trim();
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return "2016-01-01";
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function secHeaders(): HeadersInit {
  const ua = process.env.SEC_EDGAR_USER_AGENT?.trim();
  if (!ua) {
    throw new Error(
      "Set SEC_EDGAR_USER_AGENT in .env (e.g. the_matrix/0.1 (you@domain.com))"
    );
  }
  return {
    "User-Agent": ua,
    "Accept-Encoding": "gzip, deflate",
    Accept: "application/json",
  };
}

export function padCik(cik: number | string): string {
  return String(cik).replace(/\D/g, "").padStart(10, "0");
}

/**
 * Fetches JSON from SEC endpoints with retries on transient 502/503/504 (Cloudflare / gateway).
 */
export async function fetchJson<T>(url: string): Promise<T> {
  const maxAttempts = 5;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch(url, { headers: secHeaders() });
    const transient = [502, 503, 504].includes(res.status);
    if (transient && attempt < maxAttempts - 1) {
      const backoffMs = 1000 * 2 ** attempt;
      await sleep(backoffMs);
      continue;
    }
    if (!res.ok) {
      throw new Error(`${url} → HTTP ${res.status}`);
    }
    return res.json() as Promise<T>;
  }
  throw new Error(`fetchJson: agotados reintentos (${url})`);
}

type TickerFileRow = { cik_str: number; ticker: string; title: string };

let companyTickersRowsCache: TickerFileRow[] | null = null;

export async function getCompanyTickersRows(): Promise<TickerFileRow[]> {
  if (companyTickersRowsCache) return companyTickersRowsCache;
  const raw = await fetchJson<Record<string, TickerFileRow> | TickerFileRow[]>(
    `${SEC_WWW}/files/company_tickers.json`
  );
  companyTickersRowsCache = Array.isArray(raw) ? raw : Object.values(raw);
  return companyTickersRowsCache;
}

/**
 * Read-only: whether the ticker appears in SEC company_tickers (US-listed reference).
 * Does not touch the database; uses the same source as {@link resolveUsSymbol}.
 */
export async function isUsListedInSecUniverse(ticker: string): Promise<boolean> {
  const t = ticker.trim().toUpperCase();
  const rows = await getCompanyTickersRows();
  return rows.some(
    (r) => r.ticker && r.ticker.trim().toUpperCase() === t
  );
}

export async function syncSymbolMap(
  supabase: SupabaseClient<Database, "market">
): Promise<number> {
  const rows = await getCompanyTickersRows();
  let n = 0;
  const batch: Database["market"]["Tables"]["us_symbols"]["Insert"][] = [];
  for (const r of rows) {
    if (!r.ticker || !r.cik_str) continue;
    batch.push({
      ticker: r.ticker.trim().toUpperCase().slice(0, 12),
      cik: padCik(r.cik_str),
      entity_name: r.title ?? "",
      exchange: null,
    });
  }
  const chunk = 500;
  for (let i = 0; i < batch.length; i += chunk) {
    const slice = batch.slice(i, i + chunk);
    const { error } = await supabase.from("us_symbols").upsert(slice, {
      onConflict: "ticker",
    });
    if (error) throw new Error(error.message);
    n += slice.length;
  }
  return n;
}

/**
 * Resolve ticker → CIK: DB first, else SEC company_tickers.json + upsert into us_symbols.
 */
export async function resolveUsSymbol(
  supabase: SupabaseClient<Database, "market">,
  ticker: string
): Promise<{ cik: string; entity_name: string }> {
  const t = ticker.trim().toUpperCase();
  let sym: { cik: string; entity_name: string } | null = null;
  let lastDbError: Error | null = null;
  for (let dbAttempt = 0; dbAttempt < 3; dbAttempt++) {
    const { data, error: e1 } = await supabase
      .from("us_symbols")
      .select("cik, entity_name")
      .eq("ticker", t)
      .maybeSingle();
    if (!e1) {
      if (data) {
        sym = { cik: data.cik, entity_name: data.entity_name };
      }
      lastDbError = null;
      break;
    }
    lastDbError = new Error(e1.message);
    await sleep(800 * (dbAttempt + 1));
  }
  if (lastDbError) {
    throw new Error(
      `Supabase (us_symbols): ${lastDbError.message}. Reintenta en unos minutos si es un 502 temporal.`
    );
  }
  if (sym) {
    return sym;
  }

  await sleep(SEC_REQUEST_GAP_MS);
  const rows = await getCompanyTickersRows();
  const row = rows.find(
    (r) => r.ticker && r.ticker.trim().toUpperCase() === t
  );
  if (!row || row.cik_str == null) {
    throw new Error(
      `Ticker ${t} not found in SEC company_tickers (US-listed names only).`
    );
  }

  const insert: Database["market"]["Tables"]["us_symbols"]["Insert"] = {
    ticker: t,
    cik: padCik(row.cik_str),
    entity_name: row.title ?? "",
    exchange: null,
  };
  const { error: e2 } = await supabase.from("us_symbols").upsert(insert, {
    onConflict: "ticker",
  });
  if (e2) throw new Error(e2.message);

  return { cik: insert.cik, entity_name: insert.entity_name };
}

export async function hasSecDataForTicker(
  supabase: SupabaseClient<Database, "market">,
  ticker: string
): Promise<boolean> {
  const t = ticker.trim().toUpperCase();
  const { count, error } = await supabase
    .from("sec_edgar_metrics")
    .select("*", { count: "exact", head: true })
    .eq("ticker", t);
  if (error) throw new Error(error.message);
  return (count ?? 0) > 0;
}

export async function ingestCompanyFactsForTicker(
  supabase: SupabaseClient<Database, "market">,
  ticker: string,
  options?: { skipIfFetchedWithinDays?: number }
): Promise<void> {
  const t = ticker.trim().toUpperCase();
  const sym = await resolveUsSymbol(supabase, t);

  const cik = sym.cik;

  const maxAgeDays = options?.skipIfFetchedWithinDays;
  if (maxAgeDays != null && maxAgeDays > 0) {
    const { data: snap, error: snapErr } = await supabase
      .from("sec_companyfacts_snapshot")
      .select("fetched_at")
      .eq("cik", cik)
      .maybeSingle();
    if (!snapErr && snap?.fetched_at) {
      const ageMs = Date.now() - new Date(snap.fetched_at).getTime();
      const maxMs = maxAgeDays * 24 * 60 * 60 * 1000;
      if (ageMs >= 0 && ageMs < maxMs) {
        return;
      }
    }
  }

  const url = `${SEC_DATA_API}/api/xbrl/companyfacts/CIK${cik}.json`;
  await sleep(SEC_REQUEST_GAP_MS);
  const payload = await fetchJson<SecCompanyFactsApi>(url);

  const entityName = payload.entityName ?? sym.entity_name ?? null;
  const { error: e2 } = await supabase.from("sec_companyfacts_snapshot").upsert(
    {
      cik,
      entity_name: entityName,
      fetched_at: new Date().toISOString(),
    },
    { onConflict: "cik" }
  );
  if (e2) throw new Error(e2.message);

  const flat = flattenCompanyFactsToMetrics(payload, {
    cikPadded: cik,
    ticker: t,
    conceptWhitelist: DEFAULT_US_GAAP_CONCEPT_WHITELIST,
    minPeriodEnd: secMetricsMinPeriodEnd(),
  });

  const { error: e3 } = await supabase
    .from("sec_edgar_metrics")
    .delete()
    .eq("cik", cik);
  if (e3) throw new Error(e3.message);

  const insertChunk = 400;
  for (let i = 0; i < flat.length; i += insertChunk) {
    const slice = flat.slice(i, i + insertChunk).map((row) => ({
      cik: row.cik,
      ticker: row.ticker,
      taxonomy: row.taxonomy,
      concept: row.concept,
      label: row.label,
      period_end: row.period_end,
      value: row.value,
      unit: row.unit,
      form: row.form,
      filed: row.filed,
      fiscal_year: row.fiscal_year,
      fiscal_period: row.fiscal_period,
      accession: row.accession,
    }));
    const { error: e4 } = await supabase.from("sec_edgar_metrics").insert(slice);
    if (e4) throw new Error(e4.message);
  }
}

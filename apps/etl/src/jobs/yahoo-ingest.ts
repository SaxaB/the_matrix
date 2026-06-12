/**
 * Yahoo Finance ETL → Supabase (`yahoo_eod_bars`, `yahoo_asset_snapshot`).
 *
 * Requires:
 *   SUPABASE_URL
 *   SERVICE_ROLE_KEY
 *
 * Usage:
 *   pnpm etl:yahoo -- --symbols AAPL,MSFT
 *   pnpm etl:yahoo -- --universe indices
 *   pnpm etl:yahoo -- --symbols AAPL --full   # borra velas y recarga ~2 años
 *
 * Por defecto: modo incremental (upsert diario; no borra histórico).
 */

import { loadEnv } from "../env";
import YahooFinance from "yahoo-finance2";
import { createServiceRoleClient } from "../db";
import { ingestYahooForTicker } from "../lib/yahoo-ingest-core";
import {
  expandIndexUniverseToCanonical,
  loadSp500DowNasdaqUnionTickers,
} from "../lib/index-universe";

loadEnv();

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const full = argv.includes("--full");
  const symIdx = argv.indexOf("--symbols");
  const uniIdx = argv.indexOf("--universe");
  const universeIndices =
    uniIdx >= 0 && argv[uniIdx + 1]?.toLowerCase() === "indices";

  const limIdx = argv.indexOf("--limit");
  const limit =
    limIdx >= 0 && argv[limIdx + 1]
      ? Math.max(1, parseInt(argv[limIdx + 1], 10))
      : null;

  if (universeIndices && symIdx >= 0 && argv[symIdx + 1]) {
    console.error("Usa solo --universe indices o --symbols, no ambos.");
    process.exit(1);
  }

  let tickers: string[] = [];
  const supabase = createServiceRoleClient();

  if (universeIndices) {
    console.log("Cargando unión S&P 500 ∪ Nasdaq-100 ∪ Dow…");
    let raw = await loadSp500DowNasdaqUnionTickers();
    console.log(`Listas crudas: ${raw.length} símbolos`);
    if (limit != null) {
      raw = raw.slice(0, limit);
      console.log(`--limit ${limit} → procesando ${raw.length} entradas`);
    }
    const { canonical, skipped } = await expandIndexUniverseToCanonical(
      supabase,
      raw
    );
    if (skipped.length > 0) {
      console.warn(
        `Omitidos ${skipped.length} sin fila en us_symbols (ej. ${skipped.slice(0, 8).join(", ")})`
      );
    }
    tickers = canonical;
    console.log(`Tickers canónicos para Yahoo: ${tickers.length}`);
  } else if (symIdx >= 0 && argv[symIdx + 1]) {
    tickers = argv[symIdx + 1]
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
  }

  if (tickers.length === 0) {
    console.log(`
Usage:
  pnpm etl:yahoo -- --symbols AAPL,MSFT
  pnpm etl:yahoo -- --universe indices
  pnpm etl:yahoo -- --universe indices --limit 50
  pnpm etl:yahoo -- --symbols AAPL --full

  --universe indices   Mismo universo que preload-indices (~517 tickers resueltos en us_symbols).
  --limit N            Solo con --universe: recorta la lista cruda (pruebas).

  Sin --full: modo incremental (recomendado para cron diario tras el cierre US).

Requiere tickers en public.us_symbols (una vez: pnpm etl:sec -- --sync-symbols).

Env: SUPABASE_URL, SERVICE_ROLE_KEY
`);
    process.exit(1);
  }

  const yf = new YahooFinance({
    suppressNotices: ["yahooSurvey", "ripHistorical"],
  });

  for (const t of tickers) {
    await ingestYahooForTicker(supabase, yf, t, {
      mode: full ? "full" : "incremental",
    });
    console.log(`OK ${t} (${full ? "full" : "incremental"})`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

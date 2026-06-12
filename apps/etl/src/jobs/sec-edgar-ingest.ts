/**
 * SEC EDGAR ETL (manual or cron).
 *
 * Requires:
 *   SEC_EDGAR_USER_AGENT
 *   SUPABASE_URL
 *   SERVICE_ROLE_KEY
 *
 * Usage:
 *   pnpm etl:sec -- --sync-symbols
 *   pnpm etl:sec -- --symbols MSFT,AAPL
 *   pnpm etl:sec -- --universe indices
 */

import { loadEnv } from "../env";
import { createServiceRoleClient } from "../db";
import {
  SEC_REQUEST_GAP_MS,
  ingestCompanyFactsForTicker,
  sleep,
  syncSymbolMap,
} from "../lib/sec-edgar-core";
import {
  expandIndexUniverseToCanonical,
  loadSp500DowNasdaqUnionTickers,
} from "../lib/index-universe";

loadEnv();

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const syncSymbols = argv.includes("--sync-symbols");
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

  const skipIdx = argv.indexOf("--skip-if-fetched-days");
  let skipIfFetchedWithinDays: number | undefined;
  if (skipIdx >= 0 && argv[skipIdx + 1]) {
    const n = parseInt(argv[skipIdx + 1], 10);
    if (Number.isFinite(n) && n > 0) skipIfFetchedWithinDays = n;
  }

  const supabase = createServiceRoleClient();

  if (syncSymbols) {
    const n = await syncSymbolMap(supabase);
    console.log(`Synced ${n} US symbols from SEC company_tickers.json`);
  }

  let tickers: string[] = [];

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
    console.log(`Tickers canónicos para SEC: ${tickers.length}`);
  } else if (symIdx >= 0 && argv[symIdx + 1]) {
    tickers = argv[symIdx + 1]
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
  }

  if (tickers.length > 0) {
    let ok = 0;
    let failed = 0;
    for (const t of tickers) {
      try {
        await ingestCompanyFactsForTicker(supabase, t, {
          skipIfFetchedWithinDays,
        });
        ok++;
      } catch (e) {
        failed++;
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[${t}] ${msg}`);
      }
      await sleep(SEC_REQUEST_GAP_MS);
    }
    console.log(`Resumen: ${ok} correctos, ${failed} con error`);
    if (failed > 0) {
      process.exitCode = 1;
    }
  }

  if (!syncSymbols && tickers.length === 0) {
    console.log(`
Usage:
  pnpm etl:sec -- --sync-symbols
  pnpm etl:sec -- --symbols MSFT,AAPL
  pnpm etl:sec -- --universe indices
  pnpm etl:sec -- --universe indices --limit 20
  pnpm etl:sec -- --symbols MSFT,AAPL --skip-if-fetched-days 7

  --universe indices   Mismo universo que preload-indices (~517 tickers en us_symbols).
  --limit N            Solo con --universe: recorta la lista cruda (pruebas).

  --skip-if-fetched-days N  Omite la llamada a SEC si el snapshot tiene menos de N días (cron).

Env: SEC_EDGAR_USER_AGENT, SUPABASE_URL, SERVICE_ROLE_KEY
`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

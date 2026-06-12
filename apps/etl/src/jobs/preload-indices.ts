/**
 * Precarga SEC + Yahoo para el universo S&P 500 ∪ Dow Jones ∪ Nasdaq-100.
 * Obtiene listas: CSV público (S&P), Wikipedia raw (DJIA y Nasdaq-100).
 *
 * Requiere: SEC_EDGAR_USER_AGENT, SUPABASE_URL, SERVICE_ROLE_KEY
 *
 * Uso:
 *   pnpm etl:preload --
 *   pnpm etl:preload -- --sync-symbols   # opcional: llena us_symbols completo
 *   pnpm etl:preload -- --dry-run
 *   pnpm etl:preload -- --limit 20
 */

import { loadEnv } from "../env";
import YahooFinance from "yahoo-finance2";
import { createServiceRoleClient } from "../db";
import {
  SEC_REQUEST_GAP_MS,
  hasSecDataForTicker,
  ingestCompanyFactsForTicker,
  sleep,
  syncSymbolMap,
} from "../lib/sec-edgar-core";
import {
  hasYahooDataForTicker,
  ingestYahooForTicker,
} from "../lib/yahoo-ingest-core";
import {
  expandIndexUniverseToCanonical,
  loadSp500DowNasdaqUnionTickers,
} from "../lib/index-universe";

loadEnv();

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes("--dry-run");
  const doSync = argv.includes("--sync-symbols");
  const secSkipIdx = argv.indexOf("--sec-skip-days");
  let secSkipDays: number | undefined;
  if (secSkipIdx >= 0 && argv[secSkipIdx + 1]) {
    const n = parseInt(argv[secSkipIdx + 1], 10);
    if (Number.isFinite(n) && n > 0) secSkipDays = n;
  }
  const limIdx = argv.indexOf("--limit");
  const limit =
    limIdx >= 0 && argv[limIdx + 1]
      ? Math.max(1, parseInt(argv[limIdx + 1], 10))
      : null;

  console.log("Loading index constituents…");
  let universe = await loadSp500DowNasdaqUnionTickers();
  console.log(`Union ${universe.length} tickers (raw lists)`);

  if (limit != null) {
    universe = universe.slice(0, limit);
    console.log(`--limit ${limit}: processing ${universe.length} tickers`);
  }

  if (dryRun) {
    console.log("Dry run — first 40:", universe.slice(0, 40).join(", "));
    return;
  }

  const supabase = createServiceRoleClient();
  const yf = new YahooFinance({
    suppressNotices: ["yahooSurvey", "ripHistorical"],
  });

  if (doSync) {
    console.log("Running full us_symbols sync (may take a few minutes)…");
    const n = await syncSymbolMap(supabase);
    console.log(`Synced ${n} rows into us_symbols`);
  }

  const { canonical, skipped } = await expandIndexUniverseToCanonical(
    supabase,
    universe
  );
  if (skipped.length > 0) {
    console.warn(
      `Skipped ${skipped.length} symbols not in us_symbols (e.g. ${skipped.slice(0, 5).join(", ")})`
    );
  }

  const secEnabled = !!process.env.SEC_EDGAR_USER_AGENT?.trim();
  if (!secEnabled) {
    console.warn(
      "SEC_EDGAR_USER_AGENT not set — only Yahoo backfill will run for missing snapshots."
    );
  }

  let processed = 0;
  let fail = 0;

  for (let i = 0; i < canonical.length; i++) {
    const canonicalTicker = canonical[i];
    const label = `[${i + 1}/${canonical.length}] ${canonicalTicker}`;

    try {
      const needSec =
        secEnabled && !(await hasSecDataForTicker(supabase, canonicalTicker));
      if (needSec) {
        console.log(`${label} SEC ingest…`);
        await ingestCompanyFactsForTicker(supabase, canonicalTicker, {
          skipIfFetchedWithinDays: secSkipDays,
        });
        await sleep(SEC_REQUEST_GAP_MS);
      }

      const needYahoo = !(await hasYahooDataForTicker(supabase, canonicalTicker));
      if (needYahoo) {
        console.log(`${label} Yahoo ingest…`);
        await ingestYahooForTicker(supabase, yf, canonicalTicker, { mode: "full" });
      }

      if (!needSec && !needYahoo) {
        console.log(`${label} already complete`);
      }
      processed++;
    } catch (e) {
      fail++;
      console.error(`${label} ERROR`, e);
    }

    await sleep(400);
  }

  console.log(
    `Done. processed=${processed}, not-in-us_symbols=${skipped.length}, failed=${fail}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

import type {
  SecCompanyFactsApi,
  SecEdgarMetricRow,
  SecFactUnit,
} from "./types";

function parseDate(s: string | undefined): string | null {
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/**
 * Flattens SEC companyfacts JSON into rows.
 *
 * Only the `us-gaap` taxonomy is persisted (the app reads nothing else), and an
 * optional `conceptWhitelist` further narrows the stored concepts. `minPeriodEnd`
 * (YYYY-MM-DD) drops older history that the UI never surfaces, keeping the table small.
 */
export function flattenCompanyFactsToMetrics(
  data: SecCompanyFactsApi,
  opts: {
    cikPadded: string;
    ticker: string | null;
    conceptWhitelist: Set<string> | null;
    /** Inclusive lower bound for `period_end` (YYYY-MM-DD). Older facts are skipped. */
    minPeriodEnd?: string | null;
  }
): SecEdgarMetricRow[] {
  const rows: SecEdgarMetricRow[] = [];
  const facts = data.facts;
  if (!facts || typeof facts !== "object") return rows;

  const minPeriodEnd = opts.minPeriodEnd ?? null;

  for (const [taxonomy, concepts] of Object.entries(facts)) {
    if (!concepts || typeof concepts !== "object") continue;
    // The app only ever queries us-gaap; skip dei/srt/ifrs-full/etc. entirely.
    if (taxonomy !== "us-gaap") continue;

    for (const [concept, meta] of Object.entries(concepts)) {
      if (opts.conceptWhitelist && !opts.conceptWhitelist.has(concept)) {
        continue;
      }

      const units = meta.units;
      if (!units || typeof units !== "object") continue;

      for (const [unit, arr] of Object.entries(units)) {
        if (!Array.isArray(arr)) continue;
        for (const fact of arr as SecFactUnit[]) {
          const periodEnd = parseDate(fact.end);
          if (!periodEnd) continue;
          if (minPeriodEnd && periodEnd < minPeriodEnd) continue;
          const filed = parseDate(fact.filed);
          rows.push({
            cik: opts.cikPadded,
            ticker: opts.ticker,
            taxonomy,
            concept,
            label: meta.label ?? null,
            period_end: periodEnd,
            value: fact.val,
            unit,
            form: fact.form ?? null,
            filed,
            fiscal_year: typeof fact.fy === "number" ? fact.fy : null,
            fiscal_period: fact.fp ?? null,
            accession: fact.accn ?? null,
          });
        }
      }
    }
  }

  // Deduplicate restatements: same key → keep row with latest `filed`
  const byKey = new Map<string, SecEdgarMetricRow>();
  for (const row of rows) {
    const k = `${row.taxonomy}\0${row.concept}\0${row.period_end}\0${row.unit}\0${row.fiscal_period ?? ""}`;
    const prev = byKey.get(k);
    if (!prev) {
      byKey.set(k, row);
      continue;
    }
    const prevFiled = prev.filed ?? "";
    const nextFiled = row.filed ?? "";
    if (nextFiled > prevFiled) {
      byKey.set(k, row);
    }
  }
  return [...byKey.values()];
}

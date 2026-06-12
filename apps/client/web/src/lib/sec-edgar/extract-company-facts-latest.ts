import type { SecCompanyFactsApi, SecFactUnit } from "./types";

export type ExtractedAnnualFact = {
  value: number;
  periodEnd: string;
  fiscalYear: number | null;
  fiscalPeriod: string | null;
};

function parseDate(s: string | undefined): string | null {
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/**
 * From a US-GAAP concept's unit array, pick the best annual (FY) fact, else latest by period end.
 */
function pickBestAnnualUsd(facts: SecFactUnit[] | undefined): ExtractedAnnualFact | null {
  if (!facts?.length) return null;
  const fyRows = facts.filter((f) => f.fp === "FY" && typeof f.val === "number");
  if (fyRows.length > 0) {
    fyRows.sort((a, b) => (b.fy ?? 0) - (a.fy ?? 0));
    const f = fyRows[0];
    const end = parseDate(f.end);
    if (!end) return null;
    return {
      value: f.val,
      periodEnd: end,
      fiscalYear: typeof f.fy === "number" ? f.fy : null,
      fiscalPeriod: f.fp ?? null,
    };
  }
  const withEnd = facts
    .filter((f) => typeof f.val === "number" && f.end)
    .sort((a, b) => (b.end ?? "").localeCompare(a.end ?? ""));
  const f = withEnd[0];
  if (!f) return null;
  const end = parseDate(f.end);
  if (!end) return null;
  return {
    value: f.val,
    periodEnd: end,
    fiscalYear: typeof f.fy === "number" ? f.fy : null,
    fiscalPeriod: f.fp ?? null,
  };
}

function getConceptFacts(
  data: SecCompanyFactsApi,
  concept: string,
  unitKey: string
): SecFactUnit[] | undefined {
  const meta = data.facts?.["us-gaap"]?.[concept];
  return meta?.units?.[unitKey];
}

/**
 * Try several US-GAAP concept names (SEC tag variants).
 */
export function extractFirstAvailableAnnual(
  data: SecCompanyFactsApi,
  concepts: string[],
  unitKey = "USD"
): ExtractedAnnualFact | null {
  for (const c of concepts) {
    const facts = getConceptFacts(data, c, unitKey);
    const picked = pickBestAnnualUsd(facts);
    if (picked) return picked;
  }
  return null;
}

/** Two most recent FY values for YoY growth (e.g. revenues). */
export function extractTwoLatestAnnualUsd(
  data: SecCompanyFactsApi,
  concepts: string[]
): [ExtractedAnnualFact, ExtractedAnnualFact] | null {
  for (const c of concepts) {
    const facts = getConceptFacts(data, c, "USD");
    if (!facts?.length) continue;
    const fyRows = facts.filter((f) => f.fp === "FY" && typeof f.val === "number");
    if (fyRows.length < 2) continue;
    fyRows.sort((a, b) => (b.fy ?? 0) - (a.fy ?? 0));
    const a = fyRows[0];
    const b = fyRows[1];
    const endA = parseDate(a.end);
    const endB = parseDate(b.end);
    if (!endA || !endB) continue;
    return [
      {
        value: a.val,
        periodEnd: endA,
        fiscalYear: typeof a.fy === "number" ? a.fy : null,
        fiscalPeriod: a.fp ?? null,
      },
      {
        value: b.val,
        periodEnd: endB,
        fiscalYear: typeof b.fy === "number" ? b.fy : null,
        fiscalPeriod: b.fp ?? null,
      },
    ];
  }
  return null;
}

export function extractSharesOutstandingAnnual(
  data: SecCompanyFactsApi
): ExtractedAnnualFact | null {
  const candidates = [
    "CommonStockSharesOutstanding",
    "EntityCommonStockSharesOutstanding",
    "WeightedAverageNumberOfSharesOutstandingBasic",
  ];
  for (const c of candidates) {
    const facts = getConceptFacts(data, c, "shares");
    const picked = pickBestAnnualUsd(facts);
    if (picked) return picked;
    const factsUsd = getConceptFacts(data, c, "USD");
    const p2 = pickBestAnnualUsd(factsUsd);
    if (p2) return p2;
  }
  return null;
}

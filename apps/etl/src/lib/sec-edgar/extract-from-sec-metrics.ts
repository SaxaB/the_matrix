import type { ExtractedAnnualFact } from "./extract-company-facts-latest";

export type SecMetricRowInput = {
  concept: string;
  period_end: string;
  value: number;
  unit: string;
  fiscal_year: number | null;
  fiscal_period: string | null;
  taxonomy?: string | null;
};

function unitEq(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function onlyUsGaap(rows: SecMetricRowInput[]): SecMetricRowInput[] {
  return rows.filter((r) => !r.taxonomy || r.taxonomy === "us-gaap");
}

/**
 * Best FY fact for one concept + unit; else latest by period_end.
 */
function pickBestAnnualForConcept(
  rows: SecMetricRowInput[],
  concept: string,
  unitKey: string
): ExtractedAnnualFact | null {
  const sub = rows.filter(
    (r) => r.concept === concept && unitEq(r.unit, unitKey)
  );
  if (!sub.length) return null;
  const fy = sub.filter((r) => r.fiscal_period === "FY");
  const pick =
    fy.length > 0
      ? [...fy].sort((a, b) => (b.fiscal_year ?? 0) - (a.fiscal_year ?? 0))[0]
      : [...sub].sort((a, b) => b.period_end.localeCompare(a.period_end))[0];
  return {
    value: Number(pick.value),
    periodEnd: pick.period_end,
    fiscalYear: typeof pick.fiscal_year === "number" ? pick.fiscal_year : null,
    fiscalPeriod: pick.fiscal_period,
  };
}

export function extractFirstAvailableAnnualFromMetrics(
  rows: SecMetricRowInput[],
  concepts: string[],
  unitKey = "USD"
): ExtractedAnnualFact | null {
  const us = onlyUsGaap(rows);
  for (const c of concepts) {
    const picked = pickBestAnnualForConcept(us, c, unitKey);
    if (picked) return picked;
  }
  return null;
}

export function extractTwoLatestAnnualUsdFromMetrics(
  rows: SecMetricRowInput[],
  concepts: string[]
): [ExtractedAnnualFact, ExtractedAnnualFact] | null {
  const us = onlyUsGaap(rows);
  for (const c of concepts) {
    const fy = us.filter(
      (r) =>
        r.concept === c &&
        unitEq(r.unit, "USD") &&
        r.fiscal_period === "FY" &&
        typeof r.fiscal_year === "number"
    );
    if (fy.length < 2) continue;
    fy.sort((a, b) => (b.fiscal_year ?? 0) - (a.fiscal_year ?? 0));
    const a = fy[0];
    const b = fy[1];
    const fa: ExtractedAnnualFact = {
      value: Number(a.value),
      periodEnd: a.period_end,
      fiscalYear: a.fiscal_year,
      fiscalPeriod: a.fiscal_period,
    };
    const fb: ExtractedAnnualFact = {
      value: Number(b.value),
      periodEnd: b.period_end,
      fiscalYear: b.fiscal_year,
      fiscalPeriod: b.fiscal_period,
    };
    return [fa, fb];
  }
  return null;
}

export function extractSharesOutstandingAnnualFromMetrics(
  rows: SecMetricRowInput[]
): ExtractedAnnualFact | null {
  const candidates = [
    "CommonStockSharesOutstanding",
    "EntityCommonStockSharesOutstanding",
    "WeightedAverageNumberOfSharesOutstandingBasic",
  ];
  const us = onlyUsGaap(rows);
  for (const c of candidates) {
    const fromShares = pickBestAnnualForConcept(us, c, "shares");
    if (fromShares) return fromShares;
    const fromUsd = pickBestAnnualForConcept(us, c, "USD");
    if (fromUsd) return fromUsd;
  }
  return null;
}

const REV = [
  "Revenues",
  "RevenueFromContractWithCustomerExcludingAssessedTax",
  "SalesRevenueNet",
];
const NI = ["NetIncomeLoss"];
const GP = ["GrossProfit"];
const COR = ["CostOfRevenue"];
const OI = ["OperatingIncomeLoss"];
const TA = ["Assets"];
const TLE = ["Liabilities"];
const EQ = ["StockholdersEquity"];
const CA = ["AssetsCurrent"];
const CL = ["LiabilitiesCurrent"];
const CASH = ["CashAndCashEquivalentsAtCarryingValue"];
const LTD = [
  "LongTermDebtNoncurrent",
  "LongTermDebt",
  "LongTermDebtAndCapitalLeaseObligations",
];
const STD = [
  "DebtCurrent",
  "ShortTermBorrowings",
  "CommercialPaper",
  "LongTermDebtCurrent",
];
const INV = ["InventoryNet", "InventoryGross"];
const EPSD = ["EarningsPerShareDiluted", "EarningsPerShareDilutedOneYear"];
const EBITDA = ["EarningsBeforeInterestTaxesDepreciationAmortization"];

/** All facts needed for `buildDerivedFundamentalPanelsFromMetrics`. */
export type FundamentalFactsForPanels = {
  rev: ExtractedAnnualFact | null;
  ni: ExtractedAnnualFact | null;
  gp: ExtractedAnnualFact | null;
  cor: ExtractedAnnualFact | null;
  oi: ExtractedAnnualFact | null;
  assets: ExtractedAnnualFact | null;
  liab: ExtractedAnnualFact | null;
  eq: ExtractedAnnualFact | null;
  ca: ExtractedAnnualFact | null;
  cl: ExtractedAnnualFact | null;
  cash: ExtractedAnnualFact | null;
  ltd: ExtractedAnnualFact | null;
  std: ExtractedAnnualFact | null;
  inv: ExtractedAnnualFact | null;
  epsD: ExtractedAnnualFact | null;
  shares: ExtractedAnnualFact | null;
  ebitdaTag: ExtractedAnnualFact | null;
  twoRev: [ExtractedAnnualFact, ExtractedAnnualFact] | null;
};

export function gatherFundamentalFactsFromMetricRows(
  rows: SecMetricRowInput[]
): FundamentalFactsForPanels {
  return {
    rev: extractFirstAvailableAnnualFromMetrics(rows, REV, "USD"),
    ni: extractFirstAvailableAnnualFromMetrics(rows, NI, "USD"),
    gp: extractFirstAvailableAnnualFromMetrics(rows, GP, "USD"),
    cor: extractFirstAvailableAnnualFromMetrics(rows, COR, "USD"),
    oi: extractFirstAvailableAnnualFromMetrics(rows, OI, "USD"),
    assets: extractFirstAvailableAnnualFromMetrics(rows, TA, "USD"),
    liab: extractFirstAvailableAnnualFromMetrics(rows, TLE, "USD"),
    eq: extractFirstAvailableAnnualFromMetrics(rows, EQ, "USD"),
    ca: extractFirstAvailableAnnualFromMetrics(rows, CA, "USD"),
    cl: extractFirstAvailableAnnualFromMetrics(rows, CL, "USD"),
    cash: extractFirstAvailableAnnualFromMetrics(rows, CASH, "USD"),
    ltd: extractFirstAvailableAnnualFromMetrics(rows, LTD, "USD"),
    std: extractFirstAvailableAnnualFromMetrics(rows, STD, "USD"),
    inv: extractFirstAvailableAnnualFromMetrics(rows, INV, "USD"),
    epsD: extractFirstAvailableAnnualFromMetrics(rows, EPSD, "USD/shares"),
    shares: extractSharesOutstandingAnnualFromMetrics(rows),
    ebitdaTag: extractFirstAvailableAnnualFromMetrics(rows, EBITDA, "USD"),
    twoRev: extractTwoLatestAnnualUsdFromMetrics(rows, REV),
  };
}

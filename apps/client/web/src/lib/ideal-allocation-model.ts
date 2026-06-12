import { RISK_PROFILES } from "@/lib/constants";
import type { AppLocale } from "@/lib/i18n/config";
import {
  getIdealAllocationCopy,
  type IdealRuleCopy,
} from "@/lib/i18n/ideal-allocation-copy";
import type { AssetAllocation, AssetClass, Holding, RiskLevel } from "@/lib/types";

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.min(1, Math.max(0, t));
}

function lerpAllocation(
  A: AssetAllocation,
  B: AssetAllocation,
  t: number
): AssetAllocation {
  return {
    stocks: lerp(A.stocks, B.stocks, t),
    bonds: lerp(A.bonds, B.bonds, t),
    cash: lerp(A.cash, B.cash, t),
    alternatives: lerp(A.alternatives, B.alternatives, t),
  };
}

/** Renormalize to 100% with one decimal; fixes rounding drift. */
export function normalizePercentAllocation(a: AssetAllocation): AssetAllocation {
  const keys: AssetClass[] = ["stocks", "bonds", "cash", "alternatives"];
  const raw = keys.map((k) => Math.max(0, a[k]));
  const sum = raw.reduce((s, x) => s + x, 0);
  if (sum <= 0) {
    return { stocks: 25, bonds: 25, cash: 25, alternatives: 25 };
  }
  const f = 100 / sum;
  const rounded = raw.map((x) => Math.round(x * f * 10) / 10);
  const diff = Math.round((100 - rounded.reduce((s, x) => s + x, 0)) * 10) / 10;
  const maxI = rounded.indexOf(Math.max(...rounded));
  rounded[maxI] = Math.round((rounded[maxI] + diff) * 10) / 10;
  return {
    stocks: rounded[0],
    bonds: rounded[1],
    cash: rounded[2],
    alternatives: rounded[3],
  };
}

/**
 * Piecewise linear blend on risk_score 0–100: conservative → moderate (0–50),
 * then moderate → aggressive (50–100). A “moderate” score near 34 leans
 * conservative; near 66 leans aggressive.
 */
export function interpolateBaseIdealByRiskScore(riskScore: number): AssetAllocation {
  const s = Math.min(100, Math.max(0, riskScore));
  const u = s / 100;
  const C = RISK_PROFILES.conservative.idealAllocation;
  const M = RISK_PROFILES.moderate.idealAllocation;
  const A = RISK_PROFILES.aggressive.idealAllocation;
  const blended =
    u <= 0.5
      ? lerpAllocation(C, M, u / 0.5)
      : lerpAllocation(M, A, (u - 0.5) / 0.5);
  return normalizePercentAllocation(blended);
}

function shiftPct(
  a: AssetAllocation,
  from: AssetClass,
  to: AssetClass,
  pts: number
): void {
  const m = Math.min(Math.max(0, pts), Math.max(0, a[from]));
  a[from] -= m;
  a[to] += m;
}

/**
 * Deterministic tilts from questionnaire scores (same IDs as `QUESTIONNAIRE`).
 */
export function applyQuestionnaireAllocationRules(
  base: AssetAllocation,
  answers: Record<string, number>,
  ruleTexts: IdealRuleCopy
): { allocation: AssetAllocation; ruleNotes: string[] } {
  const a: AssetAllocation = { ...base };
  const ruleNotes: string[] = [];
  const q = (id: string) => answers[id];

  const q1 = q("q1");
  if (q1 !== undefined && q1 < 35) {
    shiftPct(a, "stocks", "cash", 3);
    ruleNotes.push(ruleTexts.q1short);
  } else if (q1 !== undefined && q1 > 65) {
    shiftPct(a, "bonds", "stocks", 2);
    ruleNotes.push(ruleTexts.q1long);
  }

  const q2 = q("q2");
  if (q2 !== undefined && q2 < 35) {
    shiftPct(a, "stocks", "cash", 2);
    ruleNotes.push(ruleTexts.q2defensive);
  } else if (q2 !== undefined && q2 > 70) {
    shiftPct(a, "bonds", "stocks", 1.5);
    ruleNotes.push(ruleTexts.q2aggressive);
  }

  const q8 = q("q8");
  if (q8 !== undefined && q8 < 40) {
    shiftPct(a, "stocks", "cash", 2);
    ruleNotes.push(ruleTexts.q8low);
  }

  const q14 = q("q14");
  if (q14 !== undefined && q14 < 40) {
    shiftPct(a, "stocks", "bonds", 3);
    ruleNotes.push(ruleTexts.q14dependent);
  }

  const q9 = q("q9");
  if (q9 !== undefined && q9 < 40) {
    shiftPct(a, "alternatives", "bonds", 2);
    ruleNotes.push(ruleTexts.q9low);
  }

  const q10 = q("q10");
  if (q10 !== undefined && q10 > 75) {
    shiftPct(a, "bonds", "alternatives", 1.5);
    ruleNotes.push(ruleTexts.q10high);
  }

  return { allocation: normalizePercentAllocation(a), ruleNotes };
}

export type IdealAllocationBuildResult = {
  allocation: AssetAllocation;
  /** Localized bullets for UI / transparency */
  notes: string[];
};

export function buildIdealAssetAllocation(params: {
  riskScore: number;
  riskLevel: RiskLevel;
  answers: Record<string, number>;
  locale: AppLocale;
}): IdealAllocationBuildResult {
  const notes: string[] = [];
  const base = interpolateBaseIdealByRiskScore(params.riskScore);
  const copy = getIdealAllocationCopy(params.locale);
  const profileLabel = copy.riskLabels[params.riskLevel];
  notes.push(copy.baseNote(profileLabel, params.riskScore));

  const { allocation, ruleNotes } = applyQuestionnaireAllocationRules(
    base,
    params.answers,
    copy.rules
  );
  notes.push(...ruleNotes);

  return { allocation, notes };
}

/** Concentración de valor en renta variable (solo clase «stocks»). */
export function analyzeStockConcentration(
  holdings: Holding[],
  locale: AppLocale
): {
  level: "ok" | "notice" | "elevated";
  top3SharePct: number;
  largestSharePct: number;
  stockPositions: number;
  message: string;
} {
  const stockValues = holdings
    .filter((h) => h.assetClass === "stocks")
    .map((h) => h.currentPrice * h.quantity)
    .sort((a, b) => b - a);
  const total = stockValues.reduce((s, x) => s + x, 0);
  const copy = getIdealAllocationCopy(locale);

  if (total <= 0 || stockValues.length === 0) {
    return {
      level: "ok",
      top3SharePct: 0,
      largestSharePct: 0,
      stockPositions: 0,
      message: "",
    };
  }
  const top3 = stockValues.slice(0, 3).reduce((s, x) => s + x, 0);
  const top3SharePct = Math.round((top3 / total) * 1000) / 10;
  const largestSharePct =
    Math.round((stockValues[0] / total) * 1000) / 10;
  let level: "ok" | "notice" | "elevated" = "ok";
  let message = "";
  if (largestSharePct >= 48 || top3SharePct >= 78) {
    level = "elevated";
    message = copy.stockConc.elevated;
  } else if (largestSharePct >= 35 || top3SharePct >= 65) {
    level = "notice";
    message = copy.stockConc.notice;
  }
  return {
    level,
    top3SharePct,
    largestSharePct,
    stockPositions: stockValues.length,
    message,
  };
}

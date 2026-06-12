import { RISK_PROFILES } from "@/lib/constants";
import { buildIdealAssetAllocation } from "@/lib/ideal-allocation-model";
import type { AppLocale } from "@/lib/i18n/config";
import { getIdealAllocationCopy } from "@/lib/i18n/ideal-allocation-copy";
import { getLocalizedQuestionnaire } from "@/lib/i18n/questionnaire-locale";
import type { RiskLevel } from "@/lib/types";

/**
 * Structured payload for external LLM calls: no user id, email, or portfolio tickers.
 * Financial questions are represented only as ordinal bands (1–4), not euro amounts in text.
 */
export type AnonymizedInvestorPayloadV1 = {
  schema: "matrix-investor-payload-v1";
  deterministic: {
    risk_band: RiskLevel;
    /** App’s numeric score 0–100 (same as DB risk_score). */
    score_0_100: number;
    /** Reference allocation from the app’s deterministic profile (do not invent other % ranges). */
    app_reference: {
      /** Human-readable profile name in the user’s UI language. */
      profile_label: string;
      ideal_allocation_pct: {
        stocks: number;
        bonds: number;
        cash: number;
        alternatives: number;
      };
      max_volatility_typical_pct: number;
      expected_return_annual_estimation_pct: { min: number; max: number };
    };
  };
  /** One row per questionnaire item: ordinal band within that question’s options. */
  dimensions: Array<{
    /** 1-based index in the questionnaire (P1…P20). */
    question_index: number;
    category: string;
    /** 1 = first option … 4 = fourth option (order as in app). */
    response_band: 1 | 2 | 3 | 4;
  }>;
};

function resolveOptionBand(
  questions: { id: string; options: { score: number }[] }[],
  questionId: string,
  storedScore: number
): 1 | 2 | 3 | 4 {
  const q = questions.find((x) => x.id === questionId);
  if (!q) return 2;

  const exact = q.options.findIndex((o) => o.score === storedScore);
  if (exact >= 0) return (exact + 1) as 1 | 2 | 3 | 4;

  let best = 0;
  let bestDiff = Infinity;
  q.options.forEach((o, i) => {
    const d = Math.abs(o.score - storedScore);
    if (d < bestDiff) {
      bestDiff = d;
      best = i;
    }
  });
  return (best + 1) as 1 | 2 | 3 | 4;
}

export function buildAnonymizedInvestorPayload(
  answers: Record<string, number>,
  deterministic: { level: RiskLevel; score: number },
  locale: AppLocale
): AnonymizedInvestorPayloadV1 {
  const questions = getLocalizedQuestionnaire(locale);
  const copy = getIdealAllocationCopy(locale);

  const dimensions = questions.map((q, i) => ({
    question_index: i + 1,
    category: q.category,
    response_band: resolveOptionBand(questions, q.id, answers[q.id] ?? 0),
  }));

  const { allocation: ideal } = buildIdealAssetAllocation({
    riskScore: deterministic.score,
    riskLevel: deterministic.level,
    answers,
    locale,
  });

  const profileLabel = copy.riskLabels[deterministic.level];
  const profile = RISK_PROFILES[deterministic.level];

  return {
    schema: "matrix-investor-payload-v1",
    deterministic: {
      risk_band: deterministic.level,
      score_0_100: Math.round(deterministic.score * 10) / 10,
      app_reference: {
        profile_label: profileLabel,
        ideal_allocation_pct: {
          stocks: Math.round(ideal.stocks * 10) / 10,
          bonds: Math.round(ideal.bonds * 10) / 10,
          cash: Math.round(ideal.cash * 10) / 10,
          alternatives: Math.round(ideal.alternatives * 10) / 10,
        },
        max_volatility_typical_pct: profile.maxVolatility,
        expected_return_annual_estimation_pct: {
          min: profile.expectedReturn.min,
          max: profile.expectedReturn.max,
        },
      },
    },
    dimensions,
  };
}

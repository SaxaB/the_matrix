/**
 * Measures how closely a ticker’s Matrix risk score (5–95, DB) aligns with the
 * user’s questionnaire risk score (0–100).
 *
 * Both map to [0, 1]; alignment is higher when values are closer (conservative
 * investor ↔ lower stock risk; aggressive investor ↔ higher stock risk).
 * Educational only — not investment advice.
 */

export type ProfileStockFitVerdict = "strong" | "moderate" | "weak" | "poor";

export type ProfileStockFitResult = {
  /** 0–100 */
  fitScore: number;
  verdict: ProfileStockFitVerdict;
  /** Convenience for badges / filters */
  recommended: boolean;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/** Map Matrix span 5–95 → approximately [0, 1] */
function stockRiskNormalized(finaiRiskScore: number): number {
  const x = clamp(finaiRiskScore, 5, 95);
  return (x - 5) / 90;
}

/**
 * @param userRiskScore questionnaire score 0–100
 * @param finaiRiskScore Matrix ticker score 5–95 or null
 */
export function computeProfileStockFit(
  userRiskScore: number,
  finaiRiskScore: number | null | undefined
): ProfileStockFitResult | null {
  if (
    finaiRiskScore == null ||
    !Number.isFinite(finaiRiskScore) ||
    !Number.isFinite(userRiskScore)
  ) {
    return null;
  }

  const userNorm = clamp(userRiskScore, 0, 100) / 100;
  const stockNorm = stockRiskNormalized(finaiRiskScore);
  const gap = Math.abs(userNorm - stockNorm);

  /** Penalise large gaps slightly more than linear for clearer “poor” tails */
  const fitScore = Math.round(100 * (1 - Math.pow(gap, 1.08)));

  let verdict: ProfileStockFitVerdict;
  if (fitScore >= 72) verdict = "strong";
  else if (fitScore >= 52) verdict = "moderate";
  else if (fitScore >= 34) verdict = "weak";
  else verdict = "poor";

  const recommended = fitScore >= 52;

  return { fitScore, verdict, recommended };
}

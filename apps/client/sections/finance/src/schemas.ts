/**
 * Schemas Zod de la sección Finanzas.
 *
 * TradePlan es el espejo TS del contrato §9bis.2 (pydantic en
 * apps/agent/saxa/domains/finance/risk.py). Si cambia uno, cambia el otro.
 */

import { z } from "zod";

export const pricePointSchema = z.object({
  px: z.number().positive(),
  weight: z.number().gt(0).lte(1),
});

export const tradePlanSchema = z.object({
  id: z.string().uuid().optional(),
  ticker: z.string().min(1).max(20).transform((t) => t.toUpperCase()),
  side: z.enum(["long", "short"]).default("long"),
  thesis_ref: z.string().nullable().optional(),
  conviction: z.number().min(0).max(1).nullable().optional(),
  position_pct_target: z.number().positive(),
  entries: z.array(pricePointSchema).min(1),
  stop_loss: z.number().positive(),
  take_profits: z.array(pricePointSchema).min(1),
  r_multiple_target: z.number().nullable().optional(),
  max_loss_pct_portfolio: z.number().nullable().optional(),
  risk_score: z.number().int().min(0).max(100).nullable().optional(),
  status: z
    .enum(["draft", "gated", "published", "rejected", "expired"])
    .default("draft"),
  gate_result: z.unknown().nullable().optional(),
  created_at: z.string().optional(),
});

export type PricePoint = z.infer<typeof pricePointSchema>;
export type TradePlan = z.infer<typeof tradePlanSchema>;

/** Entrada media ponderada (igual que TradePlan.avg_entry en el agente). */
export function avgEntry(plan: Pick<TradePlan, "entries">): number {
  return plan.entries.reduce((acc, p) => acc + p.px * p.weight, 0);
}

export function avgTakeProfit(plan: Pick<TradePlan, "take_profits">): number {
  return plan.take_profits.reduce((acc, p) => acc + p.px * p.weight, 0);
}

export function computedRMultiple(
  plan: Pick<TradePlan, "entries" | "take_profits" | "stop_loss" | "side">
): number | null {
  const entry = avgEntry(plan);
  const tp = avgTakeProfit(plan);
  const risk = plan.side === "short" ? plan.stop_loss - entry : entry - plan.stop_loss;
  if (risk <= 0) return null;
  const reward = plan.side === "short" ? entry - tp : tp - entry;
  return reward / risk;
}

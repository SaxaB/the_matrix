/**
 * Queries de la sección Finanzas contra PostgREST (supabase-js).
 *
 * Funcionan igual en web (client components) y móvil: reciben el cliente y
 * devuelven view-models. RLS decide qué filas ve cada usuario.
 */

import { financeDb, marketDb, type MatrixClient } from "@matrix/client-shared/supabase";
import { toPortfolioView, type PortfolioView } from "./mappers";
import { tradePlanSchema, type TradePlan } from "./schemas";

export async function fetchPortfolio(client: MatrixClient): Promise<PortfolioView> {
  const { data, error } = await financeDb(client)
    .from("holdings")
    .select("*")
    .order("ticker");
  if (error) throw new Error(`holdings: ${error.message}`);
  return toPortfolioView(data ?? []);
}

export interface TickerSnapshot {
  ticker: string;
  longName: string | null;
  sector: string | null;
  marketCap: number | null;
  trailingPe: number | null;
  riskScore: number | null;
  earningsNextDate: string | null;
}

export async function fetchTickerSnapshot(
  client: MatrixClient,
  ticker: string
): Promise<TickerSnapshot | null> {
  const { data, error } = await marketDb(client)
    .from("yahoo_asset_snapshot")
    .select(
      "ticker, long_name, sector, market_cap, trailing_pe, finai_risk_score, earnings_next_date"
    )
    .eq("ticker", ticker.toUpperCase())
    .maybeSingle();
  if (error) throw new Error(`yahoo_asset_snapshot: ${error.message}`);
  if (!data) return null;
  return {
    ticker: data.ticker,
    longName: data.long_name,
    sector: data.sector,
    marketCap: data.market_cap,
    trailingPe: data.trailing_pe,
    riskScore: data.finai_risk_score,
    earningsNextDate: data.earnings_next_date,
  };
}

export async function fetchTradePlans(
  client: MatrixClient,
  opts: { statuses?: TradePlan["status"][]; limit?: number } = {}
): Promise<TradePlan[]> {
  let query = financeDb(client)
    .from("trade_plans")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 25);
  if (opts.statuses?.length) {
    query = query.in("status", opts.statuses);
  }
  const { data, error } = await query;
  if (error) throw new Error(`trade_plans: ${error.message}`);
  return (data ?? []).flatMap((row) => {
    const parsed = tradePlanSchema.safeParse(row);
    return parsed.success ? [parsed.data] : [];
  });
}

/**
 * Suscripción Realtime a trade plans nuevos/actualizados (diseño §4bis:
 * el agente escribe una fila y los clientes se repintan solos).
 * Devuelve la función de unsubscribe.
 */
export function subscribeTradePlans(
  client: MatrixClient,
  onChange: () => void
): () => void {
  const channel = client
    .channel("trade_plans_changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "finance", table: "trade_plans" },
      onChange
    )
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}

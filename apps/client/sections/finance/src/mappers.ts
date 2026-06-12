/**
 * Mappers fila→view-model de la sección Finanzas (diseño §6bis: la sección
 * transforma; la UI de cada plataforma solo pinta).
 */

import type { Database } from "@matrix/db/types";

type HoldingRow = Database["finance"]["Tables"]["holdings"]["Row"];

export interface PositionView {
  ticker: string;
  name: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  value: number;
  pnlOpen: number;
  pnlOpenPct: number | null;
  weightPct: number | null;
  sector: string;
  assetClass: HoldingRow["asset_class"];
}

export function toPositionView(row: HoldingRow, totalValue: number | null): PositionView {
  const quantity = Number(row.quantity);
  const avgPrice = Number(row.avg_price);
  const currentPrice = Number(row.current_price);
  const value = quantity * currentPrice;
  return {
    ticker: row.ticker,
    name: row.name,
    quantity,
    avgPrice,
    currentPrice,
    value,
    pnlOpen: (currentPrice - avgPrice) * quantity,
    pnlOpenPct: avgPrice > 0 ? 100 * (currentPrice / avgPrice - 1) : null,
    weightPct: totalValue ? (100 * value) / totalValue : null,
    sector: row.sector ?? "Other",
    assetClass: row.asset_class,
  };
}

export interface PortfolioView {
  positions: PositionView[];
  totalValue: number;
  pnlOpen: number;
}

export function toPortfolioView(rows: HoldingRow[]): PortfolioView {
  const totalValue = rows.reduce(
    (acc, r) => acc + Number(r.quantity) * Number(r.current_price),
    0
  );
  const positions = rows
    .map((r) => toPositionView(r, totalValue))
    .sort((a, b) => b.value - a.value);
  return {
    positions,
    totalValue,
    pnlOpen: positions.reduce((acc, p) => acc + p.pnlOpen, 0),
  };
}

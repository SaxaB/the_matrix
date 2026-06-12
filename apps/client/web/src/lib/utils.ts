import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Holding } from "./types"
import type { HoldingRow } from "./actions"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPct(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

/** Calendar date label for portfolio snapshot / chart axes (es-ES). */
export function formatSnapshotChartDate(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`);
  return d.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function dbRowToHolding(row: HoldingRow): Holding {
  return {
    id: row.id,
    ticker: row.ticker,
    name: row.name,
    quantity: row.quantity,
    avgPrice: row.avg_price,
    currentPrice: row.current_price,
    assetClass: row.asset_class,
    sector: row.sector,
    currency: row.currency,
    priceUpdatedAt: row.price_updated_at,
  };
}

/**
 * Formatters compartidos web/móvil (extraídos de apps/client/web/src/lib/utils.ts).
 * Mantener alineados con la web: misma moneda y convenciones es-ES.
 */

export function formatCurrency(value: number, fractionDigits = 0): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatPct(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export function formatDateEs(isoDate: string): string {
  const d = new Date(isoDate.length <= 10 ? `${isoDate}T12:00:00` : isoDate);
  return d.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatQuantity(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(value);
}

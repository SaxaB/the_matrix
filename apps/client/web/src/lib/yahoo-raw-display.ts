import type { Json } from "@/lib/supabase/database.types";

function formatLeaf(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" && Number.isFinite(v)) {
    if (Math.abs(v) >= 1e12) return `${(v / 1e12).toFixed(2)}T`;
    if (Math.abs(v) >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
    if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
    if (Math.abs(v) < 0.0001 && v !== 0) return v.toExponential(2);
    return String(
      Number.isInteger(v) ? v : Math.round(v * 1e6) / 1e6
    );
  }
  if (typeof v === "boolean") return v ? "Sí" : "No";
  if (typeof v === "string") {
    return v.length > 120 ? `${v.slice(0, 117)}…` : v;
  }
  if (typeof v === "object" && v !== null && "raw" in v) {
    const r = (v as { raw?: unknown }).raw;
    if (typeof r === "number" && Number.isFinite(r)) return formatLeaf(r);
    if (typeof r === "string") return r.length > 120 ? `${r.slice(0, 117)}…` : r;
  }
  return null;
}

const MODULE_LABEL_ES: Record<string, string> = {
  price: "Precio",
  summaryDetail: "Resumen",
  summaryProfile: "Perfil",
  defaultKeyStatistics: "Estadísticas clave",
  financialData: "Datos financieros",
};

function humanizeKey(k: string): string {
  return k
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

/**
 * Flattens quoteSummary JSON into label/value rows for UI (max ~120 entries).
 */
export function flattenYahooQuoteSummaryForDisplay(
  raw: Json | null | undefined,
  maxRows = 120
): { path: string; label: string; value: string }[] {
  if (raw === null || raw === undefined || typeof raw !== "object") {
    return [];
  }
  const root = raw as Record<string, unknown>;
  const out: { path: string; label: string; value: string }[] = [];

  const modules = [
    "price",
    "summaryDetail",
    "summaryProfile",
    "defaultKeyStatistics",
    "financialData",
  ] as const;

  for (const mod of modules) {
    if (out.length >= maxRows) break;
    const block = root[mod];
    if (!block || typeof block !== "object" || Array.isArray(block)) continue;
    const modLabel = MODULE_LABEL_ES[mod] ?? mod;

    for (const [k, v] of Object.entries(block as Record<string, unknown>)) {
      if (out.length >= maxRows) break;
      const path = `${mod}.${k}`;
      let leaf = formatLeaf(v);
      if (leaf === null && v && typeof v === "object" && !Array.isArray(v)) {
        for (const [k2, v2] of Object.entries(v as Record<string, unknown>)) {
          if (out.length >= maxRows) break;
          leaf = formatLeaf(v2);
          if (leaf !== null) {
            out.push({
              path: `${path}.${k2}`,
              label: `${modLabel} · ${humanizeKey(k)} · ${humanizeKey(k2)}`,
              value: leaf,
            });
          }
        }
        continue;
      }
      if (leaf !== null) {
        out.push({
          path,
          label: `${modLabel} · ${humanizeKey(k)}`,
          value: leaf,
        });
      }
    }
  }

  return out;
}

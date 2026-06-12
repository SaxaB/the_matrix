import type { AppLocale } from "@/lib/i18n/config";
import type {
  DerivedFundamentalsResult,
  FundamentalMetricRow,
  FundamentalPanel,
} from "@/lib/sec-edgar/derived-fundamentals-panels";

/** Modules from `yahoo-raw-display.ts` label prefix (first segment before ·). */
const YAHOO_MODULE_ES_TO_EN: Record<string, string> = {
  Precio: "Price",
  Resumen: "Summary",
  Perfil: "Profile",
  "Estadísticas clave": "Key statistics",
  "Datos financieros": "Financial data",
};

/**
 * Exact Spanish UI strings emitted by `buildDerivedFundamentalPanelsFromMetrics`
 * → English equivalents for Explorer when locale is `en`.
 */
const FUNDAMENTAL_UI_ES_TO_EN: Record<string, string> = {
  "Ratios calculados con datos US-GAAP públicos (SEC, tabla `sec_edgar_metrics`) y precio/capitalización de Yahoo cuando existen. No incluye previsiones, valoración fair value, objetivos de analistas, ni métricas propietarias tipo InvestingPro. Algunas etiquetas varían entre empresas; si falta un concepto, el ratio aparece como —.":
    "Ratios computed from public US-GAAP data (SEC, `sec_edgar_metrics` table) and Yahoo price/market cap when available. Does not include forecasts, fair value, analyst targets, or proprietary metrics like InvestingPro. Labels may vary by company; if a concept is missing, the ratio shows as —.",

  Valoración: "Valuation",
  Rentabilidad: "Profitability",
  Liquidez: "Liquidity",
  Apalancamiento: "Leverage",
  Crecimiento: "Growth",
  "Hechos US-GAAP clave (último FY)": "Key US-GAAP facts (latest FY)",
  "Mezcla Yahoo (mercado) y ratios calculados con SEC.":
    "Combines Yahoo (market) with SEC-derived ratios.",

  "Valores brutos leídos de `sec_edgar_metrics` (ingesta SEC, sin JSON completo en BD).":
    "Raw values from `sec_edgar_metrics` (SEC ingest; no full companyfacts JSON in DB).",

  "P/E (trailing Yahoo)": "P/E (trailing Yahoo)",
  "Desde quoteSummary": "From quoteSummary",
  "P/E (precio ÷ EPS diluido SEC)": "P/E (price ÷ diluted EPS SEC)",
  "P/B (precio ÷ valor en libros / acción)":
    "P/B (price ÷ book value per share)",
  "EV / EBITDA (aprox.)": "EV / EBITDA (approx.)",
  "EV ≈ cap. mercado + deuda − caja; denominador EBITDA US-GAAP":
    "EV ≈ market cap + debt − cash; EBITDA denominator from US-GAAP",
  "Si no hay EBITDA en hechos, se usa resultado operativo como aproximación":
    "If EBITDA is missing in filings, operating income is used as an approximation",
  "Rendimiento por dividendo (Yahoo)": "Dividend yield (Yahoo)",
  "Cap. mercado (Yahoo)": "Market cap (Yahoo)",

  "ROE (neto / patrimonio)": "ROE (net / equity)",
  "ROA (neto / activos)": "ROA (net / assets)",
  "Margen bruto": "Gross margin",
  "Margen operativo": "Operating margin",
  "Margen neto": "Net margin",

  "Ratio corriente (activo corriente / pasivo corriente)":
    "Current ratio (current assets / current liabilities)",
  "Ratio rápido ( (AC − inventario) / PC )":
    "Quick ratio ((CA − inventory) / CL)",
  "Sin inventario en hechos —": "No inventory in filings —",

  "Deuda total (aprox. LP + CP)": "Total debt (approx. LT + ST)",
  "Deuda / patrimonio": "Debt / equity",
  "Deuda / activos": "Debt / assets",

  "Crecimiento ingresos (YoY, últimos 2 FY)":
    "Revenue growth (YoY, last 2 FY)",

  "Ingresos (último FY)": "Revenue (latest FY)",
  "Beneficio neto (último FY)": "Net income (latest FY)",
  "Activos totales (último FY)": "Total assets (latest FY)",
  "Patrimonio (último FY)": "Equity (latest FY)",
  "EPS diluido (último FY)": "Diluted EPS (latest FY)",
};

function translateKnownEs(s: string | undefined, locale: AppLocale): string | undefined {
  if (s == null || s === undefined) return s;
  if (locale !== "en") return s;
  return FUNDAMENTAL_UI_ES_TO_EN[s] ?? s;
}

/** Translate `Cierre YYYY-MM-DD` detail lines */
function translateDetailEs(detail: string | undefined, locale: AppLocale): string | undefined {
  if (detail == null || locale !== "en") return detail;
  const m = /^Cierre (.+)$/.exec(detail);
  if (m) return `Period end ${m[1]}`;
  const bv = /^BV\/acción ≈ (.+)$/.exec(detail);
  if (bv) return `BV/share ≈ ${bv[1]}`;
  const eps = /^EPS dil\. FY (.+)$/.exec(detail);
  if (eps) return `Diluted EPS FY ${eps[1]}`;
  return translateKnownEs(detail, locale);
}

function translateMetricRow(row: FundamentalMetricRow, locale: AppLocale): FundamentalMetricRow {
  return {
    ...row,
    labelEs: translateKnownEs(row.labelEs, locale) ?? row.labelEs,
    detail: translateDetailEs(row.detail, locale),
  };
}

function translatePanel(panel: FundamentalPanel, locale: AppLocale): FundamentalPanel {
  return {
    ...panel,
    titleEs: translateKnownEs(panel.titleEs, locale) ?? panel.titleEs,
    descriptionEs: translateKnownEs(panel.descriptionEs, locale),
    metrics: panel.metrics.map((m) => translateMetricRow(m, locale)),
  };
}

/** Localized fundamentals block for Explorer (same shape as server payload). */
export function translateDerivedFundamentalsForExplorer(
  result: DerivedFundamentalsResult | null,
  locale: AppLocale
): DerivedFundamentalsResult | null {
  if (result == null) return null;
  if (locale !== "en") return result;
  return {
    ...result,
    disclaimerEs:
      translateKnownEs(result.disclaimerEs, locale) ?? result.disclaimerEs,
    panels: result.panels.map((p) => translatePanel(p, locale)),
    fiscalYearLabel: result.fiscalYearLabel,
  };
}

export function translateYahooExplorerLabel(label: string, locale: AppLocale): string {
  if (locale !== "en") return label;
  const parts = label.split(" · ");
  if (parts.length === 0) return label;
  const first = YAHOO_MODULE_ES_TO_EN[parts[0]!] ?? parts[0]!;
  return [first, ...parts.slice(1)].join(" · ");
}

export function translateYahooExplorerValue(value: string, locale: AppLocale): string {
  if (locale !== "en") return value;
  if (value === "Sí") return "Yes";
  if (value === "No") return "No";
  return value;
}

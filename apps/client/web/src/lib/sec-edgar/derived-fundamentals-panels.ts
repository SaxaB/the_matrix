import type { YahooSnapshotView } from "@/lib/stock-exploration";
import type { ExtractedAnnualFact } from "./extract-company-facts-latest";
import {
  gatherFundamentalFactsFromMetricRows,
  type SecMetricRowInput,
} from "./extract-from-sec-metrics";

export type FundamentalMetricRow = {
  labelEs: string;
  value: string;
  detail?: string;
  source: "sec" | "yahoo" | "calc";
};

export type FundamentalPanel = {
  id: string;
  titleEs: string;
  descriptionEs?: string;
  metrics: FundamentalMetricRow[];
};

export type DerivedFundamentalsResult = {
  disclaimerEs: string;
  panels: FundamentalPanel[];
  fiscalYearLabel: string | null;
};

function fmtPct(x: number | null): string {
  if (x == null || !Number.isFinite(x)) return "—";
  return `${(x * 100).toFixed(2)}%`;
}

function fmtNum(
  x: number | null,
  opts?: { suffix?: string; decimals?: number }
): string {
  if (x == null || !Number.isFinite(x)) return "—";
  const d = opts?.decimals ?? 2;
  const suf = opts?.suffix ?? "";
  if (Math.abs(x) >= 1e9) return `${(x / 1e9).toFixed(2)}B${suf}`;
  if (Math.abs(x) >= 1e6) return `${(x / 1e6).toFixed(2)}M${suf}`;
  if (Math.abs(x) >= 1e3) return `${(x / 1e3).toFixed(2)}K${suf}`;
  return `${x.toFixed(d)}${suf}`;
}

function ratio(a: number | null, b: number | null): number | null {
  if (
    a == null ||
    b == null ||
    b === 0 ||
    !Number.isFinite(a) ||
    !Number.isFinite(b)
  ) {
    return null;
  }
  return a / b;
}

/**
 * Paneles de fundamentales desde filas `sec_edgar_metrics` (US-GAAP) + Yahoo + precio.
 * No almacena ni requiere el JSON completo de companyfacts.
 */
export function buildDerivedFundamentalPanelsFromMetrics(
  rows: SecMetricRowInput[],
  yahoo: YahooSnapshotView | null,
  marketPrice: number | null
): DerivedFundamentalsResult {
  const disclaimerEs =
    "Ratios calculados con datos US-GAAP públicos (SEC, tabla `sec_edgar_metrics`) y precio/capitalización de Yahoo cuando existen. " +
    "No incluye previsiones, valoración fair value, objetivos de analistas, ni métricas propietarias tipo InvestingPro. " +
    "Algunas etiquetas varían entre empresas; si falta un concepto, el ratio aparece como —.";

  const f = gatherFundamentalFactsFromMetricRows(rows);

  const rev = f.rev;
  const ni = f.ni;
  const gp = f.gp;
  const cor = f.cor;
  const oi = f.oi;
  const assets = f.assets;
  const liab = f.liab;
  const eq = f.eq;
  const ca = f.ca;
  const cl = f.cl;
  const cash = f.cash;
  const ltd = f.ltd;
  const std = f.std;
  const inv = f.inv;
  const epsD = f.epsD;
  const shares = f.shares;
  const ebitdaTag = f.ebitdaTag;
  const twoRev = f.twoRev;

  const fyLabel =
    rev?.fiscalYear != null
      ? `FY${rev.fiscalYear}`
      : ni?.fiscalYear != null
        ? `FY${ni.fiscalYear}`
        : assets?.fiscalYear != null
          ? `FY${assets.fiscalYear}`
          : null;

  const hasRow =
    rev ||
    ni ||
    assets ||
    epsD ||
    ltd ||
    std ||
    ebitdaTag ||
    oi;
  if (!hasRow) {
    return {
      disclaimerEs,
      panels: [],
      fiscalYearLabel: null,
    };
  }

  const hasDebtFact = ltd != null || std != null;
  const totalDebt = hasDebtFact
    ? (ltd?.value ?? 0) + (std?.value ?? 0)
    : null;

  const roe = ratio(ni?.value ?? null, eq?.value ?? null);
  const roa = ratio(ni?.value ?? null, assets?.value ?? null);
  const grossMargin = ratio(gp?.value ?? null, rev?.value ?? null);
  const netMargin = ratio(ni?.value ?? null, rev?.value ?? null);
  const opMargin = ratio(oi?.value ?? null, rev?.value ?? null);
  const currentRatio = ratio(ca?.value ?? null, cl?.value ?? null);
  const quickNum =
    ca?.value != null && inv?.value != null && cl?.value
      ? ca.value - inv.value
      : null;
  const quickRatio = ratio(quickNum, cl?.value ?? null);
  const debtToEquity = ratio(totalDebt, eq?.value ?? null);
  const debtToAssets =
    totalDebt != null && assets?.value
      ? totalDebt / assets.value
      : null;

  const bookValuePerShare =
    shares?.value && eq?.value && shares.value > 0
      ? eq.value / shares.value
      : null;
  const priceToBook =
    marketPrice != null && bookValuePerShare != null && bookValuePerShare > 0
      ? marketPrice / bookValuePerShare
      : null;

  const peCalc =
    marketPrice != null && epsD?.value && epsD.value > 0
      ? marketPrice / epsD.value
      : null;

  const evRough =
    yahoo?.market_cap != null && totalDebt != null && cash?.value != null
      ? yahoo.market_cap + totalDebt - cash.value
      : null;
  const ebitdaForEv = ebitdaTag ?? oi;
  const evToEbitda =
    evRough != null &&
    ebitdaForEv?.value != null &&
    ebitdaForEv.value > 0
      ? evRough / ebitdaForEv.value
      : null;

  let revenueYoY: number | null = null;
  if (twoRev && twoRev[1].value !== 0) {
    revenueYoY =
      (twoRev[0].value - twoRev[1].value) / Math.abs(twoRev[1].value);
  }

  const valuation: FundamentalMetricRow[] = [
    {
      labelEs: "P/E (trailing Yahoo)",
      value: yahoo?.trailing_pe != null ? yahoo.trailing_pe.toFixed(2) : "—",
      detail: "Desde quoteSummary",
      source: "yahoo",
    },
    {
      labelEs: "P/E (precio ÷ EPS diluido SEC)",
      value: peCalc != null ? peCalc.toFixed(2) : "—",
      detail: epsD ? `EPS dil. FY ${epsD.periodEnd}` : undefined,
      source: "calc",
    },
    {
      labelEs: "P/B (precio ÷ valor en libros / acción)",
      value: priceToBook != null ? priceToBook.toFixed(2) : "—",
      detail:
        bookValuePerShare != null
          ? `BV/acción ≈ ${fmtNum(bookValuePerShare, { decimals: 2 })} USD`
          : undefined,
      source: "calc",
    },
    {
      labelEs: "EV / EBITDA (aprox.)",
      value: evToEbitda != null ? evToEbitda.toFixed(2) : "—",
      detail: ebitdaTag
        ? "EV ≈ cap. mercado + deuda − caja; denominador EBITDA US-GAAP"
        : "Si no hay EBITDA en hechos, se usa resultado operativo como aproximación",
      source: "calc",
    },
    {
      labelEs: "Rendimiento por dividendo (Yahoo)",
      value:
        yahoo?.dividend_yield != null
          ? fmtPct(yahoo.dividend_yield)
          : "—",
      source: "yahoo",
    },
    {
      labelEs: "Cap. mercado (Yahoo)",
      value:
        yahoo?.market_cap != null
          ? fmtNum(yahoo.market_cap, { suffix: " USD" })
          : "—",
      source: "yahoo",
    },
  ];

  const profitability: FundamentalMetricRow[] = [
    {
      labelEs: "ROE (neto / patrimonio)",
      value: fmtPct(roe),
      source: "calc",
    },
    {
      labelEs: "ROA (neto / activos)",
      value: fmtPct(roa),
      source: "calc",
    },
    {
      labelEs: "Margen bruto",
      value: fmtPct(grossMargin),
      source: "calc",
    },
    {
      labelEs: "Margen operativo",
      value: fmtPct(opMargin),
      source: "calc",
    },
    {
      labelEs: "Margen neto",
      value: fmtPct(netMargin),
      source: "calc",
    },
  ];

  const liquidity: FundamentalMetricRow[] = [
    {
      labelEs: "Ratio corriente (activo corriente / pasivo corriente)",
      value: currentRatio != null ? currentRatio.toFixed(2) : "—",
      source: "calc",
    },
    {
      labelEs: "Ratio rápido ( (AC − inventario) / PC )",
      value: quickRatio != null ? quickRatio.toFixed(2) : "—",
      detail: inv ? undefined : "Sin inventario en hechos —",
      source: "calc",
    },
  ];

  const leverage: FundamentalMetricRow[] = [
    {
      labelEs: "Deuda total (aprox. LP + CP)",
      value: totalDebt != null ? fmtNum(totalDebt, { suffix: " USD" }) : "—",
      source: "sec",
    },
    {
      labelEs: "Deuda / patrimonio",
      value: debtToEquity != null ? debtToEquity.toFixed(2) : "—",
      source: "calc",
    },
    {
      labelEs: "Deuda / activos",
      value: debtToAssets != null ? fmtPct(debtToAssets) : "—",
      source: "calc",
    },
  ];

  const growth: FundamentalMetricRow[] = [
    {
      labelEs: "Crecimiento ingresos (YoY, últimos 2 FY)",
      value: revenueYoY != null ? fmtPct(revenueYoY) : "—",
      source: "calc",
    },
  ];

  const rawFacts: FundamentalMetricRow[] = [];
  const pushFact = (
    label: string,
    fact: ExtractedAnnualFact | null,
    unit: string
  ) => {
    if (!fact) return;
    rawFacts.push({
      labelEs: label,
      value: fmtNum(fact.value, { suffix: ` ${unit}` }),
      detail: `Cierre ${fact.periodEnd}`,
      source: "sec",
    });
  };
  pushFact("Ingresos (último FY)", rev, "USD");
  pushFact("Beneficio neto (último FY)", ni, "USD");
  pushFact("Activos totales (último FY)", assets, "USD");
  pushFact("Patrimonio (último FY)", eq, "USD");
  pushFact("EPS diluido (último FY)", epsD, "USD/acción");

  const panels: FundamentalPanel[] = [
    {
      id: "valuation",
      titleEs: "Valoración",
      descriptionEs: "Mezcla Yahoo (mercado) y ratios calculados con SEC.",
      metrics: valuation,
    },
    {
      id: "profitability",
      titleEs: "Rentabilidad",
      metrics: profitability,
    },
    {
      id: "liquidity",
      titleEs: "Liquidez",
      metrics: liquidity,
    },
    {
      id: "leverage",
      titleEs: "Apalancamiento",
      metrics: leverage,
    },
    {
      id: "growth",
      titleEs: "Crecimiento",
      metrics: growth,
    },
    {
      id: "sec-raw-fy",
      titleEs: "Hechos US-GAAP clave (último FY)",
      descriptionEs:
        "Valores brutos leídos de `sec_edgar_metrics` (ingesta SEC, sin JSON completo en BD).",
      metrics: rawFacts,
    },
  ].filter((p) => p.metrics.length > 0);

  return {
    disclaimerEs,
    panels,
    fiscalYearLabel: fyLabel,
  };
}

import type { AppLocale } from "@/lib/i18n/config";

/**
 * Maps Spanish driver strings emitted by portfolio-position-risk heuristics,
 * ticker-risk-score (persisted labels_es), and sector fallbacks to English for UI.
 * Unknown strings pass through unchanged.
 */
const EQUITY_RISK_SIGNAL_ES_TO_EN: Record<string, string> = {
  // portfolio-position-risk (heuristic + fallback)
  "Sin snapshot Yahoo en BD (ejecuta npm run etl:yahoo) — prior por sector.":
    "No Yahoo snapshot in DB (run npm run etl:yahoo) — sector prior.",
  "Puntuación Matrix en base de datos (ETL diario).":
    "Matrix score persisted in DB (daily ETL).",
  "Beta elevado frente al mercado": "High beta vs market",
  "Beta por encima de 1": "Beta above 1",
  "Beta contenido": "Contained beta",
  "Muy por debajo del máximo de 52 semanas": "Far below the 52-week high",
  "Alejado del máximo de 52 semanas": "Away from the 52-week high",
  "Cerca del mínimo anual (rango 52s)": "Near the annual low (52w range)",
  "Capitalización baja (menor liquidez típica)":
    "Small cap (typically lower liquidity)",
  "Gran capitalización": "Large cap",
  "PER bajo (valoración exigente o ciclo débil)":
    "Low P/E (demanding valuation or weak cycle)",
  "PER alto (expectativas exigentes)": "High P/E (high expectations)",
  "Dividendo relativamente alto": "Relatively high dividend",
  "Métricas dentro de rangos típicos con los datos disponibles":
    "Metrics within typical ranges for available data",

  // ticker-risk-score.js (persisted labels_es + live scoring)
  "Deuda muy alta vs patrimonio (SEC)": "Very high debt vs equity (SEC)",
  "Apalancamiento elevado vs patrimonio (SEC)": "Elevated leverage vs equity (SEC)",
  "Deuda relevante vs patrimonio (SEC)": "Material debt vs equity (SEC)",
  "Balance conservador vs patrimonio (SEC)": "Conservative balance sheet vs equity (SEC)",
  "Pasivos altos vs activos (SEC)": "High liabilities vs assets (SEC)",
  "Pasivos elevados vs activos (SEC)": "Elevated liabilities vs assets (SEC)",
  "Pérdidas netas recientes vs ingresos (SEC)":
    "Recent net losses vs revenue (SEC)",
  "Márgenes netos débiles (SEC)": "Weak net margins (SEC)",
  "Rentabilidad neta sólida vs ingresos (SEC)":
    "Solid net profitability vs revenue (SEC)",
  "Margen bruto muy bajo (SEC)": "Very low gross margin (SEC)",
  "Margen bruto alto con deuda contenida (SEC)":
    "High gross margin with contained debt (SEC)",
  "Drawdown máximo muy severo en ventana histórica (EOD)":
    "Very severe max drawdown in historical window (EOD)",
  "Drawdown máximo elevado (EOD)": "Elevated max drawdown (EOD)",
  "Drawdown máximo notable (EOD)": "Notable max drawdown (EOD)",
  "Tendencia de precios muy débil en horizonte largo (EOD)":
    "Very weak long-horizon price trend (EOD)",
  "Tendencia de precios débil en horizonte largo (EOD)":
    "Weak long-horizon price trend (EOD)",
  "Tendencia larga positiva (EOD)": "Positive long-term trend (EOD)",
  "Rebote reciente tras periodo flojo (EOD)":
    "Recent rebound after soft period (EOD)",
  "Presión bajista en corto y largo plazo (EOD)":
    "Bearish pressure short and long term (EOD)",
  "Beta muy elevado": "Very high beta",
  "Beta elevado": "High beta",
  "Beta bajo vs mercado": "Low beta vs market",
  "Precio muy por debajo del máximo de 52 semanas":
    "Price far below the 52-week high",
  "Sin cierre EOD reciente: sin señal de drawdown 52s":
    "No recent EOD close: no 52w drawdown signal",
  "Capitalización muy baja": "Very small market cap",
  "Capitalización reducida": "Reduced market cap",
  "PER muy bajo (ciclo o incertidumbre)":
    "Very low P/E (cycle or uncertainty)",
  "PER muy alto": "Very high P/E",
  "Dividendo relevante en valor mediano/grande":
    "Meaningful dividend at mid/large cap",
  "Gran capitalización y múltiplo típico: soporte de calidad":
    "Large cap with typical multiple: quality support",
  "Capitalización elevada y múltiplo moderado":
    "Elevated market cap and moderate multiple",
  "Megacap: algo de soporte por tamaño y liquidez":
    "Megacap: some support from size and liquidity",
  "Corrección fuerte en nombre grande con múltiplos razonables: se amortigua parte del estrés de precio (corto vs largo plazo)":
    "Sharp drawdown in a large name with reasonable multiples: some price stress is dampened (short vs long term)",
  "Métricas equilibradas con los datos disponibles":
    "Balanced metrics given available data",
};

export function translateEquityRiskSignal(
  labelEs: string,
  locale: AppLocale
): string {
  if (locale !== "en") return labelEs;
  return EQUITY_RISK_SIGNAL_ES_TO_EN[labelEs] ?? labelEs;
}

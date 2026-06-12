import type { AppLocale } from "@/lib/i18n/config";

/**
 * Spanish labels for US-GAAP concepts shown in stock exploration (SEC EDGAR).
 */
export const SEC_METRIC_LABELS_ES: Record<string, string> = {
  Revenues: "Ingresos",
  RevenueFromContractWithCustomerExcludingAssessedTax: "Ingresos (contratos)",
  CostOfRevenue: "Coste de ingresos",
  GrossProfit: "Beneficio bruto",
  OperatingIncomeLoss: "Resultado operativo",
  IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest:
    "Resultado antes de impuestos",
  IncomeTaxExpenseBenefit: "Impuesto sobre beneficios",
  NetIncomeLoss: "Beneficio neto",
  EarningsPerShareBasic: "BPA básico",
  EarningsPerShareDiluted: "BPA diluido",
  Assets: "Activos totales",
  AssetsCurrent: "Activos corrientes",
  Liabilities: "Pasivos totales",
  LiabilitiesCurrent: "Pasivos corrientes",
  StockholdersEquity: "Patrimonio neto",
  CashAndCashEquivalentsAtCarryingValue: "Efectivo y equivalentes",
  NetCashProvidedByUsedInOperatingActivities: "Flujo de caja operativo",
  NetCashProvidedByUsedInInvestingActivities: "Flujo de caja de inversión",
  NetCashProvidedByUsedInFinancingActivities: "Flujo de caja de financiación",
};

/** English labels for the same concepts (Explorer EN locale). */
export const SEC_METRIC_LABELS_EN: Record<string, string> = {
  Revenues: "Revenue",
  RevenueFromContractWithCustomerExcludingAssessedTax: "Revenue (contracts)",
  CostOfRevenue: "Cost of revenue",
  GrossProfit: "Gross profit",
  OperatingIncomeLoss: "Operating income",
  IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest:
    "Income before taxes",
  IncomeTaxExpenseBenefit: "Income tax expense",
  NetIncomeLoss: "Net income",
  EarningsPerShareBasic: "Basic EPS",
  EarningsPerShareDiluted: "Diluted EPS",
  Assets: "Total assets",
  AssetsCurrent: "Current assets",
  Liabilities: "Total liabilities",
  LiabilitiesCurrent: "Current liabilities",
  StockholdersEquity: "Stockholders’ equity",
  CashAndCashEquivalentsAtCarryingValue: "Cash and equivalents",
  NetCashProvidedByUsedInOperatingActivities: "Operating cash flow",
  NetCashProvidedByUsedInInvestingActivities: "Investing cash flow",
  NetCashProvidedByUsedInFinancingActivities: "Financing cash flow",
};

export function labelSecConcept(concept: string, fallbackLabel: string | null): string {
  return SEC_METRIC_LABELS_ES[concept] ?? fallbackLabel ?? concept;
}

export function labelSecConceptForLocale(
  concept: string,
  fallbackLabel: string | null,
  locale: AppLocale
): string {
  if (locale === "en") {
    return SEC_METRIC_LABELS_EN[concept] ?? fallbackLabel ?? concept;
  }
  return labelSecConcept(concept, fallbackLabel);
}

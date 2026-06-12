import type { AppLocale } from "@/lib/i18n/config";
import type { RiskLevel } from "@/lib/types";

export type IdealRuleCopy = {
  q1short: string;
  q1long: string;
  q2defensive: string;
  q2aggressive: string;
  q8low: string;
  q14dependent: string;
  q9low: string;
  q10high: string;
};

export type IdealAllocationCopy = {
  riskLabels: Record<RiskLevel, string>;
  baseNote: (profileLabel: string, score: number) => string;
  rules: IdealRuleCopy;
  stockConc: {
    elevated: string;
    notice: string;
  };
};

const ES: IdealAllocationCopy = {
  riskLabels: {
    conservative: "Conservador",
    moderate: "Moderado",
    aggressive: "Agresivo",
  },
  baseNote: (profileLabel, score) =>
    `Perfil ${profileLabel} · mix base por puntuación (${Math.round(score * 10) / 10}/100), interpolado entre conservador, moderado y agresivo.`,
  rules: {
    q1short:
      "Horizonte de inversión corto: más peso a efectivo en el objetivo.",
    q1long:
      "Horizonte largo: algo más de renta variable objetivo vs el mix base.",
    q2defensive:
      "Reacción defensiva ante caídas fuertes: se refuerza liquidez objetivo.",
    q2aggressive:
      "Alta tolerancia a drawdowns: levemente más acciones en el objetivo.",
    q8low:
      "Fondo de emergencia aún limitado: más efectivo objetivo.",
    q14dependent:
      "Dependencia relevante del rendimiento para gastos: más bonos objetivo.",
    q9low:
      "Baja comodidad con apalancamiento/complejidad: menos alternativos teóricos.",
    q10high:
      "Mayor interés en activos no tradicionales: algo más de alternativos objetivo.",
  },
  stockConc: {
    elevated:
      "La renta variable está muy concentrada en pocos valores respecto al total en acciones. El gap por clase no refleja riesgo de emisor: conviene revisar pesos individuales.",
    notice:
      "Hay cierta concentración en pocas posiciones de renta variable. Las recomendaciones por clase son orientativas.",
  },
};

const EN: IdealAllocationCopy = {
  riskLabels: {
    conservative: "Conservative",
    moderate: "Moderate",
    aggressive: "Aggressive",
  },
  baseNote: (profileLabel, score) =>
    `${profileLabel} profile · base mix from score (${Math.round(score * 10) / 10}/100), interpolated between conservative, moderate, and aggressive.`,
  rules: {
    q1short:
      "Short investment horizon: higher target weight in cash.",
    q1long:
      "Long horizon: slightly higher target equity vs the base mix.",
    q2defensive:
      "Defensive reaction to large drawdowns: higher target liquidity.",
    q2aggressive:
      "High drawdown tolerance: slightly higher target equities.",
    q8low:
      "Limited emergency fund: higher target cash.",
    q14dependent:
      "Meaningful dependence on returns for expenses: higher target bonds.",
    q9low:
      "Low comfort with leverage/complexity: lower target alternatives.",
    q10high:
      "Higher interest in non-traditional assets: slightly higher target alternatives.",
  },
  stockConc: {
    elevated:
      "Equity is highly concentrated in a few names vs total stock exposure. Class-level gaps do not reflect issuer risk—review individual weights.",
    notice:
      "Some concentration in a few equity positions. Class-level suggestions are indicative only.",
  },
};

export function getIdealAllocationCopy(locale: AppLocale): IdealAllocationCopy {
  return locale === "en" ? EN : ES;
}

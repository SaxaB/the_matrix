import { RiskProfile } from "./types";

export const APP_NAME = "Matrix";
export const APP_DESCRIPTION =
  "Análisis de portafolio e inversiones con inteligencia artificial";

export const RISK_PROFILES: Record<string, RiskProfile> = {
  conservative: {
    level: "conservative",
    label: "Conservador",
    description:
      "Priorizas la preservación de capital sobre los rendimientos. Prefieres inversiones estables con menor volatilidad, como bonos y depósitos.",
    color: "emerald",
    score: { min: 0, max: 33 },
    idealAllocation: {
      stocks: 20,
      bonds: 50,
      cash: 20,
      alternatives: 10,
    },
    maxVolatility: 8,
    expectedReturn: { min: 3, max: 6 },
  },
  moderate: {
    level: "moderate",
    label: "Moderado",
    description:
      "Buscas un equilibrio entre crecimiento y seguridad. Aceptas algo de volatilidad a cambio de mejores rendimientos a largo plazo.",
    color: "blue",
    score: { min: 34, max: 66 },
    idealAllocation: {
      stocks: 50,
      bonds: 30,
      cash: 10,
      alternatives: 10,
    },
    maxVolatility: 15,
    expectedReturn: { min: 6, max: 10 },
  },
  aggressive: {
    level: "aggressive",
    label: "Agresivo",
    description:
      "Buscas maximizar rendimientos a largo plazo. Estás cómodo con alta volatilidad y potenciales pérdidas temporales significativas.",
    color: "orange",
    score: { min: 67, max: 100 },
    idealAllocation: {
      stocks: 75,
      bonds: 10,
      cash: 5,
      alternatives: 10,
    },
    maxVolatility: 25,
    expectedReturn: { min: 10, max: 15 },
  },
};

export const ASSET_CLASS_LABELS: Record<string, string> = {
  stocks: "Acciones",
  bonds: "Bonos",
  cash: "Efectivo",
  alternatives: "Alternativos",
};

export const ASSET_CLASS_COLORS: Record<string, string> = {
  stocks: "#10b981",
  bonds: "#3b82f6",
  cash: "#f59e0b",
  alternatives: "#8b5cf6",
};

export const SECTORS = [
  "Tecnología",
  "Salud",
  "Financiero",
  "Consumo Discrecional",
  "Consumo Básico",
  "Energía",
  "Industriales",
  "Materiales",
  "Inmobiliario",
  "Servicios Públicos",
  "Comunicaciones",
];

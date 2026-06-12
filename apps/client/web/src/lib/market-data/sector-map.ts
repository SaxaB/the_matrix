import { SECTORS } from "@/lib/constants";

/** Map Alpha Vantage (English) sector strings to app labels (Spanish). */
const DIRECT: Record<string, string> = {
  technology: "Tecnología",
  "information technology": "Tecnología",
  healthcare: "Salud",
  "health care": "Salud",
  financial: "Financiero",
  "financial services": "Financiero",
  "financials": "Financiero",
  "consumer cyclical": "Consumo Discrecional",
  "consumer discretionary": "Consumo Discrecional",
  "consumer defensive": "Consumo Básico",
  "consumer staples": "Consumo Básico",
  energy: "Energía",
  industrials: "Industriales",
  industrial: "Industriales",
  "basic materials": "Materiales",
  materials: "Materiales",
  "real estate": "Inmobiliario",
  utilities: "Servicios Públicos",
  "communication services": "Comunicaciones",
  communications: "Comunicaciones",
};

function normalizeKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Returns a label that exists in {@link SECTORS}, using Alpha's sector when mappable.
 */
export function mapAlphaSectorToAppSector(sectorRaw: string): string {
  const raw = sectorRaw.trim();
  if (!raw) {
    return "Tecnología";
  }

  const key = normalizeKey(raw);
  if (DIRECT[key]) {
    return DIRECT[key];
  }

  const lower = key;
  if (lower.includes("technolog") || lower.includes("software")) {
    return "Tecnología";
  }
  if (lower.includes("health")) return "Salud";
  if (lower.includes("financial") || lower.includes("insurance")) {
    return "Financiero";
  }
  if (lower.includes("consumer") && lower.includes("discretion")) {
    return "Consumo Discrecional";
  }
  if (lower.includes("consumer") && lower.includes("staple")) {
    return "Consumo Básico";
  }
  if (lower.includes("energy") || lower.includes("oil")) return "Energía";
  if (lower.includes("industrial")) return "Industriales";
  if (lower.includes("material") || lower.includes("chemical")) {
    return "Materiales";
  }
  if (lower.includes("real estate")) return "Inmobiliario";
  if (lower.includes("utilit")) return "Servicios Públicos";
  if (lower.includes("communication")) return "Comunicaciones";

  // Use raw if it accidentally matches an app label (manual data)
  const exact = SECTORS.find((s) => normalizeKey(s) === lower);
  if (exact) return exact;

  return "Tecnología";
}

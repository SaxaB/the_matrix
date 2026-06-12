import type { AppLocale } from "@/lib/i18n/config";

/** Spanish sector labels stored in DB / mappers → English display. */
const ES_TO_EN: Record<string, string> = {
  Tecnología: "Technology",
  Salud: "Healthcare",
  Financiero: "Financials",
  "Consumo Discrecional": "Consumer Discretionary",
  "Consumo Básico": "Consumer Staples",
  Energía: "Energy",
  Industriales: "Industrials",
  Materiales: "Materials",
  Inmobiliario: "Real Estate",
  "Servicios Públicos": "Utilities",
  Comunicaciones: "Communication Services",
};

export function displaySectorLabel(sector: string, locale: AppLocale): string {
  if (!sector) return sector;
  if (locale === "es") return sector;
  return ES_TO_EN[sector] ?? sector;
}

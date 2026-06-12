export type AlphaVantageQuoteResult =
  | {
      price: number;
      change: number;
      changePct: number;
      currency: string;
    }
  | { error: string };

type GlobalQuoteJson = {
  "Global Quote"?: Record<string, string>;
  Note?: string;
  Information?: string;
  "Error Message"?: string;
};

function parsePercent(s: string | undefined): number {
  if (!s) return 0;
  const n = parseFloat(s.replace("%", "").trim());
  return Number.isFinite(n) ? n : 0;
}

/**
 * Alpha Vantage GLOBAL_QUOTE — 5 calls/min on free tier.
 * https://www.alphavantage.co/documentation/#intelligence
 */
export async function fetchAlphaVantageGlobalQuote(
  ticker: string,
  apiKey: string
): Promise<AlphaVantageQuoteResult> {
  const symbol = encodeURIComponent(ticker.trim().toUpperCase());
  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${encodeURIComponent(apiKey)}`;

  let res: Response;
  try {
    res = await fetch(url, { next: { revalidate: 0 } });
  } catch {
    return { error: "No se pudo conectar con Alpha Vantage" };
  }

  if (!res.ok) {
    return { error: `Alpha Vantage HTTP ${res.status}` };
  }

  const json = (await res.json()) as GlobalQuoteJson;

  if (json.Note || json.Information) {
    return {
      error:
        "Límite de Alpha Vantage alcanzado. Espera un minuto o revisa tu plan.",
    };
  }
  if (json["Error Message"]) {
    return { error: json["Error Message"] };
  }

  const gq = json["Global Quote"];
  if (!gq || Object.keys(gq).length === 0) {
    return { error: "Sin cotización para este ticker" };
  }

  const price = parseFloat(gq["05. price"] ?? "");
  if (!Number.isFinite(price) || price < 0) {
    return { error: "Precio no disponible en la respuesta" };
  }

  const change = parseFloat(gq["09. change"] ?? "0") || 0;
  const changePct = parsePercent(gq["10. change percent"]);

  return {
    price,
    change,
    changePct,
    currency: "USD",
  };
}

type OverviewJson = {
  Name?: string;
  Sector?: string;
  Symbol?: string;
  Note?: string;
  Information?: string;
  "Error Message"?: string;
};

/**
 * Alpha Vantage OVERVIEW — company name and sector (English labels in response).
 * https://www.alphavantage.co/documentation/#company-overview
 */
export async function fetchAlphaVantageOverview(
  ticker: string,
  apiKey: string
): Promise<{ name: string; sectorRaw: string } | { error: string }> {
  const symbol = encodeURIComponent(ticker.trim().toUpperCase());
  const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${encodeURIComponent(apiKey)}`;

  let res: Response;
  try {
    res = await fetch(url, { next: { revalidate: 0 } });
  } catch {
    return { error: "No se pudo conectar con Alpha Vantage" };
  }

  if (!res.ok) {
    return { error: `Alpha Vantage HTTP ${res.status}` };
  }

  const json = (await res.json()) as OverviewJson;

  if (json.Note || json.Information) {
    return {
      error:
        "Límite de Alpha Vantage alcanzado. Espera un minuto o revisa tu plan.",
    };
  }
  if (json["Error Message"]) {
    return { error: json["Error Message"] };
  }

  const name = (json.Name ?? "").trim();
  if (!name) {
    return { error: "No se encontró información de empresa para este ticker" };
  }

  return {
    name,
    sectorRaw: (json.Sector ?? "").trim(),
  };
}

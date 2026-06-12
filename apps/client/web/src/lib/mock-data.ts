import { Holding, StockAnalysis } from "./types";

export const SAMPLE_HOLDINGS: Holding[] = [
  {
    id: "1",
    ticker: "AAPL",
    name: "Apple Inc.",
    quantity: 50,
    avgPrice: 150.0,
    currentPrice: 195.25,
    assetClass: "stocks",
    sector: "Tecnología",
    currency: "USD",
  },
  {
    id: "2",
    ticker: "MSFT",
    name: "Microsoft Corp.",
    quantity: 30,
    avgPrice: 280.0,
    currentPrice: 420.5,
    assetClass: "stocks",
    sector: "Tecnología",
    currency: "USD",
  },
  {
    id: "3",
    ticker: "BND",
    name: "Vanguard Total Bond Market ETF",
    quantity: 100,
    avgPrice: 78.0,
    currentPrice: 72.3,
    assetClass: "bonds",
    sector: "Renta Fija",
    currency: "USD",
  },
  {
    id: "4",
    ticker: "VNQ",
    name: "Vanguard Real Estate ETF",
    quantity: 40,
    avgPrice: 85.0,
    currentPrice: 82.15,
    assetClass: "alternatives",
    sector: "Inmobiliario",
    currency: "USD",
  },
  {
    id: "5",
    ticker: "GLD",
    name: "SPDR Gold Trust",
    quantity: 20,
    avgPrice: 175.0,
    currentPrice: 215.8,
    assetClass: "alternatives",
    sector: "Materias Primas",
    currency: "USD",
  },
];

export const MOCK_STOCK_ANALYSIS: StockAnalysis = {
  ticker: "AAPL",
  name: "Apple Inc.",
  currentPrice: 195.25,
  change: 2.35,
  changePct: 1.22,
  marketCap: 3020000000000,
  peRatio: 31.2,
  dividendYield: 0.52,
  beta: 1.28,
  fiftyTwoWeekHigh: 199.62,
  fiftyTwoWeekLow: 164.08,
  volume: 52340000,
  avgVolume: 58120000,
  sentiment: "bullish",
  sentimentScore: 72,
  recommendation:
    "AAPL presenta fundamentos sólidos con crecimiento constante en servicios. Su beta de 1.28 indica una volatilidad moderadamente superior al mercado. Adecuado para perfiles moderados y agresivos.",
};

export const POPULAR_TICKERS = [
  { ticker: "AAPL", name: "Apple Inc." },
  { ticker: "MSFT", name: "Microsoft Corp." },
  { ticker: "GOOGL", name: "Alphabet Inc." },
  { ticker: "AMZN", name: "Amazon.com Inc." },
  { ticker: "NVDA", name: "NVIDIA Corp." },
  { ticker: "META", name: "Meta Platforms Inc." },
  { ticker: "TSLA", name: "Tesla Inc." },
  { ticker: "JPM", name: "JPMorgan Chase" },
  { ticker: "V", name: "Visa Inc." },
  { ticker: "JNJ", name: "Johnson & Johnson" },
  { ticker: "SPY", name: "SPDR S&P 500 ETF" },
  { ticker: "QQQ", name: "Invesco QQQ Trust" },
  { ticker: "BND", name: "Vanguard Total Bond Market" },
  { ticker: "VNQ", name: "Vanguard Real Estate" },
  { ticker: "GLD", name: "SPDR Gold Trust" },
];

export function generateMockStockAnalysis(ticker: string): StockAnalysis {
  const found = POPULAR_TICKERS.find((t) => t.ticker === ticker.toUpperCase());
  const name = found?.name ?? `${ticker.toUpperCase()} Corp.`;
  const price = 50 + Math.random() * 400;
  const change = (Math.random() - 0.45) * 8;
  const sentimentScore = Math.floor(30 + Math.random() * 60);

  return {
    ticker: ticker.toUpperCase(),
    name,
    currentPrice: Math.round(price * 100) / 100,
    change: Math.round(change * 100) / 100,
    changePct: Math.round((change / price) * 10000) / 100,
    marketCap: Math.round(price * (500 + Math.random() * 5000) * 1e6),
    peRatio: Math.round((15 + Math.random() * 30) * 10) / 10,
    dividendYield: Math.round(Math.random() * 4 * 100) / 100,
    beta: Math.round((0.5 + Math.random() * 1.5) * 100) / 100,
    fiftyTwoWeekHigh: Math.round(price * (1 + Math.random() * 0.3) * 100) / 100,
    fiftyTwoWeekLow: Math.round(price * (1 - Math.random() * 0.3) * 100) / 100,
    volume: Math.floor(1e6 + Math.random() * 1e8),
    avgVolume: Math.floor(1e6 + Math.random() * 1e8),
    sentiment: sentimentScore > 60 ? "bullish" : sentimentScore > 40 ? "neutral" : "bearish",
    sentimentScore,
    recommendation: generateRecommendation(ticker.toUpperCase(), sentimentScore),
  };
}

/** Overlay live quote onto mock fundamentals (P/E, etc. stay simulated unless we add overview API). */
export function mergeStockAnalysisWithQuote(
  base: StockAnalysis,
  live: { price: number; change: number; changePct: number }
): StockAnalysis {
  const useLiveDelta =
    Number.isFinite(live.change) &&
    Number.isFinite(live.changePct) &&
    (Math.abs(live.change) > 1e-8 || Math.abs(live.changePct) > 1e-8);
  return {
    ...base,
    currentPrice: live.price,
    change: useLiveDelta ? live.change : base.change,
    changePct: useLiveDelta ? live.changePct : base.changePct,
  };
}

function generateRecommendation(ticker: string, score: number): string {
  if (score > 60) {
    return `${ticker} muestra señales positivas con momentum alcista. Los indicadores técnicos y el sentimiento del mercado sugieren una perspectiva favorable a medio plazo. Considerar posición acorde a tu perfil de riesgo.`;
  }
  if (score > 40) {
    return `${ticker} se encuentra en zona neutral. Los fundamentos son estables pero sin catalizadores claros a corto plazo. Mantener posición actual o esperar mejor punto de entrada.`;
  }
  return `${ticker} presenta señales de cautela. El sentimiento del mercado es negativo y los indicadores técnicos sugieren debilidad. Evaluar reducción de exposición si no es acorde a tu perfil.`;
}

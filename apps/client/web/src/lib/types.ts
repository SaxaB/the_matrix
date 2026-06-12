export type RiskLevel = "conservative" | "moderate" | "aggressive";

export interface QuestionOption {
  id: string;
  text: string;
  score: number;
}

export interface Question {
  id: string;
  category: string;
  text: string;
  description?: string;
  options: QuestionOption[];
}

export interface RiskProfile {
  level: RiskLevel;
  label: string;
  description: string;
  color: string;
  score: { min: number; max: number };
  idealAllocation: AssetAllocation;
  maxVolatility: number;
  expectedReturn: { min: number; max: number };
}

export interface AssetAllocation {
  stocks: number;
  bonds: number;
  cash: number;
  alternatives: number;
}

export interface Holding {
  id: string;
  ticker: string;
  name: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  assetClass: AssetClass;
  sector: string;
  currency: string;
  /** ISO timestamp when `currentPrice` was last refreshed from market data */
  priceUpdatedAt?: string | null;
}

export type AssetClass = "stocks" | "bonds" | "cash" | "alternatives";

export interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  totalReturn: number;
  totalReturnPct: number;
  allocation: AssetAllocation;
  holdings: Holding[];
}

export interface GapItem {
  assetClass: AssetClass;
  currentPct: number;
  idealPct: number;
  gapPct: number;
  action: "buy" | "sell" | "hold";
  amountToRebalance: number;
}

export interface RebalancingTrade {
  ticker: string;
  name: string;
  action: "buy" | "sell";
  shares: number;
  estimatedValue: number;
  reason: string;
}

export interface StockAnalysis {
  ticker: string;
  name: string;
  currentPrice: number;
  change: number;
  changePct: number;
  marketCap: number;
  peRatio: number;
  dividendYield: number;
  beta: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  volume: number;
  avgVolume: number;
  sentiment: "bullish" | "neutral" | "bearish";
  sentimentScore: number;
  recommendation: string;
}

export interface PerformanceMetrics {
  sharpeRatio: number;
  maxDrawdown: number;
  annualizedReturn: number;
  volatility: number;
  sortinoRatio: number;
  beta: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

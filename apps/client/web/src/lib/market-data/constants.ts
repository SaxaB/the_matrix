/** Fresh enough to skip Alpha Vantage (free tier: avoid hammering the API). */
export const QUOTE_TTL_MS = 15 * 60 * 1000;

/** Small delay between tickers when refreshing many holdings (calls/min limit). */
export const BETWEEN_TICKER_DELAY_MS = 350;

/**
 * Space between two Alpha Vantage calls in the same user action (e.g. quote then OVERVIEW).
 * Free tier is often ~5 calls/minute → at least ~12s between consecutive requests.
 */
export const ALPHA_VANTAGE_SUCCESSIVE_CALL_DELAY_MS = 13_000;

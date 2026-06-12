/**
 * Indicators computed from closing prices (oldest → newest).
 */

/** Wilder RSI (default period 14). */
export function computeRsi(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;
  const changes: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1]);
  }
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 0; i < period; i++) {
    const ch = changes[i];
    if (ch > 0) avgGain += ch;
    else avgLoss -= ch;
  }
  avgGain /= period;
  avgLoss /= period;
  for (let i = period; i < changes.length; i++) {
    const ch = changes[i];
    const g = ch > 0 ? ch : 0;
    const l = ch < 0 ? -ch : 0;
    avgGain = (avgGain * (period - 1) + g) / period;
    avgLoss = (avgLoss * (period - 1) + l) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function computeSma(closes: number[], period: number): number | null {
  if (closes.length < period) return null;
  const slice = closes.slice(-period);
  const sum = slice.reduce((a, b) => a + b, 0);
  return sum / period;
}

/** Simple return over last n trading days (ratio). */
export function computeReturnOverBars(
  closes: number[],
  bars: number
): number | null {
  if (closes.length < bars + 1) return null;
  const oldP = closes[closes.length - 1 - bars];
  const newP = closes[closes.length - 1];
  if (oldP === 0) return null;
  return (newP - oldP) / oldP;
}

/** Calendar date for portfolio snapshots (Europe/Madrid by default). */
const SNAPSHOT_TZ = process.env.PORTFOLIO_SNAPSHOT_TZ ?? "Europe/Madrid";

export function getSnapshotCalendarDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SNAPSHOT_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Start of the window: same calendar day N days before "today" in SNAPSHOT_TZ. */
export function getSnapshotWindowStartDate(daysBack: number): string {
  const now = new Date();
  const past = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SNAPSHOT_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(past);
}

export function totalPortfolioValueFromRows(
  rows: { quantity: number; current_price: number }[]
): number {
  return rows.reduce((s, h) => s + h.quantity * h.current_price, 0);
}

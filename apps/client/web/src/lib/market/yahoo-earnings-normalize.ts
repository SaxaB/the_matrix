import type { AppLocale } from "@/lib/i18n/config";
import { ymdInTimeZone } from "@/lib/market/calendar-tz";

/**
 * US-listed earnings dates follow the US market calendar; using America/New_York
 * avoids off-by-one when Yahoo returns UTC midnight timestamps.
 */
export function getEarningsCalendarTimeZone(): string {
  const raw = process.env.EARNINGS_DATE_TZ?.trim();
  if (raw) return raw;
  return "America/New_York";
}

/**
 * Formats YYYY-MM-DD as a civil date in Spanish without applying TZ shifts to the components.
 */
export function formatYmdEs(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return ymd;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo - 1, d, 12, 0, 0));
  return dt.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatYmdLocale(ymd: string, locale: AppLocale): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return ymd;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo - 1, d, 12, 0, 0));
  const tag = locale === "en" ? "en-US" : "es-ES";
  return dt.toLocaleDateString(tag, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Normalizes a Yahoo earnings timestamp to the calendar day in the earnings TZ (default NY).
 */
export function yahooEarningsRawToCalendarYmd(raw: Date): string {
  return ymdInTimeZone(raw, getEarningsCalendarTimeZone());
}

/**
 * Picks the earliest plausible earnings instant from Yahoo's list and returns
 * calendar YMD + a stable anchor Date (noon UTC on that civil date) for ordering.
 */
export function normalizeNextEarningsFromYahooDates(
  dates: unknown[] | undefined
): { calendarYmd: string; anchorUtc: Date } | null {
  if (!Array.isArray(dates) || dates.length === 0) return null;
  const instants: Date[] = [];
  for (const x of dates) {
    const d = x instanceof Date ? x : new Date(String(x));
    if (!Number.isNaN(d.getTime())) instants.push(d);
  }
  if (instants.length === 0) return null;
  instants.sort((a, b) => a.getTime() - b.getTime());
  const first = instants[0];
  const tz = getEarningsCalendarTimeZone();
  const calendarYmd = ymdInTimeZone(first, tz);
  const [yy, mm, dd] = calendarYmd.split("-").map(Number);
  const anchorUtc = new Date(Date.UTC(yy, mm - 1, dd, 12, 0, 0));
  return { calendarYmd, anchorUtc };
}


/** Helpers for comparing calendar days in a specific IANA timezone (Vercel-compatible). */

export type AppLocale = "es" | "en";

export function getDashboardCalendarTimeZone(): string {
  const raw = process.env.DASHBOARD_CALENDAR_TZ?.trim();
  if (raw) return raw;
  return "Europe/Madrid";
}

/**
 * Calendar date YYYY-MM-DD for an instant in `timeZone` (e.g. Europe/Madrid).
 */
export function ymdInTimeZone(d: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  if (!y || !m || !day) {
    return d.toISOString().slice(0, 10);
  }
  return `${y}-${m}-${day}`;
}

export function formatDateTimeEs(
  d: Date,
  timeZone: string,
  opts: Intl.DateTimeFormatOptions = {
    dateStyle: "medium",
    timeStyle: "short",
  }
): string {
  return d.toLocaleString("es-ES", { ...opts, timeZone });
}

export function formatDateTimeLocale(
  d: Date,
  timeZone: string,
  locale: AppLocale,
  opts: Intl.DateTimeFormatOptions = {
    dateStyle: "medium",
    timeStyle: "short",
  }
): string {
  const tag = locale === "en" ? "en-US" : "es-ES";
  return d.toLocaleString(tag, { ...opts, timeZone });
}

export function formatDateEs(d: Date, timeZone: string): string {
  return d.toLocaleString("es-ES", {
    timeZone,
    dateStyle: "medium",
  });
}

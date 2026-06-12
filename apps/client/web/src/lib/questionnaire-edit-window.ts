/** Calendar-month rule for questionnaire edits (Spain-friendly). */
export const QUESTIONNAIRE_EDIT_TIMEZONE = "Europe/Madrid";

function getYmdInTimeZone(d: Date, timeZone: string): { y: number; m: number; d: number } {
  const s = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  const [ys, ms, ds] = s.split("-");
  return { y: Number(ys), m: Number(ms), d: Number(ds) };
}

/**
 * First instant (in `timeZone`) of `year-month-day` 00:00, as a UTC Date.
 */
function getMidnightInTimeZone(
  year: number,
  month1to12: number,
  day: number,
  timeZone: string
): Date {
  const pad = (n: number) => String(n).padStart(2, "0");
  const target = `${year}-${pad(month1to12)}-${pad(day)}`;
  const center = Date.UTC(year, month1to12 - 1, day, 12, 0, 0);
  for (let t = center - 48 * 3600_000; t <= center + 48 * 3600_000; t += 60_000) {
    const dt = new Date(t);
    const dateStr = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(dt);
    if (dateStr !== target) continue;
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(dt);
    const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "99");
    const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "99");
    if (hour === 0 && minute === 0) return dt;
  }
  throw new Error(`Could not resolve midnight for ${target} in ${timeZone}`);
}

/**
 * Start of the calendar month **after** the month that contains `lastEditedAt` (in Madrid).
 * Example: edit on 15 Jan → next allowed instant = 1 Feb 00:00 Madrid.
 */
export function getNextQuestionnaireEditAllowedAfter(
  lastEditedAtIso: string
): Date {
  const last = new Date(lastEditedAtIso);
  const { y, m } = getYmdInTimeZone(last, QUESTIONNAIRE_EDIT_TIMEZONE);
  const next =
    m === 12 ? { y: y + 1, m: 1 } : { y, m: m + 1 };
  return getMidnightInTimeZone(next.y, next.m, 1, QUESTIONNAIRE_EDIT_TIMEZONE);
}

export function isQuestionnaireEditAllowed(
  questionnaireEditedAtIso: string | null | undefined,
  now: Date = new Date()
): boolean {
  if (questionnaireEditedAtIso == null || questionnaireEditedAtIso === "") {
    return true;
  }
  return now.getTime() >= getNextQuestionnaireEditAllowedAfter(questionnaireEditedAtIso).getTime();
}

export function formatNextQuestionnaireEditAllowedEs(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  return d.toLocaleString("es-ES", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: QUESTIONNAIRE_EDIT_TIMEZONE,
  });
}

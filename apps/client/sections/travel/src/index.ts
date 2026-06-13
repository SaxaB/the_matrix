/**
 * Sección Travel (P4): TM47 90-day report. Queries + lógica de vencimiento.
 * Espejo TS de saxa.domains.travel.tm47 (mismas constantes y reglas).
 */

import type { MatrixClient } from "@matrix/client-shared";
import type { Database } from "@matrix/db/types";

export const REPORT_PERIOD_DAYS = 90;
export const WINDOW_BEFORE_DAYS = 15;
export const WINDOW_AFTER_DAYS = 7;

export type Tm47Report = Pick<
  Database["travel"]["Tables"]["tm47_reports"]["Row"],
  "id" | "due_date" | "filed_date" | "status" | "channel" | "created_at"
>;

export interface DueStatus {
  dueDate: Date | null;
  windowOpens: Date | null;
  windowCloses: Date | null;
  inWindow: boolean;
  overdue: boolean;
  daysUntilDue: number | null;
  label: string;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

/** Vencimiento = 90 días desde el evento más reciente (report aprobado o entrada). */
export function computeDueStatus(
  today: Date,
  lastApprovedReport: Date | null,
  lastArrival: Date | null
): DueStatus {
  const anchors = [lastApprovedReport, lastArrival].filter((d): d is Date => d != null);
  if (anchors.length === 0) {
    return {
      dueDate: null, windowOpens: null, windowCloses: null,
      inWindow: false, overdue: false, daysUntilDue: null,
      label: "Sin datos del TM47 todavía.",
    };
  }
  const anchor = new Date(Math.max(...anchors.map((d) => d.getTime())));
  const dueDate = addDays(anchor, REPORT_PERIOD_DAYS);
  const windowOpens = addDays(dueDate, -WINDOW_BEFORE_DAYS);
  const windowCloses = addDays(dueDate, WINDOW_AFTER_DAYS);
  const inWindow = today >= windowOpens && today <= windowCloses;
  const overdue = today > windowCloses;
  const daysUntilDue = daysBetween(dueDate, today);

  let label: string;
  if (overdue) {
    label = `🔴 Vencido (${dueDate.toLocaleDateString("es-ES")}). Probablemente toque presencial.`;
  } else if (inWindow) {
    label = `🟢 Toca ahora: vence ${dueDate.toLocaleDateString("es-ES")}.`;
  } else {
    label = `🗓️ Próximo: ${dueDate.toLocaleDateString("es-ES")} (en ${daysUntilDue} días).`;
  }
  return { dueDate, windowOpens, windowCloses, inWindow, overdue, daysUntilDue, label };
}

/** Lee el historial de reports del usuario (RLS: solo los suyos). */
export async function fetchTm47Reports(client: MatrixClient): Promise<Tm47Report[]> {
  const { data, error } = await client
    .schema("travel" as never)
    .from("tm47_reports")
    .select("id, due_date, filed_date, status, channel, created_at")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw new Error(`tm47_reports: ${error.message}`);
  return (data ?? []) as Tm47Report[];
}

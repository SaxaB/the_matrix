import { z } from "zod";

const FINVIZ_ECONOMIC_URL = "https://finviz.com/calendar/economic";

const FinvizEntrySchema = z
  .object({
    event: z.string(),
    date: z.string(),
    importance: z.number(),
    category: z.string().optional(),
    allDay: z.boolean().optional(),
  })
  .passthrough();

const RouteInitSchema = z.object({
  data: z.object({
    initialDateFrom: z.string().optional(),
    entries: z.array(FinvizEntrySchema),
  }),
  version: z.number().optional(),
});

export type FinvizEconomicEntry = z.infer<typeof FinvizEntrySchema>;

/** Finviz uses 1 = low, 2 = medium, 3 = high importance. */
export function finvizImportanceLabel(
  importance: number
): "alto" | "medio" | "bajo" {
  if (importance >= 3) return "alto";
  if (importance === 2) return "medio";
  return "bajo";
}

/** Medio + alto (Finviz importance ≥ 2). */
export function isRelevantMacroImportance(importance: number): boolean {
  return importance >= 2;
}

/**
 * Loads Finviz economic calendar entries from the embedded JSON (same source as the site UI).
 * Does not parse HTML tables — resilient to CSS changes.
 */
export async function fetchFinvizEconomicEntries(): Promise<{
  ok: boolean;
  entries: FinvizEconomicEntry[];
  error?: string;
}> {
  try {
    const res = await fetch(FINVIZ_ECONOMIC_URL, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent":
          "Mozilla/5.0 (compatible; the_matrix/0.1) AppleWebKit/537.36",
      },
      cache: "no-store",
    });
    if (!res.ok) {
      return {
        ok: false,
        entries: [],
        error: `HTTP ${res.status}`,
      };
    }
    const html = await res.text();
    const m = html.match(
      /<script[^>]*id="route-init-data"[^>]*>([\s\S]*?)<\/script>/i
    );
    if (!m?.[1]) {
      return {
        ok: false,
        entries: [],
        error: "No se encontró el bloque de datos del calendario",
      };
    }
    const json = JSON.parse(m[1].trim()) as unknown;
    const parsed = RouteInitSchema.safeParse(json);
    if (!parsed.success) {
      return {
        ok: false,
        entries: [],
        error: "Formato de calendario inesperado",
      };
    }
    return { ok: true, entries: parsed.data.data.entries };
  } catch (e) {
    return {
      ok: false,
      entries: [],
      error: e instanceof Error ? e.message : "Error al cargar Finviz",
    };
  }
}

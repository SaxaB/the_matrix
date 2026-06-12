"use client";

import type {
  PrepareUsTickerMarketDataResult,
  ValidateUsTickerSymbolResult,
} from "@/lib/actions";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/context";

/** i18n path for prepare / validate failure codes */
export function tickerPrepErrorMessagePath(
  code:
    | Extract<PrepareUsTickerMarketDataResult, { ok: false }>["code"]
    | Extract<ValidateUsTickerSymbolResult, { ok: false }>["code"]
): string {
  const map: Record<string, string> = {
    INVALID_TICKER: "tickerPrep.errors.invalidTicker",
    NOT_US_LISTED: "tickerPrep.errors.notUsListed",
    CONFIG: "tickerPrep.errors.config",
    INGEST_FAILED: "tickerPrep.errors.ingestFailed",
    AUTH: "tickerPrep.errors.auth",
  };
  return map[code] ?? "tickerPrep.errors.ingestFailed";
}

const PHASE_KEYS = [
  "tickerPrep.phase1",
  "tickerPrep.phase2",
  "tickerPrep.phase3",
  "tickerPrep.phase4",
] as const;

/** Milliseconds between advancing to the next phase (more spacing between messages). */
const PHASE_STEP_MS = 4200;

export function TickerIngestBanner({ active }: { active: boolean }) {
  const { t } = useI18n();
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!active) {
      setIdx(0);
      return;
    }
    setIdx(0);
    const maxIdx = PHASE_KEYS.length - 1;
    const timers: number[] = [];
    for (let step = 0; step < maxIdx; step++) {
      const tId = window.setTimeout(() => {
        setIdx(step + 1);
      }, PHASE_STEP_MS * (step + 1));
      timers.push(tId);
    }
    return () => timers.forEach((tid) => window.clearTimeout(tid));
  }, [active]);

  if (!active) return null;

  return (
    <div
      className="flex items-center gap-2 rounded-lg border border-emerald-200/60 bg-emerald-50/50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
      <span>{t(PHASE_KEYS[idx]!)}</span>
    </div>
  );
}

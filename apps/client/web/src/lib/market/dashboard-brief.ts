import {
  finvizImportanceLabel,
  isRelevantMacroImportance,
  type FinvizEconomicEntry,
} from "@/lib/market/finviz-economic-calendar";
import type { AppLocale } from "@/lib/i18n/config";
import {
  formatDateTimeLocale,
  getDashboardCalendarTimeZone,
  ymdInTimeZone,
} from "@/lib/market/calendar-tz";
import type { PortfolioEarningsInfo } from "@/lib/market/portfolio-earnings-events";
import {
  formatYmdLocale,
  getEarningsCalendarTimeZone,
} from "@/lib/market/yahoo-earnings-normalize";

export type MacroBriefItem = {
  event: string;
  category: string | null;
  at: Date;
  impact: "alto" | "medio" | "bajo";
  timeLabel: string;
};

export type PortfolioBriefItem = {
  ticker: string;
  name: string;
  /** YYYY-MM-DD en zona de resultados (EE. UU.). */
  calendarYmd: string;
  dateLabel: string;
  isEstimate: boolean;
};

export type NextRelevantEvent =
  | {
      kind: "macro";
      event: string;
      at: Date;
      impact: "alto" | "medio" | "bajo";
    }
  | {
      kind: "portfolio";
      ticker: string;
      name: string;
      dateLabel: string;
      isEstimate: boolean;
    };

export type DashboardMarketBrief = {
  timeZone: string;
  earningsTimeZone: string;
  asOf: string;
  macroSourceOk: boolean;
  macroError: string | null;
  macroToday: MacroBriefItem[];
  portfolioToday: PortfolioBriefItem[];
  hasRelevantToday: boolean;
  nextRelevant: NextRelevantEvent | null;
};

function parseEntryDate(e: FinvizEconomicEntry): Date | null {
  const d = new Date(e.date);
  return Number.isNaN(d.getTime()) ? null : d;
}

function nextFuturePortfolio(
  portfolio: PortfolioEarningsInfo[],
  now: Date,
  todayYmdEarnings: string
): PortfolioEarningsInfo | null {
  const candidates = portfolio.filter((p) => {
    if (!p.nextEarningsCalendarYmd || !p.nextEarningsAt) return false;
    const ymd = p.nextEarningsCalendarYmd;
    if (ymd < todayYmdEarnings) return false;
    if (ymd > todayYmdEarnings) return true;
    return p.nextEarningsAt.getTime() > now.getTime();
  });
  candidates.sort((a, b) => {
    const ay = a.nextEarningsCalendarYmd!;
    const by = b.nextEarningsCalendarYmd!;
    if (ay !== by) return ay < by ? -1 : ay > by ? 1 : 0;
    return a.nextEarningsAt!.getTime() - b.nextEarningsAt!.getTime();
  });
  return candidates[0] ?? null;
}

export function buildDashboardMarketBrief(params: {
  now?: Date;
  finviz: { ok: boolean; entries: FinvizEconomicEntry[]; error?: string };
  portfolio: PortfolioEarningsInfo[];
  tickerNames: Record<string, string>;
  locale: AppLocale;
}): DashboardMarketBrief {
  const now = params.now ?? new Date();
  const { locale } = params;
  const allDayLabel = locale === "en" ? "All day" : "Todo el día";
  const noDataLabel = locale === "en" ? "No data" : "Sin datos";
  const tz = getDashboardCalendarTimeZone();
  const earningsTz = getEarningsCalendarTimeZone();
  const todayYmdMacro = ymdInTimeZone(now, tz);
  const todayYmdEarnings = ymdInTimeZone(now, earningsTz);

  const macroToday: MacroBriefItem[] = [];
  if (params.finviz.ok) {
    for (const e of params.finviz.entries) {
      if (!isRelevantMacroImportance(e.importance)) continue;
      const at = parseEntryDate(e);
      if (!at) continue;
      if (ymdInTimeZone(at, tz) !== todayYmdMacro) continue;
      const impact = finvizImportanceLabel(e.importance);
      macroToday.push({
        event: e.event,
        category: e.category ?? null,
        at,
        impact,
        timeLabel: e.allDay
          ? allDayLabel
          : formatDateTimeLocale(at, tz, locale, {
              dateStyle: "medium",
              timeStyle: "short",
            }),
      });
    }
    macroToday.sort((a, b) => a.at.getTime() - b.at.getTime());
  }

  const portfolioToday: PortfolioBriefItem[] = [];
  for (const p of params.portfolio) {
    if (!p.nextEarningsCalendarYmd) continue;
    if (p.nextEarningsCalendarYmd !== todayYmdEarnings) continue;
    portfolioToday.push({
      ticker: p.ticker,
      name: params.tickerNames[p.ticker] ?? p.ticker,
      calendarYmd: p.nextEarningsCalendarYmd,
      dateLabel: formatYmdLocale(p.nextEarningsCalendarYmd, locale),
      isEstimate: p.isEstimate,
    });
  }
  portfolioToday.sort((a, b) => a.ticker.localeCompare(b.ticker));

  const hasRelevantToday =
    macroToday.length > 0 || portfolioToday.length > 0;

  let nextMacro: FinvizEconomicEntry | null = null;
  let nextMacroParsed: Date | null = null;
  let bestMacroT = Infinity;
  if (params.finviz.ok) {
    for (const e of params.finviz.entries) {
      if (!isRelevantMacroImportance(e.importance)) continue;
      const at = parseEntryDate(e);
      if (!at) continue;
      const t = at.getTime();
      if (t <= now.getTime()) continue;
      if (t < bestMacroT) {
        bestMacroT = t;
        nextMacro = e;
        nextMacroParsed = at;
      }
    }
  }

  const nextPortfolio = nextFuturePortfolio(
    params.portfolio,
    now,
    todayYmdEarnings
  );

  let nextRelevant: NextRelevantEvent | null = null;
  const candidates: { t: number; val: NextRelevantEvent }[] = [];
  if (nextMacro && nextMacroParsed) {
    candidates.push({
      t: nextMacroParsed.getTime(),
      val: {
        kind: "macro",
        event: nextMacro.event,
        at: nextMacroParsed,
        impact: finvizImportanceLabel(nextMacro.importance),
      },
    });
  }
  if (nextPortfolio?.nextEarningsCalendarYmd) {
    const at = nextPortfolio.nextEarningsAt ?? new Date();
    candidates.push({
      t: at.getTime(),
      val: {
        kind: "portfolio",
        ticker: nextPortfolio.ticker,
        name: params.tickerNames[nextPortfolio.ticker] ?? nextPortfolio.ticker,
        dateLabel: formatYmdLocale(
          nextPortfolio.nextEarningsCalendarYmd,
          locale
        ),
        isEstimate: nextPortfolio.isEstimate,
      },
    });
  }
  candidates.sort((a, b) => a.t - b.t);
  if (candidates.length > 0) nextRelevant = candidates[0].val;

  if (hasRelevantToday) {
    nextRelevant = null;
  }

  return {
    timeZone: tz,
    earningsTimeZone: earningsTz,
    asOf: formatDateTimeLocale(now, tz, locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }),
    macroSourceOk: params.finviz.ok,
    macroError: params.finviz.ok ? null : (params.finviz.error ?? noDataLabel),
    macroToday,
    portfolioToday,
    hasRelevantToday,
    nextRelevant,
  };
}

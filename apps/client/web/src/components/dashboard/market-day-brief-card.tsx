"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type {
  DashboardMarketBrief,
  MacroBriefItem,
  NextRelevantEvent,
  PortfolioBriefItem,
} from "@/lib/market/dashboard-brief";
import { formatDateTimeLocale } from "@/lib/market/calendar-tz";
import { AlertCircle, Building2, CalendarClock, TrendingUp } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { formatMessage } from "@/lib/i18n/messages";

function asDate(v: Date | string): Date {
  return v instanceof Date ? v : new Date(v);
}

function impactBadgeClass(impact: "alto" | "medio" | "bajo"): string {
  if (impact === "alto") {
    return "border-orange-300 bg-orange-50 text-orange-900 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-100";
  }
  if (impact === "medio") {
    return "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100";
  }
  return "border-muted text-muted-foreground";
}

function translateImpact(
  impact: "alto" | "medio" | "bajo",
  t: (k: string) => string
): string {
  if (impact === "alto") return t("market.impactHigh");
  if (impact === "medio") return t("market.impactMed");
  return t("market.impactLow");
}

function formatNextRelevant(
  ev: NextRelevantEvent,
  timeZone: string,
  locale: import("@/lib/i18n/config").AppLocale,
  t: (k: string) => string
): string {
  if (ev.kind === "macro") {
    const when = formatDateTimeLocale(asDate(ev.at), timeZone, locale, {
      dateStyle: "medium",
      timeStyle: "short",
    });
    return `${ev.event} — ${when} (${t("market.impactWord")} ${translateImpact(ev.impact, t)})`;
  }
  const est = ev.isEstimate ? ` ${t("market.estimateSuffix")}` : "";
  return `${ev.ticker} · ${ev.name} — ${ev.dateLabel}${est}`;
}

export function MarketDayBriefCard({
  brief,
  loading,
  hasEquityHoldings,
}: {
  brief: DashboardMarketBrief | null;
  loading: boolean;
  /** At least one stocks/alternatives position (for copy about earnings). */
  hasEquityHoldings: boolean;
}) {
  const { t, locale } = useI18n();

  if (loading) {
    return (
      <Card className="mb-8 border-emerald-200/60 dark:border-emerald-900/40">
        <CardContent className="p-5">
          <div className="h-5 w-48 animate-pulse rounded bg-muted" />
          <div className="mt-4 h-4 w-full max-w-xl animate-pulse rounded bg-muted" />
          <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  if (!brief) {
    return null;
  }

  const tz = brief.timeZone;

  return (
    <Card className="mb-8 border-emerald-200/60 dark:border-emerald-900/40">
      <CardContent className="p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 shrink-0 text-emerald-600" />
            <div>
              <h2 className="text-lg font-semibold leading-tight">
                {t("market.contextTitle")}
              </h2>
              <p className="text-xs text-muted-foreground">
                {t("market.updated")}: {brief.asOf} · {t("market.macroTz")}: {tz}{" "}
                · {t("market.earningsTz")}: {brief.earningsTimeZone}
              </p>
            </div>
          </div>
        </div>

        {!brief.macroSourceOk && (
          <div className="mt-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50/80 px-3 py-2 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {formatMessage(t("market.macroUnavailable"), {
                detail: brief.macroError ? `: ${brief.macroError}` : "",
              })}
            </span>
          </div>
        )}

        {brief.hasRelevantToday ? (
          <div className="mt-4 space-y-4">
            <p className="text-sm font-medium text-red-600 dark:text-red-400">
              {t("market.relevantToday")}
            </p>

            {brief.macroToday.length > 0 && (
              <div>
                <p className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  {t("market.macroSection")}
                </p>
                <ul className="space-y-2">
                  {brief.macroToday.map((m: MacroBriefItem, i: number) => (
                    <li
                      key={`${m.event}-${i}`}
                      className="flex flex-wrap items-start gap-2 text-sm"
                    >
                      <Badge
                        variant="outline"
                        className={impactBadgeClass(m.impact)}
                      >
                        {translateImpact(m.impact, t)}
                      </Badge>
                      <span className="font-medium">{m.event}</span>
                      {m.category ? (
                        <span className="text-muted-foreground">
                          · {m.category}
                        </span>
                      ) : null}
                      <span className="text-muted-foreground">— {m.timeLabel}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {brief.portfolioToday.length > 0 && (
              <div>
                <p className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  {t("market.portfolioSection")}
                </p>
                <ul className="space-y-1 text-sm">
                  {brief.portfolioToday.map((p: PortfolioBriefItem, i: number) => (
                    <li key={`${p.ticker}-${i}`}>
                      <span className="font-medium">{p.ticker}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        · {p.name}
                      </span>
                      <span className="text-muted-foreground">
                        {" "}
                        — {p.dateLabel}
                      </span>
                      {p.isEstimate ? (
                        <span className="text-muted-foreground">
                          {" "}
                          {t("market.estimateSuffix")}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <p className="text-sm font-medium text-foreground">
              {t("market.noRelevantToday")}
            </p>
            {brief.nextRelevant ? (
              <p className="text-sm">
                <span className="font-medium text-foreground">
                  {t("market.nextRelevant")}{" "}
                </span>
                {brief.nextRelevant.kind === "macro" ? (
                  <span>
                    {t("market.macroKind")} —{" "}
                    {formatNextRelevant(brief.nextRelevant, tz, locale, t)}
                  </span>
                ) : (
                  <span>
                    {t("market.earningsKind")} —{" "}
                    {formatNextRelevant(brief.nextRelevant, tz, locale, t)}
                  </span>
                )}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">{t("market.noNext")}</p>
            )}
          </div>
        )}

        {!hasEquityHoldings && (
          <p className="mt-4 border-t pt-3 text-xs text-muted-foreground">
            {t("market.addEquitiesHint")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

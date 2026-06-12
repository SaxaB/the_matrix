"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Activity,
  DollarSign,
  Globe,
  Database,
  LineChart as LineChartIcon,
  Landmark,
  Gauge,
  Table2,
  Clock,
  PieChart,
  UserCheck,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { generateMockStockAnalysis, POPULAR_TICKERS } from "@/lib/mock-data";
import {
  explainFinAiTickerRisk,
  getRiskProfile,
  getStockExplorationData,
  prepareUsTickerMarketData,
  validateUsTickerSymbol,
} from "@/lib/actions";
import type { StockExplorationPayload } from "@/lib/stock-exploration";
import type { AppLocale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/context";
import { formatMessage } from "@/lib/i18n/messages";
import {
  translateDerivedFundamentalsForExplorer,
  translateYahooExplorerLabel,
  translateYahooExplorerValue,
} from "@/lib/i18n/stock-explore-display";
import { labelSecConceptForLocale } from "@/lib/sec-metric-labels";
import { formatYmdLocale } from "@/lib/market/yahoo-earnings-normalize";
import {
  TickerIngestBanner,
  tickerPrepErrorMessagePath,
} from "@/components/shared/ticker-ingest-banner";
import {
  computeProfileStockFit,
  type ProfileStockFitVerdict,
} from "@/lib/investor-profile-stock-fit";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

function formatNumber(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return value.toLocaleString();
}

function formatVolume(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toLocaleString();
}

function formatSecValue(value: number, unit: string): string {
  const u = unit.toLowerCase();
  if (u === "usd" || u === "usd/shares") {
    if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  }
  if (u === "shares") return formatVolume(value);
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

/** Chip styles only; sentiment labels come from `stockExplore.sentiment*` via i18n */
const sentimentVisual = {
  bullish: {
    icon: TrendingUp,
    badgeClass:
      "bg-emerald-600 text-zinc-950 hover:bg-emerald-700 [&>svg]:text-zinc-950",
  },
  neutral: {
    icon: Minus,
    badgeClass:
      "bg-blue-600 text-zinc-950 hover:bg-blue-700 [&>svg]:text-zinc-950",
  },
  bearish: {
    icon: TrendingDown,
    badgeClass:
      "bg-red-600 text-zinc-950 hover:bg-red-700 [&>svg]:text-zinc-950",
  },
};

function sentimentLabelPath(s: "bullish" | "neutral" | "bearish"): string {
  if (s === "bullish") return "stockExplore.sentimentBullish";
  if (s === "bearish") return "stockExplore.sentimentBearish";
  return "stockExplore.sentimentNeutral";
}

function profileFitVerdictMessagePath(v: ProfileStockFitVerdict): string {
  if (v === "strong") return "stockExplore.profileFitVerdictStrong";
  if (v === "moderate") return "stockExplore.profileFitVerdictModerate";
  if (v === "weak") return "stockExplore.profileFitVerdictWeak";
  return "stockExplore.profileFitVerdictPoor";
}

function profileFitSurfaceClass(v: ProfileStockFitVerdict): string {
  if (v === "strong")
    return "border-emerald-600/40 bg-emerald-50/90 dark:bg-emerald-950/35";
  if (v === "moderate")
    return "border-blue-600/40 bg-blue-50/90 dark:bg-blue-950/35";
  if (v === "weak")
    return "border-amber-600/45 bg-amber-50/80 dark:bg-amber-950/30";
  return "border-red-600/40 bg-red-50/85 dark:bg-red-950/35";
}

function buildExplorationHintLines(
  d: StockExplorationPayload,
  t: (path: string) => string,
  localeTag: string
): string[] {
  const parts: string[] = [];
  if (d.alpha?.fromCache) {
    parts.push(t("stockExplore.hintAlphaCached"));
  } else if (d.alpha) {
    parts.push(t("stockExplore.hintAlphaLive"));
  } else if (d.alphaError) {
    parts.push(`${t("stockExplore.hintAlphaErrPrefix")} ${d.alphaError}`);
  }
  if (d.yahoo) {
    parts.push(
      formatMessage(t("stockExplore.hintYahooFundamentals"), {
        when: new Date(d.yahoo.fetched_at).toLocaleString(localeTag),
      })
    );
  } else if (d.hasUsListing) {
    parts.push(t("stockExplore.hintYahooMissing"));
  }
  if (d.earningsLive && !d.earningsLive.error) {
    parts.push(t("stockExplore.hintEarningsOk"));
  } else if (d.earningsLive?.error) {
    parts.push(
      `${t("stockExplore.hintEarningsErrPrefix")} ${d.earningsLive.error}`
    );
  }
  if (d.fundamentalPanels && d.fundamentalPanels.panels.length > 0) {
    parts.push(
      formatMessage(t("stockExplore.hintFundPanels"), {
        n: d.fundamentalPanels.panels.length,
      })
    );
  }
  if (d.secSummary.length > 0) {
    parts.push(
      formatMessage(t("stockExplore.hintSecSummary"), {
        rows: d.secRows.length,
        concepts: d.secSummary.length,
      })
    );
  } else if (d.hasUsListing) {
    parts.push(t("stockExplore.hintSecMissing"));
  }
  if (!d.hasUsListing) {
    parts.push(t("stockExplore.hintNonUs"));
  }
  parts.push(t("stockExplore.hintFooter"));
  return parts;
}

function FundamentalSourceTag({
  source,
}: {
  source: "sec" | "yahoo" | "calc";
}) {
  const { t } = useI18n();
  const label =
    source === "sec"
      ? "SEC"
      : source === "yahoo"
        ? "Yahoo"
        : t("stockExplore.sourceCalc");
  return (
    <span className="rounded border border-border/80 bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
      {label}
    </span>
  );
}

function SourceBadge({
  label,
  active,
}: {
  label: string;
  active: boolean;
}) {
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 text-xs font-medium",
        active
          ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
          : "border-muted text-muted-foreground"
      )}
    >
      {label}
    </span>
  );
}

function FinAiRiskNarrativeBlock({
  exploration,
  locale,
}: {
  exploration: StockExplorationPayload;
  locale: AppLocale;
}) {
  const { t } = useI18n();
  const [riskNarrativeLoading, setRiskNarrativeLoading] = useState(true);
  const [riskNarrativeMd, setRiskNarrativeMd] = useState<string | null>(null);
  const [riskNarrativeError, setRiskNarrativeError] = useState<string | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await Promise.resolve();
      if (cancelled) return;
      setRiskNarrativeLoading(true);
      setRiskNarrativeError(null);
      setRiskNarrativeMd(null);
      const demoLabel = t(sentimentLabelPath(exploration.demo.sentiment));
      const r = await explainFinAiTickerRisk(
        exploration.ticker,
        demoLabel,
        locale
      );
      if (cancelled) return;
      setRiskNarrativeLoading(false);
      if (!r.ok) {
        setRiskNarrativeMd(null);
        setRiskNarrativeError(r.error);
        return;
      }
      setRiskNarrativeError(null);
      setRiskNarrativeMd(r.markdown);
    })();
    return () => {
      cancelled = true;
    };
  }, [exploration, locale, t]);

  return (
    <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50/40 p-6 dark:border-emerald-800 dark:bg-emerald-950/30">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
          <TrendingUp className="h-4 w-4" />
        </div>
        <h3 className="text-lg font-semibold">{t("stockExplore.aiTitle")}</h3>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        {t("stockExplore.aiSub")}
      </p>
      {riskNarrativeLoading ? (
        <p className="text-sm text-muted-foreground">
          {t("stockExplore.aiGenerating")}
        </p>
      ) : null}
      {riskNarrativeError ? (
        <p className="text-sm text-red-600">{riskNarrativeError}</p>
      ) : null}
      {riskNarrativeMd ? (
        <div className="text-sm leading-relaxed text-foreground [&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:font-semibold">
          <ReactMarkdown>{riskNarrativeMd}</ReactMarkdown>
        </div>
      ) : null}
    </div>
  );
}

export default function StocksPage() {
  const { t, locale } = useI18n();
  const localeTag = locale === "en" ? "en-US" : "es-ES";
  const [query, setQuery] = useState("");
  const [exploration, setExploration] = useState<StockExplorationPayload | null>(
    null
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [riskProfile, setRiskProfile] = useState<
    Awaited<ReturnType<typeof getRiskProfile>> | undefined
  >(undefined);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const p = await getRiskProfile();
      if (!cancelled) setRiskProfile(p);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const dataHint = useMemo(() => {
    if (!exploration) return null;
    return buildExplorationHintLines(exploration, t, localeTag).join(" ");
  }, [exploration, t, localeTag]);

  const searchStock = useCallback(
    async (ticker?: string) => {
      const raw = ticker || query;
      if (!raw.trim()) return;
      setLoadError(null);
      const sym = raw.trim().toUpperCase();

      try {
        const validated = await validateUsTickerSymbol(sym);
        if (!validated.ok) {
          setExploration(null);
          setLoadError(t(tickerPrepErrorMessagePath(validated.code)));
          return;
        }

        setLoading(true);

        const prep = await prepareUsTickerMarketData(sym);
        if (!prep.ok) {
          setExploration(null);
          setLoadError(t(tickerPrepErrorMessagePath(prep.code)));
          return;
        }

        const res = await getStockExplorationData(sym);
        if (!res.ok) {
          setExploration(null);
          setLoadError(res.error);
          return;
        }

        setExploration(res.data);
      } finally {
        setLoading(false);
      }
    },
    [query, t]
  );

  const sentiment = exploration
    ? sentimentVisual[exploration.demo.sentiment]
    : null;

  const canNarrateFinAi = useMemo(() => {
    if (!exploration) return false;
    const s = exploration.finaiRisk?.score;
    return s != null && Number.isFinite(s) && s >= 5 && s <= 95;
  }, [exploration]);

  const mockFill = exploration
    ? generateMockStockAnalysis(exploration.ticker)
    : null;

  const headlinePrice =
    exploration?.alpha?.price ??
    (exploration?.yahooEod.length
      ? exploration.yahooEod[exploration.yahooEod.length - 1]?.close
      : null) ??
    mockFill?.currentPrice ??
    null;

  const headlineChange = exploration?.alpha?.change ?? 0;
  const headlineChangePct = exploration?.alpha?.changePct ?? 0;
  const hasLiveChange = !!exploration?.alpha;

  const peDisplay =
    exploration?.yahoo?.trailing_pe ?? mockFill?.peRatio ?? null;
  const betaDisplay = exploration?.yahoo?.beta ?? mockFill?.beta ?? null;
  const divDisplay =
    exploration?.yahoo?.dividend_yield != null
      ? exploration.yahoo.dividend_yield * 100
      : (mockFill?.dividendYield ?? null);
  const mcapDisplay =
    exploration?.yahoo?.market_cap ?? mockFill?.marketCap ?? null;
  const weekHigh =
    exploration?.yahoo?.fifty_two_week_high ?? mockFill?.fiftyTwoWeekHigh;
  const weekLow =
    exploration?.yahoo?.fifty_two_week_low ?? mockFill?.fiftyTwoWeekLow;
  const volDisplay =
    exploration?.yahoo?.average_volume ?? mockFill?.avgVolume ?? null;

  const chartData =
    exploration?.yahooEod.slice(-120).map((r) => ({
      date: r.trade_date.slice(5),
      close: r.close,
    })) ?? [];

  const lastBar =
    exploration?.yahooEod.length && exploration.yahooEod.length > 0
      ? exploration.yahooEod[exploration.yahooEod.length - 1]
      : null;

  const tech = exploration?.technical;

  const finaiScore = exploration?.finaiRisk?.score;
  const hasFinAiRisk =
    finaiScore != null &&
    Number.isFinite(finaiScore) &&
    finaiScore >= 5 &&
    finaiScore <= 95;

  const profileFit = useMemo(() => {
    if (riskProfile === undefined || riskProfile === null) return null;
    return computeProfileStockFit(riskProfile.risk_score, finaiScore);
  }, [riskProfile, finaiScore]);

  const fundamentalPanelsDisplay = useMemo(
    () =>
      translateDerivedFundamentalsForExplorer(
        exploration?.fundamentalPanels ?? null,
        locale
      ),
    [exploration?.fundamentalPanels, locale]
  );

  return (
    <TooltipProvider delay={200}>
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          {t("stockExplore.title")}
        </h1>
        <p className="mt-1 text-muted-foreground">{t("stockExplore.sub")}</p>
      </div>

      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("stockExplore.searchPlaceholder")}
                className="pl-10"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchStock()}
              />
            </div>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => searchStock()}
              disabled={loading}
            >
              {loading ? t("stockExplore.loading") : t("stockExplore.analyze")}
            </Button>
          </div>

          <TickerIngestBanner active={loading} />

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground">{t("stockExplore.popular")}</span>
            {POPULAR_TICKERS.slice(0, 8).map((pop) => (
              <button
                key={pop.ticker}
                type="button"
                onClick={() => {
                  setQuery(pop.ticker);
                  searchStock(pop.ticker);
                }}
                className="rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors hover:border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
              >
                {pop.ticker}
              </button>
            ))}
          </div>
          {loadError && (
            <p className="mt-3 text-sm text-red-600">{loadError}</p>
          )}
          {dataHint && !loadError && (
            <p className="mt-3 text-xs text-muted-foreground">{dataHint}</p>
          )}
        </CardContent>
      </Card>

      {exploration && sentiment && mockFill && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <SourceBadge
              label={t("stockExplore.badgeAlpha")}
              active={!!exploration.alpha}
            />
            <SourceBadge
              label={t("stockExplore.badgeYahooDb")}
              active={!!exploration.yahoo}
            />
            <SourceBadge
              label={t("stockExplore.badgeYahooEarnings")}
              active={
                !!exploration.earningsLive &&
                !exploration.earningsLive.error &&
                !!exploration.earningsLive.nextEarningsCalendarYmd
              }
            />
            <SourceBadge
              label={t("stockExplore.badgeSec")}
              active={
                exploration.secRows.length > 0 ||
                !!exploration.secCompanyFactsFetchedAt
              }
            />
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-bold">{exploration.ticker}</h2>
                    <Badge
                      variant="default"
                      className={cn(
                        "h-auto min-h-7 rounded-lg border-0 px-2.5 py-1 text-xs font-medium shadow-none",
                        sentiment.badgeClass
                      )}
                    >
                      <sentiment.icon className="mr-1 h-3 w-3" />
                      {t(sentimentLabelPath(exploration.demo.sentiment))}
                    </Badge>
                    {hasFinAiRisk ? (
                      <Tooltip>
                        <TooltipTrigger
                          type="button"
                          className={cn(
                            "inline-flex h-auto min-h-7 items-center gap-1 rounded-lg border-0 px-2.5 py-1 text-xs font-medium shadow-none outline-none transition-colors",
                            "bg-emerald-600 text-zinc-950 hover:bg-emerald-700 [&>svg]:text-zinc-950"
                          )}
                        >
                          <Gauge className="size-3.5 shrink-0" />
                          <span>{t("stockExplore.finAiRisk")}</span>
                          <span className="font-semibold tabular-nums">
                            {Math.round(finaiScore!)}
                          </span>
                          <span className="text-[10px] font-normal text-zinc-950/80">
                            (5–95)
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-xs text-xs">
                          {t("stockExplore.finAiTooltip")}
                          {exploration.finaiRisk?.computedAt ? (
                            <span className="mt-1 block text-[10px] opacity-80">
                              {t("stockExplore.finAiUpdated")}{" "}
                              {new Date(
                                exploration.finaiRisk.computedAt
                              ).toLocaleString(localeTag)}
                            </span>
                          ) : null}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger
                          type="button"
                          className={cn(
                            "inline-flex h-auto min-h-7 items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium shadow-none outline-none",
                            "border-muted-foreground/30 bg-muted/40 text-muted-foreground"
                          )}
                        >
                          <Gauge className="size-3.5 shrink-0 opacity-70" />
                          {t("stockExplore.noFinAiScore")}
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-xs text-xs">
                          {t("stockExplore.noFinAiHelp")}
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>

                  {riskProfile !== undefined ? (
                    riskProfile === null ? (
                      <div className="mt-3 rounded-lg border border-dashed border-muted-foreground/35 bg-muted/25 px-3 py-2.5 text-sm">
                        <div className="flex flex-wrap items-start gap-2">
                          <UserCheck className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0 flex-1 space-y-1">
                            <p className="font-medium">{t("stockExplore.profileFitTitle")}</p>
                            <p className="text-xs text-muted-foreground">
                              {t("stockExplore.profileFitNoProfileHelp")}
                            </p>
                            <Link
                              href="/perfil/encuesta"
                              className="inline-block text-xs font-medium text-emerald-700 underline underline-offset-2 hover:text-emerald-800 dark:text-emerald-400"
                            >
                              {t("stockExplore.profileFitCtaQuestionnaire")}
                            </Link>
                          </div>
                        </div>
                      </div>
                    ) : !hasFinAiRisk ? (
                      <div className="mt-3 rounded-lg border border-muted-foreground/25 bg-muted/30 px-3 py-2.5 text-sm">
                        <div className="flex flex-wrap items-start gap-2">
                          <UserCheck className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0 space-y-1">
                            <p className="font-medium">{t("stockExplore.profileFitTitle")}</p>
                            <p className="text-xs text-muted-foreground">
                              {t("stockExplore.profileFitNoFinAiHelp")}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : profileFit ? (
                      <Tooltip>
                        <TooltipTrigger
                          type="button"
                          className={cn(
                            "mt-3 w-full rounded-lg border px-3 py-2.5 text-left outline-none ring-offset-background transition-opacity hover:opacity-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                            profileFitSurfaceClass(profileFit.verdict)
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <UserCheck className="mt-0.5 size-5 shrink-0 text-foreground/90" />
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                  {t("stockExplore.profileFitTitle")}
                                </span>
                                <span className="font-mono text-xl font-bold tabular-nums leading-none">
                                  {profileFit.fitScore}/100
                                </span>
                              </div>
                              <p className="text-sm font-semibold leading-snug">
                                {t(profileFitVerdictMessagePath(profileFit.verdict))}
                              </p>
                              <p className="text-xs leading-snug text-muted-foreground">
                                {profileFit.recommended
                                  ? t("stockExplore.profileFitRecommended")
                                  : t("stockExplore.profileFitCaution")}
                              </p>
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-sm text-xs">
                          <p>{t("stockExplore.profileFitTooltip")}</p>
                          <p className="mt-2 text-[10px] opacity-90">
                            {formatMessage(t("stockExplore.profileFitDetailScores"), {
                              user: Math.round(riskProfile.risk_score),
                              stock: Math.round(finaiScore!),
                            })}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    ) : null
                  ) : null}

                  <p className="text-muted-foreground">{exploration.displayName}</p>
                  {exploration.usSymbol && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      CIK {exploration.usSymbol.cik}
                      {exploration.usSymbol.exchange
                        ? ` · ${exploration.usSymbol.exchange}`
                        : ""}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  {headlinePrice != null ? (
                    <>
                      <div className="text-3xl font-bold">
                        ${headlinePrice.toFixed(2)}
                      </div>
                      <div
                        className={cn(
                          "flex items-center justify-end gap-1 text-sm font-medium",
                          hasLiveChange
                            ? headlineChange >= 0
                              ? "text-emerald-600"
                              : "text-red-500"
                            : "text-muted-foreground"
                        )}
                      >
                        {hasLiveChange ? (
                          <>
                            {headlineChange >= 0 ? (
                              <TrendingUp className="h-4 w-4" />
                            ) : (
                              <TrendingDown className="h-4 w-4" />
                            )}
                            {headlineChange >= 0 ? "+" : ""}
                            {headlineChange.toFixed(2)} (
                            {headlineChangePct.toFixed(2)}%)
                          </>
                        ) : (
                          <span>
                            {exploration.yahooEod.length > 0
                              ? t("stockExplore.priceLastCloseDb")
                              : t("stockExplore.priceDemo")}
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-muted-foreground">
                      {t("stockExplore.priceUnavailable")}
                    </div>
                  )}
                </div>
              </div>
              {exploration && canNarrateFinAi && (
                <FinAiRiskNarrativeBlock
                  key={`${exploration.ticker}-${locale}`}
                  exploration={exploration}
                  locale={locale}
                />
              )}
            </CardContent>
          </Card>

          {exploration.earningsLive && (
            <Card>
              <CardContent className="p-6">
                <div className="mb-4 flex items-start gap-3">
                  <Clock className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  <div>
                    <h3 className="text-lg font-semibold">
                      {t("stockExplore.earningsTitle")}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatMessage(t("stockExplore.earningsIntro"), {
                        tz: exploration.earningsLive.earningsTimeZone,
                      })}
                    </p>
                  </div>
                </div>

                {exploration.earningsLive.error ? (
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    {exploration.earningsLive.error}
                  </p>
                ) : exploration.earningsLive.nextEarningsCalendarYmd ? (
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">
                        {t("stockExplore.earningsDateLabel")}{" "}
                      </span>
                      <span className="font-medium">
                        {formatYmdLocale(
                          exploration.earningsLive.nextEarningsCalendarYmd,
                          locale
                        )}
                      </span>
                      {exploration.earningsLive.isEstimate ? (
                        <Badge variant="outline" className="ml-2">
                          {t("stockExplore.earningsEstimate")}
                        </Badge>
                      ) : null}
                    </div>
                    {exploration.earningsLive.trendPeriod ? (
                      <p className="text-xs text-muted-foreground">
                        {t("stockExplore.consensusPeriod")}{" "}
                        {exploration.earningsLive.trendPeriod}
                      </p>
                    ) : null}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border bg-muted/30 p-3">
                        <p className="text-xs text-muted-foreground">
                          {t("stockExplore.epsNext")}
                        </p>
                        <p className="mt-1 text-lg font-semibold tabular-nums">
                          {exploration.earningsLive.epsConsensus != null
                            ? exploration.earningsLive.epsConsensus.toFixed(2)
                            : "—"}
                        </p>
                        {exploration.earningsLive.epsAnalystCount != null ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {t("stockExplore.analysts")}{" "}
                            {exploration.earningsLive.epsAnalystCount}
                          </p>
                        ) : null}
                      </div>
                      <div className="rounded-lg border bg-muted/30 p-3">
                        <p className="text-xs text-muted-foreground">
                          {t("stockExplore.revenueNext")}
                        </p>
                        <p className="mt-1 text-lg font-semibold tabular-nums">
                          {exploration.earningsLive.revenueConsensus != null
                            ? formatNumber(exploration.earningsLive.revenueConsensus)
                            : "—"}
                        </p>
                        {exploration.earningsLive.revenueAnalystCount != null ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {t("stockExplore.analysts")}{" "}
                            {exploration.earningsLive.revenueAnalystCount}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("stockExplore.earningsDisclaimer")}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t("stockExplore.earningsNoDate")}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Globe className="h-4 w-4" />
                  {t("stockExplore.mcap")}
                </div>
                <div className="mt-1 text-xl font-bold">
                  {mcapDisplay != null ? formatNumber(mcapDisplay) : "—"}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BarChart3 className="h-4 w-4" />
                  {t("stockExplore.peTrailing")}
                </div>
                <div className="mt-1 text-xl font-bold">
                  {peDisplay != null ? peDisplay.toFixed(1) : "—"}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  {t("stockExplore.divYield")}
                </div>
                <div className="mt-1 text-xl font-bold">
                  {divDisplay != null ? `${divDisplay.toFixed(2)}%` : "—"}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Activity className="h-4 w-4" />
                  {t("stockExplore.beta")}
                </div>
                <div className="mt-1 text-xl font-bold">
                  {betaDisplay != null ? betaDisplay.toFixed(2) : "—"}
                </div>
              </CardContent>
            </Card>
          </div>

          {fundamentalPanelsDisplay != null && (
            <Card>
              <CardContent className="p-6">
                <div className="mb-4 flex items-start gap-3">
                  <PieChart className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                  <div>
                    <h3 className="text-lg font-semibold">
                      {t("stockExplore.fundPanelsTitle")}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {fundamentalPanelsDisplay.disclaimerEs}
                    </p>
                    {fundamentalPanelsDisplay.fiscalYearLabel && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t("stockExplore.fiscalPeriodHint")}{" "}
                        <span className="font-medium text-foreground">
                          {fundamentalPanelsDisplay.fiscalYearLabel}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
                {fundamentalPanelsDisplay.panels.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t("stockExplore.fundPanelsEmpty")}
                  </p>
                ) : (
                  <Accordion
                    multiple
                    defaultValue={fundamentalPanelsDisplay.panels
                      .slice(0, 2)
                      .map((p) => p.id)}
                    className="rounded-lg border border-border/80"
                  >
                    {fundamentalPanelsDisplay.panels.map((panel) => (
                      <AccordionItem key={panel.id} value={panel.id}>
                        <AccordionTrigger className="px-4">
                          <span className="font-medium">{panel.titleEs}</span>
                        </AccordionTrigger>
                        <AccordionContent className="px-4">
                          {panel.descriptionEs && (
                            <p className="mb-3 text-xs text-muted-foreground">
                              {panel.descriptionEs}
                            </p>
                          )}
                          <div className="space-y-2">
                            {panel.metrics.map((row, i) => (
                              <div
                                key={`${panel.id}-${i}-${row.labelEs}`}
                                className="flex flex-col gap-0.5 rounded-md border border-border/60 bg-muted/20 px-3 py-2 sm:flex-row sm:items-start sm:justify-between"
                              >
                                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                                  <span className="text-sm">{row.labelEs}</span>
                                  <FundamentalSourceTag source={row.source} />
                                </div>
                                <div className="text-right sm:max-w-[45%]">
                                  <div className="font-mono text-sm font-semibold">
                                    {row.value}
                                  </div>
                                  {row.detail && (
                                    <div className="text-xs text-muted-foreground">
                                      {row.detail}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </CardContent>
            </Card>
          )}

          {tech && exploration.yahooEod.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                  <Gauge className="h-5 w-5 text-muted-foreground" />
                  {t("stockExplore.techTitle")}
                </h3>
                <p className="mb-4 text-xs text-muted-foreground">
                  {t("stockExplore.techIntro")}
                  {exploration.yahooEod.length < 15
                    ? t("stockExplore.techRsiShort")
                    : null}
                </p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    {
                      k: t("stockExplore.rsi14"),
                      v:
                        tech.rsi14 != null ? tech.rsi14.toFixed(2) : "—",
                    },
                    {
                      k: t("stockExplore.sma20"),
                      v:
                        tech.sma20 != null
                          ? `$${tech.sma20.toFixed(2)}`
                          : "—",
                    },
                    {
                      k: t("stockExplore.sma50"),
                      v:
                        tech.sma50 != null
                          ? `$${tech.sma50.toFixed(2)}`
                          : "—",
                    },
                    {
                      k: t("stockExplore.sma200"),
                      v:
                        tech.sma200 != null
                          ? `$${tech.sma200.toFixed(2)}`
                          : "—",
                    },
                    {
                      k: t("stockExplore.ret20"),
                      v:
                        tech.return20dPct != null
                          ? `${(tech.return20dPct * 100).toFixed(2)}%`
                          : "—",
                    },
                    {
                      k: t("stockExplore.ret60"),
                      v:
                        tech.return60dPct != null
                          ? `${(tech.return60dPct * 100).toFixed(2)}%`
                          : "—",
                    },
                  ].map((row) => (
                    <div
                      key={row.k}
                      className="rounded-lg border border-border/80 px-3 py-2"
                    >
                      <div className="text-xs text-muted-foreground">{row.k}</div>
                      <div className="text-lg font-semibold">{row.v}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {exploration.assetQuoteCache && (
            <Card>
              <CardContent className="p-6">
                <h3 className="mb-2 flex items-center gap-2 text-lg font-semibold">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  {t("stockExplore.cacheAlphaTitle")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {formatMessage(t("stockExplore.cacheAlphaLine"), {
                    price: `$${exploration.assetQuoteCache.price.toFixed(2)}`,
                    currency: exploration.assetQuoteCache.currency,
                    when: new Date(
                      exploration.assetQuoteCache.fetched_at
                    ).toLocaleString(localeTag),
                  })}
                </p>
              </CardContent>
            </Card>
          )}

          {lastBar && (
            <Card>
              <CardContent className="p-6">
                <h3 className="mb-4 text-lg font-semibold">
                  {t("stockExplore.lastSessionTitle")} — {lastBar.trade_date}
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4 lg:grid-cols-7">
                  {(
                    [
                      [t("stockExplore.ohlcOpen"), lastBar.open, false],
                      [t("stockExplore.ohlcHigh"), lastBar.high, false],
                      [t("stockExplore.ohlcLow"), lastBar.low, false],
                      [t("stockExplore.ohlcClose"), lastBar.close, false],
                      [t("stockExplore.ohlcAdj"), lastBar.adj_close, false],
                      [t("stockExplore.ohlcVol"), lastBar.volume, true],
                    ] as const
                  ).map(([label, val, isVol]) => (
                    <div key={String(label)} className="rounded-md border px-2 py-1.5">
                      <div className="text-xs text-muted-foreground">{label}</div>
                      <div className="font-medium">
                        {typeof val === "number"
                          ? isVol
                            ? formatVolume(val)
                            : `$${val.toFixed(2)}`
                          : "—"}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {chartData.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <div className="mb-4 flex items-center gap-2">
                  <LineChartIcon className="h-5 w-5 text-muted-foreground" />
                  <h3 className="text-lg font-semibold">
                    {formatMessage(t("stockExplore.priceChartTitle"), {
                      n: chartData.length,
                    })}
                  </h3>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis
                        domain={["auto", "auto"]}
                        tick={{ fontSize: 11 }}
                        width={56}
                      />
                      <RechartsTooltip
                        formatter={(value) => [
                          typeof value === "number"
                            ? `$${value.toFixed(2)}`
                            : String(value),
                          t("stockExplore.chartClose"),
                        ]}
                      />
                      <Area
                        type="monotone"
                        dataKey="close"
                        stroke="#059669"
                        fill="#10b981"
                        fillOpacity={0.15}
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {exploration.yahooRawRows.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                  <Table2 className="h-5 w-5 text-muted-foreground" />
                  {t("stockExplore.yahooRawTitle")}
                </h3>
                <p className="mb-3 text-xs text-muted-foreground">
                  {t("stockExplore.yahooRawSub")}
                </p>
                <ScrollArea className="h-[min(28rem,50vh)] rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted/80">
                      <tr className="text-left text-xs">
                        <th className="p-2 font-medium">{t("stockExplore.thField")}</th>
                        <th className="p-2 font-medium">{t("stockExplore.thValue")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exploration.yahooRawRows.map((row) => (
                        <tr
                          key={row.path}
                          className="border-t border-border/60 odd:bg-muted/30"
                        >
                          <td className="max-w-[55%] p-2 align-top text-muted-foreground">
                            {translateYahooExplorerLabel(row.label, locale)}
                          </td>
                          <td className="p-2 font-mono text-xs">
                            {translateYahooExplorerValue(row.value, locale)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardContent className="p-6">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                  <Database className="h-5 w-5" />
                  {t("stockExplore.statsYahooDemo")}
                </h3>
                <div className="space-y-3">
                  {[
                    {
                      label: t("stockExplore.stat52High"),
                      value:
                        weekHigh != null ? `$${weekHigh.toFixed(2)}` : "—",
                    },
                    {
                      label: t("stockExplore.stat52Low"),
                      value: weekLow != null ? `$${weekLow.toFixed(2)}` : "—",
                    },
                    {
                      label: t("stockExplore.statVolAvg"),
                      value:
                        volDisplay != null ? formatVolume(volDisplay) : "—",
                    },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="flex items-center justify-between border-b pb-2 last:border-0"
                    >
                      <span className="text-sm text-muted-foreground">
                        {stat.label}
                      </span>
                      <span className="text-sm font-medium">{stat.value}</span>
                    </div>
                  ))}
                  {exploration.yahoo?.sector && (
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="text-sm text-muted-foreground">
                        {t("stockExplore.sectorIndustry")}
                      </span>
                      <span className="max-w-[60%] text-right text-sm font-medium">
                        {exploration.yahoo.sector}
                        {exploration.yahoo.industry
                          ? ` · ${exploration.yahoo.industry}`
                          : ""}
                      </span>
                    </div>
                  )}
                  {exploration.yahoo?.currency && (
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="text-sm text-muted-foreground">
                        {t("stockExplore.currencyExchange")}
                      </span>
                      <span className="text-sm font-medium">
                        {exploration.yahoo.currency}
                        {exploration.yahoo.exchange
                          ? ` · ${exploration.yahoo.exchange}`
                          : ""}
                      </span>
                    </div>
                  )}
                  {exploration.yahoo?.regular_market_volume != null && (
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="text-sm text-muted-foreground">
                        {t("stockExplore.volLastSession")}
                      </span>
                      <span className="text-sm font-medium">
                        {formatVolume(exploration.yahoo.regular_market_volume)}
                      </span>
                    </div>
                  )}

                  <div className="mt-6">
                    <h4 className="mb-2 text-sm font-medium">
                      {t("stockExplore.sentimentDemo")}
                    </h4>
                    <div className="flex items-center gap-3">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            exploration.demo.sentimentScore > 60
                              ? "bg-emerald-500"
                              : exploration.demo.sentimentScore > 40
                                ? "bg-blue-500"
                                : "bg-red-500"
                          )}
                          style={{
                            width: `${exploration.demo.sentimentScore}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium">
                        {exploration.demo.sentimentScore}/100
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              {exploration.secCompanyFactsFetchedAt && (
                <p className="text-xs text-muted-foreground">
                  {formatMessage(t("stockExplore.companyFactsDownloaded"), {
                    when: new Date(
                      exploration.secCompanyFactsFetchedAt
                    ).toLocaleString(localeTag),
                  })}
                </p>
              )}

              {exploration.secSummary.length > 0 && (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                      <Landmark className="h-5 w-5" />
                      {t("stockExplore.secSummaryTitle")}
                    </h3>
                    <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                      {exploration.secSummary.map((row) => (
                        <div
                          key={row.concept}
                          className="flex flex-col gap-0.5 rounded-md border border-border/60 px-3 py-2 text-sm"
                        >
                          <div className="font-medium leading-tight">
                            {labelSecConceptForLocale(
                              row.concept,
                              row.label,
                              locale
                            )}
                          </div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>
                              {row.period_end} · {row.unit}
                            </span>
                            <span className="font-medium text-foreground">
                              {formatSecValue(row.value, row.unit)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {exploration.secRows.length > 0 && (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                      <Landmark className="h-5 w-5" />
                      {t("stockExplore.secAllRowsTitle")}
                    </h3>
                    <ScrollArea className="h-[min(24rem,40vh)] rounded-md border">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-muted/80">
                          <tr className="text-left">
                            <th className="p-2 font-medium">{t("stockExplore.thConcept")}</th>
                            <th className="p-2 font-medium">{t("stockExplore.thPeriod")}</th>
                            <th className="p-2 font-medium">{t("stockExplore.thValueSec")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {exploration.secRows.map((row, idx) => (
                            <tr
                              key={`${idx}-${row.concept}-${row.period_end}-${row.unit}`}
                              className="border-t border-border/60"
                            >
                              <td className="p-2 align-top">
                                <div className="font-medium">
                                  {labelSecConceptForLocale(
                                    row.concept,
                                    row.label,
                                    locale
                                  )}
                                </div>
                                <div className="text-muted-foreground">
                                  {row.concept}
                                </div>
                              </td>
                              <td className="p-2 whitespace-nowrap text-muted-foreground">
                                {row.period_end}
                                <br />
                                {row.unit}
                              </td>
                              <td className="p-2 font-mono">
                                {formatSecValue(row.value, row.unit)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      )}

      {!exploration && !loading && !loadError && (
        <div className="flex flex-col items-center py-20 text-center">
          <Search className="mb-4 h-16 w-16 text-muted-foreground/30" />
          <h3 className="text-xl font-semibold">{t("stockExplore.emptySearchTitle")}</h3>
          <p className="mt-2 max-w-md text-muted-foreground">
            {t("stockExplore.emptySearchSub")}
          </p>
        </div>
      )}
    </div>
    </TooltipProvider>
  );
}

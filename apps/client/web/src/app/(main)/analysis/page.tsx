"use client";

import { useMemo, useState, useEffect, useTransition, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import {
  calculatePortfolioSummary,
  calculateGapAnalysis,
} from "@/lib/portfolio-optimizer";
import {
  buildIdealAssetAllocation,
  analyzeStockConcentration,
} from "@/lib/ideal-allocation-model";
import { Holding, RiskLevel } from "@/lib/types";
import { getHoldings, getRiskProfile, getYahooSnapshotsForTickers } from "@/lib/actions";
import {
  buildEquityRiskBreakdown,
  type YahooSnapshotForRisk,
} from "@/lib/portfolio-position-risk";
import { cn, formatCurrency, dbRowToHolding } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/context";
import { formatMessage } from "@/lib/i18n/messages";
import { translateEquityRiskSignal } from "@/lib/i18n/equity-risk-signal-i18n";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";

const actionConfigKeys = {
  buy: {
    icon: ArrowUpRight,
    labelKey: "analysis.buy",
    color: "text-emerald-600",
    bg: "bg-emerald-50 dark:bg-emerald-950/50",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  sell: {
    icon: ArrowDownRight,
    labelKey: "analysis.sell",
    color: "text-red-500",
    bg: "bg-red-50 dark:bg-red-950/50",
    badge: "border-red-200 bg-red-50 text-red-700",
  },
  hold: {
    icon: Minus,
    labelKey: "analysis.hold",
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-950/50",
    badge: "border-blue-200 bg-blue-50 text-blue-700",
  },
};

export default function AnalysisPage() {
  const { t, locale } = useI18n();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [riskLevel, setRiskLevel] = useState<RiskLevel>("moderate");
  const [riskScore, setRiskScore] = useState(50);
  const [questionnaireAnswers, setQuestionnaireAnswers] = useState<
    Record<string, number>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [analysisVersion, setAnalysisVersion] = useState(0);
  const [yahooByTicker, setYahooByTicker] = useState<
    Record<string, YahooSnapshotForRisk | undefined>
  >({});
  const [, startTransition] = useTransition();

  const loadAnalysis = useCallback(async () => {
    setIsLoading(true);
    try {
      const [rows, profileData] = await Promise.all([
        getHoldings(),
        getRiskProfile(),
      ]);
      setHoldings(rows.map(dbRowToHolding));
      if (profileData) {
        setRiskLevel(profileData.risk_level);
        setRiskScore(profileData.risk_score);
        setQuestionnaireAnswers({ ...profileData.questionnaire_answers });
      }
      const stockTickers = rows
        .filter(
          (r) =>
            r.asset_class === "stocks" &&
            !String(r.ticker).toUpperCase().startsWith("CASH-")
        )
        .map((r) => r.ticker);
      const snaps = await getYahooSnapshotsForTickers(stockTickers);
      setYahooByTicker(snaps);
    } catch {
      setHoldings([]);
      setYahooByTicker({});
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    startTransition(() => {
      void loadAnalysis();
    });
  }, [analysisVersion, loadAnalysis]);

  const summary = useMemo(() => calculatePortfolioSummary(holdings), [holdings]);

  const idealBuild = useMemo(
    () =>
      buildIdealAssetAllocation({
        riskScore,
        riskLevel,
        answers: questionnaireAnswers,
        locale,
      }),
    [riskScore, riskLevel, questionnaireAnswers, locale]
  );

  const gaps = useMemo(
    () =>
      calculateGapAnalysis(
        summary.allocation,
        idealBuild.allocation,
        summary.totalValue
      ),
    [summary, idealBuild.allocation]
  );

  const stockConcentration = useMemo(
    () => analyzeStockConcentration(holdings, locale),
    [holdings, locale]
  );

  const equityRisk = useMemo(
    () => buildEquityRiskBreakdown(holdings, yahooByTicker),
    [holdings, yahooByTicker]
  );

  const barData = useMemo(
    () =>
      gaps.map((g) => ({
        name: t(`assetClasses.${g.assetClass}`),
        actualPct: g.currentPct,
        idealPct: g.idealPct,
      })),
    [gaps, t]
  );

  const radarData = useMemo(
    () =>
      gaps.map((g) => ({
        subject: t(`assetClasses.${g.assetClass}`),
        actual: g.currentPct,
        ideal: g.idealPct,
        fullMark: 100,
      })),
    [gaps, t]
  );

  const totalGap = gaps.reduce((sum, g) => sum + Math.abs(g.gapPct), 0);
  const isAligned = totalGap < 10;

  const rebalancingTrades = useMemo(
    () =>
      gaps
        .filter((g) => g.action !== "hold")
        .map((g) => ({
          assetClass: g.assetClass,
          label: t(`assetClasses.${g.assetClass}`),
          action: g.action,
          amount: Math.abs(g.amountToRebalance),
          gapPct: g.gapPct,
        })),
    [gaps, t]
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("analysis.title")}</h1>
          <p className="mt-1 text-muted-foreground">{t("analysis.sub")}</p>
        </div>
        <Button
          type="button"
          disabled={isLoading}
          className={cn(
            "shrink-0 gap-2 self-stretch sm:self-auto",
            "bg-emerald-600 text-zinc-950 hover:bg-emerald-700 [&>svg]:text-zinc-950"
          )}
          onClick={() => setAnalysisVersion((v) => v + 1)}
        >
          <RefreshCw
            className={cn("h-4 w-4", isLoading && "animate-spin")}
          />
          {t("analysis.refresh")}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <Card><CardContent className="p-6"><div className="h-16 animate-pulse rounded bg-muted" /></CardContent></Card>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card><CardContent className="p-6"><div className="h-72 animate-pulse rounded bg-muted" /></CardContent></Card>
            <Card><CardContent className="p-6"><div className="h-72 animate-pulse rounded bg-muted" /></CardContent></Card>
          </div>
        </div>
      ) : holdings.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <p className="text-lg font-medium">{t("analysis.emptyTitle")}</p>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              {t("analysis.emptySub")}
            </p>
            <Link
              href="/portfolio"
              className={buttonVariants({
                className: "mt-6 bg-emerald-600 hover:bg-emerald-700",
              })}
            >
              {t("dashboard.goPortfolio")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      ) : (
      <>
      <Card className="mb-6 border-muted">
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold">{t("analysis.howTitle")}</h3>
          <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-muted-foreground">
            {idealBuild.notes.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">{t("analysis.howFoot")}</p>
        </CardContent>
      </Card>

      {stockConcentration.level !== "ok" && stockConcentration.message && (
        <Alert
          variant={stockConcentration.level === "elevated" ? "destructive" : "default"}
          className="mb-6"
        >
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t("analysis.concTitle")}</AlertTitle>
          <AlertDescription>
            {stockConcentration.message}{" "}
            <span className="tabular-nums">
              {formatMessage(t("analysis.concStats"), {
                largest: stockConcentration.largestSharePct,
                top3: stockConcentration.top3SharePct,
                n: stockConcentration.stockPositions,
              })}
            </span>
          </AlertDescription>
        </Alert>
      )}

      {equityRisk.rows.length > 0 && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold">{t("analysis.equityRiskTitle")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("analysis.equityRiskIntro")}{" "}
              <Link
                href="/stocks"
                className="font-medium text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-400"
              >
                {t("nav.explore")}
              </Link>
              .
            </p>
            {equityRisk.weightedScore != null && (
              <p className="mt-3 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  {formatMessage(t("analysis.equityWeighted"), {
                    score: equityRisk.weightedScore,
                    profile: Math.round(riskScore),
                  })}
                </span>
                {equityRisk.weightedScore > riskScore + 8
                  ? t("analysis.equityHintHigh")
                  : equityRisk.weightedScore < riskScore - 8
                    ? t("analysis.equityHintLow")
                    : t("analysis.equityHintMid")}
              </p>
            )}
            <div className="mt-4 overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs font-medium uppercase text-muted-foreground">
                    <th className="px-3 py-2">{t("dashboard.thTicker")}</th>
                    <th className="px-3 py-2">{t("dashboard.thName")}</th>
                    <th className="px-3 py-2 text-right">{t("analysis.thPctEq")}</th>
                    <th className="px-3 py-2 text-right">{t("analysis.thRisk")}</th>
                    <th className="px-3 py-2">{t("analysis.thSignals")}</th>
                  </tr>
                </thead>
                <tbody>
                  {equityRisk.rows.map((r) => (
                    <tr key={r.ticker} className="border-b last:border-0">
                      <td className="px-3 py-2 font-medium">{r.ticker}</td>
                      <td className="max-w-[200px] truncate px-3 py-2 text-muted-foreground">
                        {r.name}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {r.weightInEquityPct}%
                      </td>
                      <td
                        className={cn(
                          "px-3 py-2 text-right font-semibold tabular-nums",
                          r.score >= 68
                            ? "text-red-600"
                            : r.score >= 52
                              ? "text-amber-600"
                              : "text-emerald-600"
                        )}
                      >
                        {r.score}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {r.drivers
                          .map((d) => translateEquityRiskSignal(d, locale))
                          .join(" · ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alignment Status */}
      <Card
        className={cn(
          "mb-6",
          isAligned
            ? "border-emerald-200 dark:border-emerald-800"
            : "border-amber-200 dark:border-amber-800"
        )}
      >
        <CardContent className="flex items-center gap-4 p-6">
          {isAligned ? (
            <CheckCircle2 className="h-8 w-8 shrink-0 text-emerald-600" />
          ) : (
            <AlertTriangle className="h-8 w-8 shrink-0 text-amber-500" />
          )}
          <div>
            <h3 className="font-semibold">
              {isAligned ? t("analysis.alignedGoodTitle") : t("analysis.alignedBadTitle")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {isAligned
                ? t("analysis.alignedGoodSub")
                : formatMessage(t("analysis.alignedBadSub"), {
                    gap: totalGap.toFixed(1),
                  })}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Bar Chart */}
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 text-lg font-semibold">{t("analysis.chartVsIdeal")}</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} barGap={8}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip formatter={(value) => [`${value}%`, ""]} />
                  <Legend />
                  <Bar
                    name={t("analysis.chartActual")}
                    dataKey="actualPct"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    name={t("analysis.chartIdeal")}
                    dataKey="idealPct"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Radar Chart */}
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 text-lg font-semibold">{t("analysis.radarChart")}</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid className="stroke-muted" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                  <PolarRadiusAxis tick={{ fontSize: 10 }} />
                  <Radar
                    name={t("analysis.chartActual")}
                    dataKey="actual"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.2}
                  />
                  <Radar
                    name={t("analysis.chartIdeal")}
                    dataKey="ideal"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.15}
                  />
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gap Details */}
      <Card className="mt-6">
        <CardContent className="p-6">
          <h3 className="mb-4 text-lg font-semibold">{t("analysis.gapDetail")}</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {gaps.map((gap) => {
              const config = actionConfigKeys[gap.action];
              const Icon = config.icon;
              return (
                <div
                  key={gap.assetClass}
                  className={cn("rounded-xl border p-4", config.bg)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {t(`assetClasses.${gap.assetClass}`)}
                    </span>
                    <Badge variant="outline" className={cn("text-xs", config.badge)}>
                      <Icon className="mr-1 h-3 w-3" />
                      {t(config.labelKey)}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <div className="text-xs text-muted-foreground">
                        {t("analysis.gapActual")}
                      </div>
                      <div className="text-lg font-bold">
                        {gap.currentPct}%
                      </div>
                    </div>
                    <ArrowRight className="mb-1 h-4 w-4 text-muted-foreground" />
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">
                        {t("analysis.gapIdeal")}
                      </div>
                      <div className="text-lg font-bold">{gap.idealPct}%</div>
                    </div>
                  </div>
                  {gap.action !== "hold" && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      {gap.action === "buy"
                        ? t("analysis.investVerb")
                        : t("analysis.reduceVerb")}{" "}
                      <span className="font-semibold text-foreground">
                        {formatCurrency(Math.abs(gap.amountToRebalance))}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Rebalancing Trades */}
      {rebalancingTrades.length > 0 && (
        <Card className="mt-6">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              <h3 className="text-lg font-semibold">{t("analysis.rebalTitle")}</h3>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">{t("analysis.rebalSub")}</p>
            <div className="space-y-3">
              {rebalancingTrades.map((trade) => {
                const config = actionConfigKeys[trade.action];
                const Icon = config.icon;
                return (
                  <div
                    key={trade.assetClass}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-lg",
                          config.bg
                        )}
                      >
                        <Icon className={cn("h-5 w-5", config.color)} />
                      </div>
                      <div>
                        <div className="font-medium">{trade.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {trade.action === "buy"
                            ? `Aumentar exposición (${Math.abs(trade.gapPct)}% por debajo del ideal)`
                            : `Reducir exposición (${Math.abs(trade.gapPct)}% por encima del ideal)`}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={cn("font-semibold", config.color)}>
                        {trade.action === "buy" ? "+" : "-"}
                        {formatCurrency(trade.amount)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t(config.labelKey)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
      </>
      )}
    </div>
  );
}

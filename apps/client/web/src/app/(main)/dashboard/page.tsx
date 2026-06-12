"use client";

import { useMemo, useState, useEffect, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  BarChart3,
  ArrowRight,
  Activity,
} from "lucide-react";
import Link from "next/link";
import {
  calculatePortfolioSummary,
  calculatePerformanceMetrics,
  generateMockReturns,
  maxDrawdownPctFromEquityCurve,
  dailyReturnsFromValueSeries,
  periodReturnFromPortfolioHistory,
} from "@/lib/portfolio-optimizer";
import { ASSET_CLASS_COLORS } from "@/lib/constants";
import {
  getDashboardMarketBrief,
  getHoldings,
  getPortfolioValueHistory,
} from "@/lib/actions";
import { MarketDayBriefCard } from "@/components/dashboard/market-day-brief-card";
import type { DashboardMarketBrief } from "@/lib/market/dashboard-brief";
import { Holding } from "@/lib/types";
import {
  formatCurrency,
  formatPct,
  formatSnapshotChartDate,
  dbRowToHolding,
} from "@/lib/utils";
import { useI18n } from "@/lib/i18n/context";
import { formatMessage } from "@/lib/i18n/messages";
import {
  PieChart as RechartsPie,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

function SkeletonCard() {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="mt-3 h-7 w-32 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-3 w-16 animate-pulse rounded bg-muted" />
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { t } = useI18n();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [portfolioHistoryPoints, setPortfolioHistoryPoints] = useState<
    { date: string; value: number }[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dayBrief, setDayBrief] = useState<DashboardMarketBrief | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      try {
        const [rows, history, brief] = await Promise.all([
          getHoldings(),
          getPortfolioValueHistory(),
          getDashboardMarketBrief(),
        ]);
        setHoldings(rows.map(dbRowToHolding));
        setPortfolioHistoryPoints(history.points);
        setDayBrief(brief);
      } catch {
        setHoldings([]);
        setPortfolioHistoryPoints([]);
        setDayBrief(null);
      } finally {
        setIsLoading(false);
      }
    });
  }, []);

  const summary = useMemo(() => calculatePortfolioSummary(holdings), [holdings]);

  /** Aligned with the visible history chart: first stored day → current market value. */
  const periodFromHistory = useMemo(
    () =>
      periodReturnFromPortfolioHistory(
        portfolioHistoryPoints,
        summary.totalValue
      ),
    [portfolioHistoryPoints, summary.totalValue]
  );

  const metrics = useMemo(() => {
    const vals = portfolioHistoryPoints.map((p) => p.value);
    if (vals.length >= 2) {
      const rets = dailyReturnsFromValueSeries(vals);
      const m = calculatePerformanceMetrics(rets, 0.04);
      return {
        ...m,
        maxDrawdown: maxDrawdownPctFromEquityCurve(vals),
      };
    }
    const returns = generateMockReturns(252);
    return calculatePerformanceMetrics(returns);
  }, [portfolioHistoryPoints]);

  const hasEquityHoldings = useMemo(
    () =>
      holdings.some(
        (h) => h.assetClass === "stocks" || h.assetClass === "alternatives"
      ),
    [holdings]
  );

  const pieData = Object.entries(summary.allocation)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({
      name: t(`assetClasses.${key}`),
      value: Math.round(value * 10) / 10,
      color: ASSET_CLASS_COLORS[key],
    }));

  const useHistoryPeriod = periodFromHistory !== null;

  const statCards = [
    {
      label: t("dashboard.totalValue"),
      value: formatCurrency(summary.totalValue),
      icon: DollarSign,
      change: useHistoryPeriod
        ? formatPct(periodFromHistory.pctVsFirst)
        : formatPct(summary.totalReturnPct),
      positive: useHistoryPeriod
        ? periodFromHistory.pctVsFirst >= 0
        : summary.totalReturnPct >= 0,
    },
    {
      label: t("dashboard.performance"),
      value: useHistoryPeriod
        ? formatCurrency(periodFromHistory.absVsFirst)
        : formatCurrency(summary.totalReturn),
      icon: useHistoryPeriod
        ? periodFromHistory.absVsFirst >= 0
          ? TrendingUp
          : TrendingDown
        : summary.totalReturn >= 0
          ? TrendingUp
          : TrendingDown,
      change: useHistoryPeriod
        ? formatPct(periodFromHistory.pctVsFirst)
        : formatPct(summary.totalReturnPct),
      positive: useHistoryPeriod
        ? periodFromHistory.absVsFirst >= 0
        : summary.totalReturn >= 0,
    },
    {
      label: t("dashboard.sharpe"),
      value: metrics.sharpeRatio.toFixed(2),
      icon: Activity,
      change:
        metrics.sharpeRatio >= 1 ? t("dashboard.sharpeGood") : t("dashboard.sharpePoor"),
      positive: metrics.sharpeRatio >= 1,
    },
    {
      label: t("dashboard.maxDd"),
      value: `${metrics.maxDrawdown.toFixed(1)}%`,
      icon: BarChart3,
      change:
        metrics.maxDrawdown < 15 ? t("dashboard.ddControlled") : t("dashboard.ddHigh"),
      positive: metrics.maxDrawdown < 15,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <MarketDayBriefCard
        brief={dayBrief}
        loading={isLoading}
        hasEquityHoldings={hasEquityHoldings}
      />

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t("dashboard.title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("dashboard.sub")}</p>
      </div>

      {/* Stat Cards */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : holdings.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <p className="text-lg font-medium">{t("dashboard.emptyTitle")}</p>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              {t("dashboard.emptySub")}
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {card.label}
                </span>
                <card.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2 text-2xl font-bold">{card.value}</div>
              <div
                className={`mt-1 text-xs font-medium ${card.positive ? "text-emerald-600" : "text-red-500"}`}
              >
                {card.change}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {useHistoryPeriod && (
        <p className="mt-3 max-w-4xl text-xs text-muted-foreground">
          {formatMessage(t("dashboard.historyHint"), {
            first: formatSnapshotChartDate(periodFromHistory.firstDate),
            retPct: formatPct(summary.totalReturnPct),
            retAbs: formatCurrency(summary.totalReturn),
          })}
        </p>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Chart */}
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold">{t("dashboard.chartTitle")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t("dashboard.chartSub")}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {portfolioHistoryPoints.length === 0
                ? t("dashboard.noHistoryYet")
                : formatMessage(t("dashboard.daysRecorded"), {
                    n: portfolioHistoryPoints.length,
                  })}
            </p>
            <div className="mt-4 h-72">
              {portfolioHistoryPoints.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    {t("dashboard.historyEmptyHint")}
                  </p>
                </div>
              ) : portfolioHistoryPoints.length === 1 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2">
                  <p className="text-sm text-muted-foreground">
                    {formatSnapshotChartDate(portfolioHistoryPoints[0].date)}
                  </p>
                  <p className="text-3xl font-bold tabular-nums">
                    {formatCurrency(portfolioHistoryPoints[0].value)}
                  </p>
                  <p className="max-w-sm text-center text-xs text-muted-foreground">
                    {t("dashboard.singleDayHint")}
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={portfolioHistoryPoints}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(d) => {
                        const [, m, day] = String(d).split("-");
                        return `${day}/${m}`;
                      }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      domain={["auto", "auto"]}
                      tickFormatter={(v) =>
                        Math.abs(v) >= 1000
                          ? `$${(v / 1000).toFixed(1)}k`
                          : `$${Math.round(v)}`
                      }
                    />
                    <Tooltip
                      formatter={(value) => [
                        formatCurrency(Number(value)),
                        t("dashboard.tooltipValue"),
                      ]}
                      labelFormatter={(label) => formatSnapshotChartDate(String(label))}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#10b981"
                      strokeWidth={2}
                      fill="url(#colorValue)"
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Allocation Pie */}
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 text-lg font-semibold">
              {t("dashboard.allocationTitle")}
            </h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value}%`, ""]} />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {pieData.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span>{item.name}</span>
                  </div>
                  <span className="font-medium">{item.value}%</span>
                </div>
              ))}
            </div>

            <Link
              href="/analysis"
              className={buttonVariants({ variant: "outline", className: "mt-6 w-full" })}
            >
              <PieChart className="mr-2 h-4 w-4" />
              {t("dashboard.viewAnalysis")}
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Holdings Table */}
      <Card className="mt-6">
        <CardContent className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">{t("dashboard.positionsTitle")}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs font-medium uppercase text-muted-foreground">
                  <th className="pb-3 pr-4">{t("dashboard.thTicker")}</th>
                  <th className="pb-3 pr-4">{t("dashboard.thName")}</th>
                  <th className="pb-3 pr-4 text-right">{t("dashboard.thQty")}</th>
                  <th className="pb-3 pr-4 text-right">{t("dashboard.thPrice")}</th>
                  <th className="pb-3 pr-4 text-right">{t("dashboard.thValue")}</th>
                  <th className="pb-3 text-right">{t("dashboard.thReturn")}</th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((h) => {
                  const value = h.currentPrice * h.quantity;
                  const returnPct =
                    ((h.currentPrice - h.avgPrice) / h.avgPrice) * 100;
                  return (
                    <tr key={h.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium">{h.ticker}</td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {h.name}
                      </td>
                      <td className="py-3 pr-4 text-right">{h.quantity}</td>
                      <td className="py-3 pr-4 text-right">
                        ${h.currentPrice.toFixed(2)}
                      </td>
                      <td className="py-3 pr-4 text-right font-medium">
                        {formatCurrency(value)}
                      </td>
                      <td
                        className={`py-3 text-right font-medium ${returnPct >= 0 ? "text-emerald-600" : "text-red-500"}`}
                      >
                        {formatPct(returnPct)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
}

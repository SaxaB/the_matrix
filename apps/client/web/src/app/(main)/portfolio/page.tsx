"use client";

import { useState, useMemo, useEffect, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  Upload,
  PieChart,
  ArrowRight,
  RefreshCw,
  MoreHorizontal,
} from "lucide-react";
import Link from "next/link";
import { Holding, AssetClass } from "@/lib/types";
import {
  calculatePortfolioSummary,
  periodReturnFromPortfolioHistory,
} from "@/lib/portfolio-optimizer";
import { ASSET_CLASS_COLORS } from "@/lib/constants";
import { useI18n } from "@/lib/i18n/context";
import { formatMessage } from "@/lib/i18n/messages";
import type { AppLocale } from "@/lib/i18n/config";
import {
  addHolding as addHoldingAction,
  deleteHolding as deleteHoldingAction,
  getCurrentUser,
  getHoldings,
  getPortfolioValueHistory,
  prepareUsTickerMarketData,
  validateUsTickerSymbol,
  refreshHoldingsPrices,
  resolveTickerForPortfolio,
  sellHoldingToCash,
} from "@/lib/actions";
import {
  formatCurrency,
  formatPct,
  formatSnapshotChartDate,
  dbRowToHolding,
} from "@/lib/utils";
import {
  PieChart as RechartsPie,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  TickerIngestBanner,
  tickerPrepErrorMessagePath,
} from "@/components/shared/ticker-ingest-banner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const emptyHolding: Omit<Holding, "id"> = {
  ticker: "",
  name: "",
  quantity: 0,
  avgPrice: 0,
  currentPrice: 0,
  assetClass: "stocks",
  sector: "",
  currency: "USD",
};

const CASH_CURRENCY_OPTIONS = [
  "USD",
  "EUR",
  "GBP",
  "CHF",
  "JPY",
  "MXN",
] as const;

const ASSET_HINT_PATH: Record<AssetClass, string> = {
  stocks: "portfolio.hintStocks",
  bonds: "portfolio.hintBonds",
  alternatives: "portfolio.hintAlternatives",
  cash: "portfolio.hintCash",
};

function formatHoldingMoney(
  value: number,
  currency: string,
  locale: AppLocale
): string {
  return new Intl.NumberFormat(locale === "en" ? "en-US" : "es-ES", {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export default function PortfolioPage() {
  const { t, locale } = useI18n();
  const localeTag = locale === "en" ? "en-US" : "es-ES";
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newHolding, setNewHolding] = useState(emptyHolding);
  const [isPending, startTransition] = useTransition();
  const [dbMode, setDbMode] = useState(false);
  const [refreshingPrices, setRefreshingPrices] = useState(false);
  const [priceRefreshNote, setPriceRefreshNote] = useState<string | null>(null);
  const [addHoldingError, setAddHoldingError] = useState<string | null>(null);
  const [addHoldingNote, setAddHoldingNote] = useState<string | null>(null);
  const [tickerIngest, setTickerIngest] = useState(false);
  const [sellDialog, setSellDialog] = useState<{
    holding: Holding;
    mode: "partial" | "full";
  } | null>(null);
  const [sellQty, setSellQty] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [sellError, setSellError] = useState<string | null>(null);
  const [portfolioHistoryPoints, setPortfolioHistoryPoints] = useState<
    { date: string; value: number }[]
  >([]);

  useEffect(() => {
    startTransition(async () => {
      try {
        const user = await getCurrentUser();
        const [rows, history] = await Promise.all([
          getHoldings(),
          getPortfolioValueHistory(),
        ]);
        setPortfolioHistoryPoints(history.points);
        if (user) {
          setDbMode(true);
          setHoldings(rows.map(dbRowToHolding));
        } else {
          setDbMode(false);
          setHoldings([]);
        }
      } catch {
        setDbMode(false);
        setHoldings([]);
        setPortfolioHistoryPoints([]);
      }
    });
  }, []);

  const summary = useMemo(() => calculatePortfolioSummary(holdings), [holdings]);

  const periodFromHistory = useMemo(
    () =>
      periodReturnFromPortfolioHistory(
        portfolioHistoryPoints,
        summary.totalValue
      ),
    [portfolioHistoryPoints, summary.totalValue]
  );
  const useHistoryPeriod = periodFromHistory !== null;

  const positionLinesBreakdown = useMemo(() => {
    if (holdings.length === 0) return "";
    const count = (ac: AssetClass) =>
      holdings.filter((h) => h.assetClass === ac).length;
    const stocks = count("stocks");
    const bonds = count("bonds");
    const cash = count("cash");
    const alt = count("alternatives");
    const parts: string[] = [];
    if (stocks)
      parts.push(
        stocks === 1
          ? t("portfolio.lineStockOne")
          : formatMessage(t("portfolio.lineStockMany"), { n: stocks })
      );
    if (bonds)
      parts.push(
        bonds === 1
          ? t("portfolio.lineBondOne")
          : formatMessage(t("portfolio.lineBondMany"), { n: bonds })
      );
    if (cash) parts.push(formatMessage(t("portfolio.lineCash"), { n: cash }));
    if (alt) parts.push(formatMessage(t("portfolio.lineAlt"), { n: alt }));
    return parts.join(" · ");
  }, [holdings, t]);

  const pieData = useMemo(
    () =>
      Object.entries(summary.allocation)
        .filter(([, v]) => v > 0)
        .map(([key, value]) => {
          const ac = key as AssetClass;
          return {
            name: t(`assetClasses.${ac}`),
            value: Math.round(value * 10) / 10,
            color: ASSET_CLASS_COLORS[ac],
          };
        }),
    [summary.allocation, t]
  );

  function addHolding() {
    if (newHolding.assetClass === "cash") {
      if (newHolding.quantity <= 0) return;
    } else {
      if (!newHolding.ticker?.trim() || newHolding.quantity <= 0) return;
    }

    if (dbMode) {
      startTransition(async () => {
        setAddHoldingError(null);
        setAddHoldingNote(null);

        if (newHolding.assetClass !== "cash") {
          try {
            const validated = await validateUsTickerSymbol(newHolding.ticker.trim());
            if (!validated.ok) {
              setAddHoldingError(t(tickerPrepErrorMessagePath(validated.code)));
              return;
            }
          } catch {
            setAddHoldingError(t(tickerPrepErrorMessagePath("INGEST_FAILED")));
            return;
          }

          setTickerIngest(true);
          try {
            const prep = await prepareUsTickerMarketData(newHolding.ticker.trim());
            if (!prep.ok) {
              setAddHoldingError(t(tickerPrepErrorMessagePath(prep.code)));
              return;
            }
            const ingestNote =
              prep.ranSec || prep.ranYahoo || prep.ranRisk
                ? [
                    prep.ranSec ? t("portfolio.etlSecUpdated") : null,
                    prep.ranYahoo ? t("portfolio.etlYahooUpdated") : null,
                    prep.ranRisk ? t("portfolio.etlRiskUpdated") : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : null;
            const result = await addHoldingAction({
              ticker: newHolding.ticker,
              quantity: newHolding.quantity,
              avgPrice: newHolding.avgPrice,
              assetClass: newHolding.assetClass,
              currency: newHolding.currency,
              skipMarketBackfill: true,
            });
            if (result.error) {
              setAddHoldingError(result.error);
              return;
            }
            if (result.data) {
              setHoldings((prev) => [...prev, dbRowToHolding(result.data)]);
              setNewHolding(emptyHolding);
              setIsAdding(false);
              if (ingestNote) {
                setAddHoldingNote(ingestNote);
              }
            }
          } finally {
            setTickerIngest(false);
          }
          return;
        }

        const cashResult = await addHoldingAction({
          ticker: "CASH",
          quantity: newHolding.quantity,
          avgPrice: 1,
          assetClass: "cash",
          currency: newHolding.currency,
        });
        if (cashResult.error) {
          setAddHoldingError(cashResult.error);
          return;
        }
        if (cashResult.data) {
          setHoldings((prev) => [...prev, dbRowToHolding(cashResult.data)]);
          setNewHolding(emptyHolding);
          setIsAdding(false);
          if ("etl" in cashResult && cashResult.etl?.message) {
            setAddHoldingNote(cashResult.etl.message);
          }
        }
      });
    } else {
      startTransition(async () => {
        setAddHoldingError(null);
        if (newHolding.assetClass === "cash") {
          const currency = (newHolding.currency || "USD").toUpperCase();
          const amount = newHolding.quantity;
          const holding: Holding = {
            id: `${Date.now()}`,
            ticker: `CASH-${currency}`,
            name: formatMessage(t("portfolio.cashDisplayName"), {
              currency,
            }),
            quantity: amount,
            avgPrice: 1,
            currentPrice: 1,
            assetClass: "cash",
            sector: t("portfolio.cashSector"),
            currency,
          };
          setHoldings((prev) => [...prev, holding]);
          setNewHolding(emptyHolding);
          setIsAdding(false);
          return;
        }
        const r = await resolveTickerForPortfolio(newHolding.ticker);
        if (!r.ok) {
          setAddHoldingError(r.error);
          return;
        }
        const holding: Holding = {
          id: `${Date.now()}`,
          ticker: r.ticker,
          name: r.name,
          quantity: newHolding.quantity,
          avgPrice: newHolding.avgPrice,
          currentPrice: r.currentPrice,
          assetClass: newHolding.assetClass,
          sector: r.sector,
          currency: r.currency,
        };
        setHoldings((prev) => [...prev, holding]);
        setNewHolding(emptyHolding);
        setIsAdding(false);
      });
    }
  }

  function removeHolding(id: string) {
    if (dbMode) {
      startTransition(async () => {
        await deleteHoldingAction(id);
        setHoldings((prev) => prev.filter((h) => h.id !== id));
      });
    } else {
      setHoldings((prev) => prev.filter((h) => h.id !== id));
    }
  }

  function applySellLocal(
    h: Holding,
    qtySold: number,
    pricePerUnit: number
  ) {
    const proceeds = qtySold * pricePerUnit;
    const currency = (h.currency || "USD").toUpperCase();
    const cashTicker = `CASH-${currency}`;
    const remaining = h.quantity - qtySold;
    const closeAll = remaining <= 1e-8;
    setHoldings((prev) => {
      let next: Holding[] = prev
        .map((p) => {
          if (p.id !== h.id) return p;
          if (closeAll) return null;
          return { ...p, quantity: remaining };
        })
        .filter((x): x is Holding => x !== null);
      const cidx = next.findIndex(
        (x) => x.assetClass === "cash" && x.ticker === cashTicker
      );
      if (cidx >= 0) {
        const c = next[cidx];
        next = [...next];
        next[cidx] = { ...c, quantity: c.quantity + proceeds };
        return next;
      }
      return [
        ...next,
        {
          id: `${Date.now()}-cash`,
          ticker: cashTicker,
          name: formatMessage(t("portfolio.cashDisplayName"), {
            currency,
          }),
          quantity: proceeds,
          avgPrice: 1,
          currentPrice: 1,
          assetClass: "cash",
          sector: t("portfolio.cashSector"),
          currency,
        },
      ];
    });
  }

  function openSellPartial(h: Holding) {
    setSellDialog({ holding: h, mode: "partial" });
    setSellQty("");
    setSellPrice(
      h.currentPrice > 0 ? String(h.currentPrice) : ""
    );
    setSellError(null);
  }

  function openSellFull(h: Holding) {
    setSellDialog({ holding: h, mode: "full" });
    setSellQty(String(h.quantity));
    setSellPrice(
      h.currentPrice > 0 ? String(h.currentPrice) : ""
    );
    setSellError(null);
  }

  function executeSell() {
    if (!sellDialog) return;
    const h = sellDialog.holding;
    const qty = parseFloat(sellQty.replace(",", "."));
    const price = parseFloat(sellPrice.replace(",", "."));
    if (!Number.isFinite(qty) || qty <= 0) {
      setSellError(t("portfolio.sellErrQty"));
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      setSellError(t("portfolio.sellErrPrice"));
      return;
    }
    if (qty > h.quantity + 1e-8) {
      setSellError(t("portfolio.sellErrMax"));
      return;
    }
    setSellError(null);
    startTransition(async () => {
      if (dbMode) {
        const r = await sellHoldingToCash({
          holdingId: h.id,
          quantitySold: qty,
          pricePerUnit: price,
        });
        if ("error" in r) {
          setSellError(r.error ?? t("portfolio.sellErrDb"));
          return;
        }
        const rows = await getHoldings();
        setHoldings(rows.map(dbRowToHolding));
      } else {
        applySellLocal(h, qty, price);
      }
      setSellDialog(null);
    });
  }

  function handleRefreshPrices() {
    setPriceRefreshNote(null);
    setRefreshingPrices(true);
    startTransition(async () => {
      try {
        const result = await refreshHoldingsPrices();
        if (!result.ok) {
          setPriceRefreshNote(result.error);
          return;
        }
        const rows = await getHoldings();
        if (rows.length > 0) {
          setDbMode(true);
          setHoldings(rows.map(dbRowToHolding));
        }
        const parts: string[] = [];
        if (result.updatedHoldings === 0 && result.messages.length > 0) {
          parts.push(...result.messages);
        } else {
          parts.push(
            formatMessage(t("portfolio.priceRefreshUpdated"), {
              n: result.updatedHoldings,
            })
          );
          parts.push(...result.messages);
        }
        if (
          result.updatedHoldings === 0 &&
          result.messages.length === 0 &&
          result.tickers.length > 0
        ) {
          parts.push(t("portfolio.priceRefreshNoRows"));
        }
        setPriceRefreshNote(parts.filter(Boolean).join(" "));
      } catch (e) {
        setPriceRefreshNote(
          e instanceof Error ? e.message : t("portfolio.priceRefreshError")
        );
      } finally {
        setRefreshingPrices(false);
      }
    });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("portfolio.title")}</h1>
          <p className="mt-1 text-muted-foreground">{t("portfolio.sub")}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={refreshingPrices || isPending}
            onClick={handleRefreshPrices}
            title={t("portfolio.refreshPricesTitle")}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${refreshingPrices ? "animate-spin" : ""}`}
            />
            {t("portfolio.refreshPrices")}
          </Button>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={() => {
              setNewHolding(emptyHolding);
              setAddHoldingError(null);
              setAddHoldingNote(null);
              setIsAdding(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("portfolio.addPosition")}
          </Button>
        </div>
      </div>

      {priceRefreshNote && (
        <p className="mb-4 text-sm text-muted-foreground">{priceRefreshNote}</p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Summary Cards */}
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardContent className="p-6">
              <h3 className="mb-4 text-sm font-medium text-muted-foreground">
                {t("portfolio.summaryTitle")}
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="text-2xl font-bold">
                    {formatCurrency(summary.totalValue)}
                  </div>
                  <div
                    className={cn(
                      "text-sm font-medium",
                      useHistoryPeriod
                        ? periodFromHistory!.absVsFirst >= 0
                          ? "text-emerald-600"
                          : "text-red-500"
                        : summary.totalReturn >= 0
                          ? "text-emerald-600"
                          : "text-red-500"
                    )}
                  >
                    {useHistoryPeriod ? (
                      <>
                        {periodFromHistory!.absVsFirst >= 0 ? "+" : ""}
                        {formatCurrency(periodFromHistory!.absVsFirst)} (
                        {formatPct(periodFromHistory!.pctVsFirst)})
                      </>
                    ) : (
                      <>
                        {summary.totalReturn >= 0 ? "+" : ""}
                        {formatCurrency(summary.totalReturn)} (
                        {formatPct(summary.totalReturnPct)})
                      </>
                    )}
                  </div>
                  {holdings.length > 0 && (
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      {useHistoryPeriod ? (
                        <>
                          {formatMessage(t("portfolio.summaryDeltaHistory"), {
                            first: formatSnapshotChartDate(
                              periodFromHistory!.firstDate
                            ),
                            retPct: formatPct(summary.totalReturnPct),
                            retAbs:
                              (summary.totalReturn >= 0 ? "+" : "") +
                              formatCurrency(summary.totalReturn),
                          })}
                        </>
                      ) : (
                        <>{t("portfolio.summaryDeltaCostOnly")}</>
                      )}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-muted/50 p-3">
                    <div className="text-xs text-muted-foreground">
                      {t("portfolio.cost")}
                    </div>
                    <div className="font-semibold">
                      {formatCurrency(summary.totalCost)}
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <div className="text-xs text-muted-foreground">
                      {t("portfolio.positionsLines")}
                    </div>
                    <div className="font-semibold">{holdings.length}</div>
                    {positionLinesBreakdown ? (
                      <div className="mt-1.5 text-[11px] font-normal leading-snug text-muted-foreground">
                        {positionLinesBreakdown}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="mb-4 text-sm font-medium text-muted-foreground">
                {t("portfolio.distribution")}
              </h3>
              {pieData.length > 0 ? (
                <>
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={65}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {pieData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => [`${value}%`, ""]}
                        />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    {pieData.map((item) => (
                      <div
                        key={item.name}
                        className="flex items-center justify-between text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span>{item.name}</span>
                        </div>
                        <span className="font-medium">{item.value}%</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("portfolio.addForDistribution")}
                </p>
              )}

              {holdings.length > 0 && (
                <Link
                  href="/analysis"
                  className={buttonVariants({ className: "mt-6 w-full bg-emerald-600 hover:bg-emerald-700" })}
                >
                  <PieChart className="mr-2 h-4 w-4" />
                  {t("portfolio.analyzeGaps")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Holdings List */}
        <div className="lg:col-span-2">
          {/* Add Holding Form */}
          {isAdding && (
            <Card className="mb-6 border-emerald-200 dark:border-emerald-800">
              <CardContent className="p-6">
                <h3 className="mb-4 font-semibold">{t("portfolio.newPosition")}</h3>
                <div className="space-y-4">
                  <div>
                    <Label>{t("portfolio.assetType")}</Label>
                    <Select
                      value={newHolding.assetClass}
                      onValueChange={(v) => {
                        const ac = v as AssetClass;
                        setNewHolding((p) => {
                          if (ac === "cash") {
                            return {
                              ...emptyHolding,
                              assetClass: "cash",
                              currency: p.currency || "USD",
                            };
                          }
                          if (p.assetClass === "cash") {
                            return { ...emptyHolding, assetClass: ac };
                          }
                          return { ...p, assetClass: ac };
                        });
                      }}
                    >
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="stocks">
                          {t("assetClasses.stocks")}
                        </SelectItem>
                        <SelectItem value="bonds">{t("assetClasses.bonds")}</SelectItem>
                        <SelectItem value="cash">{t("assetClasses.cash")}</SelectItem>
                        <SelectItem value="alternatives">
                          {t("assetClasses.alternatives")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t(ASSET_HINT_PATH[newHolding.assetClass])}
                  </p>
                  {newHolding.assetClass === "cash" ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label>{t("portfolio.currency")}</Label>
                        <Select
                          value={newHolding.currency || "USD"}
                          onValueChange={(v) =>
                            setNewHolding((p) => ({
                              ...p,
                              currency: v ?? "USD",
                            }))
                          }
                        >
                          <SelectTrigger className="mt-1.5">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CASH_CURRENCY_OPTIONS.map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>{t("portfolio.cashAmount")}</Label>
                        <Input
                          className="mt-1.5"
                          type="number"
                          placeholder="10000"
                          min={0}
                          step="any"
                          value={newHolding.quantity || ""}
                          onChange={(e) =>
                            setNewHolding((p) => ({
                              ...p,
                              quantity: parseFloat(e.target.value) || 0,
                            }))
                          }
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <Label>
                          {newHolding.assetClass === "bonds"
                            ? t("portfolio.labelTickerBonds")
                            : newHolding.assetClass === "alternatives"
                              ? t("portfolio.labelTickerAlt")
                              : t("portfolio.labelTicker")}
                        </Label>
                        <Input
                          className="mt-1.5"
                          placeholder={
                            newHolding.assetClass === "stocks"
                              ? "MSFT"
                              : "AGG"
                          }
                          value={newHolding.ticker}
                          onChange={(e) =>
                            setNewHolding((p) => ({
                              ...p,
                              ticker: e.target.value.toUpperCase(),
                            }))
                          }
                        />
                      </div>
                      <div>
                        <Label>{t("portfolio.qtyTitles")}</Label>
                        <Input
                          className="mt-1.5"
                          type="number"
                          placeholder="100"
                          min={0}
                          step="any"
                          value={newHolding.quantity || ""}
                          onChange={(e) =>
                            setNewHolding((p) => ({
                              ...p,
                              quantity: parseFloat(e.target.value) || 0,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <Label>{t("portfolio.avgBuyPrice")}</Label>
                        <Input
                          className="mt-1.5"
                          type="number"
                          placeholder="350.00"
                          min={0}
                          step="any"
                          value={newHolding.avgPrice || ""}
                          onChange={(e) =>
                            setNewHolding((p) => ({
                              ...p,
                              avgPrice: parseFloat(e.target.value) || 0,
                            }))
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>
                <TickerIngestBanner active={tickerIngest} />
                {addHoldingError && (
                  <p className="mt-4 text-sm text-red-600">{addHoldingError}</p>
                )}
                {addHoldingNote && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {addHoldingNote}
                  </p>
                )}
                <div className="mt-4 flex gap-3">
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={addHolding}
                    disabled={
                      isPending ||
                      tickerIngest ||
                      (newHolding.assetClass === "cash"
                        ? newHolding.quantity <= 0
                        : !newHolding.ticker?.trim() ||
                          newHolding.quantity <= 0)
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {tickerIngest
                      ? t("portfolio.tickerImporting")
                      : isPending
                        ? newHolding.assetClass === "cash"
                          ? t("portfolio.saving")
                          : t("portfolio.resolving")
                        : t("portfolio.add")}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setIsAdding(false);
                      setNewHolding(emptyHolding);
                      setAddHoldingError(null);
                      setAddHoldingNote(null);
                      setTickerIngest(false);
                    }}
                  >
                    {t("portfolio.cancel")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Holdings Table */}
          <Card>
            <CardContent className="p-6">
              <h3 className="mb-4 font-semibold">{t("portfolio.positionsTitle")}</h3>
              {holdings.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-center">
                  <Upload className="mb-4 h-12 w-12 text-muted-foreground/40" />
                  <h4 className="font-medium">{t("portfolio.emptyTitle")}</h4>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("portfolio.emptySub")}
                  </p>
                  <Button
                    size="sm"
                    className="mt-4 bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => {
                      setNewHolding(emptyHolding);
                      setAddHoldingError(null);
                      setAddHoldingNote(null);
                      setIsAdding(true);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {t("portfolio.emptyCta")}
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs font-medium uppercase text-muted-foreground">
                        <th className="pb-3 pr-3">{t("portfolio.thTicker")}</th>
                        <th className="hidden pb-3 pr-3 sm:table-cell">
                          {t("portfolio.thName")}
                        </th>
                        <th className="pb-3 pr-3">{t("portfolio.thType")}</th>
                        <th className="pb-3 pr-3 text-right">{t("portfolio.thQty")}</th>
                        <th className="pb-3 pr-3 text-right">{t("portfolio.thPrice")}</th>
                        <th className="pb-3 pr-3 text-right">{t("portfolio.thValue")}</th>
                        <th className="pb-3 pr-3 text-right">{t("portfolio.thPnl")}</th>
                        <th className="pb-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {holdings.map((h) => {
                        const isCash = h.assetClass === "cash";
                        const value = h.currentPrice * h.quantity;
                        const pnl =
                          (h.currentPrice - h.avgPrice) * h.quantity;
                        const pnlPct =
                          h.avgPrice > 0
                            ? ((h.currentPrice - h.avgPrice) / h.avgPrice) *
                              100
                            : 0;
                        return (
                          <tr key={h.id} className="border-b last:border-0">
                            <td className="py-3 pr-3 font-medium">
                              {isCash ? h.name : h.ticker}
                            </td>
                            <td className="hidden py-3 pr-3 text-muted-foreground sm:table-cell">
                              {isCash ? "—" : h.name}
                            </td>
                            <td className="py-3 pr-3">
                              <Badge variant="secondary" className="text-xs">
                                {t(`assetClasses.${h.assetClass}`)}
                              </Badge>
                            </td>
                            <td className="py-3 pr-3 text-right tabular-nums">
                              {isCash
                                ? h.quantity.toLocaleString(localeTag, {
                                    maximumFractionDigits: 2,
                                  })
                                : h.quantity}
                            </td>
                            <td className="py-3 pr-3 text-right">
                              {isCash
                                ? "—"
                                : formatHoldingMoney(h.currentPrice, h.currency, locale)}
                            </td>
                            <td className="py-3 pr-3 text-right font-medium">
                              {formatHoldingMoney(value, h.currency, locale)}
                            </td>
                            <td
                              className={cn(
                                "py-3 pr-3 text-right font-medium",
                                isCash
                                  ? "text-muted-foreground"
                                  : pnl >= 0
                                    ? "text-emerald-600"
                                    : "text-red-500"
                              )}
                            >
                              {isCash
                                ? "—"
                                : `${pnl >= 0 ? "+" : ""}${pnlPct.toFixed(1)}%`}
                            </td>
                            <td className="py-3 text-right">
                              {isCash ? (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-red-500"
                                  title={t("portfolio.removeCashTitle")}
                                  onClick={() => {
                                    if (
                                      window.confirm(t("portfolio.confirmRemoveCash"))
                                    ) {
                                      removeHolding(h.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              ) : (
                                <DropdownMenu>
                                  <DropdownMenuTrigger
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                                    title={t("portfolio.positionMenuTitle")}
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent
                                    align="end"
                                    className="min-w-[min(100vw-2rem,22rem)] w-[min(100vw-1rem,26rem)] max-w-none p-2 sm:min-w-[24rem] sm:w-[26rem]"
                                  >
                                    <DropdownMenuItem
                                      className="gap-2 py-2.5 text-left whitespace-normal"
                                      onClick={() => openSellPartial(h)}
                                    >
                                      {t("portfolio.sellPartial")}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="gap-2 py-2.5 text-left whitespace-normal"
                                      onClick={() => openSellFull(h)}
                                    >
                                      {t("portfolio.sellFull")}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      variant="destructive"
                                      className="items-start gap-2 py-2.5 text-left whitespace-normal"
                                      onClick={() => {
                                        if (
                                          window.confirm(
                                            t("portfolio.confirmRemoveOnly")
                                          )
                                        ) {
                                          removeHolding(h.id);
                                        }
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4 shrink-0" />
                                      {t("portfolio.deleteNoConversion")}
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog
        open={!!sellDialog}
        onOpenChange={(open) => {
          if (!open) {
            setSellDialog(null);
            setSellError(null);
          }
        }}
      >
        <DialogContent className="max-w-[calc(100%-2rem)] border-border bg-background text-foreground shadow-lg sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {sellDialog?.mode === "full"
                ? t("portfolio.dialogSellFull")
                : t("portfolio.dialogSellPartial")}
            </DialogTitle>
            <DialogDescription>
              {sellDialog &&
                formatMessage(t("portfolio.sellDialogBody"), {
                  ticker: sellDialog.holding.ticker,
                  name: sellDialog.holding.name,
                  currency: sellDialog.holding.currency,
                })}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label htmlFor="sell-qty">{t("portfolio.soldUnits")}</Label>
              <Input
                id="sell-qty"
                type="number"
                min={0}
                step="any"
                max={sellDialog?.holding.quantity}
                className={cn(
                  "mt-1.5",
                  sellDialog?.mode === "full" && "bg-muted"
                )}
                readOnly={sellDialog?.mode === "full"}
                value={sellQty}
                onChange={(e) => setSellQty(e.target.value)}
                placeholder={t("portfolio.soldPlaceholder")}
              />
              {sellDialog && sellDialog.mode === "partial" && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatMessage(t("portfolio.maxUnits"), {
                    n: sellDialog.holding.quantity,
                  })}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="sell-price">{t("portfolio.sellPriceLabel")}</Label>
              <Input
                id="sell-price"
                type="number"
                min={0}
                step="any"
                className="mt-1.5"
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                placeholder="0.00"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {t("portfolio.sellPriceHint")}
              </p>
            </div>
            {sellDialog &&
              (() => {
                const q = parseFloat(sellQty.replace(",", "."));
                const p = parseFloat(sellPrice.replace(",", "."));
                const prev =
                  Number.isFinite(q) &&
                  Number.isFinite(p) &&
                  q > 0 &&
                  p > 0
                    ? q * p
                    : 0;
                return prev > 0 ? (
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                    {t("portfolio.cashProceeds")}{" "}
                    {formatHoldingMoney(prev, sellDialog.holding.currency, locale)}
                  </p>
                ) : null;
              })()}
            {sellError && (
              <p className="text-sm text-red-600" role="alert">
                {sellError}
              </p>
            )}
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              type="button"
              onClick={() => setSellDialog(null)}
            >
              {t("portfolio.cancel")}
            </Button>
            <Button
              type="button"
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={isPending}
              onClick={executeSell}
            >
              {isPending ? t("portfolio.confirming") : t("portfolio.confirmSale")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

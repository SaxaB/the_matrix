"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ASSET_CLASS_COLORS, RISK_PROFILES } from "@/lib/constants";
import { getLocalizedQuestionnaire } from "@/lib/i18n/questionnaire-locale";
import { useI18n } from "@/lib/i18n/context";
import { formatMessage } from "@/lib/i18n/messages";
import { getInvestorProfileAiReport, getRiskProfile } from "@/lib/actions";
import { InvestorReportMarkdown } from "@/components/questionnaire/investor-report-markdown";
import { downloadInvestorReportMarkdown } from "@/lib/investor-report-download";
import type { RiskLevel } from "@/lib/types";
import { ClipboardList, FileDown, Gauge, Sparkles } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart as RechartsPie,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function riskZoneColor(level: RiskLevel): string {
  if (level === "conservative") return "text-emerald-600";
  if (level === "moderate") return "text-blue-600";
  return "text-orange-600";
}

function riskZoneBg(level: RiskLevel): string {
  if (level === "conservative")
    return "bg-emerald-100 dark:bg-emerald-950/50";
  if (level === "moderate") return "bg-blue-100 dark:bg-blue-950/50";
  return "bg-orange-100 dark:bg-orange-950/50";
}

export default function PerfilPage() {
  const { t, locale } = useI18n();
  const [riskLevel, setRiskLevel] = useState<RiskLevel>("moderate");
  const [riskScore, setRiskScore] = useState(50);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [aiReportAt, setAiReportAt] = useState<string | null>(null);
  const [aiReportLoading, setAiReportLoading] = useState(true);
  const [, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      try {
        const p = await getRiskProfile();
        if (p) {
          setRiskLevel(p.risk_level);
          setRiskScore(p.risk_score);
          setAnswers({ ...p.questionnaire_answers });
        }
      } finally {
        setLoading(false);
      }
    });
  }, []);

  useEffect(() => {
    if (loading) return;
    startTransition(async () => {
      try {
        const r = await getInvestorProfileAiReport();
        setAiReport(r.report);
        setAiReportAt(r.generatedAt);
      } finally {
        setAiReportLoading(false);
      }
    });
  }, [loading]);

  const profile = RISK_PROFILES[riskLevel];
  const profileLabel = t(`riskProfiles.${riskLevel}.label`);
  const profileDesc = t(`riskProfiles.${riskLevel}.description`);

  const questionScores = useMemo(() => {
    const qq = getLocalizedQuestionnaire(locale);
    return qq.map((q, i) => ({
      label: `P${i + 1}`,
      category: q.category,
      pregunta: q.text,
      score: answers[q.id] ?? 0,
    }));
  }, [answers, locale]);

  const allocationPie = useMemo(
    () =>
      Object.entries(profile.idealAllocation).map(([key, value]) => ({
        name: t(`assetClasses.${key}`),
        value,
        color: ASSET_CLASS_COLORS[key] ?? "#888",
      })),
    [profile.idealAllocation, t]
  );

  const markerPct = Math.min(100, Math.max(0, riskScore));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("perfil.title")}</h1>
          <p className="mt-1 text-muted-foreground">{t("perfil.sub")}</p>
        </div>
        <Link
          href="/perfil/encuesta"
          className={buttonVariants({
            size: "sm",
            className: "shrink-0 gap-2 bg-emerald-600 hover:bg-emerald-700",
          })}
        >
          <ClipboardList className="h-4 w-4" />
          {t("perfil.editSurvey")}
        </Link>
      </div>

      {loading ? (
        <div className="space-y-6">
          <Card>
            <CardContent className="p-8">
              <div className="h-32 animate-pulse rounded-lg bg-muted" />
            </CardContent>
          </Card>
          <Card className="border-violet-200/40 dark:border-violet-900/30">
            <CardContent className="p-6">
              <div className="h-6 w-48 animate-pulse rounded bg-muted" />
              <div className="mt-4 h-40 animate-pulse rounded-lg bg-muted" />
            </CardContent>
          </Card>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardContent className="p-6">
                <div className="h-64 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="h-64 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardContent className="p-6">
              <div className="h-20 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          <Card className="mb-8 border-emerald-200/50 dark:border-emerald-900/40">
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${riskZoneBg(riskLevel)}`}
                  >
                    <Gauge className={`h-8 w-8 ${riskZoneColor(riskLevel)}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {t("perfil.assigned")}
                    </p>
                    <h2
                      className={`text-2xl font-bold ${riskZoneColor(riskLevel)}`}
                    >
                      {profileLabel}
                    </h2>
                    <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                      {profileDesc}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="secondary">
                        {formatMessage(t("perfil.scoreBadge"), {
                          score: Math.round(riskScore),
                        })}
                      </Badge>
                      <Badge variant="outline">
                        {formatMessage(t("perfil.volBadge"), {
                          v: profile.maxVolatility,
                        })}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <p className="mb-3 text-sm font-medium text-muted-foreground">
                  {t("perfil.scaleLabel")}
                </p>
                <div className="relative h-12 overflow-hidden rounded-lg border bg-muted/40">
                  <div className="absolute inset-0 flex">
                    <div
                      className="h-full bg-emerald-500/25"
                      style={{ width: "33%" }}
                      title={t("riskProfiles.conservative.label")}
                    />
                    <div
                      className="h-full bg-blue-500/25"
                      style={{ width: "34%" }}
                      title={t("riskProfiles.moderate.label")}
                    />
                    <div
                      className="h-full bg-orange-500/25"
                      style={{ width: "33%" }}
                      title={t("riskProfiles.aggressive.label")}
                    />
                  </div>
                  <div
                    className="absolute top-1/2 h-0 w-0 -translate-x-1/2 -translate-y-1/2 border-l-[10px] border-r-[10px] border-t-[14px] border-l-transparent border-r-transparent border-t-foreground shadow-sm"
                    style={{ left: `${markerPct}%` }}
                    aria-hidden
                  />
                </div>
                <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                  <span>
                    {formatMessage(t("perfil.zone1"), {
                      label: t("riskProfiles.conservative.label"),
                    })}
                  </span>
                  <span>
                    {formatMessage(t("perfil.zone2"), {
                      label: t("riskProfiles.moderate.label"),
                    })}
                  </span>
                  <span>
                    {formatMessage(t("perfil.zone3"), {
                      label: t("riskProfiles.aggressive.label"),
                    })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6 border-violet-200/60 dark:border-violet-900/40">
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="flex items-center gap-2 text-lg font-semibold">
                    <Sparkles className="h-5 w-5 shrink-0 text-violet-600" />
                    {t("perfil.aiTitle")}
                  </h3>
                  <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                    {t("perfil.aiSub")}
                  </p>
                </div>
                {aiReport && !aiReportLoading && (
                  <button
                    type="button"
                    className={buttonVariants({
                      size: "sm",
                      className:
                        "shrink-0 gap-2 bg-emerald-600 hover:bg-emerald-700",
                    })}
                    onClick={() =>
                      downloadInvestorReportMarkdown(aiReport, {
                        generatedAt: aiReportAt,
                      })
                    }
                  >
                    <FileDown className="h-4 w-4" />
                    {t("perfil.downloadMd")}
                  </button>
                )}
              </div>

              {aiReportAt && (
                <p className="mt-3 text-xs text-muted-foreground">
                  {t("perfil.generatedAt")}{" "}
                  {new Date(aiReportAt).toLocaleString(
                    locale === "en" ? "en-US" : "es-ES",
                    {
                      dateStyle: "short",
                      timeStyle: "short",
                    }
                  )}
                </p>
              )}

              {aiReportLoading ? (
                <div className="mt-4 h-32 animate-pulse rounded-lg bg-muted" />
              ) : aiReport ? (
                <div className="mt-4">
                  <InvestorReportMarkdown markdown={aiReport} />
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">
                  {t("perfil.aiEmptyDetail")}
                </p>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold">
                  {t("perfil.dimChartTitle")}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("perfil.dimChartSub")}
                </p>
                <div className="mt-4 h-[min(560px,65vh)] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={questionScores}
                      margin={{ left: 8, right: 16, top: 8, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <YAxis
                        type="category"
                        dataKey="label"
                        width={36}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const row = payload[0].payload as {
                            pregunta: string;
                            score: number;
                            category: string;
                          };
                          return (
                            <div className="max-w-xs rounded-md border bg-background/95 p-3 text-xs shadow-md backdrop-blur">
                              <p className="font-medium text-foreground">
                                {row.category}
                              </p>
                              <p className="mt-1 text-muted-foreground">
                                {row.pregunta}
                              </p>
                              <p className="mt-2 font-semibold tabular-nums">
                                {formatMessage(t("perfil.tooltipScore"), {
                                  score: row.score,
                                })}
                              </p>
                            </div>
                          );
                        }}
                      />
                      <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                        {questionScores.map((_, i) => (
                          <Cell
                            key={i}
                            fill={
                              i % 3 === 0
                                ? "#10b981"
                                : i % 3 === 1
                                  ? "#3b82f6"
                                  : "#f97316"
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold">{t("perfil.idealCardTitle")}</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatMessage(t("perfil.idealPieSub"), { label: profileLabel })}
                </p>
                <div className="mt-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={allocationPie}
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={88}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {allocationPie.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value}%`, ""]} />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
                <ul className="mt-4 space-y-2 text-sm">
                  {allocationPie.map((item) => (
                    <li
                      key={item.name}
                      className="flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        {item.name}
                      </span>
                      <span className="font-medium tabular-nums">{item.value}%</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold">{t("perfil.expectedReturnTitle")}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("perfil.expectedReturnSub")}
              </p>
              <p className="mt-4 text-2xl font-bold tabular-nums">
                {profile.expectedReturn.min}% – {profile.expectedReturn.max}%{" "}
                <span className="text-base font-normal text-muted-foreground">
                  {t("perfil.annualEstNote")}
                </span>
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

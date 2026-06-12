"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { RISK_PROFILES } from "@/lib/constants";
import { calculateRiskLevel } from "@/lib/portfolio-optimizer";
import { saveRiskProfile } from "@/lib/actions";
import { useI18n } from "@/lib/i18n/context";
import { getLocalizedQuestionnaire } from "@/lib/i18n/questionnaire-locale";
import { formatMessage } from "@/lib/i18n/messages";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Shield,
  BarChart3,
  Flame,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ConfidentialityNotice } from "@/components/questionnaire/confidentiality-notice";

const profileIcons = {
  conservative: Shield,
  moderate: BarChart3,
  aggressive: Flame,
};

const profileColors = {
  conservative: "from-emerald-500 to-green-500",
  moderate: "from-blue-500 to-indigo-500",
  aggressive: "from-orange-500 to-red-500",
};

export default function OnboardingPage() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const questionnaire = useMemo(
    () => getLocalizedQuestionnaire(locale),
    [locale]
  );
  async function signOut() {
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const [introAccepted, setIntroAccepted] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [showResult, setShowResult] = useState(false);

  const totalSteps = questionnaire.length;
  const current = questionnaire[step];
  const progress = introAccepted
    ? ((step + (showResult ? 1 : 0)) / totalSteps) * 100
    : 0;

  function selectOption(questionId: string, score: number) {
    setAnswers((prev) => ({ ...prev, [questionId]: score }));
    if (step < totalSteps - 1) {
      setTimeout(() => setStep((s) => s + 1), 300);
    } else {
      setTimeout(() => setShowResult(true), 300);
    }
  }

  const result = showResult ? calculateRiskLevel(Object.values(answers)) : null;
  const profile = result ? RISK_PROFILES[result.level] : null;
  const savedRef = useRef(false);

  useEffect(() => {
    if (result && !savedRef.current) {
      savedRef.current = true;
      saveRiskProfile(result.level, result.score, answers, {
        regenerateAiReport: true,
        locale,
      }).catch(() => {});
    }
  }, [result, answers, locale]);

  if (showResult && result && profile) {
    const Icon = profileIcons[result.level];
    const profileLabel = t(`riskProfiles.${result.level}.label`);
    const profileDesc = t(`riskProfiles.${result.level}.description`);
    return (
      <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          <div className="mb-8 text-center">
            <div
              className={cn(
                "mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg",
                profileColors[result.level]
              )}
            >
              <Icon className="h-10 w-10" />
            </div>
            <h1 className="text-3xl font-bold">{t("onboarding.resultTitle")}</h1>
            <p className="mt-2 text-muted-foreground">
              {t("onboarding.resultSub")}
            </p>
          </div>

          <Card className="overflow-hidden">
            <div
              className={cn(
                "bg-gradient-to-r p-6 text-white",
                profileColors[result.level]
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium opacity-80">
                    {t("onboarding.profileLabel")}
                  </div>
                  <div className="text-2xl font-bold">{profileLabel}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium opacity-80">
                    {t("onboarding.scoreLabel")}
                  </div>
                  <div className="text-2xl font-bold">
                    {Math.round(result.score)}
                    <span className="text-base">/100</span>
                  </div>
                </div>
              </div>
            </div>
            <CardContent className="p-6">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {profileDesc}
              </p>

              <div className="mt-6 space-y-3">
                <h3 className="text-sm font-semibold">
                  {t("onboarding.idealTitle")}
                </h3>
                {Object.entries(profile.idealAllocation).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-3">
                    <div className="w-24 text-sm capitalize text-muted-foreground">
                      {t(`assetClasses.${key}`)}
                    </div>
                    <div className="flex-1">
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full rounded-full bg-gradient-to-r",
                            profileColors[result.level]
                          )}
                          style={{ width: `${value}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-12 text-right text-sm font-medium">
                      {value}%
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-muted/50 p-3">
                  <div className="text-xs text-muted-foreground">
                    {t("onboarding.expectedReturn")}
                  </div>
                  <div className="text-lg font-semibold">
                    {profile.expectedReturn.min}% - {profile.expectedReturn.max}%
                  </div>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <div className="text-xs text-muted-foreground">
                    {t("onboarding.maxVol")}
                  </div>
                  <div className="text-lg font-semibold">
                    {profile.maxVolatility}%
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => router.push("/portfolio")}
                >
                  {t("onboarding.ctaPortfolio")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => router.push("/dashboard")}
                >
                  {t("onboarding.ctaDashboard")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!introAccepted) {
    return (
      <div className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 py-12">
        <div className="absolute right-4 top-4 sm:right-8 sm:top-8">
          <LanguageSwitcher />
        </div>
        <div className="w-full max-w-xl">
          <div className="mb-8 text-center">
            <div className="mb-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                {t("onboarding.backHome")}
              </Link>
              <span className="hidden text-muted-foreground sm:inline">·</span>
              <button
                type="button"
                onClick={() => void signOut()}
                className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                {t("onboarding.signOut")}
              </button>
            </div>
            <div className="mb-4 flex items-center justify-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
                <TrendingUp className="h-5 w-5" />
              </div>
              <span className="text-xl font-bold">Matrix</span>
            </div>
            <h1 className="text-2xl font-bold">{t("onboarding.riskTitle")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("onboarding.introSub")}
            </p>
          </div>
          <ConfidentialityNotice />
          <Button
            className="mt-8 w-full bg-emerald-600 hover:bg-emerald-700 sm:mx-auto sm:block sm:w-auto sm:min-w-[280px]"
            onClick={() => setIntroAccepted(true)}
          >
            {t("onboarding.understoodContinue")}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 py-12">
      <div className="absolute right-4 top-4 sm:right-8 sm:top-8">
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("onboarding.backHome")}
            </Link>
            <span className="hidden text-muted-foreground sm:inline">·</span>
            <button
              type="button"
              onClick={() => void signOut()}
              className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {t("onboarding.signOut")}
            </button>
          </div>
          <div className="mb-4 flex items-center justify-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <TrendingUp className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold">Matrix</span>
          </div>
          <h1 className="text-2xl font-bold">{t("onboarding.riskTitle")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatMessage(t("onboarding.questionProgress"), {
              current: step + 1,
              total: totalSteps,
            })}
          </p>
        </div>

        <Progress value={progress} className="mb-8 h-2" />

        {/* Question Card */}
        <Card>
          <CardContent className="p-6 sm:p-8">
            <div className="mb-2 text-xs font-medium uppercase tracking-wider text-emerald-600">
              {current.category}
            </div>
            <h2 className="text-xl font-semibold leading-snug">
              {current.text}
            </h2>
            {current.description && (
              <p className="mt-2 text-sm text-muted-foreground">
                {current.description}
              </p>
            )}

            <div className="mt-6 space-y-3">
              {current.options.map((opt) => {
                const isSelected = answers[current.id] === opt.score;
                return (
                  <button
                    key={opt.id}
                    onClick={() => selectOption(current.id, opt.score)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border p-4 text-left text-sm transition-all hover:border-emerald-300 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30",
                      isSelected
                        ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500 dark:bg-emerald-950/40"
                        : "border-border"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                        isSelected
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-muted-foreground/30"
                      )}
                    >
                      {isSelected && <CheckCircle2 className="h-4 w-4" />}
                    </div>
                    <span className={isSelected ? "font-medium" : ""}>
                      {opt.text}
                    </span>
                  </button>
                );
              })}
            </div>

            {step > 0 && (
              <Button
                variant="ghost"
                className="mt-6"
                onClick={() => setStep((s) => s - 1)}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("onboarding.previous")}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

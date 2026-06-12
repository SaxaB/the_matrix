"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { calculateRiskLevel } from "@/lib/portfolio-optimizer";
import { getRiskProfile, saveRiskProfile } from "@/lib/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfidentialityNotice } from "@/components/questionnaire/confidentiality-notice";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/context";
import { getLocalizedQuestionnaire } from "@/lib/i18n/questionnaire-locale";
import { formatMessage } from "@/lib/i18n/messages";

export default function EditarEncuestaPage() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const questionnaire = useMemo(
    () => getLocalizedQuestionnaire(locale),
    [locale]
  );
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [savedOk, setSavedOk] = useState(false);
  const [saveInfo, setSaveInfo] = useState<string | null>(null);
  const [saveInfoTone, setSaveInfoTone] = useState<"muted" | "warn" | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const profile = await getRiskProfile();
        if (cancelled) return;
        if (!profile) {
          router.replace("/onboarding");
          return;
        }
        setAnswers({ ...profile.questionnaire_answers });
      } catch {
        setError(t("encuesta.loadError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, t]);

  function setAnswer(questionId: string, score: number) {
    setAnswers((prev) => ({ ...prev, [questionId]: score }));
    setSavedOk(false);
  }

  function handleSave() {
    const missing = questionnaire.filter((q) => answers[q.id] === undefined);
    if (missing.length > 0) {
      setError(
        formatMessage(t("encuesta.missingQuestions"), { n: missing.length })
      );
      return;
    }
    setError(null);
    setSaveInfo(null);
    setSaveInfoTone(null);
    startTransition(async () => {
      const scores = questionnaire.map((q) => answers[q.id]!);
      const result = calculateRiskLevel(scores);
      const res = await saveRiskProfile(result.level, result.score, answers, {
        regenerateAiReport: true,
        questionnaireEdit: true,
        locale,
      });
      if ("error" in res) {
        if (
          res.error === "questionnaire_edit_locked" &&
          "nextEditAllowedAfter" in res
        ) {
          const d = new Date(res.nextEditAllowedAfter);
          const dateStr = d.toLocaleString(locale === "en" ? "en-US" : "es-ES", {
            dateStyle: "medium",
            timeStyle: "short",
          });
          setError(
            `${t("encuesta.lockedTitle")}. ${formatMessage(t("encuesta.lockedBody"), { date: dateStr })}`
          );
        } else {
          setError(res.error ?? t("encuesta.saveError"));
        }
        return;
      }
      setSavedOk(true);
      if (res.aiReportRegenerated) {
        setSaveInfo(t("encuesta.aiRegenOk"));
        setSaveInfoTone("muted");
      } else if (res.aiReportError) {
        setSaveInfo(
          formatMessage(t("encuesta.aiRegenFail"), { msg: res.aiReportError })
        );
        setSaveInfoTone("warn");
      } else if (res.aiReportSkippedNoKey) {
        setSaveInfo(t("encuesta.aiNoKey"));
        setSaveInfoTone("warn");
      }
      router.refresh();
    });
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-28 pt-8 sm:px-6 lg:pb-12">
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("encuesta.backDashboard")}
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">
          {t("encuesta.title")}
        </h1>
        <p className="mt-2 text-muted-foreground">{t("encuesta.sub")}</p>
      </div>

      <div className="mb-10">
        <ConfidentialityNotice />
      </div>

      <div className="space-y-10">
        {questionnaire.map((q) => (
          <Card key={q.id} id={q.id}>
            <CardContent className="p-6 sm:p-8">
              <div className="mb-2 text-xs font-medium uppercase tracking-wider text-emerald-600">
                {q.category}
              </div>
              <h2 className="text-lg font-semibold leading-snug sm:text-xl">
                {q.text}
              </h2>
              {q.description && (
                <p className="mt-2 text-sm text-muted-foreground">
                  {q.description}
                </p>
              )}
              <div className="mt-5 space-y-3">
                {q.options.map((opt) => {
                  const isSelected = answers[q.id] === opt.score;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setAnswer(q.id, opt.score)}
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
            </CardContent>
          </Card>
        ))}
      </div>

      {error && (
        <p className="mt-6 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {savedOk && !error && (
        <div className="mt-6 space-y-2 text-sm">
          <p className="text-emerald-600">{t("encuesta.saved")}</p>
          {saveInfo && (
            <p
              className={
                saveInfoTone === "warn"
                  ? "text-amber-700 dark:text-amber-500"
                  : "text-muted-foreground"
              }
            >
              {saveInfo}
            </p>
          )}
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 border-t bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:static lg:mt-10 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
        <div className="mx-auto flex max-w-2xl flex-col gap-3 sm:flex-row sm:justify-end">
          <Link
            href="/dashboard"
            className={buttonVariants({
              variant: "outline",
              className: "lg:w-auto",
            })}
          >
            {t("encuesta.cancel")}
          </Link>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 lg:w-auto"
            onClick={handleSave}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("encuesta.saving")}
              </>
            ) : (
              t("encuesta.save")
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

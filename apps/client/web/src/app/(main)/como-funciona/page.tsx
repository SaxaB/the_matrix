"use client";

import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, PieChart, Search, Sparkles, Shield } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

export default function ComoFuncionaPage() {
  const { t } = useI18n();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-10 space-y-3">
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
          <BookOpen className="h-8 w-8" aria-hidden />
          <span className="text-sm font-semibold uppercase tracking-wide">
            Matrix
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {t("howItWorks.title")}
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          {t("howItWorks.subtitle")}
        </p>
      </header>

      <div className="space-y-6">
        <Card className="border-border/80 shadow-sm">
          <CardContent className="space-y-4 p-6 sm:p-8">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                <PieChart className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0 space-y-3">
                <h2 className="text-xl font-semibold">
                  {t("howItWorks.profileTitle")}
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {t("howItWorks.profileLead")}
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  {t("howItWorks.profileP2")}
                </p>
                <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground leading-relaxed">
                  <li>{t("howItWorks.profileBullet1")}</li>
                  <li>{t("howItWorks.profileBullet2")}</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardContent className="space-y-4 p-6 sm:p-8">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                <Search className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0 space-y-3">
                <h2 className="text-xl font-semibold">
                  {t("howItWorks.stocksTitle")}
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {t("howItWorks.stocksLead")}
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  {t("howItWorks.stocksP2")}
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed border-l-2 border-blue-500/40 pl-4">
                  {t("howItWorks.stocksBullet1")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardContent className="space-y-4 p-6 sm:p-8">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                <Sparkles className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0 space-y-3">
                <h2 className="text-xl font-semibold">
                  {t("howItWorks.recoTitle")}
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {t("howItWorks.recoLead")}
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  {t("howItWorks.recoP2")}
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed border-l-2 border-violet-500/40 pl-4">
                  {t("howItWorks.recoBullet1")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-muted/20 shadow-sm">
          <CardContent className="space-y-3 p-6 sm:p-8">
            <div className="flex items-start gap-3">
              <Shield className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="space-y-2">
                <h2 className="text-lg font-semibold">
                  {t("howItWorks.transparencyTitle")}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t("howItWorks.transparencyP")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground leading-relaxed">
          {t("howItWorks.disclaimer")}
        </p>
      </div>
    </div>
  );
}

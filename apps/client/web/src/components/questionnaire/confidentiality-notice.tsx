"use client";

import { Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n/context";

/**
 * Notice shown at the start of the risk questionnaire (onboarding and edit flow).
 */
export function ConfidentialityNotice() {
  const { t } = useI18n();
  return (
    <Card className="border-emerald-200/70 bg-emerald-50/40 dark:border-emerald-900/50 dark:bg-emerald-950/25">
      <CardContent className="p-4 sm:p-5">
        <div className="flex gap-3 sm:gap-4">
          <Shield
            className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600"
            aria-hidden
          />
          <div className="space-y-3 text-xs leading-relaxed text-muted-foreground sm:text-sm">
            <p className="font-semibold text-foreground">
              {t("confidentiality.title")}
            </p>
            <p>
              {t("confidentiality.p1a")}{" "}
              <strong className="font-medium text-foreground">
                {t("confidentiality.p1b")}
              </strong>
              {t("confidentiality.p1c")}
            </p>
            <p>{t("confidentiality.p2")}</p>
            <p>
              {t("confidentiality.p3a")}{" "}
              <strong className="font-medium text-foreground">
                {t("confidentiality.p3b")}
              </strong>
              {t("confidentiality.p3c")}
            </p>
            <p className="text-[11px] sm:text-xs">{t("confidentiality.p4")}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

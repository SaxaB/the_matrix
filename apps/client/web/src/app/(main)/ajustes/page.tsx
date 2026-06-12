"use client";

import { useI18n } from "@/lib/i18n/context";

export default function AjustesPage() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">{t("ajustes.title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("ajustes.sub")}</p>
    </div>
  );
}

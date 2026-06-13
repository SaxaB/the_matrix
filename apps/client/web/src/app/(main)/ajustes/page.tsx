"use client";

import { useI18n } from "@/lib/i18n/context";
import { ThemeSwitcher } from "@/components/shared/theme-switcher";

export default function AjustesPage() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl font-bold tracking-tight text-glow">
        {t("ajustes.title")}
      </h1>
      <p className="mt-2 text-muted-foreground">{t("ajustes.sub")}</p>

      <section className="mt-10">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Apariencia
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Elige el tema de la interfaz. Se guarda en este dispositivo.
        </p>
        <ThemeSwitcher variant="grid" />
      </section>
    </div>
  );
}

"use client";

import { Languages } from "lucide-react";
import type { AppLocale } from "@/lib/i18n/config";
import { SUPPORTED_LOCALES } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({
  align = "end",
  triggerClassName,
}: {
  align?: "start" | "end";
  triggerClassName?: string;
}) {
  const { locale, setLocale, t } = useI18n();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        type="button"
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          triggerClassName
        )}
        title={t("language.label")}
        aria-label={t("language.label")}
      >
        <Languages className="h-5 w-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-44">
        <DropdownMenuRadioGroup
          value={locale}
          onValueChange={(v) => {
            if (SUPPORTED_LOCALES.includes(v as AppLocale)) {
              void setLocale(v as AppLocale);
            }
          }}
        >
          {SUPPORTED_LOCALES.map((loc) => (
            <DropdownMenuRadioItem key={loc} value={loc}>
              {t(`language.${loc}`)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

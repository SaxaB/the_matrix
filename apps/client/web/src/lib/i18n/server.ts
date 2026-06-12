import { cookies } from "next/headers";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  SUPPORTED_LOCALES,
  type AppLocale,
} from "@/lib/i18n/config";

export function parseLocale(value: string | undefined | null): AppLocale {
  if (value === "en" || value === "es") return value;
  return DEFAULT_LOCALE;
}

export async function getLocale(): Promise<AppLocale> {
  const jar = await cookies();
  const raw = jar.get(LOCALE_COOKIE)?.value;
  return parseLocale(raw);
}

export function isAppLocale(v: string): v is AppLocale {
  return (SUPPORTED_LOCALES as string[]).includes(v);
}

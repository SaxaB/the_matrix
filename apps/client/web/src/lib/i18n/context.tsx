"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { AppLocale } from "@/lib/i18n/config";
import { messageAtPath } from "@/lib/i18n/t-path";
import { setUserLocale } from "@/lib/i18n/locale-actions";
import { getUiMessages } from "@/lib/i18n/messages";

type I18nContextValue = {
  locale: AppLocale;
  setLocale: (next: AppLocale) => Promise<void>;
  t: (path: string) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale: AppLocale;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<AppLocale>(initialLocale);

  useEffect(() => {
    setLocaleState(initialLocale);
  }, [initialLocale]);

  const messages = useMemo(() => getUiMessages(locale), [locale]);

  const t = useCallback(
    (path: string) => messageAtPath(messages as Record<string, unknown>, path),
    [messages]
  );

  const setLocale = useCallback(async (next: AppLocale) => {
    await setUserLocale(next);
    setLocaleState(next);
    router.refresh();
  }, [router]);

  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return ctx;
}

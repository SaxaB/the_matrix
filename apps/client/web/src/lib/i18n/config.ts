export type AppLocale = "es" | "en";

export const DEFAULT_LOCALE: AppLocale = "es";

export const SUPPORTED_LOCALES: AppLocale[] = ["es", "en"];

export const LOCALE_COOKIE = "matrix_locale";

export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

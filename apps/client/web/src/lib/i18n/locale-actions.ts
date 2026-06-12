"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE } from "@/lib/i18n/config";
import { isAppLocale } from "@/lib/i18n/server";

export async function setUserLocale(locale: string): Promise<{ ok: boolean }> {
  if (!isAppLocale(locale)) return { ok: false };
  const jar = await cookies();
  jar.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

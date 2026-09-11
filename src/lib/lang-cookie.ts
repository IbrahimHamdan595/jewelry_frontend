/**
 * The UI language lives in a cookie so the SERVER can render the right
 * language and direction on the first paint (NEX-63). localStorage alone
 * forced every Arabic load to start in English LTR and flip after mount.
 * Not sensitive: readable by scripts on purpose, one year, SameSite=Lax.
 */
import type { Lang } from "@/context/LanguageContext";

export const LANG_COOKIE = "mz_lang";
const ONE_YEAR = 60 * 60 * 24 * 365;

export function parseLang(value: string | undefined | null): Lang {
  return value === "ar" ? "ar" : "en";
}

export function dirFor(lang: Lang): "rtl" | "ltr" {
  return lang === "ar" ? "rtl" : "ltr";
}

/** Intl locale for dates. Arabic month names with Western digits — the Lebanese convention. */
export function localeFor(lang: Lang): string {
  return lang === "ar" ? "ar-LB-u-nu-latn" : "en-GB";
}

export function writeLangCookie(lang: Lang) {
  if (typeof document === "undefined") return;
  const secure = typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=${ONE_YEAR}; SameSite=Lax${secure}`;
}

export function readLangCookie(): Lang | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${LANG_COOKIE}=(\\w+)`));
  return m ? parseLang(m[1]) : null;
}

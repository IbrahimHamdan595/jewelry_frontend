"use client";
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import en from "@/i18n/en";
import ar from "@/i18n/ar";
import type { Translations } from "@/i18n/en";
import { dirFor, localeFor, readLangCookie, writeLangCookie } from "@/lib/lang-cookie";

export type Lang = "en" | "ar";

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Translations;
  isRTL: boolean;
  /** Intl locale for dates: "ar-LB-u-nu-latn" or "en-GB". */
  locale: string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "en",
  setLang: () => {},
  t: en,
  isRTL: false,
  locale: localeFor("en"),
});

/**
 * `initialLang` comes from the root layout, which reads the language cookie
 * on the server — so the first paint is already in the saved language and
 * direction, and hydration sees the same value on both sides. Switching is
 * instant (state) and persisted (cookie) for the next request.
 */
export function LanguageProvider({ children, initialLang = "en" }: { children: ReactNode; initialLang?: Lang }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  const setLang = useCallback((newLang: Lang) => {
    setLangState(newLang);
    writeLangCookie(newLang);
    try {
      localStorage.setItem("lang", newLang);
    } catch {
      // storage unavailable — the cookie still carries the choice
    }
  }, []);

  // One-time migration for users who chose a language before the cookie
  // existed: adopt localStorage only when no cookie has been written yet.
  useEffect(() => {
    if (readLangCookie() !== null) return;
    let saved: string | null = null;
    try {
      saved = localStorage.getItem("lang");
    } catch {
      return;
    }
    if ((saved === "ar" || saved === "en") && saved !== initialLang) setLang(saved);
  }, [initialLang, setLang]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dirFor(lang);
  }, [lang]);

  const t = lang === "ar" ? ar : en;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, isRTL: lang === "ar", locale: localeFor(lang) }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  return useContext(LanguageContext);
}

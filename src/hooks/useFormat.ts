"use client";
import { useMemo } from "react";
import { useLang } from "@/context/LanguageContext";
import { formatDate, formatDateTime, formatShortDate } from "@/lib/utils";

/**
 * Date formatters bound to the current UI language: Arabic month and day
 * names in Arabic mode (Western digits), English otherwise. Money is not
 * localised on purpose — "$1,234.56" with Western digits is what the shop
 * prints in either language.
 */
export function useFormat() {
  const { locale } = useLang();
  return useMemo(
    () => ({
      formatDate: (d: string | Date) => formatDate(d, locale),
      formatDateTime: (d: string | Date) => formatDateTime(d, locale),
      formatShortDate: (d: string | Date) => formatShortDate(d, locale),
    }),
    [locale],
  );
}

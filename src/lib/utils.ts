import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const KARAT_PURITY: Record<string, number> = {
  K18: 0.750,
  K21: 0.875,
  K24: 0.999,
};

export const KARAT_LABEL: Record<string, string> = {
  K18: "18K",
  K21: "21K",
  K24: "24K",
};

export function calculatePrice(params: {
  rate24k: number;
  karat: string;
  weightGrams: number;
  marginPercent: number;
  makingCharge: number;
  karatMarkup?: number;
  stoneValue?: number;
}) {
  const purity = KARAT_PURITY[params.karat] ?? 0.999;
  const purityRate = params.rate24k * purity;
  const effectiveRate = purityRate + (params.karatMarkup ?? 0);
  const metalValue = effectiveRate * params.weightGrams;
  const marginAmount = metalValue * (params.marginPercent / 100);
  const withMargin = metalValue + marginAmount;
  const finalPrice = withMargin + params.makingCharge + (params.stoneValue ?? 0);
  return {
    purityRate: round(purityRate),
    effectiveRate: round(effectiveRate),
    metalValue: round(metalValue),
    marginAmount: round(marginAmount),
    stoneValue: round(params.stoneValue ?? 0),
    finalPrice: round(finalPrice),
  };
}

function round(n: number, places = 2) {
  return Math.round(n * 10 ** places) / 10 ** places;
}

export function formatUSD(n: number | string) {
  return `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

export function formatLBP(n: number | string) {
  return `ل.ل ${Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

// ── Dates ─────────────────────────────────────────────────────────────────────
// The shop runs on Beirut time, and every date here is pinned to it (NEX-62).
// A calendar day computed from the process's local clock differs between the
// server (UTC on Vercel) and the cashier's browser for three hours a night,
// and React throws the server HTML away when the two disagree. Pinning the
// IANA zone (DST included) makes both sides compute the same day from the
// same instant, and shows Beirut dates to a viewer in any timezone.
export const SHOP_TIME_ZONE = "Asia/Beirut";

/** YYYY-MM-DD of an instant, on the Beirut calendar. */
function beirutDay(d: Date): { y: string; m: string; day: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SHOP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return { y: get("year"), m: get("month"), day: get("day") };
}

// Defaults for report ranges and date inputs; safe in useState initialisers
// because server and client agree on the Beirut day.
export function today() {
  const { y, m, day } = beirutDay(new Date());
  return `${y}-${m}-${day}`;
}

export function firstOfMonth() {
  const { y, m } = beirutDay(new Date());
  return `${y}-${m}-01`;
}

export function firstOfYear() {
  return `${beirutDay(new Date()).y}-01-01`;
}

// `locale` is the UI language's Intl locale (see lang-cookie.localeFor);
// components get it pre-bound from useFormat(). The default keeps English for
// non-React callers.
const DEFAULT_LOCALE = "en-GB";

export function formatDate(d: string | Date, locale: string = DEFAULT_LOCALE) {
  return new Date(d).toLocaleDateString(locale, { timeZone: SHOP_TIME_ZONE, day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(d: string | Date, locale: string = DEFAULT_LOCALE) {
  return new Date(d).toLocaleString(locale, {
    timeZone: SHOP_TIME_ZONE,
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

/** "Wed 09 Sep" — the POS header date. Render it client-only (TodayInBeirut). */
export function formatShortDate(d: string | Date, locale: string = DEFAULT_LOCALE) {
  return new Date(d).toLocaleDateString(locale, { timeZone: SHOP_TIME_ZONE, weekday: "short", day: "2-digit", month: "short" });
}

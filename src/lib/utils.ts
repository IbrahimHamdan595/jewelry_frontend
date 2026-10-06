import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Money } from "@/types/api";

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

/** What a money cell shows when there is no finite number to show. */
export const MISSING_AMOUNT = "—";

/**
 * The one conversion at the API boundary (NEX-54). The backend sends money as
 * exact decimal strings ("1234.56") and used to send JSON numbers; both read
 * as the same number here. Anything else — missing, empty, unparseable — is
 * `null`, never NaN and never 0: showing "$NaN" or a fake "$0.00" hides a bug
 * upstream, and pricing something at 0 gives it away.
 *
 * Use it once, where a value enters arithmetic or long-lived state (the cart,
 * a chart series). For display, the formatters below already go through it.
 */
export function toFiniteNumber(n: unknown): number | null {
  if (typeof n === "number") return Number.isFinite(n) ? n : null;
  if (typeof n === "string" && n.trim() !== "") {
    const v = Number(n);
    return Number.isFinite(v) ? v : null;
  }
  return null;
}

/**
 * Money, always two decimals (NEX-56: a minimum with no maximum let
 * $20,572.483 through). Intl rounds half away from zero (roundingMode
 * "halfExpand"), which matches the receipts.
 */
export function formatUSD(n: Money | null | undefined) {
  const v = toFiniteNumber(n);
  if (v === null) return MISSING_AMOUNT;
  return signed(v, Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
}

/**
 * "$" in front of a formatted magnitude, and the sign in front of that:
 * "-$5.00", not "$-5.00". An amount that rounds to zero has no sign — there is
 * no "-$0.00".
 */
function signed(value: number, magnitude: string) {
  const isZero = /^[0.,]*$/.test(magnitude);
  return `${value < 0 && !isZero ? "-" : ""}$${magnitude}`;
}

/** Lira has no useful sub-unit: whole numbers only. */
export function formatLBP(n: Money | null | undefined) {
  const v = toFiniteNumber(n);
  if (v === null) return MISSING_AMOUNT;
  return `ل.ل ${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

/**
 * A bare figure at a fixed number of decimals, no currency sign and no
 * thousands separators — "141.66". What `n.toFixed(places)` printed, for a
 * value that may arrive as a string and may be missing.
 */
export function formatDecimal(n: Money | null | undefined, places = 2) {
  const v = toFiniteNumber(n);
  return v === null ? MISSING_AMOUNT : v.toFixed(places);
}

/** A per-gram gold rate: "$141.66". Ungrouped, as the rate cards always showed it. */
export function formatRate(n: Money | null | undefined) {
  const v = toFiniteNumber(n);
  return v === null ? MISSING_AMOUNT : signed(v, Math.abs(v).toFixed(2));
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

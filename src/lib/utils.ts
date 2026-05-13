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
}) {
  const purity = KARAT_PURITY[params.karat] ?? 0.999;
  const purityRate = params.rate24k * purity;
  const effectiveRate = purityRate + (params.karatMarkup ?? 0);
  const metalValue = effectiveRate * params.weightGrams;
  const marginAmount = metalValue * (params.marginPercent / 100);
  const withMargin = metalValue + marginAmount;
  const finalPrice = withMargin + params.makingCharge;
  return {
    purityRate: round(purityRate),
    effectiveRate: round(effectiveRate),
    metalValue: round(metalValue),
    marginAmount: round(marginAmount),
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

export function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(d: string | Date) {
  return new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

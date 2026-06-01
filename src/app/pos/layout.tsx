"use client";
import { CartProvider } from "@/hooks/useCart";
import useSWR from "swr";
import { apiFetcher } from "@/lib/api-client";
import type { Settings } from "@/types/api";

export default function POSLayout({ children }: { children: React.ReactNode }) {
  const { data: settings } = useSWR<Settings>("/settings", apiFetcher);
  const vatPercent = settings ? Number(settings.vat_percent) : 11;
  const maxDiscountPercent = settings ? Number(settings.max_discount_percent) : 0;

  return (
    <CartProvider vatPercent={vatPercent} maxDiscountPercent={maxDiscountPercent}>
      <div className="bg-pos-bg min-h-screen text-pos-cream">{children}</div>
    </CartProvider>
  );
}

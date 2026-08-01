"use client";
import { CartProvider } from "@/hooks/useCart";
import useSWR from "swr";
import { apiFetcher } from "@/lib/api-client";
import { MarketClosedBanner } from "@/components/shared/MarketClosedBanner";
import type { Settings } from "@/types/api";

export default function POSLayout({ children }: { children: React.ReactNode }) {
  const { data: settings } = useSWR<Settings>("/settings", apiFetcher);
  const vatPercent = settings ? Number(settings.vat_percent) : 11;
  const maxDiscountPercent = settings ? Number(settings.max_discount_percent) : 0;

  return (
    <CartProvider vatPercent={vatPercent} maxDiscountPercent={maxDiscountPercent}>
      {/* Column layout so a page can claim "whatever is left under the banner"
          instead of a hardcoded 100vh — see the flex-1 root of pos/page.tsx. */}
      <div className="bg-pos-bg min-h-screen text-pos-cream flex flex-col">
        {/* Renders nothing while the rate is fresh; empty:hidden then drops the padding too. */}
        <div className="px-4 pt-4 empty:hidden">
          <MarketClosedBanner variant="dark" />
        </div>
        {children}
      </div>
    </CartProvider>
  );
}

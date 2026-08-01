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
      {/*
        Column layout so a page can claim "whatever is left under the banner"
        instead of a hardcoded 100vh — see the flex-1 root of pos/page.tsx.

        h-screen, not min-h-screen: the height has to be DEFINITE, or a flex-1
        page resolves against its own content instead of the viewport and a long
        cart inflates the whole document, pushing the checkout button off-screen.
        overflow-y-auto, not hidden: the confirmation/receipt routes set their own
        min-h-screen and must scroll inside this wrapper rather than be clipped.
        print:*: buyback-receipt calls window.print(), and a 100vh scroll ancestor
        truncates a multi-page receipt on a real shop printer.
      */}
      <div className="bg-pos-bg h-screen overflow-y-auto text-pos-cream flex flex-col print:h-auto print:overflow-visible">
        {/* Renders nothing while the rate is fresh; empty:hidden then drops the padding too. */}
        <div className="px-4 pt-4 empty:hidden shrink-0">
          <MarketClosedBanner variant="dark" />
        </div>
        {children}
      </div>
    </CartProvider>
  );
}

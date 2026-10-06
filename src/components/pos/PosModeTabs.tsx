"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingCart, Recycle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLang } from "@/context/LanguageContext";

export function PosModeTabs() {
  const pathname = usePathname();
  const { t } = useLang();
  // Labels reuse the wording these two modes already have elsewhere: the Sell
  // tab of the orders screen and the buyback page's own heading.
  const tabs = [
    { href: "/pos", label: t.orders.tabSell, icon: ShoppingCart },
    { href: "/pos/buyback", label: t.posBuyback.eyebrow, icon: Recycle },
  ];
  return (
    <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
      {tabs.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/pos" ? pathname === "/pos" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-1.5 px-4 py-1.5 rounded text-xs uppercase tracking-widest transition-colors",
              active
                ? "bg-gold text-black font-semibold"
                : "text-pos-gray hover:text-pos-cream",
            )}
          >
            <Icon className="w-3.5 h-3.5" aria-hidden />
            {label}
          </Link>
        );
      })}
    </div>
  );
}

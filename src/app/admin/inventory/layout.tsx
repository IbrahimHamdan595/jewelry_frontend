"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useLang } from "@/context/LanguageContext";

export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useLang();
  // Each tab's label lives with its own screen's strings.
  const tabs = [
    { href: "/admin/inventory/lots", label: t.lots.tab },
    { href: "/admin/inventory/buybacks", label: t.buybacks.tab },
    { href: "/admin/inventory/alerts", label: t.stockAlerts.tab },
    { href: "/admin/inventory/reconcile", label: t.reconcile.tab },
  ];
  return (
    <div className="space-y-5">
      <div className="border-b border-gray-200">
        <nav className="flex gap-6 -mb-px">
          {tabs.map(({ href, label }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "py-3 text-sm border-b-2 transition-colors",
                  active
                    ? "border-gold text-gold font-medium"
                    : "border-transparent text-gray-500 hover:text-gray-800",
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
      {children}
    </div>
  );
}

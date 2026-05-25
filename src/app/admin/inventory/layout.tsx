"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin/inventory/lots", label: "Pure Gold Lots" },
  { href: "/admin/inventory/coins", label: "Coins" },
  { href: "/admin/inventory/ounces", label: "Ounces" },
  { href: "/admin/inventory/buybacks", label: "Buybacks" },
  { href: "/admin/inventory/alerts", label: "Alerts" },
  { href: "/admin/inventory/reconcile", label: "Reconcile" },
  { href: "/admin/inventory/ledger", label: "Audit Ledger" },
];

export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="space-y-5">
      <div className="border-b border-gray-200">
        <nav className="flex gap-6 -mb-px">
          {TABS.map(({ href, label }) => {
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

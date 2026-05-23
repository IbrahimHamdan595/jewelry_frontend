"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Package, QrCode, ShoppingCart,
  TrendingUp, Settings, LogOut, Gem, Tag, Boxes, Truck, Wallet,
} from "lucide-react";
import { logout, getStoredUser } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { useLang } from "@/context/LanguageContext";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<ReturnType<typeof getStoredUser>>(null);
  const { t } = useLang();

  useEffect(() => { setUser(getStoredUser()); }, []);

  const NAV = [
    { href: "/admin/dashboard", icon: LayoutDashboard, label: t.nav.dashboard },
    { href: "/admin/products", icon: Package, label: t.nav.products },
    { href: "/admin/categories", icon: Tag, label: t.nav.categories },
    { href: "/admin/qr-labels", icon: QrCode, label: t.nav.qrLabels },
    { href: "/admin/orders", icon: ShoppingCart, label: t.nav.orders },
    { href: "/admin/inventory", icon: Boxes, label: t.nav.inventory },
    { href: "/admin/suppliers", icon: Truck, label: t.nav.suppliers },
    { href: "/admin/accounts-payable", icon: Wallet, label: t.nav.accountsPayable },
    { href: "/admin/gold-price", icon: TrendingUp, label: t.nav.goldPrice },
    { href: "/admin/settings", icon: Settings, label: t.nav.settings },
  ];

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <div className="flex h-screen bg-admin-canvas overflow-hidden rtl:flex-row-reverse">
      {/* Sidebar */}
      <aside className="w-60 bg-admin-sidebar flex flex-col shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-white/10 gap-2">
          <Gem className="text-gold w-5 h-5 shrink-0" />
          <span className="font-serif text-gold tracking-widest text-lg">ZAHAB</span>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-0.5">
          {NAV.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-colors",
                pathname.startsWith(href)
                  ? "bg-gold/15 text-gold"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center text-gold text-xs font-bold shrink-0">
              {user?.name?.[0] ?? "A"}
            </div>
            <div className="min-w-0">
              <div className="text-white text-xs font-medium truncate">{user?.name ?? t.nav.admin}</div>
              <div className="text-white/40 text-[10px] truncate">{user?.email}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-white/40 hover:text-white/70 text-xs w-full transition-colors"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            {t.nav.signOut}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-6 shrink-0 gap-4">
          <h1 className="font-semibold text-gray-800 text-sm flex-1">
            {NAV.find((n) => pathname.startsWith(n.href))?.label ?? t.nav.admin}
          </h1>
          <LanguageSwitcher variant="light" />
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

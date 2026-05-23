"use client";
import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Coins, Layers } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useScanner } from "@/hooks/useScanner";
import { ScanPanel } from "@/components/pos/ScanPanel";
import { CheckoutPanel } from "@/components/pos/CheckoutPanel";
import { GoldRateCard } from "@/components/shared/GoldRateCard";
import { PosModeTabs } from "@/components/pos/PosModeTabs";
import { AddUnitDialog } from "@/components/pos/AddUnitDialog";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import { api } from "@/lib/api-client";
import { logout, getStoredUser } from "@/lib/auth";
import { useLang } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";
import type { OrderItemKind, ProductLookup } from "@/types/api";

export default function POSPage() {
  const router = useRouter();
  const { t, isRTL } = useLang();
  const [user, setUser] = useState<ReturnType<typeof getStoredUser>>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setUser(getStoredUser());
    setMounted(true);
  }, []);

  const { items, paymentMethod, addItem, clear } = useCart();
  const [scanError, setScanError] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [addUnit, setAddUnit] = useState<"COIN" | "OUNCE" | null>(null);

  async function handleSignOut() {
    await logout();
    router.push("/login");
  }

  const handleScan = useCallback(
    async (code: string) => {
      setScanError(null);
      try {
        const product = await api.get<ProductLookup>(`/products/lookup/${code}`);
        addItem({
          cartId: `${product.id}-${Date.now()}`,
          kind: "PRODUCT",
          productId: product.id,
          code: product.code,
          nameEn: product.name_en,
          karat: product.karat,
          weightGrams: Number(product.weight_grams),
          quantity: 1,
          goldRate24k: product.gold_rate_24k,
          unitPrice: Number(product.final_price),
          finalPrice: Number(product.final_price),
        });
      } catch {
        setScanError(code);
        setTimeout(() => setScanError(null), 5000);
      }
    },
    [addItem]
  );

  useScanner(handleScan);

  async function handleCheckout() {
    if (items.length === 0) return;
    setCheckingOut(true);
    try {
      const order = await api.post<{ id: string }>("/orders", {
        items: items.map((i) => {
          if (i.kind === "COIN") {
            return { item_kind: "COIN", coin_type_id: i.coinTypeId, quantity: i.quantity };
          }
          if (i.kind === "OUNCE") {
            return { item_kind: "OUNCE", ounce_type_id: i.ounceTypeId, quantity: i.quantity };
          }
          return { item_kind: "PRODUCT", product_id: i.productId, quantity: 1 };
        }),
        payment_method: paymentMethod,
        customer_name: customerName || null,
      });
      clear();
      router.push(`/pos/confirmation/${order.id}`);
    } finally {
      setCheckingOut(false);
    }
  }

  return (
    <div className="flex flex-col h-screen bg-pos-bg">
      {/* Top bar */}
      <header className="min-h-14 border-b border-white/10 flex flex-wrap items-center px-4 md:px-6 py-2 shrink-0 gap-3 md:gap-6">
        <div className="flex items-center gap-3 shrink-0">
          <span className="font-serif text-gold text-xl tracking-widest">{t.appName}</span>
          <span className="text-pos-gray/40 text-xs">·</span>
          <span className="text-pos-gray text-xs uppercase tracking-widest">{t.pos.pointOfSale}</span>
        </div>

        <PosModeTabs />

        <div className="hidden lg:flex flex-1 justify-center">
          <GoldRateCard compact />
        </div>

        <div className="ms-auto flex items-center gap-5 shrink-0">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-pos-gray text-[10px] uppercase tracking-widest">
              {new Date().toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" })}
            </span>
            {mounted && user && (
              <span className="text-pos-cream text-xs mt-0.5">{user.name}</span>
            )}
          </div>
          <LanguageSwitcher variant="dark" />
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-pos-gray hover:text-pos-cream text-xs transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">{t.pos.signOut}</span>
          </button>
        </div>
      </header>

      {/* Body — stacks vertically on mobile, side-by-side on md+ */}
      <div className={cn("flex flex-col md:flex-row flex-1 overflow-hidden", isRTL && "md:flex-row-reverse")}>
        {/* Scan/capture panel */}
        <aside className="w-full md:w-[22rem] border-b md:border-b-0 md:border-e border-white/10 p-4 md:p-6 shrink-0 overflow-y-auto">
          <ScanPanel onScan={handleScan} scanError={scanError} />

          <div className="mt-8 space-y-2">
            <p className="text-pos-gray text-[10px] uppercase tracking-widest">
              {t.pos.addBullion}
            </p>
            <button
              onClick={() => setAddUnit("COIN")}
              className="flex items-center gap-2 w-full px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-pos-cream text-sm transition-colors"
            >
              <Coins className="w-4 h-4 text-gold shrink-0" />
              {t.pos.addCoin}
            </button>
            <button
              onClick={() => setAddUnit("OUNCE")}
              className="flex items-center gap-2 w-full px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-pos-cream text-sm transition-colors"
            >
              <Layers className="w-4 h-4 text-gold shrink-0" />
              {t.pos.addOunceBar}
            </button>
          </div>

          <div className="lg:hidden mt-8">
            <p className="text-pos-gray text-[10px] uppercase tracking-widest mb-3">
              {t.pos.liveGoldRate}
            </p>
            <GoldRateCard />
          </div>
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden">
          <CheckoutPanel
            customerName={customerName}
            onCustomerNameChange={setCustomerName}
            onCheckout={handleCheckout}
            checkingOut={checkingOut}
          />
        </main>
      </div>

      {addUnit && (
        <AddUnitDialog
          kind={addUnit}
          onClose={() => setAddUnit(null)}
          onAdded={() => setAddUnit(null)}
        />
      )}
    </div>
  );
}

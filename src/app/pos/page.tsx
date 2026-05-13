"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useScanner } from "@/hooks/useScanner";
import { ScanPanel } from "@/components/pos/ScanPanel";
import { CheckoutPanel } from "@/components/pos/CheckoutPanel";
import { api } from "@/lib/api-client";
import { logout, getStoredUser } from "@/lib/auth";
import type { ProductLookup } from "@/types/api";

export default function POSPage() {
  const router = useRouter();
  const user = getStoredUser();
  const { items, paymentMethod, addItem, clear } = useCart();
  const [scanError, setScanError] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [customerName, setCustomerName] = useState("");

  async function handleSignOut() {
    await logout();
    router.push("/login");
  }

  const handleScan = useCallback(async (code: string) => {
    setScanError(null);
    try {
      const product = await api.get<ProductLookup>(`/products/lookup/${code}`);
      addItem({
        cartId: `${product.id}-${Date.now()}`,
        productId: product.id,
        code: product.code,
        nameEn: product.name_en,
        karat: product.karat,
        weightGrams: Number(product.weight_grams),
        goldRate24k: product.gold_rate_24k,
        finalPrice: Number(product.final_price),
      });
    } catch {
      setScanError(code);
      setTimeout(() => setScanError(null), 5000);
    }
  }, [addItem]);

  useScanner(handleScan);

  async function handleCheckout() {
    if (items.length === 0) return;
    setCheckingOut(true);
    try {
      const order = await api.post<{ id: string }>("/orders", {
        items: items.map((i) => ({ product_id: i.productId, quantity: 1 })),
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
    <div className="flex flex-col h-screen">
      <header className="h-14 bg-pos-bg border-b border-white/10 flex items-center justify-between px-6 shrink-0">
        <span className="font-serif text-gold text-xl tracking-widest">MAISON ZAHAB</span>
        <span className="text-pos-gray text-xs hidden sm:block">
          {new Date().toLocaleDateString("en-GB", {
            weekday: "long", day: "2-digit", month: "long", year: "numeric",
          })}
        </span>
        <div className="flex items-center gap-4">
          {user && <span className="text-pos-gray text-xs">{user.name}</span>}
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-pos-gray hover:text-pos-cream text-xs transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-96 border-r border-white/10 p-6 shrink-0 overflow-y-auto">
          <ScanPanel onScan={handleScan} scanError={scanError} />
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 pt-6 pb-0 shrink-0">
            <p className="text-pos-gray text-[10px] uppercase tracking-widest">Current Sale</p>
          </div>
          <CheckoutPanel
            customerName={customerName}
            onCustomerNameChange={setCustomerName}
            onCheckout={handleCheckout}
            checkingOut={checkingOut}
          />
        </div>
      </div>
    </div>
  );
}

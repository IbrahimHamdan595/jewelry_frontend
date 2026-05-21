"use client";
import { ShoppingCart } from "lucide-react";
import { CartItem } from "./CartItem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatUSD } from "@/lib/utils";
import { useCart } from "@/hooks/useCart";
import type { PaymentMethod } from "@/types/api";

const PAYMENT_METHODS: PaymentMethod[] = ["CASH", "CARD", "MIXED"];

interface Props {
  customerName: string;
  onCustomerNameChange: (v: string) => void;
  onCheckout: () => void;
  checkingOut: boolean;
}

export function CheckoutPanel({
  customerName,
  onCustomerNameChange,
  onCheckout,
  checkingOut,
}: Props) {
  const { items, removeItem, paymentMethod, setPaymentMethod, subtotal, vat, total } =
    useCart();

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-5 pb-3 shrink-0 flex items-center justify-between border-b border-white/5">
        <div>
          <p className="text-pos-gray text-[10px] uppercase tracking-widest">
            Current Sale
          </p>
          <p className="text-pos-cream text-sm mt-0.5">
            {items.length === 0
              ? "No items yet"
              : `${items.length} item${items.length === 1 ? "" : "s"}`}
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-pos-gray px-6">
          <ShoppingCart className="w-12 h-12 mb-4 opacity-30" />
          <p className="font-serif italic text-lg opacity-60">
            Scan an item to begin
          </p>
          <p className="text-xs opacity-50 mt-1">
            Items added will appear here
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {items.map((item) => (
            <CartItem key={item.cartId} item={item} onRemove={removeItem} />
          ))}
        </div>
      )}

      <div className="border-t border-white/10 px-6 py-5 space-y-4 shrink-0 bg-pos-bg/60">
        <div>
          <label className="text-pos-gray text-[10px] uppercase tracking-widest mb-1.5 block">
            Customer (optional)
          </label>
          <Input
            dark
            value={customerName}
            onChange={(e) => onCustomerNameChange(e.target.value)}
            placeholder="Customer name"
          />
        </div>

        <div>
          <label className="text-pos-gray text-[10px] uppercase tracking-widest mb-1.5 block">
            Payment method
          </label>
          <div className="grid grid-cols-3 gap-2">
            {PAYMENT_METHODS.map((p) => (
              <button
                key={p}
                onClick={() => setPaymentMethod(p)}
                className={`py-2.5 rounded text-xs font-medium border transition-colors ${
                  paymentMethod === p
                    ? "bg-gold border-gold text-pos-bg"
                    : "border-white/15 text-pos-gray hover:border-white/30 hover:text-pos-cream"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5 text-sm pt-3 border-t border-white/5">
          <div className="flex justify-between text-pos-gray">
            <span>Subtotal</span>
            <span>{formatUSD(subtotal)}</span>
          </div>
          <div className="flex justify-between text-pos-gray">
            <span>VAT 11%</span>
            <span>{formatUSD(vat)}</span>
          </div>
          <div className="flex justify-between items-baseline pt-2 mt-1 border-t border-white/5">
            <span className="font-serif text-base text-pos-cream uppercase tracking-widest">
              Total
            </span>
            <span className="font-serif text-2xl font-bold text-gold">
              {formatUSD(total)}
            </span>
          </div>
        </div>

        <Button
          className="w-full py-4 text-sm tracking-widest"
          onClick={onCheckout}
          disabled={checkingOut || items.length === 0}
        >
          {checkingOut
            ? "PROCESSING…"
            : items.length === 0
              ? "ADD ITEMS TO CHECKOUT"
              : `CHECKOUT · ${formatUSD(total)}`}
        </Button>
      </div>
    </div>
  );
}

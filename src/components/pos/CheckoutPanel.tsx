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

export function CheckoutPanel({ customerName, onCustomerNameChange, onCheckout, checkingOut }: Props) {
  const { items, removeItem, paymentMethod, setPaymentMethod, subtotal, vat, total } = useCart();

  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-pos-gray">
        <ShoppingCart className="w-12 h-12 mb-4 opacity-30" />
        <p className="font-serif italic text-lg opacity-60">Scan an item to begin</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable cart items */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
        {items.map((item) => (
          <CartItem key={item.cartId} item={item} onRemove={removeItem} />
        ))}
      </div>

      {/* Fixed checkout footer */}
      <div className="border-t border-white/10 p-6 space-y-4 shrink-0">
        <Input
          dark
          value={customerName}
          onChange={(e) => onCustomerNameChange(e.target.value)}
          placeholder="Customer name (optional)"
        />

        {/* Totals */}
        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-pos-gray">
            <span>Subtotal</span>
            <span>{formatUSD(subtotal)}</span>
          </div>
          <div className="flex justify-between text-pos-gray">
            <span>VAT 11%</span>
            <span>{formatUSD(vat)}</span>
          </div>
          <div className="flex justify-between font-serif text-xl font-bold text-gold">
            <span>TOTAL</span>
            <span>{formatUSD(total)}</span>
          </div>
        </div>

        {/* Payment method pills */}
        <div className="flex gap-2">
          {PAYMENT_METHODS.map((p) => (
            <button
              key={p}
              onClick={() => setPaymentMethod(p)}
              className={`flex-1 py-2 rounded text-xs font-medium border transition-colors ${
                paymentMethod === p
                  ? "bg-gold border-gold text-pos-bg"
                  : "border-white/15 text-pos-gray hover:border-white/30"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <Button
          className="w-full py-4 text-sm tracking-wider"
          onClick={onCheckout}
          disabled={checkingOut}
        >
          {checkingOut ? "PROCESSING…" : `CHECKOUT · ${formatUSD(total)}`}
        </Button>
      </div>
    </div>
  );
}

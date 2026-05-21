"use client";
import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from "react";
import type { Karat, OrderItemKind, PaymentMethod } from "@/types/api";

const DEFAULT_PAYMENT_METHOD: PaymentMethod = "CASH";

export interface CartItem {
  /** Unique cart-row ID (allows same SKU added multiple times) */
  cartId: string;
  kind: OrderItemKind;
  /** Set when kind === "PRODUCT" */
  productId?: string;
  /** Set when kind === "COIN" */
  coinTypeId?: string;
  /** Set when kind === "OUNCE" */
  ounceTypeId?: string;
  code: string;
  nameEn: string;
  karat: Karat;
  weightGrams: number;
  /** Always 1 for PRODUCT; user-set (capped 100 server-side) for COIN/OUNCE */
  quantity: number;
  goldRate24k: number;
  /** Per-unit price (one piece / one coin / one ounce) */
  unitPrice: number;
  /** unitPrice × quantity */
  finalPrice: number;
}

interface CartState {
  items: CartItem[];
  paymentMethod: PaymentMethod;
  addItem: (item: CartItem) => void;
  removeItem: (cartId: string) => void;
  clear: () => void;
  setPaymentMethod: (m: PaymentMethod) => void;
  subtotal: number;
  vat: number;
  total: number;
}

const CartContext = createContext<CartState | null>(null);

export function CartProvider({
  children,
  vatPercent = 11,
}: {
  children: ReactNode;
  vatPercent?: number;
}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(DEFAULT_PAYMENT_METHOD);

  const addItem = useCallback((item: CartItem) => setItems((prev) => [...prev, item]), []);
  const removeItem = useCallback(
    (cartId: string) => setItems((prev) => prev.filter((i) => i.cartId !== cartId)),
    [],
  );
  const clear = useCallback(() => setItems([]), []);

  const subtotal = useMemo(() => items.reduce((s, i) => s + i.finalPrice, 0), [items]);
  const vat = useMemo(
    () => Math.round((subtotal * vatPercent) / 100 * 100) / 100,
    [subtotal, vatPercent],
  );
  const total = useMemo(() => subtotal + vat, [subtotal, vat]);

  return (
    <CartContext.Provider
      value={{ items, paymentMethod, addItem, removeItem, clear, setPaymentMethod, subtotal, vat, total }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}

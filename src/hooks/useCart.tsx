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
  /** Units in the cart (capped 100 server-side; products also capped by stock) */
  quantity: number;
  goldRate24k: number;
  /** Per-unit price (one piece / one coin / one ounce) */
  unitPrice: number;
  /** unitPrice × quantity */
  finalPrice: number;
  /** Max sellable units (PRODUCT: on_hand_qty). Undefined ⇒ fall back to the 100 cap. */
  available?: number;
}

const HARD_QTY_CAP = 100; // mirrors COIN_OUNCE_QTY_CAP server-side

interface CartState {
  items: CartItem[];
  paymentMethod: PaymentMethod;
  addItem: (item: CartItem) => void;
  updateQuantity: (cartId: string, quantity: number) => void;
  removeItem: (cartId: string) => void;
  clear: () => void;
  setPaymentMethod: (m: PaymentMethod) => void;
  vatPercent: number;
  // Phase 2 — order-level discount
  maxDiscountPercent: number;
  discountPercent: number;
  setDiscountPercent: (p: number) => void;
  subtotal: number;
  vat: number;
  discountAmount: number;
  total: number;
}

const CartContext = createContext<CartState | null>(null);

export function CartProvider({
  children,
  vatPercent = 11,
  maxDiscountPercent = 0,
}: {
  children: ReactNode;
  vatPercent?: number;
  maxDiscountPercent?: number;
}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(DEFAULT_PAYMENT_METHOD);
  const [discountPercentRaw, setDiscountPercentRaw] = useState(0);

  const capFor = (item: CartItem) =>
    item.available != null ? Math.min(item.available, HARD_QTY_CAP) : HARD_QTY_CAP;

  // Adding a PRODUCT that's already in the cart bumps its quantity (one scan =
  // one more unit) instead of creating a duplicate row — so selling 12 doesn't
  // mean 12 lines. COIN/OUNCE keep their own rows (added via the dialog).
  const addItem = useCallback((item: CartItem) => {
    setItems((prev) => {
      if (item.kind === "PRODUCT" && item.productId) {
        const existing = prev.find((i) => i.kind === "PRODUCT" && i.productId === item.productId);
        if (existing) {
          const cap = capFor(existing);
          const nextQty = Math.min(existing.quantity + item.quantity, cap);
          return prev.map((i) =>
            i.cartId === existing.cartId
              ? { ...i, quantity: nextQty, finalPrice: Math.round(i.unitPrice * nextQty * 100) / 100 }
              : i,
          );
        }
      }
      return [...prev, item];
    });
  }, []);

  const updateQuantity = useCallback((cartId: string, quantity: number) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.cartId !== cartId) return i;
        const qty = Math.max(1, Math.min(capFor(i), Math.floor(quantity) || 1));
        return { ...i, quantity: qty, finalPrice: Math.round(i.unitPrice * qty * 100) / 100 };
      }),
    );
  }, []);

  const removeItem = useCallback(
    (cartId: string) => setItems((prev) => prev.filter((i) => i.cartId !== cartId)),
    [],
  );
  const clear = useCallback(() => {
    setItems([]);
    setDiscountPercentRaw(0);
  }, []);

  // Clamp the discount to [0, maxDiscountPercent] — the server enforces the same
  // cap (422), this just keeps the UI honest.
  const setDiscountPercent = useCallback(
    (p: number) => setDiscountPercentRaw(Math.max(0, Math.min(maxDiscountPercent, isNaN(p) ? 0 : p))),
    [maxDiscountPercent],
  );
  const discountPercent = Math.max(0, Math.min(maxDiscountPercent, discountPercentRaw));

  const subtotal = useMemo(() => items.reduce((s, i) => s + i.finalPrice, 0), [items]);
  const vat = useMemo(
    () => Math.round((subtotal * vatPercent) / 100 * 100) / 100,
    [subtotal, vatPercent],
  );
  // VAT is charged on the pre-discount subtotal; the discount is then subtracted
  // from the grand total (mirrors backend create_order).
  const discountAmount = useMemo(
    () => Math.round((subtotal * discountPercent) / 100 * 100) / 100,
    [subtotal, discountPercent],
  );
  const total = useMemo(() => subtotal + vat - discountAmount, [subtotal, vat, discountAmount]);

  return (
    <CartContext.Provider
      value={{
        items, paymentMethod, addItem, updateQuantity, removeItem, clear, setPaymentMethod,
        vatPercent, maxDiscountPercent, discountPercent, setDiscountPercent,
        subtotal, vat, discountAmount, total,
      }}
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

/**
 * The cart's backing store: sessionStorage, keyed per tab.
 *
 * React state alone dies with its provider — a root-level error boundary, a
 * global-error, or a cashier's reflexive reload would all drop a half-built
 * sale. sessionStorage survives those and still dies with the tab, so a
 * stale cart cannot leak into the next shift. Cleared on checkout (`clear()`)
 * and on logout.
 */
import type { PaymentMethod } from "@/types/api";
import type { CartItem } from "@/hooks/useCart";

export const CART_STORAGE_KEY = "mz_cart";

export interface StoredCart {
  items: CartItem[];
  paymentMethod: PaymentMethod;
  discountPercent: number;
}

export function readStoredCart(): StoredCart | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredCart>;
    if (!Array.isArray(parsed.items)) return null;
    return {
      items: parsed.items,
      paymentMethod: parsed.paymentMethod ?? "CASH",
      discountPercent: typeof parsed.discountPercent === "number" ? parsed.discountPercent : 0,
    };
  } catch {
    // Corrupt storage must never take the till down; start empty.
    clearStoredCart();
    return null;
  }
}

export function writeStoredCart(cart: StoredCart) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch {
    // Quota / private mode: the in-memory cart still works for this render.
  }
}

export function clearStoredCart() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(CART_STORAGE_KEY);
  } catch {
    // nothing to do
  }
}

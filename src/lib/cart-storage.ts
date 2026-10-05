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
import { toFiniteNumber } from "@/lib/utils";

export const CART_STORAGE_KEY = "mz_cart";

export interface StoredCart {
  items: CartItem[];
  paymentMethod: PaymentMethod;
  discountPercent: number;
}

/**
 * Storage is another way into the cart, so the same rule applies as at the
 * lookup (NEX-54): the figures the cart does arithmetic on are numbers. A tab
 * still running the previous build can have stored a rate as the decimal
 * string the API sent; that reads back as a number here. A line whose price
 * or rate cannot be read at all is `null`.
 */
function readStoredLine(line: CartItem): CartItem | null {
  const goldRate24k = toFiniteNumber(line?.goldRate24k);
  const unitPrice = toFiniteNumber(line?.unitPrice);
  const finalPrice = toFiniteNumber(line?.finalPrice);
  if (goldRate24k === null || unitPrice === null || finalPrice === null) return null;
  return { ...line, goldRate24k, unitPrice, finalPrice };
}

export function readStoredCart(): StoredCart | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredCart>;
    if (!Array.isArray(parsed.items)) return null;
    const items = parsed.items.map(readStoredLine);
    if (items.some((line) => line === null)) {
      // One line that cannot be priced makes the whole cart suspect. An empty
      // till is obvious and gets rescanned; a cart quietly missing a line, or
      // carrying one at NaN, is not.
      clearStoredCart();
      return null;
    }
    return {
      items: items as CartItem[],
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

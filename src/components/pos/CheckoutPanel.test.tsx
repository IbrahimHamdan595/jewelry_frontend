import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { CheckoutPanel } from "@/components/pos/CheckoutPanel";
import { CartProvider, type CartItem } from "@/hooks/useCart";
import { CART_STORAGE_KEY } from "@/lib/cart-storage";
import { LanguageProvider } from "@/context/LanguageContext";
import en from "@/i18n/en";
import ar from "@/i18n/ar";

// Cart lines as the till builds them from GET /products/lookup/{code} and the
// coin price endpoint: codes in the backend's FN-… format, karat as the enum value.
const ring: CartItem = {
  cartId: "r1", kind: "PRODUCT", productId: "p1", code: "FN-21K-0001", nameEn: "Ring", karat: "K21",
  weightGrams: 5, quantity: 2, goldRate24k: 141.66, unitPrice: 700, finalPrice: 1400, available: 2,
};
const coin: CartItem = {
  cartId: "c1", kind: "COIN", coinTypeId: "ct1", code: "FN-COIN-21K-0001", nameEn: "Lira", karat: "K21",
  weightGrams: 8, quantity: 1, goldRate24k: 141.66, unitPrice: 1000, finalPrice: 1000,
};

function seedCart(items: CartItem[], discountPercent = 0) {
  sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ items, paymentMethod: "CASH", discountPercent }));
}

function renderPanel(lang: "en" | "ar", props: Partial<React.ComponentProps<typeof CheckoutPanel>> = {}) {
  const onCheckout = vi.fn();
  const onCustomerNameChange = vi.fn();
  const view = render(
    <LanguageProvider initialLang={lang}>
      <CartProvider vatPercent={11} maxDiscountPercent={10}>
        <CheckoutPanel customerName="" onCustomerNameChange={onCustomerNameChange} onCheckout={onCheckout} checkingOut={false} {...props} />
      </CartProvider>
    </LanguageProvider>,
  );
  return { ...view, onCheckout, onCustomerNameChange };
}

// Everything a user can read or hear: text nodes plus placeholder / title / aria-label / alt.
function uiStrings(root: HTMLElement): string[] {
  const out: string[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) if (walker.currentNode.parentElement?.tagName !== "STYLE") out.push(walker.currentNode.textContent ?? "");
  root.querySelectorAll("*").forEach((el) => ["placeholder", "title", "aria-label", "alt"].forEach((a) => out.push(el.getAttribute(a) ?? "")));
  return out;
}
/** Latin words still on screen once data and the codes that stay Latin by design are set aside. */
const englishLeft = (root: HTMLElement, keep: RegExp) =>
  uiStrings(root).map((s) => s.replace(keep, "")).filter((s) => /[A-Za-z]{2,}/.test(s));
// Karat codes, plus the product names and codes the fixtures supply as data.
const DATA = /\b(FN-21K-0001|FN-COIN-21K-0001|K?\d\dK?|Ring|Lira)\b/g;

describe("CheckoutPanel — labels and i18n (NEX-64)", () => {
  beforeEach(() => sessionStorage.clear());

  it("customer and discount are reachable by their labels, and a label click reaches the field", () => {
    seedCart([ring]);
    const { onCustomerNameChange } = renderPanel("en");
    const c = en.checkout;

    const customer = screen.getByLabelText(c.customerOptional);
    expect((screen.getByText(c.customerOptional).closest("label") as HTMLLabelElement).control).toBe(customer);
    fireEvent.change(customer, { target: { value: "Rima" } });
    expect(onCustomerNameChange).toHaveBeenCalledWith("Rima");

    const discount = screen.getByLabelText(c.discountPctMax(10));
    expect(discount).toHaveAttribute("type", "number");
    expect((screen.getByText(c.discountPctMax(10)).closest("label") as HTMLLabelElement).control).toBe(discount);
  });

  it("the payment buttons are a named group, not an orphan label", () => {
    seedCart([ring]);
    renderPanel("en");
    const group = screen.getByRole("group", { name: en.checkout.paymentMethod });
    expect(within(group).getAllByRole("button").map((b) => b.textContent)).toEqual(["CASH", "CARD", "MIXED"]);
  });

  it("an empty cart in Arabic has no English left", () => {
    const { container } = renderPanel("ar");
    const c = ar.checkout;
    for (const text of [c.currentSale, c.noItems, c.scanToBegin, c.itemsAppearHere]) expect(screen.getByText(text), text).toBeInTheDocument();
    expect(screen.getByRole("button", { name: c.addItemsToCheckout })).toBeDisabled();
    expect(englishLeft(container, DATA)).toEqual([]);
  });

  it("a full cart in Arabic: labels, payment methods, totals, steppers — no English left", () => {
    seedCart([ring, coin], 5);
    const { container } = renderPanel("ar");
    const c = ar.checkout;

    expect(screen.getByText(c.itemCount(2))).toBeInTheDocument();
    expect(screen.getByLabelText(c.customerOptional)).toHaveAttribute("placeholder", c.customerNamePlaceholder);
    expect(screen.getByLabelText(c.discountPctMax(10))).toBeInTheDocument();
    const group = screen.getByRole("group", { name: c.paymentMethod });
    expect(within(group).getAllByRole("button").map((b) => b.textContent)).toEqual([c.paymentMethods.CASH, c.paymentMethods.CARD, c.paymentMethods.MIXED]);

    for (const text of [ar.common.subtotal, c.vatLine(11), c.discountLine(5), ar.common.total, c.itemKinds.COIN]) {
      expect(screen.getByText(text), text).toBeInTheDocument();
    }
    // Icon-only cart buttons are announced in Arabic and say which line they act on;
    // the stock cap explains itself in Arabic.
    for (const name of ["Ring", "Lira"]) {
      expect(screen.getByRole("button", { name: c.removeItem(name) })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: c.decreaseQty(name) })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: c.increaseQty(name) })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: c.increaseQty("Ring") })).toHaveAttribute("title", c.onlyInStock(2));

    // The code / weight / rate run is isolated left-to-right; the per-piece note beside it is Arabic.
    const runs = Array.from(container.querySelectorAll('bdi[dir="ltr"]')).map((el) => el.textContent);
    expect(runs).toEqual(["FN-21K-0001 · 5g @ $141.66/g", "FN-COIN-21K-0001 · 8g @ $141.66/g"]);
    expect(screen.getByText(`· ${c.perEach("$700.00")}`)).toBeInTheDocument();

    expect(englishLeft(container, DATA)).toEqual([]);
  });

  it("the same scan does find English on the English panel", () => {
    seedCart([ring, coin]);
    const { container } = renderPanel("en");
    expect(englishLeft(container, DATA)).not.toEqual([]);
    expect(screen.getByText("Current Sale")).toBeInTheDocument();
    expect(screen.getByText("2 items")).toBeInTheDocument();
    expect(screen.getByText("COIN")).toBeInTheDocument();
    expect(screen.getByText("· $700.00/ea")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove Ring" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Increase quantity of Lira" })).toBeInTheDocument();
  });
});

describe("CheckoutPanel — the money is untouched", () => {
  beforeEach(() => sessionStorage.clear());

  // 1400 + 1000 = 2400; VAT 11% = 264; discount is 5% of the pre-VAT subtotal = 120; total 2544
  it.each(["en", "ar"] as const)("shows the same subtotal, VAT, discount and total (%s)", (lang) => {
    seedCart([ring, coin], 5);
    const { onCheckout } = renderPanel(lang);
    const c = (lang === "ar" ? ar : en).checkout;
    const common = (lang === "ar" ? ar : en).common;
    const amountNextTo = (label: string) => screen.getByText(label).nextElementSibling?.textContent;

    expect(amountNextTo(common.subtotal)).toBe("$2,400.00");
    expect(amountNextTo(c.vatLine(11))).toBe("$264.00");
    expect(amountNextTo(c.discountLine(5))).toBe("−$120.00");
    expect(amountNextTo(common.total)).toBe("$2,544.00");

    const button = screen.getByRole("button", { name: c.checkoutTotal("$2,544.00") });
    fireEvent.click(button);
    expect(onCheckout).toHaveBeenCalledTimes(1);
  });

  it("choosing a payment method still selects it", () => {
    seedCart([ring]);
    renderPanel("ar");
    const c = ar.checkout;
    fireEvent.click(screen.getByRole("button", { name: c.paymentMethods.CARD }));
    expect(JSON.parse(sessionStorage.getItem(CART_STORAGE_KEY) ?? "{}").paymentMethod).toBe("CARD");
    expect(screen.getByRole("button", { name: c.paymentMethods.CARD })).toHaveClass("bg-gold");
  });

  it("says it is processing, in the current language, and blocks a second submit", () => {
    seedCart([ring]);
    renderPanel("ar", { checkingOut: true });
    expect(screen.getByRole("button", { name: ar.checkout.processing })).toBeDisabled();
  });
});

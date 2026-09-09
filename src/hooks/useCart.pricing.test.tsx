import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CartProvider, useCart, type CartItem } from "@/hooks/useCart";

/**
 * Money assertions compare integer cents. The cart rounds to 2dp at each
 * step, so floating-point noise never reaches these values — but comparing
 * raw floats would still be a coin toss on some inputs.
 */
const cents = (n: number) => Math.round(n * 100);

const ring: CartItem = {
  cartId: "ring", kind: "PRODUCT", productId: "p-ring", code: "R-1", nameEn: "Ring", karat: "K21",
  weightGrams: 5, quantity: 1, goldRate24k: 141.66, unitPrice: 123.45, finalPrice: 123.45, available: 3,
};
const coin: CartItem = {
  cartId: "coin", kind: "COIN", coinTypeId: "c-1", code: "C-1", nameEn: "Coin", karat: "K24",
  weightGrams: 8, quantity: 2, goldRate24k: 141.66, unitPrice: 1133.28, finalPrice: 2266.56,
};

function Probe() {
  const c = useCart();
  return (
    <div>
      <span data-testid="subtotal">{cents(c.subtotal)}</span>
      <span data-testid="vat">{cents(c.vat)}</span>
      <span data-testid="discount">{cents(c.discountAmount)}</span>
      <span data-testid="discountPct">{c.discountPercent}</span>
      <span data-testid="total">{cents(c.total)}</span>
      <span data-testid="lines">{c.items.map((i) => `${i.cartId}:${i.quantity}:${cents(i.finalPrice)}`).join("|")}</span>
      <button onClick={() => c.addItem(ring)}>add ring</button>
      <button onClick={() => c.addItem(coin)}>add coin</button>
      <button onClick={() => c.updateQuantity("ring", 2)}>ring x2</button>
      <button onClick={() => c.updateQuantity("ring", 99)}>ring x99</button>
      <button onClick={() => c.updateQuantity("ring", 0)}>ring x0</button>
      <button onClick={() => c.updateQuantity("coin", 500)}>coin x500</button>
      <button onClick={() => c.setDiscountPercent(5)}>discount 5</button>
      <button onClick={() => c.setDiscountPercent(50)}>discount 50</button>
      <button onClick={() => c.setDiscountPercent(NaN)}>discount NaN</button>
      <button onClick={() => c.removeItem("ring")}>remove ring</button>
    </div>
  );
}

const v = (id: string) => screen.getByTestId(id).textContent;
const click = (name: string) => fireEvent.click(screen.getByText(name));

describe("cart pricing", () => {
  beforeEach(() => sessionStorage.clear());

  it("sums line totals into the subtotal", () => {
    render(<CartProvider vatPercent={11}><Probe /></CartProvider>);
    click("add ring");
    click("add coin");
    expect(v("subtotal")).toBe(String(cents(123.45 + 2266.56)));
  });

  it("charges VAT on the subtotal, rounded to the cent", () => {
    render(<CartProvider vatPercent={11}><Probe /></CartProvider>);
    click("add ring"); // 123.45 × 11% = 13.5795 → 13.58
    expect(v("vat")).toBe("1358");
    expect(v("total")).toBe(String(12345 + 1358));
  });

  it("uses the VAT rate it was given", () => {
    render(<CartProvider vatPercent={0}><Probe /></CartProvider>);
    click("add ring");
    expect(v("vat")).toBe("0");
    expect(v("total")).toBe("12345");
  });

  it("re-scanning a product bumps its quantity instead of adding a line", () => {
    render(<CartProvider vatPercent={11}><Probe /></CartProvider>);
    click("add ring");
    click("add ring");
    expect(v("lines")).toBe("ring:2:24690");
  });

  it("caps a product at its stock on hand", () => {
    render(<CartProvider vatPercent={11}><Probe /></CartProvider>);
    click("add ring"); // available: 3
    click("ring x99");
    expect(v("lines")).toBe("ring:3:37035");
  });

  it("caps bullion at the 100-unit hard limit", () => {
    render(<CartProvider vatPercent={11}><Probe /></CartProvider>);
    click("add coin");
    click("coin x500");
    expect(v("lines")).toBe(`coin:100:${cents(1133.28 * 100)}`);
  });

  it("never lets a line drop below one unit", () => {
    render(<CartProvider vatPercent={11}><Probe /></CartProvider>);
    click("add ring");
    click("ring x0");
    expect(v("lines")).toBe("ring:1:12345");
  });

  it("applies the discount to the subtotal and takes it off the total after VAT", () => {
    render(<CartProvider vatPercent={11} maxDiscountPercent={10}><Probe /></CartProvider>);
    click("add ring");
    click("discount 5"); // 123.45 × 5% = 6.1725 → 6.17
    expect(v("discount")).toBe("617");
    expect(v("vat")).toBe("1358"); // VAT is on the pre-discount subtotal
    expect(v("total")).toBe(String(12345 + 1358 - 617));
  });

  it("clamps the discount to the configured maximum", () => {
    render(<CartProvider vatPercent={11} maxDiscountPercent={10}><Probe /></CartProvider>);
    click("add ring");
    click("discount 50");
    expect(v("discountPct")).toBe("10");
  });

  it("treats a non-numeric discount as zero", () => {
    render(<CartProvider vatPercent={11} maxDiscountPercent={10}><Probe /></CartProvider>);
    click("add ring");
    click("discount 5");
    click("discount NaN");
    expect(v("discountPct")).toBe("0");
    expect(v("discount")).toBe("0");
  });

  it("allows no discount at all when the maximum is zero", () => {
    render(<CartProvider vatPercent={11} maxDiscountPercent={0}><Probe /></CartProvider>);
    click("add ring");
    click("discount 5");
    expect(v("discountPct")).toBe("0");
  });

  it("removing a line recomputes everything", () => {
    render(<CartProvider vatPercent={11}><Probe /></CartProvider>);
    click("add ring");
    click("add coin");
    click("remove ring");
    expect(v("subtotal")).toBe(String(cents(2266.56)));
    expect(v("vat")).toBe(String(cents(Math.round(2266.56 * 11) / 100)));
  });
});

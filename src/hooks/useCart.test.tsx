import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CartProvider, useCart, type CartItem } from "@/hooks/useCart";

const ring: CartItem = {
  cartId: "r1", kind: "PRODUCT", productId: "p1", code: "R-1", nameEn: "Ring", karat: "K21",
  weightGrams: 5, quantity: 1, goldRate24k: 141.66, unitPrice: 700, finalPrice: 700,
};

function Probe() {
  const { items, addItem, clear, paymentMethod, setPaymentMethod, discountPercent, setDiscountPercent } = useCart();
  return (
    <div>
      <span data-testid="count">{items.length}</span>
      <span data-testid="pay">{paymentMethod}</span>
      <span data-testid="disc">{discountPercent}</span>
      <button onClick={() => addItem(ring)}>add</button>
      <button onClick={() => clear()}>clear</button>
      <button onClick={() => setPaymentMethod("CARD")}>card</button>
      <button onClick={() => setDiscountPercent(5)}>discount</button>
    </div>
  );
}

const mount = () => render(<CartProvider maxDiscountPercent={10}><Probe /></CartProvider>);

describe("CartProvider persistence", () => {
  beforeEach(() => sessionStorage.clear());

  it("rehydrates the items after a remount", () => {
    const first = mount();
    fireEvent.click(screen.getByText("add"));
    expect(screen.getByTestId("count")).toHaveTextContent("1");
    first.unmount();

    mount();
    expect(screen.getByTestId("count")).toHaveTextContent("1");
  });

  it("rehydrates the payment method and discount", () => {
    const first = mount();
    fireEvent.click(screen.getByText("card"));
    fireEvent.click(screen.getByText("discount"));
    first.unmount();

    mount();
    expect(screen.getByTestId("pay")).toHaveTextContent("CARD");
    expect(screen.getByTestId("disc")).toHaveTextContent("5");
  });

  it("forgets the cart after clear()", () => {
    const first = mount();
    fireEvent.click(screen.getByText("add"));
    fireEvent.click(screen.getByText("clear"));
    first.unmount();

    mount();
    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });

  it("ignores a corrupt stored cart instead of crashing the till", () => {
    sessionStorage.setItem("mz_cart", "{not json");
    mount();
    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });
});

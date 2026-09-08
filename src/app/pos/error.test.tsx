import { describe, it, expect, vi, afterEach } from "vitest";
import { Component, useState, type ReactNode } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PosError from "@/app/pos/error";
import { CartProvider, useCart, type CartItem } from "@/hooks/useCart";

/**
 * Next's error.tsx is a class error boundary mounted BELOW the segment's
 * layout and ABOVE its page. This stand-in reproduces exactly that placement:
 * CartProvider (pos/layout.tsx) → boundary → page.
 */
class Boundary extends Component<
  { fallback: (error: Error, reset: () => void) => ReactNode; children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    return this.state.error
      ? this.props.fallback(this.state.error, () => this.setState({ error: null }))
      : this.props.children;
  }
}

const ring: CartItem = {
  cartId: "r1", kind: "PRODUCT", productId: "p1", code: "R-1", nameEn: "Ring", karat: "K21",
  weightGrams: 5, quantity: 1, goldRate24k: 141.66, unitPrice: 700, finalPrice: 700,
};

const explode = { now: false };

function Page() {
  const { items, addItem } = useCart();
  if (explode.now) throw new Error('malformed payload {"detail":"secret-card-number"}');
  return (
    <div>
      <span data-testid="count">{items.length}</span>
      <button onClick={() => addItem(ring)}>add</button>
    </div>
  );
}

function Harness() {
  const [, bump] = useState(0);
  return (
    <CartProvider>
      <button onClick={() => bump((n) => n + 1)}>rerender</button>
      <Boundary fallback={(error, reset) => <PosError error={error} reset={reset} />}>
        <Page />
      </Boundary>
    </CartProvider>
  );
}

describe("/pos error boundary", () => {
  afterEach(() => {
    explode.now = false;
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("shows a recoverable boundary and the cart survives the reset", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<Harness />);
    fireEvent.click(screen.getByText("add"));
    expect(screen.getByTestId("count")).toHaveTextContent("1");

    explode.now = true;
    fireEvent.click(screen.getByText("rerender"));

    // Recoverable, and nothing from the payload reaches the cashier.
    const retry = screen.getByRole("button", { name: /try again/i });
    expect(screen.queryByText(/secret-card-number/)).toBeNull();
    expect(screen.queryByText(/malformed payload/)).toBeNull();

    explode.now = false;
    fireEvent.click(retry);

    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("1"));
  });
});

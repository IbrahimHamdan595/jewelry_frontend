import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ConfirmationPage from "@/app/pos/confirmation/[orderId]/page";
import { LanguageProvider } from "@/context/LanguageContext";
import en from "@/i18n/en";
import ar from "@/i18n/ar";

vi.mock("next/navigation", () => ({ useParams: () => ({ orderId: "o1" }), useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));
const swr = vi.hoisted(() => ({ data: undefined as unknown }));
vi.mock("swr", () => ({ default: () => ({ data: swr.data, error: undefined, isLoading: false, isValidating: false, mutate: vi.fn() }) }));
vi.mock("@/lib/api-client", async (orig) => ({ ...(await orig<typeof import("@/lib/api-client")>()), apiFetcher: vi.fn() }));

// OrderOut as GET /orders/{id} sends it (app/schemas/order.py): decimals are strings,
// the number is ORD-YYYYMMDD-NNN, karat is the enum value.
const line = {
  item_kind: "PRODUCT", product_id: "p1", coin_type_id: null, ounce_type_id: null, quantity: 1, product_code: "FN-21K-0001",
  product_name: "Gold Ring", karat: "K21", weight_grams: "5.250", gold_rate_at_sale: "141.66", margin_percent: "15.00",
  making_charge: "25.00", final_price: "668.47", stone_value_at_sale: null, stone_cost_at_sale: null,
  refunded_qty: 0, refunded_amount: "0", refunded_at: null,
};
const order = {
  id: "o1", order_number: "ORD-20260908-001", status: "COMPLETED", payment_method: "CARD", customer_name: "Rima",
  cashier_id: "u1", cashier: { id: "u1", name: "Maya", email: "maya@fawazelnamel.com" },
  subtotal: "1336.94", vat_percent: "11.00", vat_amount: "147.06", discount_percent: "0.00", discount_amount: "0.00",
  total_usd: "1484.00", total_lbp: "132818000.00", lbp_exchange_rate: "89500.00",
  voided_at: null, voided_by: null, void_reason: null, created_at: "2026-09-08T10:00:00Z",
  items: [{ id: "i1", ...line }, { id: "i2", ...line }],
};

const renderPage = (lang: "en" | "ar") => render(<LanguageProvider initialLang={lang}><ConfirmationPage /></LanguageProvider>);

// Everything a user can read or hear: text nodes plus placeholder / title / aria-label / alt.
function uiStrings(root: HTMLElement): string[] {
  const out: string[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) if (walker.currentNode.parentElement?.tagName !== "STYLE") out.push(walker.currentNode.textContent ?? "");
  root.querySelectorAll("*").forEach((el) => ["placeholder", "title", "aria-label", "alt"].forEach((a) => out.push(el.getAttribute(a) ?? "")));
  return out;
}
/** Latin words still on screen once the data the server sent is set aside. */
const englishLeft = (root: HTMLElement, keep: RegExp) =>
  uiStrings(root).map((s) => s.replace(keep, "")).filter((s) => /[A-Za-z]{2,}/.test(s));
// The order number and the two people's names are data.
const DATA = /ORD-20260908-001|Rima|Maya/g;

describe("sale-complete screen (NEX-64)", () => {
  beforeEach(() => { swr.data = order; });

  it("Arabic: headline, summary and both actions — no English left", () => {
    const { container } = renderPage("ar");
    const c = ar.checkout;
    expect(screen.getByRole("heading", { name: c.saleComplete })).toBeInTheDocument();
    expect(screen.getByText(c.thankYou("Rima"))).toBeInTheDocument();
    expect(screen.getByText(c.payment).nextElementSibling).toHaveTextContent(c.paymentMethods.CARD);
    expect(screen.getByText(c.items).nextElementSibling).toHaveTextContent("2");
    expect(screen.getByText(c.cashier).nextElementSibling).toHaveTextContent("Maya");
    expect(screen.getByRole("link", { name: ar.receipt.printReceipt })).toHaveAttribute("href", "/pos/receipt/o1");
    expect(screen.getByRole("link", { name: c.newOrder })).toHaveAttribute("href", "/pos");
    expect(screen.getByText(c.returningToPos)).toBeInTheDocument();
    expect(englishLeft(container, DATA)).toEqual([]);
  });

  it("the order number keeps its bidi isolation and the amounts are untouched", () => {
    const { container } = renderPage("ar");
    expect(container.querySelector('bdi[dir="ltr"]')).toHaveTextContent("ORD-20260908-001");
    expect(screen.getByText("$1,484.00")).toBeInTheDocument();
    expect(screen.getByText("ل.ل 132,818,000")).toBeInTheDocument();
  });

  it("a walk-in sale has no thank-you line, and every payment method the API knows is translated", () => {
    for (const method of ["CASH", "MIXED", "CREDIT"] as const) {
      swr.data = { ...order, customer_name: null, payment_method: method };
      const view = renderPage("ar");
      expect(screen.getByText(ar.checkout.payment).nextElementSibling).toHaveTextContent(ar.checkout.paymentMethods[method]);
      expect(view.container).not.toHaveTextContent("شكراً");
      expect(englishLeft(view.container, DATA)).toEqual([]);
      view.unmount();
    }
  });

  it("keeps the English wording it had", () => {
    const { container } = renderPage("en");
    for (const text of ["SALE COMPLETE", "Thank you, Rima", "Payment", "CARD", "Items", "Cashier", "Print Receipt", "+ New Order", "Returning to POS in 30 seconds…"]) {
      expect(screen.getByText(text), text).toBeInTheDocument();
    }
    expect(screen.getByText(en.checkout.saleComplete)).toBeInTheDocument();
    expect(englishLeft(container, DATA)).not.toEqual([]);
  });
});

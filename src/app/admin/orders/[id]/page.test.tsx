import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import OrderDetailPage from "@/app/admin/orders/[id]/page";
import { LanguageProvider } from "@/context/LanguageContext";
import ar from "@/i18n/ar";

const swr = vi.hoisted(() => ({ data: undefined as unknown }));
vi.mock("swr", () => ({ default: () => ({ data: swr.data, error: undefined, isLoading: false, isValidating: false, mutate: vi.fn() }) }));
vi.mock("next/navigation", () => ({ useParams: () => ({ id: "o1" }) }));
const api = vi.hoisted(() => ({ post: vi.fn(() => Promise.resolve({})) }));
vi.mock("@/lib/api-client", () => ({ apiFetcher: vi.fn(), api }));

const item = (over: Record<string, unknown>) => ({
  id: "i1", item_kind: "PRODUCT", product_id: "p1", coin_type_id: null, ounce_type_id: null, quantity: 3,
  product_code: "RNG-0042", product_name: "Twisted Ring", karat: "K21", weight_grams: 4.25, gold_rate_at_sale: 88.4,
  margin_percent: 10, making_charge: 15, final_price: 300, refunded_qty: 1, refunded_amount: 100, refunded_at: null, ...over,
});
const order = (over: Record<string, unknown>) => ({
  id: "o1", order_number: "ORD-20260905-002", status: "COMPLETED", payment_method: "CASH", customer_name: "Rana Haddad",
  cashier_id: "u1", cashier: { id: "u1", name: "Ibrahim", email: "i@x.y" }, subtotal: 300, vat_percent: 11, vat_amount: 33,
  discount_percent: 5, discount_amount: 15, total_usd: 318, total_lbp: 28461000, lbp_exchange_rate: 89500,
  voided_at: null, voided_by: null, void_reason: null, created_at: "2026-09-05T10:00:00Z",
  items: [item({}), item({ id: "i2", item_kind: "COIN", product_code: "LIRA-8G", product_name: "Gold Lira", quantity: 1, refunded_qty: 0, refunded_amount: 0 })],
  ...over,
});

// Database values: names, codes, the order number.
const DATA = ["ORD-20260905-002", "Ibrahim", "Rana Haddad", "RNG-0042", "Twisted Ring", "LIRA-8G", "Gold Lira"];
// StatusBadge is a shared component outside this slice; it still prints the
// order-status enum lowercased in English.
const SHARED = ["completed", "partially refunded", "refunded", "voided"];

/** Text a user reads or a screen reader announces, minus data and shared-component text. */
function englishLeft(root: HTMLElement): string[] {
  const found: string[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) found.push(walker.currentNode.textContent ?? "");
  root.querySelectorAll("[placeholder],[title],[aria-label],[alt]").forEach((el) => {
    for (const attr of ["placeholder", "title", "aria-label", "alt"]) found.push(el.getAttribute(attr) ?? "");
  });
  return found
    .map((text) => DATA.reduce((rest, value) => rest.split(value).join(""), text).trim())
    .filter((text) => !SHARED.includes(text) && /[A-Za-z]{2,}/.test(text));
}

function renderPage(lang: "en" | "ar", data: unknown = order({})) {
  swr.data = data;
  return render(<LanguageProvider initialLang={lang}><OrderDetailPage /></LanguageProvider>);
}

describe("order detail in Arabic (NEX-64)", () => {
  beforeEach(() => api.post.mockClear());

  it("leaves no English behind: header, item table, enum labels, totals", () => {
    const { container } = renderPage("ar");
    for (const english of ["Print Receipt", "Void Order", "Item", "Kind", "Qty", "Karat", "Weight", "Rate at Sale", "Price", "PRODUCT", "COIN", "Refund", "Subtotal", "Total", "LBP Equivalent", "Payment Method", "CASH"]) {
      expect(screen.queryByText(english), english).toBeNull();
    }
    expect(screen.getByText(ar.orders.cashierLine("Ibrahim"))).toBeInTheDocument();
    expect(screen.getByText(ar.orders.customerLine("Rana Haddad"))).toBeInTheDocument();
    expect(screen.getByText(ar.orders.itemKind.PRODUCT)).toBeInTheDocument();
    expect(screen.getByText(ar.orders.itemKind.COIN)).toBeInTheDocument();
    expect(screen.getByText(ar.orders.payment.CASH)).toBeInTheDocument();
    expect(screen.getByText(ar.orders.discountPct(5))).toBeInTheDocument();
    expect(screen.getByText(ar.orders.refundedLine(1, 3, "$106.00"))).toBeInTheDocument();
    expect(englishLeft(container)).toEqual([]);
  });

  it("keeps the order number isolated left-to-right", () => {
    renderPage("ar");
    expect(screen.getByText("ORD-20260905-002").closest("bdi")).toHaveAttribute("dir", "ltr");
  });

  it("translates the void panel and names its reason field", () => {
    const { container } = renderPage("ar");
    fireEvent.click(screen.getByRole("button", { name: ar.orders.voidOrder }));
    const reason = screen.getByLabelText(ar.orders.voidReason);
    expect(reason).toHaveAttribute("placeholder", ar.orders.voidReason);
    expect(screen.getByRole("button", { name: ar.orders.confirmVoid })).toBeInTheDocument();
    // "Cancel" and "void" would both be إلغاء; the way out of the panel must read differently.
    expect(ar.orders.dismiss).not.toBe(ar.common.cancel);
    expect(screen.getByRole("button", { name: ar.orders.dismiss })).toBeInTheDocument();
    expect(englishLeft(container)).toEqual([]);
  });

  it("refund dialog: the quantity field is reachable by its label, and the label's control is the field", () => {
    const { container } = renderPage("ar");
    fireEvent.click(screen.getAllByRole("button", { name: ar.orders.refund })[0]);
    const qty = screen.getByLabelText(ar.orders.refundQty(2));
    expect(qty).toHaveAttribute("type", "number");
    expect(qty).toHaveValue(2);
    const label = screen.getByText(ar.orders.refundQty(2)).closest("label") as HTMLLabelElement;
    expect(label.control).toBe(qty);
    expect(screen.getByRole("heading", { name: ar.orders.refundItem })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: ar.orders.confirmRefund })).toBeInTheDocument();
    expect(englishLeft(container)).toEqual([]);
  });

  it("refund dialog still clamps the quantity and posts it", () => {
    renderPage("ar");
    fireEvent.click(screen.getAllByRole("button", { name: ar.orders.refund })[0]);
    const qty = screen.getByLabelText(ar.orders.refundQty(2));
    fireEvent.change(qty, { target: { value: "9" } });
    expect(qty).toHaveValue(2);
    fireEvent.change(qty, { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: ar.orders.confirmRefund }));
    expect(api.post).toHaveBeenCalledWith("/orders/o1/items/i1/refund", { quantity: 1 });
  });

  it("translates the voided stamp and the refunded-totals note", () => {
    const { container, unmount } = renderPage("ar", order({ status: "VOIDED" }));
    expect(screen.getByText(ar.orders.voidedStamp)).toBeInTheDocument();
    expect(screen.queryByText("VOIDED")).toBeNull();
    expect(englishLeft(container)).toEqual([]);
    unmount();
    renderPage("ar", order({ status: "PARTIALLY_REFUNDED" }));
    expect(screen.getByText(ar.orders.refundTotalsNote)).toBeInTheDocument();
  });
});

describe("order detail in English is unchanged", () => {
  it("keeps the original wording, including the composed refund sentences", () => {
    renderPage("en");
    expect(screen.getByText("Cashier: Ibrahim")).toBeInTheDocument();
    expect(screen.getByText("Customer: Rana Haddad")).toBeInTheDocument();
    expect(screen.getByText("Refunded 1/3 · −$106.00 to customer")).toBeInTheDocument();
    expect(screen.getAllByText("4.250g")).toHaveLength(2);
    expect(screen.getAllByText("$88.40/g")).toHaveLength(2);
    expect(screen.getByText("VAT 11%")).toBeInTheDocument();
    expect(screen.getByText("Discount 5%")).toBeInTheDocument();
    expect(screen.getByText("CASH")).toBeInTheDocument();
    expect(screen.getByText("PRODUCT")).toBeInTheDocument();
    for (const header of ["Item", "Kind", "Qty", "Karat", "Weight", "Rate at Sale", "Price"]) {
      expect(screen.getByRole("columnheader", { name: header })).toBeInTheDocument();
    }
    fireEvent.click(screen.getAllByRole("button", { name: "Refund" })[0]);
    const dialog = screen.getByRole("heading", { name: "Refund item" }).parentElement?.parentElement as HTMLElement;
    expect(within(dialog).getByLabelText("Quantity to refund (max 2)")).toHaveValue(2);
    expect(within(dialog).getByText(/Returned to customer/)).toHaveTextContent(
      "Returned to customer ≈ $212.00 (incl. 11% VAT, less 5% discount) · returns 2 unit(s) to stock.",
    );
  });
});

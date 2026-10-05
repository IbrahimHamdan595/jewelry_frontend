import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within, waitFor, act } from "@testing-library/react";
import OrderDetailPage from "@/app/admin/orders/[id]/page";
import { LanguageProvider } from "@/context/LanguageContext";
import ar from "@/i18n/ar";

const swr = vi.hoisted(() => ({ data: undefined as unknown }));
vi.mock("swr", () => ({ default: () => ({ data: swr.data, error: undefined, isLoading: false, isValidating: false, mutate: vi.fn() }) }));
vi.mock("next/navigation", () => ({ useParams: () => ({ id: "o1" }) }));
const api = vi.hoisted(() => ({ post: vi.fn<(path: string, body?: unknown) => Promise<unknown>>(() => Promise.resolve({})) }));
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

/** globals.css lays .font-mono out left-to-right in RTL: fine for codes, wrong for Arabic words. */
function arabicInMono(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll(".font-mono")).map((el) => el.textContent ?? "").filter((text) => /[\u0600-\u06FF]/.test(text));
}

/** Every <label> on screen must reach a control: a click focuses it and it names the field. */
function labelsWithoutControl(): string[] {
  return Array.from(document.querySelectorAll("label")).filter((label) => label.control === null).map((label) => label.textContent ?? "");
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
    expect(arabicInMono(container)).toEqual([]);
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
    expect(document.querySelectorAll("label")).toHaveLength(1);
    expect(labelsWithoutControl()).toEqual([]);
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

  it("refund quantity is always a whole number between 1 and what is left to refund", () => {
    renderPage("ar");
    fireEvent.click(screen.getAllByRole("button", { name: ar.orders.refund })[0]);
    const qty = screen.getByLabelText(ar.orders.refundQty(2));
    expect(qty).toHaveAttribute("step", "1");
    const cases: [typed: string, kept: number][] = [["1.5", 1], ["2.9", 2], ["0.4", 1], ["-3", 1], ["9", 2], ["2.0", 2], ["", 1]];
    for (const [typed, kept] of cases) {
      fireEvent.change(qty, { target: { value: typed } });
      expect(qty, `typed "${typed}"`).toHaveValue(kept);
    }
  });

  it("a typed 1.5 reaches the API as a whole unit, never as 1.5", () => {
    renderPage("ar");
    fireEvent.click(screen.getAllByRole("button", { name: ar.orders.refund })[0]);
    fireEvent.change(screen.getByLabelText(ar.orders.refundQty(2)), { target: { value: "1.5" } });
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

describe("order detail: voiding an order", () => {
  beforeEach(() => api.post.mockReset().mockResolvedValue({}));

  function openVoidPanel(reason?: string) {
    renderPage("ar");
    fireEvent.click(screen.getByRole("button", { name: ar.orders.voidOrder }));
    if (reason !== undefined) fireEvent.change(screen.getByLabelText(ar.orders.voidReason), { target: { value: reason } });
  }
  const confirm = () => fireEvent.click(screen.getByRole("button", { name: ar.orders.confirmVoid }));

  it("says a reason is needed instead of silently doing nothing", () => {
    openVoidPanel();
    confirm();
    expect(screen.getByRole("alert")).toHaveTextContent(ar.orders.voidReasonRequired);
    expect(api.post).not.toHaveBeenCalled();
  });

  it("does not take blank space for a reason", () => {
    openVoidPanel("   ");
    confirm();
    expect(screen.getByRole("alert")).toHaveTextContent(ar.orders.voidReasonRequired);
    expect(api.post).not.toHaveBeenCalled();
  });

  it("locks the panel while the request is out, then closes it", async () => {
    let finish: (value: unknown) => void = () => {};
    api.post.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    openVoidPanel("duplicate sale");
    confirm();
    expect(screen.getByRole("button", { name: ar.orders.voiding })).toBeDisabled();
    expect(screen.getByRole("button", { name: ar.orders.dismiss })).toBeDisabled();
    expect(screen.getByLabelText(ar.orders.voidReason)).toBeDisabled();
    expect(api.post).toHaveBeenCalledWith("/orders/o1/void", { reason: "duplicate sale" });
    await act(async () => finish({}));
    await waitFor(() => expect(screen.queryByLabelText(ar.orders.voidReason)).toBeNull());
  });

  it("stays open and shows the server's reason when the void fails", async () => {
    api.post.mockRejectedValueOnce(new Error("Order already voided"));
    openVoidPanel("duplicate sale");
    confirm();
    expect(await screen.findByRole("alert")).toHaveTextContent("Order already voided");
    expect(screen.getByRole("button", { name: ar.orders.confirmVoid })).toBeEnabled();
    expect(screen.getByLabelText(ar.orders.voidReason)).toHaveValue("duplicate sale");
  });

  it("falls back to a translated message when the failure carries none", async () => {
    api.post.mockRejectedValueOnce({});
    openVoidPanel("duplicate sale");
    confirm();
    expect(await screen.findByRole("alert")).toHaveTextContent(ar.orders.voidFailed);
  });

  it("does not carry an old error into a reopened panel", async () => {
    api.post.mockRejectedValueOnce({});
    openVoidPanel("duplicate sale");
    confirm();
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: ar.orders.dismiss }));
    fireEvent.click(screen.getByRole("button", { name: ar.orders.voidOrder }));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("reads in English too", () => {
    renderPage("en");
    fireEvent.click(screen.getByRole("button", { name: "Void Order" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm Void" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a reason for voiding this order.");
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
    expect(screen.getByText("PRODUCT")).toHaveClass("ltr:font-mono");
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

// The backend PaymentMethod enum (app/models/__init__.py) has four values; the
// frontend type knew three. CREDIT — a sale on account — printed as the raw code.
describe("order detail: every payment method the API can send is named", () => {
  it.each(["CASH", "CARD", "MIXED", "CREDIT"] as const)("%s is translated in Arabic", (method) => {
    renderPage("ar", order({ payment_method: method }));
    const value = screen.getByText(ar.orders.paymentMethod).nextElementSibling;
    expect(value).toHaveTextContent(ar.checkout.paymentMethods[method]);
    expect(value?.textContent).toMatch(/[\u0600-\u06FF]/);
    expect(value).not.toHaveTextContent(method);
  });

  it("CREDIT reads as CREDIT in English, like the other three", () => {
    renderPage("en", order({ payment_method: "CREDIT" }));
    expect(screen.getByText("Payment Method").nextElementSibling).toHaveTextContent("CREDIT");
  });
});

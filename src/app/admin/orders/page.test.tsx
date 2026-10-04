import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import OrdersPage from "@/app/admin/orders/page";
import { LanguageProvider } from "@/context/LanguageContext";
import ar from "@/i18n/ar";

const order = { id: "o1", order_number: "ORD-20260905-002", created_at: "2026-09-05T10:00:00Z", cashier: { name: "Ibrahim" }, customer_name: null, item_count: 2, total_usd: "614.68", status: "COMPLETED" };
const purchase = { id: "p1", supplier_id: "s1", supplier_name: "Abu Ali", occurred_at: "2026-09-05T10:00:00Z", payment_mode: "MIXED", item_count: 3, total_cash_due: "1200.00", total_grams_due_by_karat: { K21: "12.5" } };
const buyback = { id: "b1", occurred_at: "2026-09-05T10:00:00Z", seller_name: "Rana Haddad", seller_phone: "+961-03-123456", kind: "USED_PRODUCT", karat: "K18", weight_grams: "4.2", quantity: 1, buy_price_usd: "310.00" };
const sales = { items: [order], total: 45, page: 1, page_size: 20, total_revenue: "614.68", avg_order_value: "614.68" };
const pages: [string, unknown][] = [
  ["/orders", sales],
  ["/suppliers/purchases/list", { items: [purchase], total: 1 }],
  ["/buybacks", { items: [buyback], total: 1 }],
];
const swr = vi.hoisted(() => ({ empty: false }));
vi.mock("swr", () => ({
  default: (key: string) => {
    const page = pages.find(([prefix]) => key?.startsWith(prefix))?.[1] as { items: unknown[] } | undefined;
    return { data: page && swr.empty ? { ...page, items: [], total: 0 } : page, error: undefined, isLoading: false, isValidating: false, mutate: vi.fn() };
  },
}));
vi.mock("@/lib/api-client", () => ({ apiFetcher: vi.fn(), apiUrl: (p: string) => "/api" + p, api: {} }));

// Database values and format names: not interface copy.
const DATA = ["ORD-20260905-002", "Ibrahim", "Abu Ali", "Rana Haddad", "CSV"];
// Shared components outside this screen's slice that still print English:
// StatusBadge lowercases the order-status enum, CalendarFilter names its ranges.
const SHARED = ["completed", "All time", "day", "month", "year"];

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

function renderPage(lang: "en" | "ar") {
  return render(<LanguageProvider initialLang={lang}><OrdersPage /></LanguageProvider>);
}

describe("orders list in Arabic (NEX-63)", () => {
  it("isolates the order number left-to-right", () => {
    renderPage("ar");
    const number = screen.getByText("ORD-20260905-002").closest("bdi");
    expect(number).toHaveAttribute("dir", "ltr");
  });

  // The Arabic header is a translated word now (NEX-64) and has no "#" to
  // drift; the English one still has, and is still isolated.
  it("isolates the '#' header left-to-right wherever the header has one", () => {
    renderPage("en");
    const header = screen.getByText("Order #").closest("bdi");
    expect(header).not.toBeNull();
    expect(header).toHaveAttribute("dir", "ltr");
  });

  it("shows the order date with an Arabic month name", () => {
    renderPage("ar");
    expect(screen.getByText(/أيلول|سبتمبر/)).toBeInTheDocument();
  });
});

describe("orders list in Arabic (NEX-64)", () => {
  it("sell tab: no English left in the title, tabs, stats, filters, headers, links or pager", () => {
    const { container } = renderPage("ar");
    for (const english of ["Transactions", "Export CSV", "Sell", "Supplier Purchases", "Buybacks", "Total Orders", "Revenue", "Avg Order Value", "All", "voided", "partially refunded", "Order #", "Date", "Cashier", "Customer", "Items", "Total", "Status", "View", "Receipt", "Prev", "Next"]) {
      expect(screen.queryByText(english), english).toBeNull();
    }
    expect(screen.getByRole("columnheader", { name: ar.dashboard.orderNum })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: ar.orders.status.PARTIALLY_REFUNDED })).toBeInTheDocument();
    expect(screen.getByText(ar.orders.showing(1, 20, 45))).toBeInTheDocument();
    expect(englishLeft(container)).toEqual([]);
  });

  it("supplier purchases tab: headers, payment mode and gram unit are Arabic", () => {
    const { container } = renderPage("ar");
    fireEvent.click(screen.getByRole("button", { name: ar.orders.tabPurchases }));
    for (const english of ["Supplier", "Mode", "Cash Due", "Gold Due", "MIXED", "Receipt"]) {
      expect(screen.queryByText(english), english).toBeNull();
    }
    expect(screen.getByText(ar.orders.purchaseMode.MIXED)).toBeInTheDocument();
    expect(screen.getByText(`K21 12.50${ar.dashboard.grams}`)).toBeInTheDocument();
    expect(englishLeft(container)).toEqual([]);
  });

  it("buybacks tab: headers and the buyback kind are Arabic", () => {
    const { container } = renderPage("ar");
    fireEvent.click(screen.getByRole("button", { name: ar.orders.tabBuybacks }));
    for (const english of ["Seller", "Kind", "Karat / Weight", "Qty", "Paid", "USED PRODUCT", "Receipt"]) {
      expect(screen.queryByText(english), english).toBeNull();
    }
    expect(screen.getByText(ar.orders.buybackKind.USED_PRODUCT)).toBeInTheDocument();
    expect(englishLeft(container)).toEqual([]);
  });

  it("translates each tab's empty state", () => {
    swr.empty = true;
    try {
      renderPage("ar");
      expect(screen.getByText(ar.orders.emptySell)).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: ar.orders.tabPurchases }));
      expect(screen.getByText(ar.orders.emptyPurchases)).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: ar.orders.tabBuybacks }));
      expect(screen.getByText(ar.orders.emptyBuybacks)).toBeInTheDocument();
    } finally {
      swr.empty = false;
    }
  });
});

describe("orders list in English is unchanged", () => {
  it("keeps the original wording", () => {
    renderPage("en");
    expect(screen.getByRole("heading", { name: "Transactions" })).toBeInTheDocument();
    expect(screen.getByText("Showing 1–20 of 45")).toBeInTheDocument();
    for (const filter of ["All", "completed", "partially refunded", "refunded", "voided"]) {
      expect(screen.getByRole("button", { name: filter })).toBeInTheDocument();
    }
    fireEvent.click(screen.getByRole("button", { name: "Supplier Purchases" }));
    expect(screen.getByText("MIXED")).toBeInTheDocument();
    expect(screen.getByText("K21 12.50g")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Buybacks" }));
    expect(screen.getByText("USED PRODUCT")).toBeInTheDocument();
    expect(screen.getByText("4.200g")).toBeInTheDocument();
  });
});

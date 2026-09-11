import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import OrdersPage from "@/app/admin/orders/page";
import { LanguageProvider } from "@/context/LanguageContext";

const order = { id: "o1", order_number: "ORD-20260905-002", created_at: "2026-09-05T10:00:00Z", cashier: { name: "Ibrahim" }, customer_name: null, item_count: 2, total_usd: "614.68", status: "COMPLETED" };
vi.mock("swr", () => ({ default: (key: string) => ({ data: key?.startsWith("/orders") ? { items: [order], total: 1, page: 1, page_size: 20 } : undefined, error: undefined, isLoading: false, isValidating: false, mutate: vi.fn() }) }));
vi.mock("@/lib/api-client", () => ({ apiFetcher: vi.fn(), apiUrl: (p: string) => "/api" + p, api: {} }));

describe("orders list in Arabic (NEX-63)", () => {
  it("isolates the order number and the '#' header left-to-right", () => {
    render(<LanguageProvider initialLang="ar"><OrdersPage /></LanguageProvider>);
    const header = screen.getByText("Order #").closest("bdi");
    expect(header).not.toBeNull();
    expect(header).toHaveAttribute("dir", "ltr");
    const number = screen.getByText("ORD-20260905-002").closest("bdi");
    expect(number).toHaveAttribute("dir", "ltr");
  });

  it("shows the order date with an Arabic month name", () => {
    render(<LanguageProvider initialLang="ar"><OrdersPage /></LanguageProvider>);
    expect(screen.getByText(/أيلول|سبتمبر/)).toBeInTheDocument();
  });
});

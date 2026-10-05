import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ProductsPage from "@/app/admin/products/page";
import { LanguageProvider } from "@/context/LanguageContext";
import ar from "@/i18n/ar";

const product = (over: Record<string, unknown>) => ({
  id: "p1", code: "RNG-0042", name_en: "Twisted Ring", name_ar: "خاتم مجدول", category: "Rings", category_id: "c1",
  karat: "K21", weight_grams: 4.25, margin_percent: 10, making_charge: 15, photos: [], is_active: true,
  on_hand_qty: 1, min_stock_qty: 2, is_used: true, cost_basis_usd: null, status: "RESERVED",
  source_ref_type: null, source_ref_id: null, stone_value_usd: 120, stone_cost_usd: null, stone_carats: null,
  stone_count: null, stone_cert: null, stone_note: null, created_at: "2026-09-05T10:00:00Z", updated_at: "2026-09-05T10:00:00Z", ...over,
});
const list = { items: [product({}), product({ id: "p2", code: "BRC-0007", name_en: "Rope Bracelet", is_active: false, is_used: false, status: "AVAILABLE", stone_value_usd: null, on_hand_qty: 5, min_stock_qty: null })], total: 45, page: 1, page_size: 20 };
vi.mock("swr", () => ({
  default: (key: string) => ({ data: key === "/categories" ? [{ id: "c1", name_en: "Rings", name_ar: "خواتم" }] : key?.startsWith("/products") ? list : undefined, error: undefined, isLoading: false, isValidating: false, mutate: vi.fn() }),
}));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(), useRouter: () => ({ replace: vi.fn() }), usePathname: () => "/admin/products" }));
const gold = vi.hoisted(() => ({ rate: { rate_24k: 100 } as unknown }));
vi.mock("@/hooks/useGoldRate", () => ({ useGoldRate: () => ({ rate: gold.rate }) }));
vi.mock("@/lib/api-client", () => ({ apiFetcher: vi.fn(), api: { patch: vi.fn(), delete: vi.fn() } }));

// Database values: product names and codes, and the category name.
const DATA = ["Twisted Ring", "Rope Bracelet", "RNG-0042", "BRC-0007", "Rings"];

/** Text a user reads or a screen reader announces, minus the given data values. */
function englishLeft(root: HTMLElement): string[] {
  const found: string[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) found.push(walker.currentNode.textContent ?? "");
  root.querySelectorAll("[placeholder],[title],[aria-label],[alt]").forEach((el) => {
    for (const attr of ["placeholder", "title", "aria-label", "alt"]) found.push(el.getAttribute(attr) ?? "");
  });
  return found
    .map((text) => DATA.reduce((rest, value) => rest.split(value).join(""), text).trim())
    .filter((text) => /[A-Za-z]{2,}/.test(text));
}

/** globals.css lays .font-mono out left-to-right in RTL: fine for codes, wrong for Arabic words. */
function arabicInMono(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll(".font-mono")).map((el) => el.textContent ?? "").filter((text) => /[\u0600-\u06FF]/.test(text));
}

function renderPage(lang: "en" | "ar") {
  return render(<LanguageProvider initialLang={lang}><ProductsPage /></LanguageProvider>);
}

describe("products list in Arabic (NEX-64)", () => {
  it("leaves no English behind: title, tabs, filters, headers, badges, pager", () => {
    const { container } = renderPage("ar");
    for (const english of ["Products", "Add Product", "Coins", "Ounces", "All categories", "All", "Image", "Code", "Name", "Category", "Karat", "Weight", "Stock", "Live Price", "Status", "Actions", "USED", "RESERVED", "low", "Prev", "Next"]) {
      expect(screen.queryByText(english), english).toBeNull();
    }
    expect(screen.getByText(ar.products.status.RESERVED)).toBeInTheDocument();
    expect(screen.getByText(ar.products.usedBadge)).toBeInTheDocument();
    expect(screen.getByText(ar.orders.showing(1, 20, 45))).toBeInTheDocument();
    expect(englishLeft(container)).toEqual([]);
    expect(arabicInMono(container)).toEqual([]);
  });

  it("names the filters and the icon-only row controls", () => {
    renderPage("ar");
    expect(screen.getByLabelText(ar.products.searchPlaceholder)).toHaveAttribute("placeholder", ar.products.searchPlaceholder);
    expect(screen.getByLabelText(ar.products.category).tagName).toBe("SELECT");
    expect(screen.getByRole("button", { name: ar.products.deactivate })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: ar.products.activate })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: ar.common.edit })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: ar.deleteDialog.confirm })).toHaveLength(2);
  });

  it("opens the delete confirmation in Arabic", () => {
    const { container } = renderPage("ar");
    fireEvent.click(screen.getAllByRole("button", { name: ar.deleteDialog.confirm })[0]);
    expect(screen.getByText(ar.deleteDialog.title)).toBeInTheDocument();
    expect(screen.getByText("Twisted Ring (RNG-0042)")).toBeInTheDocument();
    expect(englishLeft(container)).toEqual([]);
  });
});

describe("products list in English is unchanged", () => {
  it("keeps the original wording", () => {
    renderPage("en");
    expect(screen.getByRole("heading", { name: "Products" })).toBeInTheDocument();
    expect(screen.getByText("Showing 1–20 of 45")).toBeInTheDocument();
    expect(screen.getByText("USED")).toBeInTheDocument();
    expect(screen.getByText("RESERVED")).toBeInTheDocument();
    expect(screen.getByText("💎 Stones")).toBeInTheDocument();
    expect(screen.getByText("low")).toBeInTheDocument();
    expect(screen.getAllByText("4.25g")).toHaveLength(2);
    for (const header of ["Image", "Code", "Name", "Category", "Karat", "Weight", "Stock", "Live Price", "Status", "Actions"]) {
      expect(screen.getByRole("columnheader", { name: header })).toBeInTheDocument();
    }
  });
});

// NEX-54: the Live Price column is computed from GET /gold-price, whose rates are
// moving from JSON numbers to exact decimal strings.
describe("products list — live price from a string or a number rate (NEX-54)", () => {
  afterEach(() => { gold.rate = { rate_24k: 100 }; });

  const livePrices = () => screen.getAllByRole("row").slice(1).map((row) => row.querySelectorAll("td")[7].textContent);

  it("prices every row identically for both shapes", () => {
    // 141.66 × 0.875 × 4.25 g = 526.80 → +10% = 579.48 → + $15 making = 594.48
    gold.rate = { rate_24k: 141.66 };
    const numeric = renderPage("en");
    expect(livePrices()).toEqual(["$594.48", "$594.48"]);
    numeric.unmount();

    gold.rate = { rate_24k: "141.66" };
    renderPage("en");
    expect(livePrices()).toEqual(["$594.48", "$594.48"]);
  });

  it("shows the missing-amount dash, never a price built on zero, when the rate cannot be read", () => {
    gold.rate = { rate_24k: "n/a" };
    renderPage("en");
    expect(livePrices()).toEqual(["—", "—"]);
  });
});

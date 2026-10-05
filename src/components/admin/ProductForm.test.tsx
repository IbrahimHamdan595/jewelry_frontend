import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProductForm } from "@/components/admin/ProductForm";
import { LanguageProvider } from "@/context/LanguageContext";
import en from "@/i18n/en";
import ar from "@/i18n/ar";
import type { Product } from "@/types/api";

const swr = vi.hoisted(() => ({ byKey: {} as Record<string, unknown> }));
vi.mock("swr", () => ({ default: (key: string) => ({ data: swr.byKey[key], error: undefined, isLoading: false, isValidating: false, mutate: vi.fn() }) }));
const RATE = { rate_24k: 100, rate_22k: 91.7, rate_21k: 87.5, rate_18k: 75, source: "t", fetched_at: "2026-09-09T00:00:00Z", is_stale: false, market_closed: false };
const gold = vi.hoisted(() => ({ rate: undefined as unknown }));
vi.mock("@/hooks/useGoldRate", () => ({
  useGoldRate: () => ({ rate: gold.rate, refresh: vi.fn(), error: undefined, isLoading: false, isValidating: false }),
}));
vi.mock("@/lib/api-client", async (orig) => ({ ...(await orig<typeof import("@/lib/api-client")>()), apiFetcher: vi.fn(), uploadFile: vi.fn() }));

function renderForm(lang: "en" | "ar", initial?: Product) {
  return render(
    <LanguageProvider initialLang={lang}>
      <ProductForm onSave={vi.fn()} initial={initial} />
    </LanguageProvider>,
  );
}

const STONE_KEYS = ["stones", "carats", "stoneCount", "certificate", "stoneValue", "stoneNote", "stoneDetails"] as const;

describe("ProductForm labels and i18n (NEX-64)", () => {
  beforeEach(() => {
    localStorage.clear();
    gold.rate = RATE;
    swr.byKey = { "/categories": [], "/settings": { markup_k18: 0, markup_k21: 0, markup_k24: 0 } };
  });

  it("every field is reachable by its label", () => {
    renderForm("en");
    for (const text of [en.common.nameEn, en.common.nameAr, en.products.category, en.products.weightGrams, en.products.marginPct, en.products.makingUsd, en.products.qtyOnHand, en.products.lowStockAlert]) {
      expect(screen.getByLabelText(text), text).toBeInTheDocument();
    }
    fireEvent.click(screen.getByLabelText(en.products.hasStones));
    for (const text of [en.products.stoneValue, en.products.stoneCost, en.products.carats, en.products.stoneCount, en.products.certificate, en.products.stoneNote]) {
      expect(screen.getByLabelText(text), text).toBeInTheDocument();
    }
  });

  it("clicking a label reaches its control", () => {
    renderForm("en");
    const input = screen.getByLabelText(en.products.weightGrams);
    const label = screen.getByText(en.products.weightGrams).closest("label") as HTMLLabelElement;
    expect(label.control).toBe(input);
  });

  it("renders the stone section in Arabic with no English left behind", () => {
    renderForm("ar");
    fireEvent.click(screen.getByLabelText(ar.products.hasStones));
    expect(screen.getByLabelText(ar.products.carats)).toBeInTheDocument();
    expect(screen.getByLabelText(ar.products.stoneCount)).toBeInTheDocument();
    for (const english of ["Carats", "Stone count", "Has diamonds / stones", "Stone value (USD)", "Certificate #", "Weight (g)", "Live Preview", "Save Product"]) {
      expect(screen.queryByText(english), english).toBeNull();
    }
  });

  it("uses the dictionary for the preview and the buttons too", () => {
    renderForm("ar");
    expect(screen.getByText(ar.products.livePreview)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: ar.products.saveProduct })).toBeInTheDocument();
  });
});

describe("stone keys are translated, not English placeholders", () => {
  it.each(STONE_KEYS)("ar.products.%s differs from English", (key) => {
    expect(ar.products[key]).not.toBe(en.products[key]);
    expect(ar.products[key]).toMatch(/[؀-ۿ]/);
  });
});

// NEX-54: GET /gold-price is moving its rates from JSON numbers to exact decimal
// strings, and the live preview prices the piece from the 24K rate.
describe("ProductForm live preview — rate as a decimal string or a number (NEX-54)", () => {
  beforeEach(() => {
    localStorage.clear();
    swr.byKey = { "/categories": [], "/settings": { markup_k18: "0.50", markup_k21: "1.25", markup_k24: "0.00" } };
  });

  /** The preview panel's text once a 4.25 g piece is typed in (K21, 15% margin, $25 making by default). */
  function preview(rate: unknown) {
    gold.rate = rate;
    const view = renderForm("en");
    fireEvent.change(screen.getByLabelText(en.products.weightGrams), { target: { value: "4.25" } });
    const panel = screen.getByText(en.products.livePreview).closest(".col-span-2") as HTMLElement;
    const text = panel.textContent ?? "";
    view.unmount();
    return text;
  }

  it("prices the piece identically for both shapes", () => {
    const numeric = preview({ ...RATE, rate_24k: 141.66 });
    const exact = preview({ ...RATE, rate_24k: "141.66", rate_22k: "129.90", rate_21k: "123.95", rate_18k: "106.25" });
    expect(exact).toBe(numeric);
    // 141.66 × 0.875 = 123.9525 → +1.25 markup = 125.2025/g → × 4.25 g = 532.11
    // → +15% = 611.93 → + $25 making = 636.93
    expect(numeric).toContain("$141.66/g");
    expect(numeric).toContain("$123.95/g");
    expect(numeric).toContain("$636.93");
  });

  it("shows no price at all — not a price built on zero — when the rate cannot be read", () => {
    const text = preview({ ...RATE, rate_24k: "n/a" });
    expect(text).toContain(en.products.previewHint);
    expect(text).not.toContain("$");
    expect(text).not.toContain("NaN");
  });
});

// ProductOut as GET /products/{id} sends it (app/schemas/product.py): Decimal
// columns are strings at their scale, so a product without stones that was
// once saved with the box ticked comes back as "0.00" — a truthy string.
describe("ProductForm — 'has stones' when editing a product", () => {
  beforeEach(() => {
    localStorage.clear();
    gold.rate = RATE;
    swr.byKey = { "/categories": [], "/settings": { markup_k18: "0.00", markup_k21: "0.00", markup_k24: "0.00" } };
  });

  const product = (stones: Record<string, unknown>) => ({
    id: "8f3a1c2e", code: "FN-21K-0001", name_en: "Twisted Ring", name_ar: "خاتم مجدول", category: "Rings", category_id: null,
    karat: "K21", weight_grams: "5.000", margin_percent: "10.00", making_charge: "15.00", photos: [], is_active: true,
    on_hand_qty: 1, min_stock_qty: null, is_used: false, cost_basis_usd: null, status: "AVAILABLE", source_ref_type: null, source_ref_id: null,
    stone_value_usd: null, stone_cost_usd: null, stone_carats: null, stone_count: null, stone_cert: null, stone_note: null,
    created_at: "2026-09-05T10:00:00Z", updated_at: "2026-09-05T10:00:00Z", ...stones,
  }) as unknown as Product;
  const box = () => screen.getByLabelText(en.products.hasStones) as HTMLInputElement;

  it.each([
    ['"0.00"', "0.00"],
    ["0", 0],
    ["null", null],
    ['"n/a"', "n/a"],
  ])("a stone value of %s is not a stone: the box is clear and the stone fields stay closed", (_name, stone_value_usd) => {
    renderForm("en", product({ stone_value_usd }));
    expect(box()).not.toBeChecked();
    expect(screen.queryByLabelText(en.products.stoneValue)).toBeNull();
  });

  it.each([
    ['"12.50"', "12.50"],
    ["12.5", 12.5],
  ])("a stone value of %s ticks the box and fills the field with the number", (_name, stone_value_usd) => {
    renderForm("en", product({ stone_value_usd, stone_cost_usd: "8.00", stone_carats: "0.250" }));
    expect(box()).toBeChecked();
    expect(screen.getByLabelText(en.products.stoneValue)).toHaveValue(12.5);
    expect(screen.getByLabelText(en.products.stoneCost)).toHaveValue(8);
    expect(screen.getByLabelText(en.products.carats)).toHaveValue(0.25);
  });

  it("the preview adds the stones only when the box is ticked", () => {
    const previewOf = (stone_value_usd: unknown) => {
      const view = renderForm("en", product({ stone_value_usd }));
      const text = (screen.getByText(en.products.livePreview).closest(".col-span-2") as HTMLElement).textContent ?? "";
      view.unmount();
      return text;
    };
    // 100 × 0.875 × 5 g = 437.50 → +10% = 481.25 → + $15 making = 496.25; stones add 12.50.
    expect(previewOf("0.00")).toContain("$496.25");
    expect(previewOf("0.00")).not.toContain(en.products.stones);
    expect(previewOf("12.50")).toContain("$508.75");
  });

  // Saving with the box clear sends every stone field as null. A piece whose
  // stones were recorded without a value must not open with the box clear, or
  // the next save would wipe its carats and certificate.
  it.each([
    ["carats", { stone_carats: "0.500" }],
    ["a certificate", { stone_cert: "GIA-2201" }],
    ["a stone count", { stone_count: 3 }],
    ["a note", { stone_note: "centre stone chipped" }],
    ["a stone cost", { stone_cost_usd: "40.00" }],
  ])("a piece with %s recorded but no stone value still has stones", (_name, details) => {
    renderForm("en", product({ stone_value_usd: "0.00", ...details }));
    expect(box()).toBeChecked();
  });

  it("zeros in every stone field are not stones", () => {
    renderForm("en", product({ stone_value_usd: "0.00", stone_cost_usd: "0.00", stone_carats: "0.000", stone_count: 0, stone_cert: "", stone_note: null }));
    expect(box()).not.toBeChecked();
  });
});

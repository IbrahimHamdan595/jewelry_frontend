import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProductForm } from "@/components/admin/ProductForm";
import { LanguageProvider } from "@/context/LanguageContext";
import en from "@/i18n/en";
import ar from "@/i18n/ar";

const swr = vi.hoisted(() => ({ byKey: {} as Record<string, unknown> }));
vi.mock("swr", () => ({ default: (key: string) => ({ data: swr.byKey[key], error: undefined, isLoading: false, isValidating: false, mutate: vi.fn() }) }));
vi.mock("@/hooks/useGoldRate", () => ({
  useGoldRate: () => ({ rate: { rate_24k: 100, rate_22k: 91.7, rate_21k: 87.5, rate_18k: 75, source: "t", fetched_at: "2026-09-09T00:00:00Z", is_stale: false, market_closed: false }, refresh: vi.fn(), error: undefined, isLoading: false, isValidating: false }),
}));
vi.mock("@/lib/api-client", () => ({ apiFetcher: vi.fn(), uploadFile: vi.fn() }));

function renderForm(lang: "en" | "ar") {
  return render(
    <LanguageProvider initialLang={lang}>
      <ProductForm onSave={vi.fn()} />
    </LanguageProvider>,
  );
}

const STONE_KEYS = ["stones", "carats", "stoneCount", "certificate", "stoneValue", "stoneNote", "stoneDetails"] as const;

describe("ProductForm labels and i18n (NEX-64)", () => {
  beforeEach(() => {
    localStorage.clear();
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

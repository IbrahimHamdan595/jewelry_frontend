import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import LotsPage from "@/app/admin/inventory/lots/page";
import { LanguageProvider } from "@/context/LanguageContext";
import en from "@/i18n/en";
import ar from "@/i18n/ar";

const swr = vi.hoisted(() => ({ lots: undefined as unknown, totals: undefined as unknown }));
vi.mock("swr", () => ({
  default: (key: string) => ({
    data: key.startsWith("/lots/totals") ? swr.totals : swr.lots,
    error: undefined, isLoading: false, isValidating: false, mutate: vi.fn(),
  }),
}));
vi.mock("@/lib/api-client", () => ({ apiFetcher: vi.fn(), api: { post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));

const base = { source_ref_type: null, source_ref_id: null, notes: null, acquired_at: "2026-09-05T10:00:00Z", created_at: "2026-09-05T10:00:00Z", updated_at: "2026-09-05T10:00:00Z" };
const LOTS = {
  items: [
    { ...base, id: "l1", karat: "K21", weight_grams: 20, weight_remaining_grams: 12.5, source: "SEED", cost_basis_usd: 1234, is_depleted: false },
    { ...base, id: "l2", karat: "K18", weight_grams: 5, weight_remaining_grams: 0, source: "BUYBACK", cost_basis_usd: 300, is_depleted: true },
  ],
  total: 2, page: 1, page_size: 50,
};
const TOTALS = { by_karat: [{ karat: "K21", total_remaining_grams: 12.5, lot_count: 1, cost_basis_remaining_usd: 1234 }], grand_total_remaining_grams: 12.5 };

function renderPage(lang: "en" | "ar") {
  return render(<LanguageProvider initialLang={lang}><LotsPage /></LanguageProvider>);
}

/** Opens the new-lot form and the adjust dialog, so every string on the screen is rendered. */
function openEverything(dict: typeof en) {
  fireEvent.click(screen.getByRole("button", { name: dict.lots.newLot }));
  fireEvent.click(screen.getAllByRole("button", { name: dict.lots.manualAdjustment })[0]);
}

/** The field a label names, checked both ways: by its text and through label.control. */
function expectLabelled(text: string) {
  const control = screen.getByLabelText(text);
  const label = control.closest("label") as HTMLLabelElement;
  expect(label, text).not.toBeNull();
  expect(label.control, text).toBe(control);
}

/** Everything a user reads or hears: text nodes plus placeholder, title, aria-label and alt. */
function uiStrings(): string[] {
  const out: string[] = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) out.push(walker.currentNode.textContent ?? "");
  document.body.querySelectorAll("*").forEach((el) => {
    for (const attr of ["placeholder", "title", "aria-label", "alt"]) {
      const value = el.getAttribute(attr);
      if (value) out.push(value);
    }
  });
  return out.map((s) => s.trim()).filter(Boolean);
}
/** A run of two or more Latin letters is a word; "K21", "g" and "$1,234.00" are not. */
const hasEnglishWord = (s: string) => /[A-Za-z]{2,}/.test(s);

beforeEach(() => {
  swr.lots = LOTS;
  swr.totals = TOTALS;
});

describe("lots labels (NEX-64)", () => {
  it("every field in the new-lot form is reachable by its label", () => {
    renderPage("en");
    fireEvent.click(screen.getByRole("button", { name: en.lots.newLot }));
    for (const text of [en.lots.karat, en.lots.weightG, en.lots.source, en.lots.costBasisUsd, en.lots.notesOptional]) {
      expectLabelled(text);
    }
  });

  it("every field in the adjust dialog is reachable by its label", () => {
    renderPage("en");
    fireEvent.click(screen.getAllByRole("button", { name: en.lots.manualAdjustment })[0]);
    for (const text of [en.lots.deltaG, en.lots.reason, en.lots.notesRequired]) expectLabelled(text);
    // The hint sits beside the label, not inside it, so it stays out of the field's name.
    expect(screen.getByLabelText(en.lots.deltaG)).toHaveAccessibleName(en.lots.deltaG);
  });

  it("no form control is left without a name", () => {
    renderPage("en");
    openEverything(en);
    const controls = Array.from(document.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input, select, textarea"));
    expect(controls.length).toBe(10);
    for (const control of controls) {
      expect(control.labels?.length || control.getAttribute("aria-label"), control.outerHTML).toBeTruthy();
    }
    expect(screen.getByLabelText(en.lots.filterByKarat).tagName).toBe("SELECT");
    expectLabelled(en.lots.includeDepleted);
  });

  it("names the icon-only adjust button and the empty header cell", () => {
    renderPage("ar");
    expect(screen.getAllByRole("button", { name: ar.lots.manualAdjustment })).toHaveLength(2);
    expect(screen.getByRole("columnheader", { name: ar.common.actions })).toBeInTheDocument();
  });
});

describe("lots in Arabic (NEX-64)", () => {
  it("leaves no English behind — page, new-lot form and adjust dialog", () => {
    renderPage("ar");
    openEverything(ar);
    for (const english of ["New Lot", "All karats", "Include depleted", "Remaining / Original", "Source", "Cost basis", "Acquired", "Status", "Active", "Depleted", "SEED", "ADJUSTMENT", "BUYBACK", "New Pure-Gold Lot", "Weight (g)", "Cost basis (USD)", "Notes (optional)", "Create Lot", "Cancel", "Adjust lot", "Delta (g)", "Reason", "CORRECTION", "LOSS", "Notes (required)", "Apply"]) {
      expect(screen.queryByText(english), english).toBeNull();
    }
    expect(uiStrings().filter(hasEnglishWord)).toEqual([]);
  });

  it("shows the Arabic copy, including enum values and the per-karat pool cards", () => {
    renderPage("ar");
    openEverything(ar);
    expect(screen.getByText(ar.lots.poolTitle("K21"))).toBeInTheDocument();
    expect(screen.getByText(ar.lots.lotCount(1), { exact: false })).toBeInTheDocument();
    expect(screen.getAllByText(ar.lots.lotCount(0))).toHaveLength(3);
    expect(screen.getAllByText(ar.lots.sources.SEED).length).toBeGreaterThan(0);
    expect(screen.getByText(ar.lots.sources.BUYBACK)).toBeInTheDocument();
    expect(screen.getByText(ar.lots.depleted)).toBeInTheDocument();
    expect(screen.getByRole("option", { name: ar.lots.reasons.THEFT })).toHaveValue("THEFT");
    expect(screen.getByLabelText(ar.lots.deltaG)).toHaveAttribute("placeholder", ar.lots.deltaPlaceholder);
    expect(screen.getByRole("button", { name: ar.lots.createLot })).toBeInTheDocument();
  });

  it("keeps money and identifiers left-to-right inside Arabic text", () => {
    renderPage("ar");
    openEverything(ar);
    // "$" drifts to the far side of the digits when a figure follows Arabic letters.
    expect(screen.getAllByText("$1,234.00")[0].closest("bdi")).toHaveAttribute("dir", "ltr");
    // The adjust subtitle reads right-to-left as a phrase; karat and weight stay LTR inside it.
    const phrase = document.querySelector(".font-mono > span[dir]") as HTMLElement;
    expect(phrase).toHaveAttribute("dir", "rtl");
    expect(phrase).toHaveTextContent(`K21 · ${ar.lots.remaining} 12.500g`);
    expect(screen.getByText("12.500g", { selector: "bdi" })).toHaveAttribute("dir", "ltr");
    expect(screen.getByText("K21", { selector: ".font-mono bdi" })).toHaveAttribute("dir", "ltr");
  });

  it("translates the empty state with and without a karat filter", () => {
    swr.lots = { items: [], total: 0, page: 1, page_size: 50 };
    renderPage("ar");
    expect(screen.getByText(ar.lots.empty(""))).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(ar.lots.filterByKarat), { target: { value: "K18" } });
    expect(screen.getByText(ar.lots.empty("K18"))).toBeInTheDocument();
  });
});

describe("lots in English is unchanged", () => {
  it("keeps the copy the screen had before the strings moved", () => {
    renderPage("en");
    openEverything(en);
    expect(screen.getByText("K21 pool")).toBeInTheDocument();
    expect(screen.getByText("1 lot", { exact: false })).toBeInTheDocument();
    expect(screen.getAllByText("0 lots")).toHaveLength(3);
    const phrase = document.querySelector(".font-mono > span[dir]") as HTMLElement;
    expect(phrase).toHaveAttribute("dir", "ltr");
    expect(phrase).toHaveTextContent("K21 · remaining 12.500g");
    expect(screen.getByRole("option", { name: "CORRECTION" })).toBeInTheDocument();
    // The sweep the Arabic test relies on does see this screen's copy.
    expect(uiStrings().filter(hasEnglishWord).length).toBeGreaterThan(30);
    expect(en.lots.empty("")).toBe("No lots yet");
    expect(en.lots.empty("K18")).toBe("No lots in K18");
  });
});

describe("lots dictionary is translated, not English placeholders", () => {
  const strings = (dict: typeof en.lots) => ({
    ...dict, ...dict.sources, ...dict.reasons,
    poolTitle: dict.poolTitle("K21"), lotCount: dict.lotCount(2), empty: dict.empty("K21"), emptyAll: dict.empty(""),
    sources: "", reasons: "",
  });
  const english = strings(en.lots) as Record<string, string>;
  const arabic = strings(ar.lots) as Record<string, string>;

  it("every ar.lots string contains Arabic and differs from English", () => {
    const keys = Object.keys(english).filter((key) => english[key]);
    expect(keys.length).toBeGreaterThan(40);
    for (const key of keys) {
      expect(arabic[key], key).toMatch(/[\u0600-\u06FF]/);
      expect(arabic[key], key).not.toBe(english[key]);
    }
  });
});

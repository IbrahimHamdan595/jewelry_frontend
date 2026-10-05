import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import LotsPage from "@/app/admin/inventory/lots/page";
import { LanguageProvider } from "@/context/LanguageContext";
import en from "@/i18n/en";
import ar from "@/i18n/ar";

// Shapes as the backend sends them (jewelry_backend/app/schemas/lot.py and
// api/lots.py): Decimal columns arrive as strings with the column's scale,
// ids are uuid4 hex, karat is already "K21", and the list leaves depleted lots
// out unless include_depleted=true. 22:30Z is 01:30 the next day in Beirut.
const stamps = { created_at: "2026-09-05T22:30:00Z", updated_at: "2026-09-05T22:30:00Z", acquired_at: "2026-09-05T22:30:00Z" };
const ALL_LOTS = [
  { ...stamps, id: "9f3c1a2b5d6e4f708192a3b4c5d6e7f8", karat: "K21", weight_grams: "20.000", weight_remaining_grams: "12.500", source: "SEED", source_ref_type: null, source_ref_id: null, cost_basis_usd: "1234.00", notes: null, is_depleted: false },
  { ...stamps, id: "4e7d2c9a1b3f4a5d8c7e6f5a4b3c2d1e", karat: "K18", weight_grams: "5.000", weight_remaining_grams: "0.000", source: "BUYBACK", source_ref_type: "walkin_buyback", source_ref_id: "0a1b2c3d4e5f60718293a4b5c6d7e8f9", cost_basis_usd: "300.00", notes: "From walk-in buyback 0a1b2c3d4e5f60718293a4b5c6d7e8f9", is_depleted: true },
];
// /lots/totals groups the non-depleted lots only, so a karat with none is simply absent.
const TOTALS = { by_karat: [{ karat: "K21", total_remaining_grams: "12.500", total_original_grams: "20.000", lot_count: 1, cost_basis_remaining_usd: "771.25" }], grand_total_remaining_grams: "12.500" };

vi.mock("swr", () => ({
  default: (key: string) => {
    const query = new URLSearchParams(key.split("?")[1] ?? "");
    const items = ALL_LOTS.filter((lot) => (query.get("include_depleted") === "true" || !lot.is_depleted) && (!query.get("karat") || lot.karat === query.get("karat")));
    return {
      data: key.startsWith("/lots/totals") ? TOTALS : { items, total: items.length, page: 1, page_size: 50 },
      error: undefined, isLoading: false, isValidating: false, mutate: vi.fn(),
    };
  },
}));
vi.mock("@/lib/api-client", () => ({ apiFetcher: vi.fn(), api: { post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));

function renderPage(lang: "en" | "ar") {
  return render(<LanguageProvider initialLang={lang}><LotsPage /></LanguageProvider>);
}

/** Shows the depleted lot too, and opens the new-lot form and the adjust dialog: every string on the screen. */
function openEverything(dict: typeof en) {
  fireEvent.click(screen.getByLabelText(dict.lots.includeDepleted));
  fireEvent.click(screen.getByRole("button", { name: dict.lots.newLot }));
  fireEvent.click(screen.getByRole("button", { name: dict.lots.adjustLot("K21", "9f3c1a2b") }));
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
/** A run of two or more Latin letters is a word; "K21", "g", "$1,234.00" and a hex lot id are not. */
const hasEnglishWord = (s: string) => /[A-Za-z]{2,}/.test(s);

/** Elements whose classes pin a side (text-left, ml-2, pr-4, right-0 …) instead of following the reading direction. */
function physicalClasses(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll("[class]"))
    .map((el) => el.getAttribute("class") ?? "")
    .filter((classes) => /(^|\s)(text-(left|right)|-?m[lr]-\S+|p[lr]-\S+|-?(left|right)-\S+)(\s|$)/.test(classes));
}

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
    fireEvent.click(screen.getByRole("button", { name: en.lots.adjustLot("K21", "9f3c1a2b") }));
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

  it("gives each row's adjust button its own name, and names the empty header cell", () => {
    renderPage("ar");
    fireEvent.click(screen.getByLabelText(ar.lots.includeDepleted));
    const active = screen.getByRole("button", { name: ar.lots.adjustLot("K21", "9f3c1a2b") });
    const depleted = screen.getByRole("button", { name: ar.lots.adjustLot("K18", "4e7d2c9a") });
    expect(active).toBeEnabled();
    expect(depleted).toBeDisabled();
    // The tooltip stays the short action name.
    expect(active).toHaveAttribute("title", ar.lots.manualAdjustment);
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

  it("lists what the backend lists: depleted lots only on request", () => {
    renderPage("ar");
    expect(screen.getByText(ar.lots.active)).toBeInTheDocument();
    expect(screen.queryByText(ar.lots.depleted)).toBeNull();
    fireEvent.click(screen.getByLabelText(ar.lots.includeDepleted));
    expect(screen.getByText(ar.lots.depleted)).toBeInTheDocument();
    expect(screen.getByText(ar.lots.sources.BUYBACK)).toBeInTheDocument();
  });

  it("shows the Arabic copy, including enum values and the per-karat pool cards", () => {
    renderPage("ar");
    openEverything(ar);
    expect(screen.getByText(ar.lots.poolTitle("K21"))).toBeInTheDocument();
    expect(screen.getAllByText(ar.lots.sources.SEED).length).toBeGreaterThan(0);
    expect(screen.getByRole("option", { name: ar.lots.reasons.THEFT })).toHaveValue("THEFT");
    expect(screen.getByLabelText(ar.lots.deltaG)).toHaveAttribute("placeholder", ar.lots.deltaPlaceholder);
    expect(screen.getByRole("button", { name: ar.lots.createLot })).toBeInTheDocument();
  });

  it("counts lots as «label: n», which needs no Arabic number agreement", () => {
    renderPage("ar");
    expect(ar.lots.lotCount(1)).toBe("الدفعات: 1");
    expect(ar.lots.lotCount(2)).toBe("الدفعات: 2");
    expect(ar.lots.lotCount(11)).toBe("الدفعات: 11");
    expect(screen.getByText("الدفعات: 1", { exact: false })).toBeInTheDocument();
    // K18, K22 and K24 have no active lots, so the totals endpoint leaves them out.
    expect(screen.getAllByText("الدفعات: 0")).toHaveLength(3);
  });

  it("shows the acquired date on the Beirut calendar, with an Arabic month", () => {
    renderPage("ar");
    // 22:30Z on the 5th is already the 6th in Beirut.
    expect(screen.getByText(/^06 (أيلول|سبتمبر) 2026$/)).toBeInTheDocument();
  });

  it("keeps money and machine values left-to-right inside Arabic text", () => {
    renderPage("ar");
    openEverything(ar);
    // "$" drifts to the far side of the digits when a figure follows Arabic letters.
    expect(screen.getByText("$771.25").closest("bdi")).toHaveAttribute("dir", "ltr");
    // A number and its unit are one left-to-right run, so the gap stays between them.
    const unit = screen.getAllByText("g", { selector: "span" })[0];
    expect(unit).toHaveClass("ms-1");
    expect(unit.closest("bdi")).toHaveAttribute("dir", "ltr");
    // The adjust subtitle is a phrase: monospace (and so left-to-right) in English only.
    const phrase = screen.getByText(new RegExp(`· ${ar.lots.remaining}`));
    expect(phrase).toHaveClass("ltr:font-mono");
    expect(phrase).not.toHaveClass("font-mono");
    expect(phrase).toHaveTextContent(`K21 · ${ar.lots.remaining} 12.500g`);
    for (const value of ["K21", "12.500g"]) {
      const isolated = Array.from(phrase.querySelectorAll("bdi")).find((el) => el.textContent === value) as HTMLElement;
      expect(isolated, value).toHaveAttribute("dir", "ltr");
      expect(isolated, value).toHaveClass("font-mono");
    }
  });

  it("follows the reading direction: logical utilities only", () => {
    const { container } = renderPage("ar");
    openEverything(ar);
    expect(physicalClasses(container)).toEqual([]);
    // No arrow, chevron or toggle on this screen: nothing to mirror.
    expect(container.querySelector("svg[class*='lucide-arrow-'], svg[class*='lucide-chevron-left'], svg[class*='lucide-chevron-right'], svg[class*='lucide-toggle-']")).toBeNull();
    expect(screen.getByRole("columnheader", { name: ar.lots.karat })).toHaveClass("text-start");
  });

  it("translates the empty state with and without a karat filter", () => {
    renderPage("ar");
    // No K24 lots exist, so filtering by K24 empties the list.
    fireEvent.change(screen.getByLabelText(ar.lots.filterByKarat), { target: { value: "K24" } });
    expect(screen.getByText(ar.lots.empty("K24"))).toBeInTheDocument();
    expect(ar.lots.empty("")).toMatch(/[\u0600-\u06FF]/);
  });
});

describe("lots in English", () => {
  it("keeps the copy the screen had before the strings moved", () => {
    renderPage("en");
    openEverything(en);
    expect(screen.getByText("K21 pool")).toBeInTheDocument();
    expect(screen.getByText("1 lot", { exact: false })).toBeInTheDocument();
    expect(screen.getAllByText("0 lots")).toHaveLength(3);
    const phrase = screen.getByText(/· remaining/);
    expect(phrase).toHaveClass("ltr:font-mono");
    expect(phrase).toHaveTextContent("K21 · remaining 12.500g");
    expect(screen.getByRole("option", { name: "CORRECTION" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Remaining / Original" })).toBeInTheDocument();
    // The sweep the Arabic test relies on does see this screen's copy.
    expect(uiStrings().filter(hasEnglishWord).length).toBeGreaterThan(30);
    expect(en.lots.empty("")).toBe("No lots yet");
    expect(en.lots.empty("K18")).toBe("No lots in K18");
  });

  it("shows the acquired date on the Beirut calendar, in the app's own format", () => {
    renderPage("en");
    expect(screen.getByText(/^06 Sept? 2026$/)).toBeInTheDocument();
  });
});

describe("lots dictionary is translated, not English placeholders", () => {
  const strings = (dict: typeof en.lots) => ({
    ...dict, ...dict.sources, ...dict.reasons,
    poolTitle: dict.poolTitle("K21"), lotCount: dict.lotCount(2), empty: dict.empty("K21"), emptyAll: dict.empty(""),
    adjustLot: dict.adjustLot("K21", "9f3c1a2b"),
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

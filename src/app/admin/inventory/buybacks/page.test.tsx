import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import BuybacksTab from "@/app/admin/inventory/buybacks/page";
import { LanguageProvider } from "@/context/LanguageContext";
import en from "@/i18n/en";
import ar from "@/i18n/ar";

const swr = vi.hoisted(() => ({ buybacks: undefined as unknown }));
vi.mock("swr", () => ({
  default: () => ({ data: swr.buybacks, error: undefined, isLoading: false, isValidating: false, mutate: vi.fn() }),
}));
vi.mock("@/lib/api-client", () => ({ apiFetcher: vi.fn(), api: { post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));

const base = {
  occurred_at: "2026-09-05T10:00:00Z", seller_phone: "+961-00-555555", cashier_id: "u1", karat: "K21",
  weight_grams: 12.5, quantity: null, coin_type_id: null, ounce_type_id: null, result_lot_id: null, product_id: null,
  buy_price_usd: 900, gold_rate_at_buy: 100, buyback_margin_mode: null, buyback_margin_value: null, price_mode: "FORMULA", notes: null,
};
// Seller names come from the database: they are data, and stay as typed in either language.
const SELLERS = ["Rami Haddad", "Maya Khoury", "Nadim Saab", "Lina Aoun", "Fadi Nassar"];
const BUYBACKS = {
  items: [
    { ...base, id: "b1", seller_name: SELLERS[0], kind: "PURE_GOLD", result_lot_id: "9f3c1a2b-0000-4000-8000-000000000001" },
    { ...base, id: "b2", seller_name: SELLERS[1], kind: "COIN", weight_grams: 8, quantity: 2 },
    { ...base, id: "b3", seller_name: SELLERS[2], kind: "USED_PRODUCT", karat: "K18", weight_grams: 5.25, buy_price_usd: 250 },
    { ...base, id: "b4", seller_name: SELLERS[3], kind: "USED_PRODUCT", product_id: "p1" },
    { ...base, id: "b5", seller_name: SELLERS[4], kind: "USED_PRODUCT", result_lot_id: "4e7d2c9a-0000-4000-8000-000000000002" },
  ],
  total: 5, page: 1, page_size: 50,
};

function renderPage(lang: "en" | "ar") {
  return render(<LanguageProvider initialLang={lang}><BuybacksTab /></LanguageProvider>);
}
const rowOf = (seller: string) => within(screen.getByText(seller).closest("tr") as HTMLElement);

/** The field a label names, checked both ways: by its text and through label.control. */
function expectLabelled(text: string) {
  const control = screen.getByLabelText(text);
  const label = control.closest("label") as HTMLLabelElement;
  expect(label, text).not.toBeNull();
  expect(label.control, text).toBe(control);
}
function expectEveryControlNamed(count: number) {
  const controls = Array.from(document.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input, select, textarea"));
  expect(controls.length).toBe(count);
  for (const control of controls) {
    expect(control.labels?.length || control.getAttribute("aria-label"), control.outerHTML).toBeTruthy();
  }
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
/** A run of two or more Latin letters is a word; "K21", "g" and a hex lot id are not. Data is set aside first. */
const hasEnglishWord = (s: string) => /[A-Za-z]{2,}/.test(SELLERS.reduce((rest, name) => rest.split(name).join(""), s));

beforeEach(() => {
  swr.buybacks = BUYBACKS;
});

describe("buybacks labels (NEX-64)", () => {
  it("every field in the polish dialog is reachable by its label", () => {
    renderPage("en");
    fireEvent.click(screen.getByRole("button", { name: en.buybacks.polish }));
    for (const text of [en.common.nameEn, en.common.nameAr, en.buybacks.category, en.buybacks.marginPct, en.buybacks.makingCharge, en.buybacks.overrideWeightOptional, en.buybacks.overrideKaratOptional, en.buybacks.notesOptional]) {
      expectLabelled(text);
    }
    expectEveryControlNamed(10);
    expect(screen.getByLabelText(en.buybacks.overrideWeightOptional)).toHaveAttribute("placeholder", "(keep 5.250)");
  });

  it("every field in the melt dialog is reachable by its label", () => {
    renderPage("en");
    fireEvent.click(screen.getByRole("button", { name: en.buybacks.melt }));
    for (const text of [en.buybacks.overrideWeight, en.buybacks.overrideKarat, en.buybacks.notesOptional]) expectLabelled(text);
    expectEveryControlNamed(5);
  });

  it("names the filters and the empty header cell", () => {
    renderPage("ar");
    expect(screen.getByLabelText(ar.buybacks.filterByKind).tagName).toBe("SELECT");
    expectLabelled(ar.buybacks.pendingOnly);
    expect(screen.getByRole("columnheader", { name: ar.common.actions })).toBeInTheDocument();
  });
});

describe("buybacks in Arabic (NEX-64)", () => {
  it("leaves no English behind — list and polish dialog", () => {
    renderPage("ar");
    fireEvent.click(screen.getByRole("button", { name: ar.buybacks.polish }));
    for (const english of ["All kinds", "Pure gold", "Coin", "Ounce", "Used product", "Pending polish/melt only", "When", "Kind", "Seller", "Detail", "Price paid", "Outcome", "PURE_GOLD", "COIN", "USED_PRODUCT", "pending", "polished → product", "Polish", "Melt", "Receipt →", "Polish used buyback into a product", "Name (English)", "Category", "Margin %", "Making charge ($)", "Notes (optional)", "Cancel", "Polish & list"]) {
      expect(screen.queryByText(english), english).toBeNull();
    }
    expect(uiStrings().filter(hasEnglishWord)).toEqual([]);
  });

  it("leaves no English behind — melt dialog", () => {
    renderPage("ar");
    fireEvent.click(screen.getByRole("button", { name: ar.buybacks.melt }));
    for (const english of ["Melt used buyback into a pure-gold lot", "Override weight (g)", "Override karat", "Notes (optional)", "Cancel"]) {
      expect(screen.queryByText(english), english).toBeNull();
    }
    expect(screen.getByText(ar.buybacks.meltTitle)).toBeInTheDocument();
    expect(screen.getByRole("option", { name: ar.buybacks.keep("K18") })).toHaveValue("");
    expect(uiStrings().filter(hasEnglishWord)).toEqual([]);
  });

  it("translates the kind pills and every outcome", () => {
    renderPage("ar");
    expect(rowOf(SELLERS[0]).getByText(ar.buybacks.kindPills.PURE_GOLD)).toHaveClass("font-mono");
    expect(rowOf(SELLERS[1]).getByText(ar.buybacks.kindPills.COIN)).toBeInTheDocument();
    expect(rowOf(SELLERS[2]).getByText(ar.buybacks.kindPills.USED_PRODUCT)).toBeInTheDocument();
    expect(rowOf(SELLERS[2]).getByText(ar.buybacks.pending)).toBeInTheDocument();
    expect(rowOf(SELLERS[3]).getByText(ar.buybacks.polishedToProduct)).toBeInTheDocument();
    expect(rowOf(SELLERS[4]).getByText(new RegExp(ar.buybacks.meltedToLot))).toHaveTextContent(`${ar.buybacks.meltedToLot} 4e7d2c9a…`);
    expect(screen.getAllByRole("link", { name: ar.buybacks.receipt })).toHaveLength(5);
  });

  it("keeps lot ids, quantities, money and the phone left-to-right inside Arabic text", () => {
    renderPage("ar");
    // The pure-gold outcome sits in a font-mono box: the phrase carries the UI direction, the id stays LTR.
    const toLot = rowOf(SELLERS[0]).getByText(new RegExp(ar.buybacks.toLot));
    expect(toLot).toHaveAttribute("dir", "rtl");
    expect(toLot.parentElement).toHaveClass("font-mono");
    expect(rowOf(SELLERS[0]).getByText("9f3c1a2b…").closest("bdi")).toHaveAttribute("dir", "ltr");
    expect(rowOf(SELLERS[4]).getByText("4e7d2c9a…").closest("bdi")).toHaveAttribute("dir", "ltr");
    expect(rowOf(SELLERS[1]).getByText("+2").closest("bdi")).toHaveAttribute("dir", "ltr");
    expect(rowOf(SELLERS[0]).getByText("+961-00-555555")).toHaveClass("font-mono");

    fireEvent.click(screen.getByRole("button", { name: ar.buybacks.polish }));
    const summary = screen.getByText(new RegExp(ar.buybacks.original));
    expect(summary).toHaveTextContent(`${ar.buybacks.original} K18 · 5.250g · ${ar.buybacks.paid} $250.00 ${ar.buybacks.costBasisCarries}`);
    for (const piece of ["K18", "5.250g", "$250.00"]) {
      expect(within(summary).getByText(piece).closest("bdi"), piece).toHaveAttribute("dir", "ltr");
    }
  });

  it("translates every empty state", () => {
    swr.buybacks = { items: [], total: 0, page: 1, page_size: 50 };
    renderPage("ar");
    expect(screen.getByText(ar.buybacks.empty("", false))).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(ar.buybacks.filterByKind), { target: { value: "COIN" } });
    expect(screen.getByText(ar.buybacks.empty(ar.buybacks.kindPills.COIN, false))).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(ar.buybacks.pendingOnly));
    expect(screen.getByText(ar.buybacks.empty(ar.buybacks.kindPills.COIN, true))).toBeInTheDocument();
    expect(uiStrings().filter(hasEnglishWord)).toEqual([]);
  });
});

describe("buybacks in English is unchanged", () => {
  it("keeps the copy the screen had before the strings moved", () => {
    renderPage("en");
    expect(rowOf(SELLERS[0]).getByText("PURE_GOLD")).toBeInTheDocument();
    expect(rowOf(SELLERS[0]).getByText(/→ lot/)).toHaveTextContent("→ lot 9f3c1a2b…");
    expect(rowOf(SELLERS[0]).getByText(/→ lot/)).toHaveAttribute("dir", "ltr");
    expect(rowOf(SELLERS[1]).getByText(/stock/)).toHaveTextContent("stock +2");
    expect(rowOf(SELLERS[2]).getByText("pending")).toBeInTheDocument();
    expect(rowOf(SELLERS[3]).getByText("polished → product")).toBeInTheDocument();
    expect(rowOf(SELLERS[4]).getByText(/melted → lot/)).toHaveTextContent("melted → lot 4e7d2c9a…");
    fireEvent.click(screen.getByRole("button", { name: "Polish" }));
    expect(screen.getByText(/Original:/)).toHaveTextContent("Original: K18 · 5.250g · paid $250.00 (cost basis carries to product)");
    expect(screen.getByRole("option", { name: "(keep K18)" })).toBeInTheDocument();
    // The sweep the Arabic tests rely on does see this screen's copy.
    expect(uiStrings().filter(hasEnglishWord).length).toBeGreaterThan(30);
  });

  it("builds the empty state from the same parts as before", () => {
    expect(en.buybacks.empty("", false)).toBe("No buybacks.");
    expect(en.buybacks.empty("COIN", false)).toBe("No buybacks of kind COIN.");
    expect(en.buybacks.empty("", true)).toBe("No buybacks pending action.");
    expect(en.buybacks.empty("COIN", true)).toBe("No buybacks of kind COIN pending action.");
  });
});

describe("buybacks dictionary is translated, not English placeholders", () => {
  const strings = (dict: typeof en.buybacks) => ({
    ...dict,
    ...Object.fromEntries(Object.entries(dict.kinds).map(([k, v]) => [`kinds.${k}`, v])),
    ...Object.fromEntries(Object.entries(dict.kindPills).map(([k, v]) => [`kindPills.${k}`, v])),
    empty: dict.empty("", false), emptyKind: dict.empty("x", false), emptyPending: dict.empty("", true), keep: dict.keep("K21"),
    kinds: "", kindPills: "",
  });
  const english = strings(en.buybacks) as Record<string, string>;
  const arabic = strings(ar.buybacks) as Record<string, string>;

  it("every ar.buybacks string contains Arabic and differs from English", () => {
    const keys = Object.keys(english).filter((key) => english[key]);
    expect(keys.length).toBeGreaterThan(45);
    for (const key of keys) {
      expect(arabic[key], key).toMatch(/[\u0600-\u06FF]/);
      expect(arabic[key], key).not.toBe(english[key]);
    }
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import BuybacksTab from "@/app/admin/inventory/buybacks/page";
import { LanguageProvider } from "@/context/LanguageContext";
import { formatDateTime } from "@/lib/utils";
import en from "@/i18n/en";
import ar from "@/i18n/ar";

// Shapes as the backend sends them (jewelry_backend/app/schemas/buyback.py and
// api/buybacks.py): Decimal columns arrive as strings, ids are uuid4 hex, karat
// is already "K21". What each kind carries follows its handler:
//   PURE_GOLD     karat + weight, a result lot from the start, formula pricing
//   COIN / OUNCE  the type id, a quantity, the type's karat and weight × quantity
//   USED_PRODUCT  karat + weight, always priced by hand (MANUAL, no margin);
//                 product_id once polished, result_lot_id once melted
const base = { seller_phone: "+961-00-555555", cashier_id: "c0ffee00c0ffee00c0ffee00c0ffee00", quantity: null, coin_type_id: null, ounce_type_id: null, result_lot_id: null, product_id: null, gold_rate_at_buy: "100.00", notes: null };
const formula = { price_mode: "FORMULA", buyback_margin_mode: "USD_PER_GRAM", buyback_margin_value: "2.0000" };
const manual = { price_mode: "MANUAL", buyback_margin_mode: null, buyback_margin_value: null };
// Seller names come from the database: they are data, and stay as typed in either language.
const SELLERS = ["Rami Haddad", "Maya Khoury", "Nadim Saab", "Lina Aoun", "Fadi Nassar"];
// Newest first, as the list endpoint orders them. 10:00Z is 13:00 in Beirut.
const ALL_BUYBACKS = [
  { ...base, ...formula, id: "b1000000000040008000000000000001", occurred_at: "2026-09-05T10:00:00Z", seller_name: SELLERS[0], kind: "PURE_GOLD", karat: "K21", weight_grams: "12.500", buy_price_usd: "900.00", result_lot_id: "9f3c1a2b5d6e4f708192a3b4c5d6e7f8" },
  { ...base, ...formula, id: "b2000000000040008000000000000002", occurred_at: "2026-09-05T09:00:00Z", seller_name: SELLERS[1], kind: "COIN", karat: "K21", weight_grams: "16.000", quantity: 2, coin_type_id: "c1000000000040008000000000000001", buy_price_usd: "1500.00" },
  { ...base, ...manual, id: "b3000000000040008000000000000003", occurred_at: "2026-09-05T08:00:00Z", seller_name: SELLERS[2], kind: "USED_PRODUCT", karat: "K18", weight_grams: "5.250", buy_price_usd: "250.00" },
  { ...base, ...manual, id: "b4000000000040008000000000000004", occurred_at: "2026-09-05T07:00:00Z", seller_name: SELLERS[3], kind: "USED_PRODUCT", karat: "K21", weight_grams: "3.100", buy_price_usd: "180.00", product_id: "d1000000000040008000000000000001" },
  { ...base, ...manual, id: "b5000000000040008000000000000005", occurred_at: "2026-09-05T06:00:00Z", seller_name: SELLERS[4], kind: "USED_PRODUCT", karat: "K21", weight_grams: "4.000", buy_price_usd: "230.00", result_lot_id: "4e7d2c9a1b3f4a5d8c7e6f5a4b3c2d1e" },
];
const WHEN = { ar: (iso: string) => formatDateTime(iso, "ar-LB-u-nu-latn"), en: (iso: string) => formatDateTime(iso, "en-GB") };
const PENDING = ALL_BUYBACKS[2];

const db = vi.hoisted(() => ({ rows: [] as { kind: string }[] }));
vi.mock("swr", () => ({
  // The list endpoint filters by kind on the server.
  default: (key: string) => {
    const kind = new URLSearchParams(key.split("?")[1] ?? "").get("kind");
    const items = db.rows.filter((row) => !kind || row.kind === kind);
    return { data: { items, total: items.length, page: 1, page_size: 50 }, error: undefined, isLoading: false, isValidating: false, mutate: vi.fn() };
  },
}));
vi.mock("@/lib/api-client", () => ({ apiFetcher: vi.fn(), api: { post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));

function renderPage(lang: "en" | "ar") {
  return render(<LanguageProvider initialLang={lang}><BuybacksTab /></LanguageProvider>);
}
const rowOf = (seller: string) => within(screen.getByText(seller).closest("tr") as HTMLElement);
const polishButton = (lang: "en" | "ar") => screen.getByRole("button", { name: (lang === "ar" ? ar : en).buybacks.polishRow(PENDING.seller_name, WHEN[lang](PENDING.occurred_at)) });
const meltButton = (lang: "en" | "ar") => screen.getByRole("button", { name: (lang === "ar" ? ar : en).buybacks.meltRow(PENDING.seller_name, WHEN[lang](PENDING.occurred_at)) });

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
/** A run of two or more Latin letters is a word; "K21", "g" and a hex lot id are not. Seller names are set aside first. */
const hasEnglishWord = (s: string) => /[A-Za-z]{2,}/.test(SELLERS.reduce((rest, name) => rest.split(name).join(""), s));

/** Elements whose classes pin a side (text-left, ml-2, pr-4, right-0 …) instead of following the reading direction. */
function physicalClasses(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll("[class]"))
    .map((el) => el.getAttribute("class") ?? "")
    .filter((classes) => /(^|\s)(text-(left|right)|-?m[lr]-\S+|p[lr]-\S+|-?(left|right)-\S+)(\s|$)/.test(classes));
}

beforeEach(() => {
  db.rows = ALL_BUYBACKS;
});

describe("buybacks labels (NEX-64)", () => {
  it("every field in the polish dialog is reachable by its label", () => {
    renderPage("en");
    fireEvent.click(polishButton("en"));
    for (const text of [en.common.nameEn, en.common.nameAr, en.buybacks.category, en.buybacks.marginPct, en.buybacks.makingCharge, en.buybacks.overrideWeightOptional, en.buybacks.overrideKaratOptional, en.buybacks.notesOptional]) {
      expectLabelled(text);
    }
    expectEveryControlNamed(10);
    expect(screen.getByLabelText(en.buybacks.overrideWeightOptional)).toHaveAttribute("placeholder", "(keep 5.250)");
  });

  it("every field in the melt dialog is reachable by its label", () => {
    renderPage("en");
    fireEvent.click(meltButton("en"));
    for (const text of [en.buybacks.overrideWeight, en.buybacks.overrideKarat, en.buybacks.notesOptional]) expectLabelled(text);
    expectEveryControlNamed(5);
  });

  it("names the filters and the empty header cell", () => {
    renderPage("ar");
    expect(screen.getByLabelText(ar.buybacks.filterByKind).tagName).toBe("SELECT");
    expectLabelled(ar.buybacks.pendingOnly);
    expect(screen.getByRole("columnheader", { name: ar.common.actions })).toBeInTheDocument();
  });

  it("names each row's controls after the row: seller and time", () => {
    renderPage("ar");
    // Only the pending used piece can be polished or melted.
    expect(polishButton("ar")).toHaveTextContent(ar.buybacks.polish);
    expect(meltButton("ar")).toHaveTextContent(ar.buybacks.melt);
    const receipts = screen.getAllByRole("link");
    expect(receipts).toHaveLength(5);
    const names = receipts.map((link) => link.getAttribute("aria-label"));
    expect(new Set(names).size).toBe(5);
    ALL_BUYBACKS.forEach((row, i) => {
      expect(names[i]).toBe(ar.buybacks.receiptRow(row.seller_name, WHEN.ar(row.occurred_at)));
      expect(receipts[i]).toHaveAttribute("href", `/pos/buyback-receipt/${row.id}`);
      expect(receipts[i]).toHaveTextContent(ar.buybacks.receipt);
    });
  });
});

describe("buybacks in Arabic (NEX-64)", () => {
  it("leaves no English behind — list and polish dialog", () => {
    renderPage("ar");
    fireEvent.click(polishButton("ar"));
    for (const english of ["All kinds", "Pure gold", "Coin", "Ounce", "Used product", "Pending polish/melt only", "When", "Kind", "Seller", "Detail", "Price paid", "Outcome", "PURE_GOLD", "COIN", "USED_PRODUCT", "pending", "polished → product", "Polish", "Melt", "Receipt →", "Polish used buyback into a product", "Name (English)", "Category", "Margin %", "Making charge ($)", "Notes (optional)", "Cancel", "Polish & list"]) {
      expect(screen.queryByText(english), english).toBeNull();
    }
    expect(uiStrings().filter(hasEnglishWord)).toEqual([]);
  });

  it("leaves no English behind — melt dialog", () => {
    renderPage("ar");
    fireEvent.click(meltButton("ar"));
    for (const english of ["Melt used buyback into a pure-gold lot", "Override weight (g)", "Override karat", "Notes (optional)", "Cancel"]) {
      expect(screen.queryByText(english), english).toBeNull();
    }
    expect(screen.getByText(ar.buybacks.meltTitle)).toBeInTheDocument();
    expect(screen.getByRole("option", { name: ar.buybacks.keep("K18") })).toHaveValue("");
    expect(uiStrings().filter(hasEnglishWord)).toEqual([]);
  });

  it("shows when each buyback happened on the Beirut clock, with an Arabic month", () => {
    renderPage("ar");
    // 10:00Z is 1 pm in Beirut.
    expect(rowOf(SELLERS[0]).getByText(/^05 (أيلول|سبتمبر) 2026\D{1,3}0?1:00\D{0,2}م$/)).toBeInTheDocument();
  });

  it("translates the kind pills and every outcome", () => {
    renderPage("ar");
    expect(rowOf(SELLERS[0]).getByText(ar.buybacks.kindPills.PURE_GOLD)).toBeInTheDocument();
    expect(rowOf(SELLERS[1]).getByText(ar.buybacks.kindPills.COIN)).toBeInTheDocument();
    expect(rowOf(SELLERS[2]).getByText(ar.buybacks.kindPills.USED_PRODUCT)).toBeInTheDocument();
    expect(rowOf(SELLERS[2]).getByText(ar.buybacks.pending)).toBeInTheDocument();
    expect(rowOf(SELLERS[3]).getByText(ar.buybacks.polishedToProduct)).toBeInTheDocument();
    expect(rowOf(SELLERS[4]).getByText(new RegExp(ar.buybacks.meltedToLot))).toHaveTextContent(`${ar.buybacks.meltedToLot} 4e7d2c9a…`);
  });

  it("keeps Arabic words out of monospace, which RTL lays out left-to-right", () => {
    renderPage("ar");
    // The pill holds a word in Arabic: monospace in LTR only.
    const pill = rowOf(SELLERS[0]).getByText(ar.buybacks.kindPills.PURE_GOLD);
    expect(pill).toHaveClass("ltr:font-mono");
    expect(pill).not.toHaveClass("font-mono");
    // The pure-gold outcome is a phrase with an id in it: only the id stays monospace.
    const toLot = rowOf(SELLERS[0]).getByText(new RegExp(ar.buybacks.toLot));
    expect(toLot).toHaveClass("ltr:font-mono");
    expect(toLot).not.toHaveClass("font-mono");
    expect(toLot).toHaveTextContent(`${ar.buybacks.toLot} 9f3c1a2b…`);
    const id = rowOf(SELLERS[0]).getByText("9f3c1a2b…");
    expect(id.tagName).toBe("BDI");
    expect(id).toHaveAttribute("dir", "ltr");
    expect(id).toHaveClass("font-mono");
  });

  it("keeps lot ids, signed quantities, money and the phone left-to-right inside Arabic text", () => {
    renderPage("ar");
    expect(rowOf(SELLERS[4]).getByText("4e7d2c9a…").closest("bdi")).toHaveAttribute("dir", "ltr");
    expect(rowOf(SELLERS[1]).getByText("+2").closest("bdi")).toHaveAttribute("dir", "ltr");
    const phone = rowOf(SELLERS[0]).getByText("+961-00-555555");
    expect(phone.closest("bdi")).toHaveAttribute("dir", "ltr");
    expect(phone.closest(".font-mono")).not.toBeNull();

    fireEvent.click(polishButton("ar"));
    const summary = screen.getByText(new RegExp(ar.buybacks.original));
    expect(summary).toHaveTextContent(`${ar.buybacks.original} K18 · 5.250g · ${ar.buybacks.paid} $250.00 ${ar.buybacks.costBasisCarries}`);
    for (const piece of ["K18", "5.250g", "$250.00"]) {
      expect(within(summary).getByText(piece).closest("bdi"), piece).toHaveAttribute("dir", "ltr");
    }
  });

  it("follows the reading direction: logical utilities only", () => {
    const { container } = renderPage("ar");
    fireEvent.click(polishButton("ar"));
    fireEvent.click(meltButton("ar"));
    expect(physicalClasses(container)).toEqual([]);
    // No arrow, chevron or toggle icon on this screen; the text arrows are flipped in the dictionary.
    expect(container.querySelector("svg[class*='lucide-arrow-'], svg[class*='lucide-chevron-left'], svg[class*='lucide-chevron-right'], svg[class*='lucide-toggle-']")).toBeNull();
    expect(ar.buybacks.receipt).toContain("←");
    expect(screen.getByRole("columnheader", { name: ar.buybacks.seller })).toHaveClass("text-start");
    // The karat pill's gap is on its trailing side in either direction.
    expect(rowOf(SELLERS[0]).getByText("K21")).toHaveClass("me-1");
    // The Arabic-name field is right-to-left by itself; its text starts at its own start.
    expect(screen.getByLabelText(ar.common.nameAr)).toHaveAttribute("dir", "rtl");
    expect(screen.getByLabelText(ar.common.nameAr)).toHaveClass("text-start");
  });

  it("translates every empty state", () => {
    renderPage("ar");
    // No ounce buybacks exist, so the server returns none for that kind.
    fireEvent.change(screen.getByLabelText(ar.buybacks.filterByKind), { target: { value: "OUNCE" } });
    expect(screen.getByText(ar.buybacks.empty(ar.buybacks.kindPills.OUNCE, false))).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(ar.buybacks.pendingOnly));
    expect(screen.getByText(ar.buybacks.empty(ar.buybacks.kindPills.OUNCE, true))).toBeInTheDocument();
    expect(uiStrings().filter(hasEnglishWord)).toEqual([]);
  });

  it("translates the empty state of a shop with no buybacks yet", () => {
    db.rows = [];
    renderPage("ar");
    expect(screen.getByText(ar.buybacks.empty("", false))).toBeInTheDocument();
  });
});

describe("buybacks in English is unchanged", () => {
  it("keeps the copy the screen had before the strings moved", () => {
    renderPage("en");
    expect(rowOf(SELLERS[0]).getByText("PURE_GOLD")).toHaveClass("ltr:font-mono");
    expect(rowOf(SELLERS[0]).getByText(/→ lot/)).toHaveTextContent("→ lot 9f3c1a2b…");
    expect(rowOf(SELLERS[0]).getByText(/→ lot/)).toHaveClass("ltr:font-mono");
    expect(rowOf(SELLERS[0]).getByText(/^05 Sept? 2026, 13:00$/)).toBeInTheDocument();
    expect(rowOf(SELLERS[1]).getByText(/stock/)).toHaveTextContent("stock +2");
    expect(rowOf(SELLERS[1]).getByText("16.000g")).toBeInTheDocument();
    expect(rowOf(SELLERS[2]).getByText("pending")).toBeInTheDocument();
    expect(rowOf(SELLERS[3]).getByText("polished → product")).toBeInTheDocument();
    expect(rowOf(SELLERS[4]).getByText(/melted → lot/)).toHaveTextContent("melted → lot 4e7d2c9a…");
    fireEvent.click(polishButton("en"));
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
    polishRow: dict.polishRow("x", "y"), meltRow: dict.meltRow("x", "y"), receiptRow: dict.receiptRow("x", "y"),
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

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { UnitCatalog } from "@/components/admin/UnitCatalog";
import { LanguageProvider } from "@/context/LanguageContext";
import en from "@/i18n/en";
import ar from "@/i18n/ar";

// Shapes as the backend sends them (jewelry_backend/app/schemas/unit_stock.py,
// api/coins.py, core/pricing.py): Decimal columns arrive as strings with the
// column's scale, ids are uuid4 hex, karat is "K21" but an auto-generated code
// carries the karat LABEL (FN-COIN-21K-0001). The list filters is_active and
// search on the server. In a price, gold_rate_24k is a float, the rest are
// Decimals rounded to cents, and rate_source is "live" or "override".
const stamps = { created_at: "2026-09-05T10:00:00Z", updated_at: "2026-09-05T10:00:00Z" };
const COIN = { ...stamps, id: "c1000000000040008000000000000001", code: "FN-COIN-21K-0001", name_en: "Lira Rashadi", name_ar: "ليرة رشادية", karat: "K21", weight_grams: "7.200", markup_per_gram: "0.5000", margin_mode: "USD", margin_value: "5.00", on_hand_qty: 3, min_stock_qty: 5, photo_url: null, is_active: true };
const RETIRED = { ...stamps, id: "c2000000000040008000000000000002", code: "FN-COIN-22K-0001", name_en: "English Sovereign", name_ar: "", karat: "K22", weight_grams: "7.988", markup_per_gram: "-0.2500", margin_mode: "PERCENT", margin_value: "2.50", on_hand_qty: 0, min_stock_qty: null, photo_url: "https://pub-0000.r2.dev/coins/sovereign.jpg", is_active: false };
// (100 + 0.50) × 7.200 + 5.00, as calculate_unit_price works it out.
const PRICE = { type_id: COIN.id, code: COIN.code, gold_rate_24k: 100, effective_rate: "100.50", metal_value: "723.60", margin_amount: "5.00", final_price: "728.60", on_hand_qty: 3, rate_source: "live", rate_is_stale: true };
// Codes and names come from the database: data, left as stored in either language.
const DATA = [COIN.code, RETIRED.code, COIN.name_en, RETIRED.name_en];

const db = vi.hoisted(() => ({ rows: [] as { code: string; name_en: string; is_active: boolean }[], price: undefined as unknown }));
vi.mock("swr", () => ({
  default: (key: string) => {
    if (key.endsWith("/price")) return { data: db.price, error: undefined, isLoading: false, isValidating: false, mutate: vi.fn() };
    const query = new URLSearchParams(key.split("?")[1] ?? "");
    const search = (query.get("search") ?? "").toLowerCase();
    const items = db.rows.filter((row) => (query.get("is_active") !== "true" || row.is_active) && (!search || row.code.toLowerCase().includes(search) || row.name_en.toLowerCase().includes(search)));
    return { data: { items, total: items.length, page: 1, page_size: 100 }, error: undefined, isLoading: false, isValidating: false, mutate: vi.fn() };
  },
}));
vi.mock("@/lib/api-client", () => ({ apiFetcher: vi.fn(), uploadFile: vi.fn(), api: { post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));

type Dict = typeof en;
function renderCatalog(lang: "en" | "ar", resource: "coins" | "ounces" = "coins") {
  return render(
    <LanguageProvider initialLang={lang}>
      <UnitCatalog resource={resource} adjustmentTarget={resource === "coins" ? "COIN_STOCK" : "OUNCE_STOCK"} />
    </LanguageProvider>,
  );
}
/** One of the four per-row buttons, found by the name it has for that row. */
const rowButton = (dict: Dict, action: string, code = COIN.code) => screen.getByRole("button", { name: dict.unitCatalog.rowAction(action, code) });
const showInactive = (dict: Dict) => fireEvent.click(screen.getByLabelText(dict.unitCatalog.includeInactive));

/** The field a label names, checked both ways: by its text and through label.control. */
function expectLabelled(text: string) {
  const control = screen.getByLabelText(text);
  const label = control.closest("label") as HTMLLabelElement;
  expect(label, text).not.toBeNull();
  expect(label.control, text).toBe(control);
  return control;
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
/** A run of two or more Latin letters is a word; "K21" and "/g" are not. Data is set aside first. */
const hasEnglishWord = (s: string) => /[A-Za-z]{2,}/.test(DATA.reduce((rest, datum) => rest.split(datum).join(""), s));

/** Elements whose classes pin a side (text-left, ml-2, pr-4, right-0 …) instead of following the reading direction. */
function physicalClasses(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll("[class]"))
    .map((el) => el.getAttribute("class") ?? "")
    .filter((classes) => /(^|\s)(text-(left|right)|-?m[lr]-\S+|p[lr]-\S+|-?(left|right)-\S+)(\s|$)/.test(classes));
}

beforeEach(() => {
  db.rows = [COIN, RETIRED];
  db.price = PRICE;
});

describe("UnitCatalog labels (NEX-64)", () => {
  it("every field in the new-type form is reachable by its label", () => {
    renderCatalog("en");
    fireEvent.click(screen.getByRole("button", { name: en.unitCatalog.coins.newType }));
    const u = en.unitCatalog;
    for (const text of [u.karat, en.common.nameEn, en.common.nameAr, u.weightG, u.markupPerGram, u.marginMode, u.marginUsd, u.minStockQty]) {
      expectLabelled(text);
    }
    // A new type has no code yet: a heading and a note, not a label pointing at nothing.
    expect(screen.queryByLabelText(u.code)).toBeNull();
    expect(screen.getByText(u.autoGenerated)).toBeInTheDocument();
    // The hidden file input is named after the section it belongs to.
    expect(screen.getByLabelText(u.photo, { selector: "input" })).toHaveAttribute("type", "file");
    expectEveryControlNamed(11);
  });

  it("the margin label follows the margin mode and keeps hold of its input", () => {
    renderCatalog("en");
    fireEvent.click(screen.getByRole("button", { name: en.unitCatalog.coins.newType }));
    const input = screen.getByLabelText(en.unitCatalog.marginUsd);
    fireEvent.change(screen.getByLabelText(en.unitCatalog.marginMode), { target: { value: "PERCENT" } });
    expect(expectLabelled(en.unitCatalog.marginPercent)).toBe(input);
  });

  it("the edit form labels the read-only code and loads the stored decimals", () => {
    renderCatalog("en");
    fireEvent.click(rowButton(en, en.common.edit));
    const code = expectLabelled(en.unitCatalog.code);
    expect(code).toBeDisabled();
    expect(code).toHaveValue(COIN.code);
    expect(screen.getByLabelText(en.unitCatalog.weightG)).toHaveValue(7.2);
    expect(screen.getByLabelText(en.unitCatalog.markupPerGram)).toHaveValue(0.5);
    expect(screen.getByRole("button", { name: en.unitCatalog.saveChanges })).toBeInTheDocument();
  });

  it("every field in the stock-adjust dialog is reachable by its label", () => {
    renderCatalog("en");
    fireEvent.click(rowButton(en, en.unitCatalog.adjustStock));
    for (const text of [en.unitCatalog.deltaQty, en.unitCatalog.reason, en.unitCatalog.notes]) expectLabelled(text);
    // The hint sits beside the label, not inside it, so it stays out of the field's name.
    expect(screen.getByLabelText(en.unitCatalog.deltaQty)).toHaveAccessibleName(en.unitCatalog.deltaQty);
    expectEveryControlNamed(5);
  });

  it("names the search box, the filter and the empty header cells", () => {
    renderCatalog("ar");
    const u = ar.unitCatalog;
    expect(screen.getByLabelText(u.coins.search)).toHaveAttribute("placeholder", u.coins.search);
    expectLabelled(u.includeInactive);
    expect(screen.getByRole("columnheader", { name: u.photo })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: ar.common.actions })).toBeInTheDocument();
  });

  it("names each row's four buttons after the row's code", () => {
    renderCatalog("ar");
    showInactive(ar);
    const u = ar.unitCatalog;
    for (const row of [COIN, RETIRED]) {
      for (const action of [u.livePrice, u.adjustStock, ar.common.edit, row.is_active ? u.deactivate : u.reactivate]) {
        // The tooltip stays the short action name.
        expect(rowButton(ar, action, row.code), `${action} ${row.code}`).toHaveAttribute("title", action);
      }
    }
    const names = within(screen.getByRole("table")).getAllByRole("button").map((button) => button.getAttribute("aria-label"));
    expect(names).toHaveLength(8);
    expect(new Set(names).size).toBe(8);
  });
});

describe("UnitCatalog lists what the backend lists", () => {
  it("hides inactive types until asked, and narrows by search", () => {
    renderCatalog("en");
    expect(screen.getByText(COIN.name_en)).toBeInTheDocument();
    expect(screen.queryByText(RETIRED.name_en)).toBeNull();
    showInactive(en);
    expect(screen.getByText(RETIRED.name_en)).toBeInTheDocument();
    expect(screen.getByText(en.unitCatalog.inactive)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(en.unitCatalog.coins.search), { target: { value: "sovereign" } });
    expect(screen.queryByText(COIN.name_en)).toBeNull();
    expect(screen.getByText(RETIRED.name_en)).toBeInTheDocument();
  });
});

describe("UnitCatalog in Arabic (NEX-64)", () => {
  it("leaves no English behind — list and new-type form", () => {
    renderCatalog("ar");
    showInactive(ar);
    fireEvent.click(screen.getByRole("button", { name: ar.unitCatalog.coins.newType }));
    for (const english of ["New Coin Type", "Include inactive", "Code", "Name", "Karat", "Weight", "Markup / Margin", "On hand", "Min", "inactive", "auto-generated", "Name (English)", "Weight (g)", "Markup / g (±)", "Margin mode", "Flat USD", "Percent", "Margin (USD)", "Min stock qty", "Photo", "Upload photo", "Create Coin Type", "Cancel"]) {
      expect(screen.queryByText(english), english).toBeNull();
    }
    expect(screen.queryByPlaceholderText("Search coin types…")).toBeNull();
    expect(screen.queryByPlaceholderText("(none)")).toBeNull();
    expect(screen.getByText(ar.unitCatalog.inactive)).toBeInTheDocument();
    expect(uiStrings().filter(hasEnglishWord)).toEqual([]);
  });

  it("leaves no English behind — edit form, with a photo", () => {
    renderCatalog("ar");
    showInactive(ar);
    fireEvent.click(rowButton(ar, ar.common.edit, RETIRED.code));
    expect(screen.getByText(ar.unitCatalog.coins.editType)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: ar.unitCatalog.photoPreview })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: ar.unitCatalog.removePhoto })).toHaveAttribute("title", ar.unitCatalog.removePhoto);
    expect(screen.getByRole("button", { name: ar.unitCatalog.changePhoto })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: ar.unitCatalog.saveChanges })).toBeInTheDocument();
    expect(uiStrings().filter(hasEnglishWord)).toEqual([]);
  });

  it("leaves no English behind — stock-adjust dialog", () => {
    renderCatalog("ar");
    fireEvent.click(rowButton(ar, ar.unitCatalog.adjustStock));
    for (const english of ["Adjust stock", "Delta (qty)", "Whole numbers only.", "Reason", "CORRECTION", "THEFT", "Notes", "Apply", "Cancel"]) {
      expect(screen.queryByText(english), english).toBeNull();
    }
    expect(screen.getByLabelText(ar.unitCatalog.deltaQty)).toHaveAttribute("placeholder", ar.unitCatalog.deltaPlaceholder);
    expect(screen.getByLabelText(ar.unitCatalog.notes)).toHaveAttribute("placeholder", ar.unitCatalog.notesPlaceholder);
    expect(screen.getByRole("option", { name: ar.unitCatalog.reasons.THEFT })).toHaveValue("THEFT");
    expect(uiStrings().filter(hasEnglishWord)).toEqual([]);
  });

  it("leaves no English behind — live price dialog, rate source included", () => {
    renderCatalog("ar");
    fireEvent.click(rowButton(ar, ar.unitCatalog.livePrice));
    for (const english of ["Live price", "per unit", "Spot 24K", "Effective rate", "Metal value", "Margin", "On hand", "Source", "live", "(stale)", "Close"]) {
      expect(screen.queryByText(english, { exact: false }), english).toBeNull();
    }
    const u = ar.unitCatalog;
    expect(screen.getByText("$728.60")).toBeInTheDocument();
    expect(screen.getByText(u.effectiveRate).parentElement).toHaveTextContent(`$100.50/g ${u.markupApplied}`);
    // "live" is the API's word for the polled feed; a stale flag only ever comes with it.
    expect(screen.getByText(u.source).parentElement).toHaveTextContent(`${u.sources.live}${u.stale}`);
    expect(screen.getByRole("button", { name: ar.common.close })).toBeInTheDocument();
    expect(uiStrings().filter(hasEnglishWord)).toEqual([]);
  });

  it("translates an admin override as the rate source", () => {
    db.price = { ...PRICE, rate_source: "override", rate_is_stale: false };
    renderCatalog("ar");
    fireEvent.click(rowButton(ar, ar.unitCatalog.livePrice));
    const cell = screen.getByText(ar.unitCatalog.source).parentElement as HTMLElement;
    expect(cell).toHaveTextContent(ar.unitCatalog.sources.override);
    expect(cell).not.toHaveTextContent(ar.unitCatalog.stale);
  });

  it("has no noun props left: the wording comes from `resource`, and a caller passing the old ones does not compile", () => {
    // @ts-expect-error `singular` was removed with `plural`; tsc fails here if either comes back.
    const stale = <UnitCatalog resource="coins" adjustmentTarget="COIN_STOCK" singular="Coin Type" plural="Coin Types" />;
    expect(stale.type).toBe(UnitCatalog);
  });

  it("uses the ounce wording for the ounce catalog", () => {
    db.rows = [];
    renderCatalog("ar", "ounces");
    const o = ar.unitCatalog.ounces;
    expect(screen.getByText(o.empty)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(o.search)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: o.newType }));
    expect(screen.getByRole("button", { name: o.createType })).toBeInTheDocument();
    expect(uiStrings().filter(hasEnglishWord)).toEqual([]);
  });

  it("keeps Arabic words out of monospace, which RTL lays out left-to-right", () => {
    renderCatalog("ar");
    const u = ar.unitCatalog;
    fireEvent.click(screen.getByRole("button", { name: u.coins.newType }));
    const autoCode = screen.getByText(u.autoGenerated);
    expect(autoCode).toHaveClass("ltr:font-mono");
    expect(autoCode).not.toHaveClass("font-mono");

    fireEvent.click(rowButton(ar, u.adjustStock));
    const subtitle = screen.getByText(new RegExp(`· ${u.onHandInline}`));
    expect(subtitle).toHaveClass("ltr:font-mono");
    expect(subtitle).not.toHaveClass("font-mono");
    expect(subtitle).toHaveTextContent(`${COIN.code} · ${u.onHandInline} 3`);
    expect(within(subtitle).getByText(COIN.code)).toHaveClass("font-mono");
    expect(within(subtitle).getByText(COIN.code)).toHaveAttribute("dir", "ltr");

    fireEvent.click(rowButton(ar, u.livePrice));
    // A figure with a translated note: the cell is monospace in LTR only, the figure always.
    const rate = screen.getByText(u.effectiveRate).nextElementSibling as HTMLElement;
    expect(rate).toHaveClass("ltr:font-mono");
    expect(rate).not.toHaveClass("font-mono");
    const figure = within(rate).getByText("$100.50/g");
    expect(figure.tagName).toBe("BDI");
    expect(figure).toHaveClass("font-mono");
    expect(figure).not.toHaveTextContent(u.markupApplied);
    // The source is a word in Arabic, so nothing in its cell is monospace there.
    const source = screen.getByText(u.source).nextElementSibling as HTMLElement;
    expect(source).toHaveClass("ltr:font-mono");
    expect(source.querySelector(".font-mono")).toBeNull();
    expect(within(source).getByText(u.stale)).toHaveClass("ms-1");
  });

  it("keeps codes, signed figures and karats left-to-right inside Arabic text", () => {
    renderCatalog("ar");
    showInactive(ar);
    for (const signed of ["+0.5000/g", "-0.2500/g", "+ $5.00", "+ 2.50%"]) {
      expect(screen.getByText(signed).closest("bdi"), signed).toHaveAttribute("dir", "ltr");
    }
    const code = screen.getByText(COIN.code);
    expect(code.closest("bdi")).toHaveAttribute("dir", "ltr");
    expect(code.closest("td")).toHaveClass("font-mono");
    fireEvent.click(rowButton(ar, ar.unitCatalog.livePrice));
    expect(screen.getByText(new RegExp(ar.unitCatalog.perUnit))).toHaveTextContent(`${ar.unitCatalog.perUnit} · K21`);
  });

  it("follows the reading direction: logical utilities only, switches mirrored", () => {
    const { container } = renderCatalog("ar");
    showInactive(ar);
    fireEvent.click(rowButton(ar, ar.common.edit, RETIRED.code));
    fireEvent.click(rowButton(ar, ar.unitCatalog.adjustStock));
    fireEvent.click(rowButton(ar, ar.unitCatalog.livePrice));
    expect(physicalClasses(container)).toEqual([]);
    // The on/off switches are the only directional icons here.
    const toggles = container.querySelectorAll("svg[class*='lucide-toggle-']");
    expect(toggles).toHaveLength(2);
    toggles.forEach((icon) => expect(icon).toHaveClass("rtl:rotate-180"));
    expect(container.querySelector("svg[class*='lucide-arrow-'], svg[class*='lucide-chevron-left'], svg[class*='lucide-chevron-right']")).toBeNull();
    expect(screen.getByRole("columnheader", { name: ar.unitCatalog.code })).toHaveClass("text-start");
    // The remove-photo button sits on the trailing corner in either direction.
    expect(screen.getByRole("button", { name: ar.unitCatalog.removePhoto })).toHaveClass("-end-1.5");
    // The Arabic-name field is right-to-left by itself; its text starts at its own start.
    expect(screen.getByLabelText(ar.common.nameAr)).toHaveAttribute("dir", "rtl");
    expect(screen.getByLabelText(ar.common.nameAr)).toHaveClass("text-start");
    expect(screen.getByText(ar.unitCatalog.inactive)).toHaveClass("ms-2");
  });
});

describe("UnitCatalog in English is unchanged", () => {
  it("keeps the list, form and dialog copy the screen had before the strings moved", () => {
    renderCatalog("en");
    showInactive(en);
    expect(screen.getByPlaceholderText("Search coin types…")).toBeInTheDocument();
    expect(screen.getByText("+0.5000/g").closest("div")).toHaveTextContent("± +0.5000/g");
    expect(screen.getByText("7.200g")).toBeInTheDocument();
    expect(screen.getByText("inactive")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "New Coin Type" }));
    expect(screen.getByRole("button", { name: "Create Coin Type" })).toBeInTheDocument();
    expect(screen.getByText("auto-generated")).toHaveClass("ltr:font-mono");
    fireEvent.click(rowButton(en, "Edit"));
    expect(screen.getByText("Edit Coin Type")).toBeInTheDocument();

    fireEvent.click(rowButton(en, "Adjust stock"));
    const subtitle = screen.getByText(/· on hand/);
    expect(subtitle).toHaveClass("ltr:font-mono");
    expect(subtitle).toHaveTextContent("FN-COIN-21K-0001 · on hand 3");
    expect(screen.getByRole("option", { name: "CORRECTION" })).toBeInTheDocument();

    fireEvent.click(rowButton(en, "Live price"));
    expect(screen.getByText(/per unit/)).toHaveTextContent("per unit · K21");
    expect(screen.getByText("Spot 24K").parentElement).toHaveTextContent("$100.00/g");
    expect(screen.getByText("Effective rate").parentElement).toHaveTextContent("$100.50/g (markup applied)");
    expect(screen.getByText("Source").parentElement).toHaveTextContent("live(stale)");
    expect(screen.getByText("Source").nextElementSibling).toHaveClass("ltr:font-mono");
    // The sweep the Arabic tests rely on does see this screen's copy.
    expect(uiStrings().filter(hasEnglishWord).length).toBeGreaterThan(40);
  });

  it("keeps the empty state and the ounce wording", () => {
    db.rows = [];
    renderCatalog("en", "ounces");
    expect(screen.getByText("No ounce types yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New Ounce Type" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search ounce types…")).toBeInTheDocument();
  });
});

// NEX-54: GET /coins/{id}/price is moving gold_rate_24k from a JSON number to
// an exact decimal string.
describe("UnitCatalog live price — the rate as a decimal string or a number (NEX-54)", () => {
  function dialog(price: unknown) {
    db.price = price;
    const view = renderCatalog("en");
    fireEvent.click(rowButton(en, "Live price"));
    const spot = screen.getByText("Spot 24K").parentElement?.textContent;
    const html = view.container.innerHTML;
    view.unmount();
    return { spot, html };
  }

  it("prints the same dialog for both shapes", () => {
    const numeric = dialog({ ...PRICE, gold_rate_24k: 141.6 });
    const exact = dialog({ ...PRICE, gold_rate_24k: "141.60" });
    expect(numeric.spot).toBe("Spot 24K$141.60/g");
    expect(exact.spot).toBe(numeric.spot);
    expect(exact.html).toBe(numeric.html);
  });

  it("a rate that cannot be read shows the missing-amount dash, never NaN", () => {
    const { spot, html } = dialog({ ...PRICE, gold_rate_24k: null });
    expect(spot).toBe("Spot 24K—/g");
    expect(html).not.toContain("NaN");
  });
});

describe("unitCatalog dictionary is translated, not English placeholders", () => {
  const strings = (dict: typeof en.unitCatalog) => ({
    ...dict,
    ...Object.fromEntries(Object.entries(dict.coins).map(([k, v]) => [`coins.${k}`, v])),
    ...Object.fromEntries(Object.entries(dict.ounces).map(([k, v]) => [`ounces.${k}`, v])),
    ...Object.fromEntries(Object.entries(dict.reasons).map(([k, v]) => [`reasons.${k}`, v])),
    ...Object.fromEntries(Object.entries(dict.sources).map(([k, v]) => [`sources.${k}`, v])),
    rowAction: dict.rowAction(dict.adjustStock, "FN-COIN-21K-0001"),
    coins: "", ounces: "", reasons: "", sources: "",
  });
  const english = strings(en.unitCatalog) as Record<string, string>;
  const arabic = strings(ar.unitCatalog) as Record<string, string>;

  it("every ar.unitCatalog string contains Arabic and differs from English", () => {
    const keys = Object.keys(english).filter((key) => english[key]);
    expect(keys.length).toBeGreaterThan(65);
    for (const key of keys) {
      expect(arabic[key], key).toMatch(/[\u0600-\u06FF]/);
      expect(arabic[key], key).not.toBe(english[key]);
    }
  });
});

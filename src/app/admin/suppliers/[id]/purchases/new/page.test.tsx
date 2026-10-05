import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import NewPurchasePage from "@/app/admin/suppliers/[id]/purchases/new/page";
import { LanguageProvider } from "@/context/LanguageContext";
import en from "@/i18n/en";
import ar from "@/i18n/ar";

vi.mock("next/navigation", () => ({ useParams: () => ({ id: "s1" }), useRouter: () => ({ push: vi.fn() }) }));
const swr = vi.hoisted(() => ({ byKey: {} as Record<string, unknown> }));
vi.mock("swr", () => ({ default: (key: string) => ({ data: swr.byKey[key], error: undefined, isLoading: false, isValidating: false, mutate: vi.fn() }) }));
vi.mock("@/lib/api-client", () => ({ apiFetcher: vi.fn(), api: { post: vi.fn() } }));

const LOT_ID = "7b1e4c90-55aa-4d2f-9c11-0a1b2c3d4e5f";
const supplier = { supplier: { id: "s1", name: "Abu Ali Gold" } };
const lots = { items: [{ id: LOT_ID, karat: "K21", weight_grams: 50, weight_remaining_grams: 30.25, source: "SUPPLIER", is_depleted: false }] };
const coins = { items: [{ id: "c1", code: "LIRA-21", karat: "K21", weight_grams: 8 }] };
const ounces = { items: [{ id: "o1", code: "OZ-PAMP", karat: "K24", weight_grams: 31.1 }] };

/** Every string a user can see or hear: text nodes plus placeholder / title / aria-label. */
function uiStrings(root: HTMLElement): string[] {
  const out: string[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) out.push(walker.currentNode.textContent ?? "");
  root.querySelectorAll("[placeholder],[title],[aria-label]").forEach((el) => {
    for (const attr of ["placeholder", "title", "aria-label"]) out.push(el.getAttribute(attr) ?? "");
  });
  return out.map((s) => s.trim()).filter(Boolean);
}

/** The strings that still carry Latin words once the known data values are taken out. */
function englishLeft(root: HTMLElement, data: (string | RegExp)[]): string[] {
  return uiStrings(root).filter((s) => /[A-Za-z]{2,}/.test(data.reduce<string>((rest, d) => rest.split(d).join(""), s)));
}

/** Elements whose classes pin a side (text-left, ml-2, pr-4 …) instead of following the reading direction. */
function physicalClasses(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll("[class]"))
    .map((el) => el.getAttribute("class") ?? "")
    .filter((classes) => /(^|\s)(text-(left|right)|-?m[lr]-\S+|p[lr]-\S+)(\s|$)/.test(classes));
}

/** Every leaf of a dictionary namespace, with function-valued keys called on sample arguments. */
function leaves(node: unknown, path: string): [string, string][] {
  if (typeof node === "string") return [[path, node]];
  if (typeof node === "function") return [[path, String((node as (...args: unknown[]) => unknown)(2, 3, 4))]];
  return Object.entries(node as Record<string, unknown>).flatMap(([key, value]) => leaves(value, `${path}.${key}`));
}

// Left as-is on purpose: the supplier's name comes from the database, and
// lot ids and coin / ounce codes are machine identifiers.
const DATA = [supplier.supplier.name, LOT_ID.slice(0, 8), coins.items[0].code, ounces.items[0].code];

function renderPage(lang: "en" | "ar") {
  return render(<LanguageProvider initialLang={lang}><NewPurchasePage /></LanguageProvider>);
}

/** A field with a visible label: found by that text, and the label's control is the field. */
function expectLabelled(text: string, tagName: string) {
  const control = screen.getByLabelText(text);
  expect(control.tagName, text).toBe(tagName);
  const label = control.closest("label") as HTMLLabelElement;
  expect(label, text).not.toBeNull();
  expect(label.control, text).toBe(control);
  return control;
}

/** The hint under "Cash paid now": the amount is its only <bdi>. */
const differenceHint = () => screen.getByText(/^\$[\d,.]+$/, { selector: "bdi" }).parentElement as HTMLElement;

/** Walks the whole form: mixed mode, one gold payment line, one item of each kind. */
function fillEveryBranch(dict: typeof en) {
  const sp = dict.supplierPurchase;
  fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${sp.mode.MIXED}`) }));
  fireEvent.click(screen.getByRole("button", { name: sp.addGoldLine }));
  for (const kind of ["PURE_GOLD", "COIN", "OUNCE", "PRODUCT"] as const) {
    fireEvent.click(screen.getByRole("button", { name: sp.addItem }));
    const item = screen.getAllByRole("group").at(-1) as HTMLElement;
    fireEvent.change(within(item).getByLabelText(sp.itemKind), { target: { value: kind } });
  }
}

describe("new supplier purchase labels and i18n (NEX-64)", () => {
  beforeEach(() => {
    swr.byKey = {
      "/suppliers/s1": supplier,
      "/lots?page_size=200": lots,
      "/coins?is_active=true&page_size=200": coins,
      "/ounces?is_active=true&page_size=200": ounces,
    };
  });

  it("the deal fields are reachable by label and the label's control is the input", () => {
    renderPage("en");
    const sp = en.supplierPurchase;
    expect(expectLabelled(sp.totalCashDue, "INPUT")).toHaveAttribute("type", "number");
    expectLabelled(sp.cashPaidNow, "INPUT");
    expectLabelled(sp.notes, "TEXTAREA");
    // The hint under "Cash paid now" is not swallowed into the field's name.
    expect(screen.getByLabelText(sp.cashPaidNow).closest("label")).toHaveTextContent(new RegExp(`^${sp.cashPaidNow}$`));
    expect(differenceHint()).toHaveTextContent("Difference ($0.00) becomes cash debt.");
    fireEvent.change(screen.getByLabelText(sp.totalCashDue), { target: { value: "1500" } });
    fireEvent.change(screen.getByLabelText(sp.cashPaidNow), { target: { value: "249.5" } });
    expect(differenceHint()).toHaveTextContent("Difference ($1,250.50) becomes cash debt.");

    fireEvent.click(screen.getByRole("button", { name: /^MIXED/ }));
    expectLabelled(sp.tradeMarkup, "INPUT");
    // One label over four inputs is a group: the legend names it, each karat names its input.
    const goldDue = screen.getByRole("group", { name: sp.totalGoldDue });
    for (const karat of ["K18", "K21", "K22", "K24"]) {
      const input = within(goldDue).getByLabelText(karat);
      expect((input.closest("label") as HTMLLabelElement).control, karat).toBe(input);
    }
  });

  it("the payment mode buttons say which one is selected", () => {
    renderPage("en");
    expect(screen.getByRole("button", { name: /^CASH/ })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: /^GOLD/ }));
    expect(screen.getByRole("button", { name: /^GOLD/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /^CASH/ })).toHaveAttribute("aria-pressed", "false");
  });

  it("each gold payment line is a numbered group that names its three controls and its remove button", () => {
    renderPage("en");
    const sp = en.supplierPurchase;
    fireEvent.click(screen.getByRole("button", { name: /^GOLD/ }));
    fireEvent.click(screen.getByRole("button", { name: sp.addGoldLine }));
    fireEvent.click(screen.getByRole("button", { name: sp.addGoldLine }));

    // Two lines repeat the same three controls: the numbered group tells them apart.
    const section = screen.getByRole("group", { name: sp.goldPaidNow });
    const first = within(section).getByRole("group", { name: sp.goldLineN(1) });
    const second = within(section).getByRole("group", { name: sp.goldLineN(2) });
    for (const line of [first, second]) {
      expect(within(line).getByLabelText(sp.karat).tagName).toBe("SELECT");
      expect(within(line).getByLabelText(sp.grams)).toHaveAttribute("type", "number");
      expect(within(line).getByRole("button", { name: sp.removeGoldLine })).toBeInTheDocument();
    }
    const lot = within(first).getByLabelText(sp.lot);
    expect(within(lot).getByRole("option", { name: `${LOT_ID.slice(0, 8)}… · 30.250g` })).toBeInTheDocument();
    expect(within(second).getByLabelText(sp.lot)).not.toBe(lot);

    fireEvent.click(within(first).getByRole("button", { name: sp.removeGoldLine }));
    expect(within(section).getByRole("group", { name: sp.goldLineN(1) })).toBeInTheDocument();
    expect(within(section).queryByRole("group", { name: sp.goldLineN(2) })).toBeNull();
  });

  it("follows the reading direction: logical utilities only, and the back arrow flips", () => {
    const { container } = renderPage("ar");
    fillEveryBranch(ar);
    fireEvent.change(within(screen.getByRole("group", { name: ar.supplierPurchase.totalGoldDue })).getByLabelText("K21"), { target: { value: "5" } });
    expect(screen.getByText(ar.supplierPurchase.pickedVsDue, { exact: false })).toBeInTheDocument();
    expect(physicalClasses(container)).toEqual([]);
    expect(container.querySelector("svg.lucide-arrow-left")).toHaveClass("rtl:rotate-180");
    container.querySelectorAll("svg[class*='lucide-arrow-'], svg[class*='lucide-chevron-left'], svg[class*='lucide-chevron-right'], svg[class*='lucide-toggle-']").forEach((icon) => expect(icon).toHaveClass("rtl:rotate-180"));
    expect(screen.getByRole("button", { name: new RegExp(`^${ar.supplierPurchase.mode.CASH}`) })).toHaveClass("text-start");
    // The Arabic-name field is right-to-left in both languages; "start" is its right edge.
    const nameAr = screen.getByLabelText(ar.common.nameAr);
    expect(nameAr).toHaveAttribute("dir", "rtl");
    expect(nameAr).toHaveClass("text-start");
  });

  it("every item control has a name, whatever the item kind", () => {
    renderPage("en");
    const sp = en.supplierPurchase;
    fireEvent.click(screen.getByRole("button", { name: sp.addItem }));
    const item = screen.getByRole("group", { name: sp.itemN(1) });
    const kind = within(item).getByLabelText(sp.itemKind);
    const names = () => Array.from(item.querySelectorAll("input, select, textarea")).map((el) => el.getAttribute("aria-label"));

    expect(names()).toEqual([sp.itemKind, sp.unitCost, sp.karat, sp.weight, sp.itemNotes]);
    fireEvent.change(kind, { target: { value: "COIN" } });
    expect(names()).toEqual([sp.itemKind, sp.unitCost, sp.coinType, sp.qty]);
    expect(within(item).getByRole("option", { name: "LIRA-21 · K21 · 8g" })).toBeInTheDocument();
    fireEvent.change(kind, { target: { value: "OUNCE" } });
    expect(names()).toEqual([sp.itemKind, sp.unitCost, sp.ounceType, sp.qty]);
    fireEvent.change(kind, { target: { value: "PRODUCT" } });
    expect(names()).toEqual([sp.itemKind, sp.unitCost, en.common.nameEn, en.common.nameAr, sp.category, sp.karat, sp.weight, sp.margin, sp.makingCharge]);

    fireEvent.click(within(item).getByRole("button", { name: sp.removeItem }));
    expect(screen.getByText(sp.noItems)).toBeInTheDocument();
  });

  it("renders every branch of the form in Arabic with no English left behind", () => {
    const { container } = renderPage("ar");
    const sp = ar.supplierPurchase;
    fillEveryBranch(ar);

    expect(screen.getByRole("link", { name: sp.backTo("Abu Ali Gold") })).toHaveAttribute("href", "/admin/suppliers/s1");
    expect(screen.getByRole("heading", { name: sp.title })).toBeInTheDocument();
    for (const text of [sp.totalCashDue, sp.cashPaidNow, sp.tradeMarkup, sp.notes]) {
      expect(screen.getByLabelText(text), text).toBeInTheDocument();
    }
    expect(screen.getByRole("group", { name: sp.totalGoldDue })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: sp.goldPaidNow })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: sp.goldLineN(1) })).toBeInTheDocument();
    // The amount sits where the Arabic sentence wants it, isolated left-to-right.
    expect(differenceHint()).toHaveTextContent(sp.cashDifference.replace("{amount}", "$0.00"));
    expect(screen.getByText("$0.00").closest("bdi")).toHaveAttribute("dir", "ltr");
    expect(screen.getAllByRole("option", { name: sp.kind.PURE_GOLD })).toHaveLength(4);
    expect(screen.getByRole("option", { name: "LIRA-21 · K21 · 8g" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: sp.recordPurchase })).toBeEnabled();
    expect(screen.getByRole("link", { name: ar.common.cancel })).toBeInTheDocument();

    for (const english of ["New supplier purchase", "Payment mode", "Deal split", "CASH", "GOLD", "MIXED", "Items received", "Add item", "Notes", "Cancel", "Record Purchase"]) {
      expect(screen.queryByText(english), english).toBeNull();
    }
    for (const placeholder of ["grams", "Unit cost USD", "weight g", "notes", "qty", "Name (English)", "Category", "margin %", "making charge"]) {
      expect(screen.queryByPlaceholderText(placeholder), placeholder).toBeNull();
    }
    expect(englishLeft(container, DATA)).toEqual([]);
  });

  it("the no-English check is not vacuous: it flags the English render", () => {
    const { container } = renderPage("en");
    fillEveryBranch(en);
    expect(englishLeft(container, DATA)).toEqual(expect.arrayContaining(["New supplier purchase", "Unit cost USD", "— pick coin type —", "Remove item"]));
  });

  it("falls back to a generic back link until the supplier has loaded", () => {
    swr.byKey = {};
    renderPage("ar");
    expect(screen.getByRole("link", { name: ar.supplierPurchase.backToSupplier })).toBeInTheDocument();
  });
});

describe("the supplierPurchase namespace is translated, not English placeholders", () => {
  it("both languages keep the {amount} token the page splits on", () => {
    expect(en.supplierPurchase.cashDifference.split("{amount}")).toHaveLength(2);
    expect(ar.supplierPurchase.cashDifference.split("{amount}")).toHaveLength(2);
  });

  it("every ar.supplierPurchase key differs from English and is written in Arabic", () => {
    const english = new Map(leaves(en.supplierPurchase, "supplierPurchase"));
    const untranslated = leaves(ar.supplierPurchase, "supplierPurchase")
      .filter(([path, value]) => value === english.get(path) || !/[؀-ۿ]/.test(value))
      .map(([path]) => path);
    // The Arabic-name field shows an Arabic placeholder in both languages, on purpose.
    expect(untranslated).toEqual(["supplierPurchase.nameArPlaceholder"]);
  });
});

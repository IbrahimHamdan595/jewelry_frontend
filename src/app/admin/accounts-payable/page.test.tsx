import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import AccountsPayablePage from "@/app/admin/accounts-payable/page";
import { LanguageProvider } from "@/context/LanguageContext";
import en from "@/i18n/en";
import ar from "@/i18n/ar";

const swr = vi.hoisted(() => ({ data: undefined as unknown }));
vi.mock("swr", () => ({ default: () => ({ data: swr.data, error: undefined, isLoading: false, isValidating: false, mutate: vi.fn() }) }));
vi.mock("@/lib/api-client", async (orig) => ({ ...(await orig<typeof import("@/lib/api-client")>()), apiFetcher: vi.fn() }));

const payable = {
  total_cash_owed: 1250.5,
  total_grams_owed_by_karat: { K21: 12.5, K18: 0 },
  suppliers: [
    { supplier_id: "s1", supplier_name: "Abu Ali Gold", balances: [{ unit: "CASH", karat: null, balance: 1250.5 }, { unit: "GOLD", karat: "K21", balance: 12.5 }] },
  ],
};

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

// Left as-is on purpose: supplier names come from the database.
const DATA = payable.suppliers.map((s) => s.supplier_name);

function renderPage(lang: "en" | "ar") {
  return render(<LanguageProvider initialLang={lang}><AccountsPayablePage /></LanguageProvider>);
}

describe("accounts payable i18n (NEX-64)", () => {
  beforeEach(() => {
    swr.data = payable;
  });

  it("renders in Arabic with no English left behind", () => {
    const { container } = renderPage("ar");
    const p = ar.payables;
    expect(screen.getByRole("heading", { name: p.title })).toBeInTheDocument();
    for (const text of [p.cashOwedStoreWide, p.goldOwed, p.suppliersWithDebt]) {
      expect(screen.getByText(text), text).toBeInTheDocument();
    }
    for (const header of [p.colSupplier, p.colCash, p.colGold]) {
      expect(screen.getByRole("columnheader", { name: header }), header).toBeInTheDocument();
    }
    expect(screen.getByRole("link", { name: p.settle })).toHaveAttribute("href", "/admin/suppliers/s1");
    for (const english of ["Accounts Payable", "Cash owed (store-wide)", "Gold owed", "Suppliers with debt", "Supplier", "Cash", "Gold", "Settle →"]) {
      expect(screen.queryByText(english), english).toBeNull();
    }
    expect(englishLeft(container, DATA)).toEqual([]);
  });

  it("the no-English check is not vacuous: it flags the English render", () => {
    const { container } = renderPage("en");
    expect(englishLeft(container, DATA)).toEqual(expect.arrayContaining(["Accounts Payable", "Gold owed", "Settle →"]));
  });

  it("leaves the supplier name as data and keeps amounts in their symbols ($, g)", () => {
    renderPage("ar");
    const row = screen.getByRole("row", { name: /Abu Ali Gold/ });
    expect(within(row).getByText("12.500g")).toBeInTheDocument();
    expect(within(row).getByText("$1,250.50")).toBeInTheDocument();
  });

  it("follows the reading direction: logical utilities only", () => {
    const { container } = renderPage("ar");
    expect(physicalClasses(container)).toEqual([]);
    // No arrow, chevron or toggle on this screen: nothing to mirror.
    expect(container.querySelector("svg[class*='lucide-arrow-'], svg[class*='lucide-chevron-left'], svg[class*='lucide-chevron-right'], svg[class*='lucide-toggle-']")).toBeNull();
    expect(screen.getByRole("columnheader", { name: ar.payables.colSupplier })).toHaveClass("text-start");
    expect(screen.getByRole("link", { name: ar.payables.settle }).closest("td")).toHaveClass("text-end");
    // A weight and its unit are one left-to-right run, so the gap stays between them.
    const unit = screen.getByText("g", { selector: "span" });
    expect(unit).toHaveClass("ms-1");
    expect(unit.closest("bdi")).toHaveAttribute("dir", "ltr");
    expect(unit.closest("bdi")).toHaveTextContent("12.500g");
  });

  it("gives the unlabelled link column a name for screen readers", () => {
    renderPage("ar");
    expect(screen.getByRole("columnheader", { name: ar.common.actions })).toBeInTheDocument();
  });

  it("translates both empty states", () => {
    swr.data = { total_cash_owed: 0, total_grams_owed_by_karat: {}, suppliers: [] };
    const { container } = renderPage("ar");
    expect(screen.getByText(ar.payables.none)).toBeInTheDocument();
    expect(screen.getByText(ar.payables.empty)).toBeInTheDocument();
    expect(screen.queryByText(en.payables.empty)).toBeNull();
    expect(englishLeft(container, DATA)).toEqual([]);
  });
});

describe("the payables namespace is translated, not English placeholders", () => {
  it("every ar.payables key differs from English and is written in Arabic", () => {
    const english = new Map(leaves(en.payables, "payables"));
    const untranslated = leaves(ar.payables, "payables")
      .filter(([path, value]) => value === english.get(path) || !/[؀-ۿ]/.test(value))
      .map(([path]) => path);
    expect(untranslated).toEqual([]);
  });
});

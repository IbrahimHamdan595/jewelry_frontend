import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import QRLabelsPage from "@/app/admin/qr-labels/page";
import { LanguageProvider } from "@/context/LanguageContext";
import en from "@/i18n/en";
import ar from "@/i18n/ar";

const swr = vi.hoisted(() => ({ data: undefined as unknown }));
vi.mock("swr", () => ({ default: () => ({ data: swr.data, error: undefined, isLoading: false, isValidating: false, mutate: vi.fn() }) }));
vi.mock("@/lib/api-client", async (orig) => ({ ...(await orig<typeof import("@/lib/api-client")>()), apiFetcher: vi.fn() }));
// jsdom has no canvas; the barcode image is not what these tests are about.
vi.mock("jsbarcode", () => ({ default: vi.fn() }));

// ProductOut as GET /products sends it (app/schemas/product.py): FN-{karat label}-NNNN codes,
// karat as the enum value ("K21"), decimals — weight and stone carats included — as strings.
const base = {
  name_ar: "", category: "Rings", category_id: "cat1", margin_percent: "15.00", making_charge: "25.00", photos: [], is_active: true,
  on_hand_qty: 1, min_stock_qty: null, is_used: false, cost_basis_usd: null, status: "AVAILABLE", source_ref_type: null, source_ref_id: null,
  stone_value_usd: null, stone_cost_usd: null, stone_carats: null, stone_count: null, stone_cert: null, stone_note: null,
  created_at: "2026-08-01T09:00:00Z", updated_at: "2026-08-01T09:00:00Z",
};
const ring = { ...base, id: "p1", code: "FN-21K-0001", name_en: "Gold Ring", karat: "K21", weight_grams: "5.250" };
const chain = {
  ...base, id: "p2", code: "FN-18K-0007", name_en: "Rope Chain", karat: "K18", weight_grams: "12.000",
  stone_value_usd: "450.00", stone_cost_usd: "300.00", stone_carats: "0.500", stone_count: 1, stone_cert: "GIA-2141438167",
};

function renderPage(lang: "en" | "ar") {
  return render(
    <LanguageProvider initialLang={lang}>
      <QRLabelsPage />
    </LanguageProvider>,
  );
}

// Everything a user can read or hear: text nodes plus placeholder / title / aria-label / alt.
function uiStrings(root: HTMLElement): string[] {
  const out: string[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) if (walker.currentNode.parentElement?.tagName !== "STYLE") out.push(walker.currentNode.textContent ?? "");
  root.querySelectorAll("*").forEach((el) => ["placeholder", "title", "aria-label", "alt"].forEach((a) => out.push(el.getAttribute(a) ?? "")));
  return out;
}
/** Latin words still on screen once data and the codes that stay Latin by design are set aside. */
const englishLeft = (root: HTMLElement, keep: RegExp) =>
  uiStrings(root).map((s) => s.replace(keep, "")).filter((s) => /[A-Za-z]{2,}/.test(s));
// The barcode symbology name, the stone certificate and carat unit printed on the tag, the
// product codes and English names the fixtures supply as data, and karat codes.
const DATA = /\b(FN-\d\dK-\d{4}|CODE128|1D|GIA-2141438167|0\.500ct|Gold Ring|Rope Chain|K?\d\dK?)\b/g;
/** Physical-direction utilities that would not flip in RTL. */
const physicalClasses = (root: HTMLElement) =>
  Array.from(root.querySelectorAll("[class]")).flatMap((el) => Array.from(el.classList)).filter((c) => /^(text-(left|right)|-?m[lr]-|p[lr]-|(left|right)-)/.test(c));

/** The list row for a product: the label that wraps its checkbox. */
const rowOf = (name: string) => screen.getAllByText(name)[0].closest("label") as HTMLLabelElement;

describe("QR labels (NEX-64)", () => {
  beforeEach(() => {
    swr.data = { items: [ring, chain], total: 2, page: 1, page_size: 100 };
    // <style jsx global> is compiled away by Next's SWC plugin; under vitest React warns about it.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it("a row is a label around a real checkbox: clicking the row or the box toggles the product", () => {
    renderPage("en");
    const row = rowOf("Gold Ring");
    const box = within(row).getByRole("checkbox") as HTMLInputElement;
    expect(row.control).toBe(box);
    expect(box.checked).toBe(false);

    fireEvent.click(within(row).getByText("Gold Ring"));
    expect(box.checked).toBe(true);
    expect(screen.getByText(en.qrLabels.labelsSelected(1))).toBeInTheDocument();

    fireEvent.click(box);
    expect(box.checked).toBe(false);
    expect(screen.getByText(en.qrLabels.labelsSelected(0))).toBeInTheDocument();
  });

  it("each row's copies stepper names its own product, and does not toggle the row", () => {
    renderPage("en");
    fireEvent.click(rowOf("Gold Ring"));
    fireEvent.click(rowOf("Rope Chain"));
    // Two steppers on screen: each button says which product it changes.
    expect(screen.getByRole("button", { name: "More copies of Gold Ring" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "More copies of Rope Chain" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fewer copies of Rope Chain" })).toBeInTheDocument();
    fireEvent.click(rowOf("Rope Chain"));
    const box = within(rowOf("Gold Ring")).getByRole("checkbox") as HTMLInputElement;
    fireEvent.click(screen.getByRole("button", { name: en.qrLabels.moreCopies("Gold Ring") }));
    fireEvent.click(screen.getByRole("button", { name: en.qrLabels.moreCopies("Gold Ring") }));
    expect(box.checked).toBe(true);
    expect(screen.getByText(en.qrLabels.labelsSelected(3))).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: en.qrLabels.fewerCopies("Gold Ring") }));
    expect(screen.getByText(en.qrLabels.labelsSelected(2))).toBeInTheDocument();
  });

  it("select all selects every product once, and clears on a second click", () => {
    renderPage("en");
    const all = screen.getByLabelText(`${en.qrLabels.selectAll} (2)`);
    fireEvent.click(all);
    expect(screen.getByText(en.qrLabels.labelsSelected(2))).toBeInTheDocument();
    fireEvent.click(all);
    expect(screen.getByText(en.qrLabels.labelsSelected(0))).toBeInTheDocument();
  });

  it("Arabic: list, preview and help — no English left", () => {
    const { container } = renderPage("ar");
    const q = ar.qrLabels;
    for (const text of [q.selectProducts, q.previewTitle, q.selectAProduct, q.formatTitle, q.formatHelp, q.labelsSelected(0)]) {
      expect(screen.getByText(text), text).toBeInTheDocument();
    }
    expect(screen.getByLabelText(`${q.selectAll} (2)`)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: q.printLabels })).toBeDisabled();

    fireEvent.click(rowOf("Rope Chain"));
    expect(screen.getByText(q.labelsSelected(1))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: q.moreCopies("Rope Chain") })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: q.printLabels })).toBeEnabled();
    expect(englishLeft(container, DATA)).toEqual([]);
    expect(physicalClasses(container)).toEqual([]);
  });

  it("the printed tag keeps its fixed Latin units whatever the UI language", () => {
    const { container } = renderPage("ar");
    fireEvent.click(rowOf("Rope Chain"));
    const sheet = container.querySelector("#print-sheet") as HTMLElement;
    const tags = sheet.querySelectorAll(".print-label");
    expect(tags).toHaveLength(1);
    expect(tags[0]).toHaveTextContent("Rope Chain");
    // Code and spec line are machine runs: isolated left-to-right on the tag.
    expect(Array.from(tags[0].querySelectorAll('bdi[dir="ltr"]')).map((el) => el.textContent)).toEqual([
      "FN-18K-0007",
      "12.000g · K18 · 💎 0.500ct · GIA-2141438167",
    ]);
  });

  it("a product without stones prints weight and karat only, and one tag per copy", () => {
    const { container } = renderPage("en");
    fireEvent.click(rowOf("Gold Ring"));
    fireEvent.click(screen.getByRole("button", { name: en.qrLabels.moreCopies("Gold Ring") }));
    const tags = container.querySelectorAll("#print-sheet .print-label");
    expect(tags).toHaveLength(2);
    expect(tags[1].querySelectorAll("bdi")[1]).toHaveTextContent(/^5\.250g · K21$/);
  });
});

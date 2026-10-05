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

const ring = { id: "p1", code: "R-1", name_en: "Gold Ring", karat: "K21", weight_grams: "5.250", stone_carats: null, stone_cert: null };
const chain = { id: "p2", code: "C-7", name_en: "Rope Chain", karat: "K18", weight_grams: "12.000", stone_carats: 0.5, stone_cert: "GIA-1" };

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
// Karat codes, the barcode symbology name, the stone certificate and carat unit printed on the
// tag, and the product names and codes the fixtures supply as data.
const DATA = /\b(K?\d\dK?|CODE128|1D|GIA-1|0\.5ct|R-1|C-7|Gold Ring|Rope Chain)\b/g;

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

  it("the copies stepper has named buttons and does not toggle the row", () => {
    renderPage("en");
    fireEvent.click(rowOf("Gold Ring"));
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
  });

  it("the printed tag keeps its fixed Latin units whatever the UI language", () => {
    const { container } = renderPage("ar");
    fireEvent.click(rowOf("Rope Chain"));
    const sheet = container.querySelector("#print-sheet") as HTMLElement;
    const tags = sheet.querySelectorAll(".print-label");
    expect(tags).toHaveLength(1);
    expect(tags[0]).toHaveTextContent("C-7");
    expect(tags[0]).toHaveTextContent("Rope Chain");
    expect(tags[0]).toHaveTextContent("12.000g · K18 · 💎 0.5ct · GIA-1");
  });
});

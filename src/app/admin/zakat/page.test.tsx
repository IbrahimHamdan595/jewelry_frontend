import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ZakatPage from "@/app/admin/zakat/page";
import { LanguageProvider } from "@/context/LanguageContext";
import ar from "@/i18n/ar";

const TAKEN = "2026-09-05T10:00:00Z";
const summary = {
  holdings: { by_karat: [{ karat: "K21", grams_by_source: { products: "10", coins: "8", ounces: "0", lots: "2" }, total_weight_grams: "20", au_grams: "17.5" }], total_au_grams: "17.5" },
  gold_rate_24k: "100", gold_rate_source: "goldapi", gold_rate_is_stale: false, gold_rate_fetched_at: TAKEN,
  nisab_grams: "85", meets_nisab: false, total_au_value_usd: "1750", zakat_au_grams: "0.4375", zakat_value_usd: "43.75",
};
const snapshot = {
  id: "s1", taken_at: TAKEN, assessment_date: "2026-09-05", taken_by_user_id: "u1", notes: null, gold_rate_24k_usd_per_gram: "100",
  gold_rate_source: "goldapi", nisab_grams_used: "85", meets_nisab: true, total_au_grams: "17.5", zakat_au_grams: "0.4375",
  zakat_value_usd: "43.75", integrity_ok: true,
};
const swr = vi.hoisted(() => ({ loading: false }));
vi.mock("swr", () => ({
  default: (key: string) => ({
    data: swr.loading ? undefined : key === "/zakat" ? summary : { items: [snapshot], total: 1 },
    error: undefined, isLoading: swr.loading, isValidating: false, mutate: vi.fn(),
  }),
}));
vi.mock("@/lib/api-client", () => ({ apiFetcher: vi.fn(), api: { post: vi.fn(() => Promise.resolve({})) } }));

// The rate feed's name comes from the server. The snapshot time and the money
// are printed in the browser's own locale (which may say "US$"), not the UI's.
const money = (n: number) => n.toLocaleString(undefined, { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const DATA = ["goldapi", new Date(TAKEN).toLocaleString(), money(1750), money(43.75)];
const RATE = `$${(100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Text a user reads or a screen reader announces, minus the given data values. */
function englishLeft(root: HTMLElement): string[] {
  const found: string[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) found.push(walker.currentNode.textContent ?? "");
  root.querySelectorAll("[placeholder],[title],[aria-label],[alt]").forEach((el) => {
    for (const attr of ["placeholder", "title", "aria-label", "alt"]) found.push(el.getAttribute(attr) ?? "");
  });
  return found
    .map((text) => DATA.reduce((rest, value) => rest.split(value).join(""), text).trim())
    .filter((text) => /[A-Za-z]{2,}/.test(text));
}

function renderPage(lang: "en" | "ar") {
  return render(<LanguageProvider initialLang={lang}><ZakatPage /></LanguageProvider>);
}

describe("zakat page labels and i18n (NEX-64)", () => {
  it("has no English left in Arabic, units included", () => {
    const { container } = renderPage("ar");
    expect(screen.getByText(ar.zakat.dueFormula(ar.zakat.totalAuCardTitle))).toBeInTheDocument();
    expect(screen.getByText((text) => text.startsWith(`${RATE}${ar.products.perGram}`))).toBeInTheDocument();
    expect(englishLeft(container)).toEqual([]);
  });

  it("translates the loading placeholder", () => {
    swr.loading = true;
    try {
      renderPage("ar");
      expect(screen.getByText(ar.common.loading)).toBeInTheDocument();
      expect(screen.queryByText("Loading…")).toBeNull();
    } finally {
      swr.loading = false;
    }
  });

  it("snapshot dialog: both fields are reachable by their labels, and each label's control is its field", () => {
    const { container } = renderPage("ar");
    fireEvent.click(screen.getByRole("button", { name: ar.zakat.saveSnapshot }));
    const date = screen.getByLabelText(ar.zakat.assessmentDate);
    expect(date).toHaveAttribute("type", "date");
    expect((screen.getByText(ar.zakat.assessmentDate).closest("label") as HTMLLabelElement).control).toBe(date);
    const notes = screen.getByLabelText(ar.zakat.notesOptional);
    expect(notes.tagName).toBe("TEXTAREA");
    expect((screen.getByText(ar.zakat.notesOptional).closest("label") as HTMLLabelElement).control).toBe(notes);
    expect(englishLeft(container)).toEqual([]);
  });

  it("snapshot dialog still closes from the backdrop and not from inside the panel", () => {
    renderPage("ar");
    fireEvent.click(screen.getByRole("button", { name: ar.zakat.saveSnapshot }));
    const panel = screen.getByLabelText(ar.zakat.assessmentDate).closest("[role=presentation]") as HTMLElement;
    fireEvent.click(panel);
    expect(screen.getByLabelText(ar.zakat.assessmentDate)).toBeInTheDocument();
    fireEvent.click(panel.parentElement as HTMLElement);
    expect(screen.queryByLabelText(ar.zakat.assessmentDate)).toBeNull();
  });

  it("reads exactly as before in English", () => {
    renderPage("en");
    expect(screen.getByText("2.5% × total pure au on hand")).toBeInTheDocument();
    expect(screen.getByText((text) => text.startsWith(`${RATE}/g`))).toBeInTheDocument();
    expect(screen.getAllByText("g")).toHaveLength(3);
  });
});

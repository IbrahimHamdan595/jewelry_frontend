import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import ZakatPage from "@/app/admin/zakat/page";
import { LanguageProvider } from "@/context/LanguageContext";
import en from "@/i18n/en";
import ar from "@/i18n/ar";

const TAKEN = "2026-09-05T10:00:00Z";
const summary = {
  holdings: { by_karat: [{ karat: "K21", grams_by_source: { products: "10", coins: "8", ounces: "0", lots: "2" }, total_weight_grams: "20", au_grams: "17.5" }], total_au_grams: "17.5" },
  gold_rate_24k: "100", gold_rate_source: "live", gold_rate_is_stale: false, gold_rate_fetched_at: TAKEN,
  nisab_grams: "85", meets_nisab: false, total_au_value_usd: "1750", zakat_au_grams: "0.4375", zakat_value_usd: "43.75",
};
const snapshot = {
  id: "s1", taken_at: TAKEN, assessment_date: "2026-09-05", taken_by_user_id: "u1", notes: null, gold_rate_24k_usd_per_gram: "100",
  gold_rate_source: "override", nisab_grams_used: "85", meets_nisab: true, total_au_grams: "17.5", zakat_au_grams: "0.4375",
  zakat_value_usd: "43.75", integrity_ok: true,
};
const swr = vi.hoisted(() => ({ loading: false }));
vi.mock("swr", () => ({
  default: (key: string) => ({
    data: swr.loading ? undefined : key === "/zakat" ? summary : { items: [snapshot], total: 1 },
    error: undefined, isLoading: swr.loading, isValidating: false, mutate: vi.fn(),
  }),
}));
const api = vi.hoisted(() => ({ post: vi.fn<(path: string, body?: unknown) => Promise<unknown>>(() => Promise.resolve({})) }));
vi.mock("@/lib/api-client", async (orig) => ({ ...(await orig<typeof import("@/lib/api-client")>()), apiFetcher: vi.fn(), api }));

// ZakatSummary / ZakatSnapshot as GET /zakat and GET /zakat/snapshots send them
// (app/core/zakat.py): gold_rate_source is the rate's source at that moment,
// "live" for the polled feed or "override" for an admin override — an enum, so
// it is translated. Nothing on this screen is free-text data.
const DATA: string[] = [];

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

/** Every <label> on screen must reach a control: a click focuses it and it names the field. */
function labelsWithoutControl(): string[] {
  return Array.from(document.querySelectorAll("label")).filter((label) => label.control === null).map((label) => label.textContent ?? "");
}

function renderPage(lang: "en" | "ar") {
  return render(<LanguageProvider initialLang={lang}><ZakatPage /></LanguageProvider>);
}

describe("zakat page labels and i18n (NEX-64)", () => {
  it("has no English left in Arabic, units included", () => {
    const { container } = renderPage("ar");
    expect(screen.getByText(ar.zakat.dueFormula(ar.zakat.totalAuCardTitle))).toBeInTheDocument();
    expect(screen.getByText((text) => text.startsWith(`$100.00${ar.products.perGram}`))).toBeInTheDocument();
    expect(englishLeft(container)).toEqual([]);
  });

  it("prints money, weights and the snapshot time the app's way, whatever the browser's locale", () => {
    const { container } = renderPage("ar");
    // formatUSD: "$", never "US$"; two decimals.
    expect(screen.getByText("$1,750.00")).toBeInTheDocument();
    expect(screen.getAllByText("$43.75")).toHaveLength(2);
    expect(screen.getByText("$100.00", { selector: "td" })).toBeInTheDocument();
    expect(screen.getAllByText("17.500").length).toBeGreaterThan(0);
    // 10:00Z on the Beirut wall clock, Arabic month name, Western digits.
    expect(screen.getByText(/^05 (أيلول|سبتمبر) 2026\D{1,3}0?1:00\D{0,2}م$/)).toBeInTheDocument();
    // Dynamic values only: the pre-existing zakat labels spell some figures
    // in Arabic-Indic digits ("٢٫٥٪"), which is copy, not formatting.
    for (const cell of Array.from(container.querySelectorAll("td"))) expect(cell.textContent).not.toMatch(/[٠-٩]/);
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
    expect(document.querySelectorAll("label")).toHaveLength(2);
    expect(labelsWithoutControl()).toEqual([]);
    expect(englishLeft(container)).toEqual([]);
  });

  it("snapshot dialog still closes from the backdrop and not from inside the panel", () => {
    renderPage("ar");
    fireEvent.click(screen.getByRole("button", { name: ar.zakat.saveSnapshot }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(dialog);
    fireEvent.click(screen.getByLabelText(ar.zakat.notesOptional));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(dialog.parentElement as HTMLElement);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("snapshot dialog is a real modal dialog: named, focus moves in, Escape closes, focus goes back", () => {
    renderPage("ar");
    const opener = screen.getByRole("button", { name: ar.zakat.saveSnapshot });
    opener.focus();
    fireEvent.click(opener);
    const dialog = screen.getByRole("dialog", { name: ar.zakat.saveSnapshotModalTitle });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByLabelText(ar.zakat.assessmentDate)).toHaveFocus();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(opener).toHaveFocus();
  });

  it("snapshot dialog keeps Tab inside it: the page behind is not reachable while it is open", () => {
    renderPage("ar");
    fireEvent.click(screen.getByRole("button", { name: ar.zakat.saveSnapshot }));
    const date = screen.getByLabelText(ar.zakat.assessmentDate);
    const save = screen.getByRole("button", { name: ar.zakat.save });
    const press = (shiftKey = false) => !fireEvent.keyDown(document.activeElement ?? document.body, { key: "Tab", shiftKey });

    save.focus(); // the last control
    expect(press()).toBe(true);
    expect(date).toHaveFocus(); // the first
    expect(press(true)).toBe(true);
    expect(save).toHaveFocus();
    screen.getByLabelText(ar.zakat.notesOptional).focus(); // in the middle: the browser's own order
    expect(press()).toBe(false);

    // Closed, it lets go of Tab.
    fireEvent.keyDown(document, { key: "Escape" });
    expect(fireEvent.keyDown(document.body, { key: "Tab" })).toBe(true);
  });

  it("snapshot dialog cannot be dismissed while the save is in flight, and still saves what was entered", async () => {
    let finish: (value: unknown) => void = () => {};
    api.post.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    renderPage("ar");
    fireEvent.click(screen.getByRole("button", { name: ar.zakat.saveSnapshot }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(screen.getByLabelText(ar.zakat.assessmentDate), { target: { value: "2026-09-05" } });
    fireEvent.change(screen.getByLabelText(ar.zakat.notesOptional), { target: { value: "annual" } });
    fireEvent.click(screen.getByRole("button", { name: ar.zakat.save }));
    expect(screen.getByRole("button", { name: ar.zakat.saving })).toBeDisabled();
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(dialog.parentElement as HTMLElement);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith("/zakat/snapshots", { assessment_date: "2026-09-05", notes: "annual" });
    await act(async () => finish({}));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("reads exactly as before in English", () => {
    renderPage("en");
    expect(screen.getByText("2.5% × total pure au on hand")).toBeInTheDocument();
    expect(screen.getByText((text) => text.startsWith("$100.00/g"))).toBeInTheDocument();
    expect(screen.getByText("$1,750.00")).toBeInTheDocument();
    expect(screen.getByText(/^05 Sept? 2026, 13:00$/)).toBeInTheDocument();
    expect(screen.getAllByText("g")).toHaveLength(3);
  });
});

describe("zakat — the gold-rate source is named, not printed raw (NEX-64)", () => {
  /** The pill after the rate on the summary card, and the one in the snapshot's row. */
  const sourcePills = (root: HTMLElement) => Array.from(root.querySelectorAll("span.bg-gray-100.uppercase")).map((el) => el.textContent);

  it("Arabic: the live feed on the summary and the override on the saved snapshot", () => {
    const { container } = renderPage("ar");
    expect(sourcePills(container)).toEqual([ar.goldRate.sources.live, ar.goldRate.sources.override]);
    expect(container).not.toHaveTextContent(/\blive\b|\boverride\b/);
    expect(englishLeft(container)).toEqual([]);
  });

  it("English keeps the API's own words (set in capitals)", () => {
    const { container } = renderPage("en");
    expect(sourcePills(container)).toEqual(["live", "override"]);
    expect(en.goldRate.sources).toEqual({ live: "live", override: "override" });
  });
});

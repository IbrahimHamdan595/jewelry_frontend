import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import InventoryReconcilePage from "@/app/admin/inventory/reconcile/page";
import { LanguageProvider } from "@/context/LanguageContext";
import en from "@/i18n/en";
import ar from "@/i18n/ar";

const api = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/lib/api-client", () => ({ api }));

const DRIFTED = {
  unit_drifts: [
    { kind: "COIN", id: "c1", code: "FN-COIN-K21-0001", name_en: "Lira Rashadi", stored: 5, computed: 3, drift: 2 },
    { kind: "OUNCE", id: "o1", code: "FN-OZ-K24-0001", name_en: "One Ounce Bar", stored: 1, computed: 2, drift: -1 },
  ],
  drift_count: 2,
  discord_alerted: true,
};
const CLEAN = { unit_drifts: [], drift_count: 0, discord_alerted: false };
// Not copy: codes and names from the database, the audited column, and a product name.
const DATA = ["FN-COIN-K21-0001", "FN-OZ-K24-0001", "Lira Rashadi", "One Ounce Bar", "on_hand_qty", "Discord"];
const RAN_AT = "05/09/2026, 13:00:00";

function renderPage(lang: "en" | "ar") {
  return render(<LanguageProvider initialLang={lang}><InventoryReconcilePage /></LanguageProvider>);
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
/** A run of two or more Latin letters is a word. Data is set aside first. */
const hasEnglishWord = (s: string) => /[A-Za-z]{2,}/.test(DATA.reduce((rest, datum) => rest.split(datum).join(""), s));

beforeEach(() => {
  api.get.mockReset();
  // The timestamp is formatted by the browser's own locale (see the report); pin it so the test is not.
  vi.spyOn(Date.prototype, "toLocaleString").mockReturnValue(RAN_AT);
});
afterEach(() => vi.restoreAllMocks());

describe("stock reconcile in Arabic (NEX-64)", () => {
  it("leaves no English behind before the first run", () => {
    renderPage("ar");
    for (const english of ["Coin & Ounce Stock Reconciliation", "Run Reconcile", "Run & alert on drift"]) {
      expect(screen.queryByText(english, { exact: false }), english).toBeNull();
    }
    expect(screen.getByRole("heading", { name: ar.reconcile.title })).toBeInTheDocument();
    expect(screen.getByText(ar.reconcile.readOnlyNote)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: ar.reconcile.run })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: ar.reconcile.runAndAlert })).toBeInTheDocument();
    expect(uiStrings().filter(hasEnglishWord)).toEqual([]);
  });

  it("keeps each sentence whole around its slot", () => {
    renderPage("ar");
    const field = screen.getByText("on_hand_qty");
    expect(field).toHaveClass("font-mono");
    expect(field.parentElement).toHaveTextContent(ar.reconcile.intro("on_hand_qty"));
    const button = screen.getByText(ar.reconcile.run, { selector: "span" });
    expect(button).toHaveClass("font-medium");
    expect(button.parentElement).toHaveTextContent(ar.reconcile.idleHint(ar.reconcile.run));
  });

  it("leaves no English behind in a drift report", async () => {
    api.get.mockResolvedValue(DRIFTED);
    renderPage("ar");
    fireEvent.click(screen.getByRole("button", { name: ar.reconcile.runAndAlert }));
    expect(await screen.findByText(ar.reconcile.driftCount(2))).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith("/inventory/reconcile-units?alert=true");
    for (const english of ["Kind", "Code", "Name", "Stored", "Computed", "Drift", "COIN", "OUNCE"]) {
      expect(screen.queryByText(english), english).toBeNull();
    }
    for (const english of ["Last run:", "alert sent", "with stock drift"]) {
      expect(screen.queryByText(english, { exact: false }), english).toBeNull();
    }
    for (const header of [ar.reconcile.kind, ar.reconcile.code, ar.common.name, ar.reconcile.stored, ar.reconcile.computed, ar.reconcile.drift]) {
      expect(screen.getByRole("columnheader", { name: header }), header).toBeInTheDocument();
    }
    expect(screen.getByText(ar.reconcile.kinds.COIN)).toBeInTheDocument();
    expect(screen.getByText(ar.reconcile.kinds.OUNCE)).toBeInTheDocument();
    expect(screen.getByText(ar.reconcile.driftHint)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(ar.reconcile.lastRun))).toHaveTextContent(`${ar.reconcile.lastRun} ${RAN_AT} · ${ar.reconcile.discordAlertSent}`);
    expect(screen.getByText("FN-COIN-K21-0001")).toHaveClass("font-mono");
    expect(uiStrings().filter(hasEnglishWord)).toEqual([]);
  });

  it("translates the clean result", async () => {
    api.get.mockResolvedValue(CLEAN);
    renderPage("ar");
    fireEvent.click(screen.getByRole("button", { name: ar.reconcile.run }));
    expect(await screen.findByText(ar.reconcile.allMatch)).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith("/inventory/reconcile-units");
    expect(screen.getByText(ar.reconcile.zeroDrift)).toBeInTheDocument();
    expect(uiStrings().filter(hasEnglishWord)).toEqual([]);
  });

  it("translates the fallback error; a server message is shown as received", async () => {
    api.get.mockRejectedValueOnce({});
    renderPage("ar");
    fireEvent.click(screen.getByRole("button", { name: ar.reconcile.run }));
    expect(await screen.findByText(ar.reconcile.failed)).toBeInTheDocument();
    api.get.mockRejectedValueOnce(new Error("Ledger replay timed out"));
    fireEvent.click(screen.getByRole("button", { name: ar.reconcile.run }));
    expect(await screen.findByText("Ledger replay timed out")).toBeInTheDocument();
  });
});

describe("stock reconcile in English is unchanged", () => {
  it("keeps the copy the screen had before the strings moved", async () => {
    api.get.mockResolvedValue(DRIFTED);
    renderPage("en");
    expect(screen.getByText("on_hand_qty").parentElement).toHaveTextContent(
      "Replays every event that mutates on_hand_qty (supplier purchases, walk-in buybacks, manual adjustments, completed & refunded sales) and compares the result against the stored quantity. Drift means the stored value disagrees with what the audit history implies.",
    );
    expect(screen.getByText(/to compute the current state/)).toHaveTextContent("Click Run Reconcile to compute the current state.");
    fireEvent.click(screen.getByRole("button", { name: "Run & alert on drift" }));
    expect(await screen.findByText("2 types with stock drift")).toBeInTheDocument();
    expect(screen.getByText(/Last run:/)).toHaveTextContent(`Last run: ${RAN_AT} · Discord alert sent.`);
    expect(screen.getByText("COIN")).toBeInTheDocument();
    expect(en.reconcile.driftCount(1)).toBe("1 type with stock drift");
    // The sweep the Arabic tests rely on does see this screen's copy.
    expect(uiStrings().filter(hasEnglishWord).length).toBeGreaterThan(12);
  });

  it("has no form fields to label", () => {
    renderPage("en");
    expect(document.querySelectorAll("input, select, textarea, label")).toHaveLength(0);
  });
});

describe("reconcile dictionary is translated, not English placeholders", () => {
  const strings = (dict: typeof en.reconcile) => ({
    ...dict, ...dict.kinds, driftCount: dict.driftCount(2), driftCountOne: dict.driftCount(1), kinds: "",
    intro: dict.intro("on_hand_qty"), idleHint: dict.idleHint(dict.run),
  });
  const english = strings(en.reconcile) as Record<string, string>;
  const arabic = strings(ar.reconcile) as Record<string, string>;

  it("every ar.reconcile string contains Arabic and differs from English", () => {
    const keys = Object.keys(english).filter((key) => english[key]);
    expect(keys.length).toBeGreaterThan(20);
    for (const key of keys) {
      expect(arabic[key], key).toMatch(/[\u0600-\u06FF]/);
      expect(arabic[key], key).not.toBe(english[key]);
    }
  });

  it.each(["intro", "idleHint"] as const)("%s places its element exactly once in both languages", (key) => {
    expect(en.reconcile[key]("§").split("§")).toHaveLength(2);
    expect(ar.reconcile[key]("§").split("§")).toHaveLength(2);
  });
});

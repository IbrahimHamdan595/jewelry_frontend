import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import InventoryReconcilePage from "@/app/admin/inventory/reconcile/page";
import { LanguageProvider } from "@/context/LanguageContext";
import en from "@/i18n/en";
import ar from "@/i18n/ar";

const api = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/lib/api-client", () => ({ api }));

// The response of GET /inventory/reconcile-units (jewelry_backend/app/api/inventory.py):
// plain integers, drift = stored − computed, codes with the karat label, and a
// Discord alert only when asked for and there is drift. The replayed count can
// be negative when the event that brought the stock in is missing.
const DRIFTED = {
  unit_drifts: [
    { kind: "COIN", id: "c1000000000040008000000000000001", code: "FN-COIN-21K-0001", name_en: "Lira Rashadi", stored: 5, computed: 3, drift: 2 },
    { kind: "COIN", id: "c2000000000040008000000000000002", code: "FN-COIN-22K-0001", name_en: "English Sovereign", stored: 0, computed: -3, drift: 3 },
    { kind: "OUNCE", id: "01000000000040008000000000000001", code: "FN-OZ-24K-0001", name_en: "One Ounce Bar", stored: 1, computed: 2, drift: -1 },
  ],
  drift_count: 3,
  discord_alerted: true,
};
const CLEAN = { unit_drifts: [], drift_count: 0, discord_alerted: false };
// Not copy: codes and names from the database, the audited column, and a product name.
const DATA = ["FN-COIN-21K-0001", "FN-COIN-22K-0001", "FN-OZ-24K-0001", "Lira Rashadi", "English Sovereign", "One Ounce Bar", "on_hand_qty", "Discord"];

function renderPage(lang: "en" | "ar") {
  return render(<LanguageProvider initialLang={lang}><InventoryReconcilePage /></LanguageProvider>);
}
const rowOf = (code: string) => within(screen.getByText(code).closest("tr") as HTMLElement);

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

/** Elements whose classes pin a side (text-left, ml-2, pr-4, right-0 …) instead of following the reading direction. */
function physicalClasses(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll("[class]"))
    .map((el) => el.getAttribute("class") ?? "")
    .filter((classes) => /(^|\s)(text-(left|right)|-?m[lr]-\S+|p[lr]-\S+|-?(left|right)-\S+)(\s|$)/.test(classes));
}

beforeEach(() => {
  api.get.mockReset();
  // "Last run" is the moment the button was pressed. 22:30Z on the 5th is 01:30 on the 6th in Beirut.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-05T22:30:00Z"));
});
afterEach(() => vi.useRealTimers());

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

  it("keeps each sentence whole around its styled element", () => {
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
    expect(await screen.findByText(ar.reconcile.driftCount(3))).toBeInTheDocument();
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
    expect(screen.getAllByText(ar.reconcile.kinds.COIN)).toHaveLength(2);
    expect(screen.getByText(ar.reconcile.kinds.OUNCE)).toBeInTheDocument();
    expect(screen.getByText(ar.reconcile.driftHint)).toBeInTheDocument();
    expect(uiStrings().filter(hasEnglishWord)).toEqual([]);
  });

  it("counts drifting types as «label: n», which needs no Arabic number agreement", () => {
    expect(ar.reconcile.driftCount(1)).toBe("أنواع فيها فرق في المخزون: 1");
    expect(ar.reconcile.driftCount(2)).toBe("أنواع فيها فرق في المخزون: 2");
    expect(ar.reconcile.driftCount(11)).toBe("أنواع فيها فرق في المخزون: 11");
  });

  it("stamps the run on the Beirut clock, with an Arabic month", async () => {
    api.get.mockResolvedValue(DRIFTED);
    renderPage("ar");
    fireEvent.click(screen.getByRole("button", { name: ar.reconcile.runAndAlert }));
    await screen.findByText(ar.reconcile.driftCount(3));
    const stamp = screen.getByText(new RegExp(ar.reconcile.lastRun));
    expect(stamp.textContent).toMatch(/^آخر تشغيل: 06 (أيلول|سبتمبر) 2026\D{1,3}0?1:30\D{0,2}ص · أُرسل تنبيه Discord\.$/);
  });

  it("keeps signed counts and codes left-to-right, so +2 and -1 do not become 2+ and 1-", async () => {
    api.get.mockResolvedValue(DRIFTED);
    renderPage("ar");
    fireEvent.click(screen.getByRole("button", { name: ar.reconcile.run }));
    await screen.findByText(ar.reconcile.driftCount(3));
    const over = rowOf("FN-COIN-21K-0001").getByText("+2");
    expect(over.tagName).toBe("BDI");
    expect(over).toHaveAttribute("dir", "ltr");
    expect(over).toHaveClass("text-amber-700");
    const under = rowOf("FN-OZ-24K-0001").getByText("-1");
    expect(under).toHaveAttribute("dir", "ltr");
    expect(under).toHaveClass("text-red-700");
    // A replay that comes out negative keeps its sign in front too.
    expect(rowOf("FN-COIN-22K-0001").getByText("-3").closest("bdi")).toHaveAttribute("dir", "ltr");
    const code = screen.getByText("FN-COIN-21K-0001");
    expect(code.closest("bdi")).toHaveAttribute("dir", "ltr");
    expect(code.closest("td")).toHaveClass("font-mono");
  });

  it("follows the reading direction: logical utilities only", async () => {
    api.get.mockResolvedValue(DRIFTED);
    const { container } = renderPage("ar");
    fireEvent.click(screen.getByRole("button", { name: ar.reconcile.run }));
    await screen.findByText(ar.reconcile.driftCount(3));
    expect(physicalClasses(container)).toEqual([]);
    // No arrow, chevron or toggle on this screen: nothing to mirror.
    expect(container.querySelector("svg[class*='lucide-arrow-'], svg[class*='lucide-chevron-left'], svg[class*='lucide-chevron-right'], svg[class*='lucide-toggle-']")).toBeNull();
    expect(screen.getByRole("columnheader", { name: ar.reconcile.kind })).toHaveClass("text-start");
    expect(screen.getByRole("columnheader", { name: ar.reconcile.drift })).toHaveClass("text-end");
    expect(rowOf("FN-COIN-21K-0001").getByText("+2").closest("td")).toHaveClass("text-end");
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

  it("announces a failed run, with the server's message as received", async () => {
    // What the API client throws for a 403 from require_admin.
    api.get.mockRejectedValueOnce(new Error("Admin access required"));
    renderPage("ar");
    fireEvent.click(screen.getByRole("button", { name: ar.reconcile.run }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Admin access required");
  });
});

describe("stock reconcile in English", () => {
  it("keeps the copy the screen had before the strings moved", async () => {
    api.get.mockResolvedValue(DRIFTED);
    renderPage("en");
    expect(screen.getByText("on_hand_qty").parentElement).toHaveTextContent(
      "Replays every event that mutates on_hand_qty (supplier purchases, walk-in buybacks, manual adjustments, completed & refunded sales) and compares the result against the stored quantity. Drift means the stored value disagrees with what the audit history implies.",
    );
    expect(screen.getByText(/to compute the current state/)).toHaveTextContent("Click Run Reconcile to compute the current state.");
    fireEvent.click(screen.getByRole("button", { name: "Run & alert on drift" }));
    expect(await screen.findByText("3 types with stock drift")).toBeInTheDocument();
    expect(screen.getAllByText("COIN")).toHaveLength(2);
    expect(rowOf("FN-COIN-21K-0001").getByText("+2")).toBeInTheDocument();
    expect(en.reconcile.driftCount(1)).toBe("1 type with stock drift");
    // The sweep the Arabic tests rely on does see this screen's copy.
    expect(uiStrings().filter(hasEnglishWord).length).toBeGreaterThan(12);
  });

  it("stamps the run on the Beirut clock, in the app's own format", async () => {
    api.get.mockResolvedValue(DRIFTED);
    renderPage("en");
    fireEvent.click(screen.getByRole("button", { name: "Run & alert on drift" }));
    await screen.findByText("3 types with stock drift");
    expect(screen.getByText(/Last run:/).textContent).toMatch(/^Last run: 06 Sept? 2026, 01:30 · Discord alert sent\.$/);
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

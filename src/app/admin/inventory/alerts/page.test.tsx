import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import InventoryAlertsPage from "@/app/admin/inventory/alerts/page";
import { LanguageProvider } from "@/context/LanguageContext";
import en from "@/i18n/en";
import ar from "@/i18n/ar";

const swr = vi.hoisted(() => ({ alerts: undefined as unknown }));
vi.mock("swr", () => ({
  default: () => ({ data: swr.alerts, error: undefined, isLoading: false, isValidating: false, mutate: vi.fn() }),
}));
vi.mock("@/lib/api-client", () => ({ apiFetcher: vi.fn() }));
vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));

const ALERTS = {
  below_threshold: [
    { kind: "COIN", id: "c1", code: "FN-COIN-K21-0001", name_en: "Lira Rashadi", on_hand_qty: 1, min_stock_qty: 5 },
    { kind: "OUNCE", id: "o1", code: "FN-OZ-K24-0001", name_en: "One Ounce Bar", on_hand_qty: 0, min_stock_qty: 2 },
    { kind: "PRODUCT", id: "p1", code: "FN-K21-0042", name_en: "Rope Chain", on_hand_qty: 1, min_stock_qty: 1 },
  ],
  total: 3,
};
const HEALTHY = { below_threshold: [], total: 0 };
// Not copy: codes and names from the database, and the setting's own name.
const DATA = ["FN-COIN-K21-0001", "FN-OZ-K24-0001", "FN-K21-0042", "Lira Rashadi", "One Ounce Bar", "Rope Chain", "min_stock_qty"];

function renderPage(lang: "en" | "ar") {
  return render(<LanguageProvider initialLang={lang}><InventoryAlertsPage /></LanguageProvider>);
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
  swr.alerts = ALERTS;
});

describe("stock alerts in Arabic (NEX-64)", () => {
  it("leaves no English behind in the alert list", () => {
    renderPage("ar");
    for (const english of ["Kind", "Code", "Name", "On hand", "Minimum", "COIN", "OUNCE", "PRODUCT", "Manage →", "3 items at or below minimum stock"]) {
      expect(screen.queryByText(english), english).toBeNull();
    }
    expect(screen.getByText(ar.stockAlerts.belowMinimum(3))).toBeInTheDocument();
    expect(screen.getByText(ar.stockAlerts.adjustHint)).toBeInTheDocument();
    for (const header of [ar.stockAlerts.kind, ar.stockAlerts.code, ar.common.name, ar.stockAlerts.onHand, ar.stockAlerts.minimum, ar.common.actions]) {
      expect(screen.getByRole("columnheader", { name: header }), header).toBeInTheDocument();
    }
    for (const kind of [ar.stockAlerts.kinds.COIN, ar.stockAlerts.kinds.OUNCE, ar.stockAlerts.kinds.PRODUCT]) {
      expect(screen.getByText(kind), kind).toBeInTheDocument();
    }
    expect(uiStrings().filter(hasEnglishWord)).toEqual([]);
  });

  it("keeps each row's link target and its code left-to-right", () => {
    renderPage("ar");
    const links = screen.getAllByRole("link", { name: ar.stockAlerts.manage });
    expect(links.map((link) => link.getAttribute("href"))).toEqual(["/admin/products?tab=coins", "/admin/products?tab=ounces", "/admin/products/p1"]);
    expect(screen.getByText("FN-COIN-K21-0001")).toHaveClass("font-mono");
  });

  it("leaves no English behind when everything is above its minimum", () => {
    swr.alerts = HEALTHY;
    renderPage("ar");
    expect(screen.queryByText("All stock above thresholds")).toBeNull();
    expect(screen.getByText(ar.stockAlerts.allHealthy)).toBeInTheDocument();
    const field = screen.getByText("min_stock_qty");
    expect(field).toHaveClass("font-mono");
    expect(field.parentElement).toHaveTextContent(ar.stockAlerts.healthyHint("min_stock_qty"));
    expect(uiStrings().filter(hasEnglishWord)).toEqual([]);
  });
});

describe("stock alerts in English is unchanged", () => {
  it("keeps the copy the screen had before the strings moved", () => {
    renderPage("en");
    expect(screen.getByText("3 items at or below minimum stock")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Manage →" })).toHaveLength(3);
    expect(screen.getByText("PRODUCT")).toBeInTheDocument();
    expect(en.stockAlerts.belowMinimum(1)).toBe("1 item at or below minimum stock");
    // The sweep the Arabic tests rely on does see this screen's copy.
    expect(uiStrings().filter(hasEnglishWord).length).toBeGreaterThan(10);
  });

  it("keeps the healthy state's sentence", () => {
    swr.alerts = HEALTHY;
    renderPage("en");
    expect(screen.getByText("min_stock_qty").parentElement).toHaveTextContent("Coin and ounce types you've set min_stock_qty on are healthy.");
  });

  it("has no form fields to label, and names its empty header cell", () => {
    renderPage("en");
    expect(document.querySelectorAll("input, select, textarea, label")).toHaveLength(0);
    expect(screen.getByRole("columnheader", { name: en.common.actions })).toBeInTheDocument();
  });
});

describe("stockAlerts dictionary is translated, not English placeholders", () => {
  const strings = (dict: typeof en.stockAlerts) => ({
    ...dict, ...dict.kinds, belowMinimum: dict.belowMinimum(3), belowMinimumOne: dict.belowMinimum(1), kinds: "",
    healthyHint: dict.healthyHint("min_stock_qty"),
  });
  const english = strings(en.stockAlerts) as Record<string, string>;
  const arabic = strings(ar.stockAlerts) as Record<string, string>;

  it("every ar.stockAlerts string contains Arabic and differs from English", () => {
    const keys = Object.keys(english).filter((key) => english[key]);
    expect(keys.length).toBeGreaterThan(12);
    for (const key of keys) {
      expect(arabic[key], key).toMatch(/[\u0600-\u06FF]/);
      expect(arabic[key], key).not.toBe(english[key]);
    }
  });

  it("healthyHint places its element exactly once in both languages", () => {
    expect(en.stockAlerts.healthyHint("§").split("§")).toHaveLength(2);
    expect(ar.stockAlerts.healthyHint("§").split("§")).toHaveLength(2);
  });
});

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

// The response of GET /inventory/alerts (jewelry_backend/app/api/inventory.py):
// coins, ounces and products at or below their minimum, in that order, with
// integer quantities and codes that carry the karat label.
const ALERTS = {
  below_threshold: [
    { kind: "COIN", id: "c1000000000040008000000000000001", code: "FN-COIN-21K-0001", name_en: "Lira Rashadi", on_hand_qty: 1, min_stock_qty: 5 },
    { kind: "OUNCE", id: "01000000000040008000000000000001", code: "FN-OZ-24K-0001", name_en: "One Ounce Bar", on_hand_qty: 0, min_stock_qty: 2 },
    { kind: "PRODUCT", id: "d1000000000040008000000000000001", code: "FN-21K-0042", name_en: "Rope Chain", on_hand_qty: 1, min_stock_qty: 1 },
  ],
  total: 3,
};
const HEALTHY = { below_threshold: [], total: 0 };
const CODES = ALERTS.below_threshold.map((row) => row.code);
// Not copy: codes and names from the database, and the setting's own name.
const DATA = [...CODES, "Lira Rashadi", "One Ounce Bar", "Rope Chain", "min_stock_qty"];

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

/** Elements whose classes pin a side (text-left, ml-2, pr-4, right-0 …) instead of following the reading direction. */
function physicalClasses(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll("[class]"))
    .map((el) => el.getAttribute("class") ?? "")
    .filter((classes) => /(^|\s)(text-(left|right)|-?m[lr]-\S+|p[lr]-\S+|-?(left|right)-\S+)(\s|$)/.test(classes));
}

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

  it("counts items as «label: n», which needs no Arabic number agreement", () => {
    expect(ar.stockAlerts.belowMinimum(1)).toBe("أصناف عند الحد الأدنى للمخزون أو دونه: 1");
    expect(ar.stockAlerts.belowMinimum(2)).toBe("أصناف عند الحد الأدنى للمخزون أو دونه: 2");
    expect(ar.stockAlerts.belowMinimum(11)).toBe("أصناف عند الحد الأدنى للمخزون أو دونه: 11");
  });

  it("names each row's link after the row's code, and keeps where it goes", () => {
    renderPage("ar");
    const links = CODES.map((code) => screen.getByRole("link", { name: ar.stockAlerts.manageRow(code) }));
    expect(links.map((link) => link.getAttribute("href"))).toEqual(["/admin/products?tab=coins", "/admin/products?tab=ounces", "/admin/products/d1000000000040008000000000000001"]);
    for (const link of links) expect(link).toHaveTextContent(ar.stockAlerts.manage);
    expect(new Set(links.map((link) => link.getAttribute("aria-label"))).size).toBe(3);
  });

  it("keeps codes left-to-right and follows the reading direction: logical utilities only", () => {
    const { container } = renderPage("ar");
    const code = screen.getByText("FN-COIN-21K-0001");
    expect(code.closest("bdi")).toHaveAttribute("dir", "ltr");
    expect(code.closest("td")).toHaveClass("font-mono");
    expect(physicalClasses(container)).toEqual([]);
    // No arrow, chevron or toggle icon here; the link's text arrow is flipped in the dictionary.
    expect(container.querySelector("svg[class*='lucide-arrow-'], svg[class*='lucide-chevron-left'], svg[class*='lucide-chevron-right'], svg[class*='lucide-toggle-']")).toBeNull();
    expect(ar.stockAlerts.manage).toContain("←");
    expect(screen.getByRole("columnheader", { name: ar.stockAlerts.kind })).toHaveClass("text-start");
    expect(screen.getAllByRole("link")[0].closest("td")).toHaveClass("text-end");
  });

  it("leaves no English behind when everything is above its minimum", () => {
    swr.alerts = HEALTHY;
    const { container } = renderPage("ar");
    expect(screen.queryByText("All stock above thresholds")).toBeNull();
    expect(screen.getByText(ar.stockAlerts.allHealthy)).toBeInTheDocument();
    const field = screen.getByText("min_stock_qty");
    expect(field).toHaveClass("font-mono");
    expect(field.parentElement).toHaveTextContent(ar.stockAlerts.healthyHint("min_stock_qty"));
    expect(uiStrings().filter(hasEnglishWord)).toEqual([]);
    expect(physicalClasses(container)).toEqual([]);
  });
});

describe("stock alerts in English is unchanged", () => {
  it("keeps the copy the screen had before the strings moved", () => {
    renderPage("en");
    expect(screen.getByText("3 items at or below minimum stock")).toBeInTheDocument();
    expect(screen.getAllByText("Manage →")).toHaveLength(3);
    expect(screen.getByRole("link", { name: "Manage: FN-21K-0042" })).toHaveAttribute("href", "/admin/products/d1000000000040008000000000000001");
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
    healthyHint: dict.healthyHint("min_stock_qty"), manageRow: dict.manageRow("FN-21K-0042"),
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

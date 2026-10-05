import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import InventoryLayout from "@/app/admin/inventory/layout";
import { LanguageProvider } from "@/context/LanguageContext";
import en from "@/i18n/en";
import ar from "@/i18n/ar";

const nav = vi.hoisted(() => ({ pathname: "/admin/inventory/lots" }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname }));
vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));

const HREFS = ["/admin/inventory/lots", "/admin/inventory/buybacks", "/admin/inventory/alerts", "/admin/inventory/reconcile"];

function renderLayout(lang: "en" | "ar") {
  return render(
    <LanguageProvider initialLang={lang}>
      <InventoryLayout><p>screen</p></InventoryLayout>
    </LanguageProvider>,
  );
}

/** Elements whose classes pin a side (text-left, ml-2, pr-4, right-0 …) instead of following the reading direction. */
function physicalClasses(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll("[class]"))
    .map((el) => el.getAttribute("class") ?? "")
    .filter((classes) => /(^|\s)(text-(left|right)|-?m[lr]-\S+|p[lr]-\S+|-?(left|right)-\S+)(\s|$)/.test(classes));
}

beforeEach(() => {
  nav.pathname = "/admin/inventory/lots";
});

describe("inventory tabs (NEX-64)", () => {
  it("labels the four tabs in Arabic, in order, with no English left", () => {
    const { container } = renderLayout("ar");
    const tabs = screen.getAllByRole("link");
    expect(tabs.map((tab) => tab.textContent)).toEqual([ar.lots.tab, ar.buybacks.tab, ar.stockAlerts.tab, ar.reconcile.tab]);
    expect(tabs.map((tab) => tab.textContent)).toEqual(["دفعات الذهب الخالص", "إعادة الشراء", "التنبيهات", "المطابقة"]);
    expect(tabs.map((tab) => tab.getAttribute("href"))).toEqual(HREFS);
    for (const english of ["Pure Gold Lots", "Buybacks", "Alerts", "Reconcile"]) {
      expect(screen.queryByText(english), english).toBeNull();
    }
    expect(screen.getByRole("navigation").textContent).not.toMatch(/[A-Za-z]/);
    expect(physicalClasses(container)).toEqual([]);
    // The screen below the tabs is still rendered.
    expect(screen.getByText("screen")).toBeInTheDocument();
  });

  it("marks the tab of the current screen", () => {
    nav.pathname = "/admin/inventory/reconcile";
    renderLayout("ar");
    expect(screen.getByRole("link", { name: ar.reconcile.tab })).toHaveClass("border-gold", "text-gold");
    expect(screen.getByRole("link", { name: ar.lots.tab })).toHaveClass("border-transparent");
  });

  it("is the name other screens use for the reconcile screen: المخزون ← المطابقة", () => {
    expect(`${ar.nav.inventory} ← ${ar.reconcile.tab}`).toBe("المخزون ← المطابقة");
  });

  it("keeps the English labels it always had", () => {
    renderLayout("en");
    expect(screen.getAllByRole("link").map((tab) => tab.textContent)).toEqual(["Pure Gold Lots", "Buybacks", "Alerts", "Reconcile"]);
    expect([en.lots.tab, en.buybacks.tab, en.stockAlerts.tab, en.reconcile.tab]).toEqual(["Pure Gold Lots", "Buybacks", "Alerts", "Reconcile"]);
  });
});

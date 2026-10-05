import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { PosModeTabs } from "@/components/pos/PosModeTabs";
import { LanguageProvider } from "@/context/LanguageContext";
import ar from "@/i18n/ar";

const nav = vi.hoisted(() => ({ pathname: "/pos" }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname }));

const renderTabs = (lang: "en" | "ar") => render(<LanguageProvider initialLang={lang}><PosModeTabs /></LanguageProvider>);

describe("PosModeTabs (NEX-64)", () => {
  beforeEach(() => { nav.pathname = "/pos"; });

  it("Arabic: both tabs are named in Arabic, with the wording the rest of the app uses", () => {
    const { container } = renderTabs("ar");
    expect(screen.getByRole("link", { name: ar.orders.tabSell })).toHaveAttribute("href", "/pos");
    expect(screen.getByRole("link", { name: ar.posBuyback.eyebrow })).toHaveAttribute("href", "/pos/buyback");
    expect(container.textContent).not.toMatch(/[A-Za-z]/);
  });

  it("English reads as it did: SELL and BUY BACK (the tabs are set in capitals)", () => {
    renderTabs("en");
    const [sell, buyBack] = screen.getAllByRole("link");
    expect(sell).toHaveTextContent("Sell");
    expect(buyBack).toHaveTextContent(/^buy back$/i);
    for (const tab of [sell, buyBack]) expect(tab).toHaveClass("uppercase");
  });

  it.each([
    ["/pos", 0],
    ["/pos/buyback", 1],
  ])("on %s the right tab is the highlighted one", (pathname, active) => {
    nav.pathname = pathname;
    renderTabs("ar");
    const tabs = screen.getAllByRole("link");
    expect(tabs[active]).toHaveClass("bg-gold");
    expect(tabs[1 - active]).not.toHaveClass("bg-gold");
  });
});

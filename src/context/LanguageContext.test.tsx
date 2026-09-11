import { describe, it, expect, beforeEach } from "vitest";
import { renderToString } from "react-dom/server";
import { render, screen, fireEvent } from "@testing-library/react";
import { LanguageProvider, useLang } from "@/context/LanguageContext";
import en from "@/i18n/en";
import ar from "@/i18n/ar";

function Probe() {
  const { lang, t, isRTL, locale, setLang } = useLang();
  return (
    <div>
      <span data-testid="lang">{lang}</span>
      <span data-testid="dir">{isRTL ? "rtl" : "ltr"}</span>
      <span data-testid="locale">{locale}</span>
      <span data-testid="label">{t.nav.dashboard}</span>
      <button onClick={() => setLang("ar")}>ar</button>
    </div>
  );
}

const clearCookies = () => document.cookie.split(";").forEach((c) => { const k = c.split("=")[0].trim(); if (k) document.cookie = `${k}=; max-age=0; path=/`; });

describe("LanguageProvider", () => {
  beforeEach(() => { localStorage.clear(); clearCookies(); });

  it("renders Arabic on the very first paint when told the saved language — no flash", () => {
    const html = renderToString(<LanguageProvider initialLang="ar"><Probe /></LanguageProvider>);
    expect(html).toContain(ar.nav.dashboard);
    expect(html).not.toContain(en.nav.dashboard);
    expect(html).toContain('data-testid="dir">rtl');
  });

  it("switches without a reload and persists the choice in the cookie the server reads", () => {
    render(<LanguageProvider initialLang="en"><Probe /></LanguageProvider>);
    expect(screen.getByTestId("label")).toHaveTextContent(en.nav.dashboard);
    fireEvent.click(screen.getByText("ar"));
    expect(screen.getByTestId("label")).toHaveTextContent(ar.nav.dashboard);
    expect(screen.getByTestId("locale")).toHaveTextContent("ar-LB-u-nu-latn");
    expect(document.cookie).toMatch(/mz_lang=ar/);
    expect(document.documentElement.dir).toBe("rtl");
  });

  it("migrates a pre-cookie preference from localStorage once, then the cookie is the source of truth", () => {
    localStorage.setItem("lang", "ar");
    render(<LanguageProvider initialLang="en"><Probe /></LanguageProvider>);
    expect(screen.getByTestId("lang")).toHaveTextContent("ar");
    expect(document.cookie).toMatch(/mz_lang=ar/);
  });

  it("does not let a stale localStorage value override an explicit cookie", () => {
    localStorage.setItem("lang", "ar");
    document.cookie = "mz_lang=en; path=/";
    render(<LanguageProvider initialLang="en"><Probe /></LanguageProvider>);
    expect(screen.getByTestId("lang")).toHaveTextContent("en");
  });
});

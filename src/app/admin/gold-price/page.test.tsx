import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import GoldPricePage from "@/app/admin/gold-price/page";
import { LanguageProvider } from "@/context/LanguageContext";
import { formatDateTime } from "@/lib/utils";
import { localeFor } from "@/lib/lang-cookie";
import type { GoldRate } from "@/types/api";
import en from "@/i18n/en";
import ar from "@/i18n/ar";

const hook = vi.hoisted(() => ({ rate: undefined as unknown, refresh: vi.fn(() => Promise.resolve()) }));
vi.mock("@/hooks/useGoldRate", () => ({
  useGoldRate: () => ({ rate: hook.rate, refresh: hook.refresh, error: undefined, isLoading: false, isValidating: false }),
}));
const swr = vi.hoisted(() => ({ history: undefined as unknown }));
vi.mock("swr", () => ({ default: () => ({ data: swr.history, error: undefined, isLoading: false, isValidating: false, mutate: vi.fn() }) }));
const api = vi.hoisted(() => ({
  post: vi.fn<(path: string, body?: unknown) => Promise<unknown>>(() => Promise.resolve({})),
  delete: vi.fn<(path: string) => Promise<unknown>>(() => Promise.resolve({})),
}));
vi.mock("@/lib/api-client", async (orig) => ({ ...(await orig<typeof import("@/lib/api-client")>()), api, apiFetcher: vi.fn() }));
// The chart widgets draw to a canvas / third-party iframe and the calendar filter belongs to
// another slice; none of them is what this file tests.
vi.mock("@/components/admin/TradingViewChart", () => ({ TradingViewChart: () => null }));
vi.mock("@/components/admin/CalendarFilter", () => ({ CalendarFilter: () => null, calendarParams: () => ({}) }));
vi.mock("recharts", () => {
  const Stub = () => null;
  return { ResponsiveContainer: Stub, AreaChart: Stub, Area: Stub, LineChart: Stub, Line: Stub, XAxis: Stub, YAxis: Stub, Tooltip: Stub };
});

const RATE: GoldRate = {
  rate_24k: 141.66, rate_22k: 130.1, rate_21k: 123.95, rate_18k: 106.25,
  source: "goldapi", fetched_at: "2026-09-08T10:00:00Z", is_stale: false, market_closed: false,
};

function renderPage(lang: "en" | "ar") {
  return render(
    <LanguageProvider initialLang={lang}>
      <GoldPricePage />
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
/** Latin words still on screen once data and the names that stay Latin by design are set aside. */
const englishLeft = (root: HTMLElement, keep: RegExp) =>
  uiStrings(root).map((s) => s.replace(keep, "")).filter((s) => /[A-Za-z]{2,}/.test(s));
// Karat codes, the market symbol and vendor name in the chart title, and the feed's source id (data).
const DATA = /\b(K?\d\dK?|XAU\/USD|TradingView|goldapi|override)\b/g;

describe("gold price — i18n (NEX-64)", () => {
  beforeEach(() => {
    hook.rate = RATE;
    swr.history = [];
    hook.refresh.mockClear();
    api.post.mockClear();
    api.delete.mockClear();
  });

  it("Arabic: hero, charts, filters and the override form — no English left", () => {
    const { container } = renderPage("ar");
    const g = ar.goldPrice;
    for (const text of [g.heroLabel, ar.goldRate.live, g.liveChartTitle, g.realTimeData, g.historyTitle, g.noHistory, g.overrideTitle, g.noOverride, g.auditNote]) {
      expect(screen.getByText(text), text).toBeInTheDocument();
    }
    for (const range of ["24h", "7d", "30d"] as const) expect(screen.getByRole("button", { name: g.ranges[range] })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: g.setOverride })).toBeDisabled();
    expect(englishLeft(container, DATA)).toEqual([]);
  });

  it("Arabic: the two override inputs are named, with translated placeholders", () => {
    renderPage("ar");
    const g = ar.goldPrice;
    expect(screen.getByLabelText(g.rateInputLabel)).toHaveAttribute("placeholder", g.ratePlaceholder);
    expect(screen.getByLabelText(g.reasonInputLabel)).toHaveAttribute("placeholder", g.reasonPlaceholder);
  });

  it("Arabic: market closed, stale marker and an active override", () => {
    hook.rate = { ...RATE, is_stale: true, market_closed: true, source: "override" };
    const { container } = renderPage("ar");
    const g = ar.goldPrice;
    expect(screen.getByText(ar.goldRate.marketClosedTitle)).toBeInTheDocument();
    expect(screen.getByText(g.marketClosedBody(formatDateTime(RATE.fetched_at, localeFor("ar"))))).toBeInTheDocument();
    expect(screen.getByText(ar.goldRate.stale)).toBeInTheDocument();
    expect(screen.getByText(g.overrideActive, { exact: false })).toHaveTextContent(`${g.overrideActive} $141.66${ar.products.perGram}`);
    expect(screen.getByRole("button", { name: g.clear })).toBeInTheDocument();
    expect(englishLeft(container, DATA)).toEqual([]);
  });

  it("keeps the English wording it had", () => {
    hook.rate = { ...RATE, source: "override" };
    const { container } = renderPage("en");
    for (const text of ["24K Gold — USD/gram", "LIVE", "XAU/USD — Live Chart (TradingView)", "Polled Rate History", "No polled rates for this period", "Manual Override", "Set Override", "24H", "7D", "30D"]) {
      expect(screen.getByText(text), text).toBeInTheDocument();
    }
    expect(screen.getByText("Override active:", { exact: false })).toHaveTextContent("Override active: $141.66/g");
    expect(englishLeft(container, DATA)).not.toEqual([]);
  });
});

describe("gold price — the override still does what it did", () => {
  beforeEach(() => {
    hook.rate = RATE;
    swr.history = [];
    hook.refresh.mockClear();
    api.post.mockClear();
    api.delete.mockClear();
  });

  it("needs a rate and a reason of three characters before it can be set", () => {
    renderPage("en");
    const g = en.goldPrice;
    const set = screen.getByRole("button", { name: g.setOverride });
    fireEvent.change(screen.getByLabelText(g.rateInputLabel), { target: { value: "150.5" } });
    fireEvent.change(screen.getByLabelText(g.reasonInputLabel), { target: { value: "ab" } });
    expect(set).toBeDisabled();
    fireEvent.change(screen.getByLabelText(g.reasonInputLabel), { target: { value: "abc" } });
    expect(set).toBeEnabled();
  });

  it("posts the rate and the trimmed reason, then refreshes (Arabic UI)", async () => {
    renderPage("ar");
    const g = ar.goldPrice;
    fireEvent.change(screen.getByLabelText(g.rateInputLabel), { target: { value: "150.5" } });
    fireEvent.change(screen.getByLabelText(g.reasonInputLabel), { target: { value: "  feed is down  " } });
    fireEvent.click(screen.getByRole("button", { name: g.setOverride }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith("/gold-price/override", { rate_24k: 150.5, reason: "feed is down" }));
    await waitFor(() => expect(hook.refresh).toHaveBeenCalled());
  });

  it("clearing an override deletes it, then refreshes", async () => {
    hook.rate = { ...RATE, source: "override" };
    renderPage("ar");
    fireEvent.click(screen.getByRole("button", { name: ar.goldPrice.clear }));
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith("/gold-price/override"));
    await waitFor(() => expect(hook.refresh).toHaveBeenCalled());
  });
});

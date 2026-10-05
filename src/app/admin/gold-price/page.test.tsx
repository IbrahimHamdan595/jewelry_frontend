import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import GoldPricePage from "@/app/admin/gold-price/page";
import { LanguageProvider } from "@/context/LanguageContext";
import { formatDateTime } from "@/lib/utils";
import { ApiError } from "@/lib/api-client";
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
// The TradingView widget loads a third-party iframe; it is not what this file tests.
vi.mock("@/components/admin/TradingViewChart", () => ({ TradingViewChart: () => null }));
// recharts needs a measured canvas. These stand-ins keep the part this page owns — the
// formatters it hands to the axis and the tooltip — and print what they return for the
// first point, so the chart's dates and labels can be asserted like any other text.
vi.mock("recharts", async () => {
  const { createContext, useContext } = await import("react");
  type Point = { fetched_at: string; rate_24k: number; rate_22k: number; rate_21k: number; rate_18k: number };
  const First = createContext<Point | null>(null);
  const Stub = () => null;
  const Pass = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  // The series exactly as the chart receives it: recharts scales an axis by comparing
  // these values, so whether they are numbers or strings is part of what the page owns.
  const AreaChart = ({ data, children }: { data: Point[]; children?: React.ReactNode }) => (
    <First.Provider value={data[0]}>
      <span data-testid="series">{JSON.stringify(data.map((p) => [p.rate_24k, p.rate_22k, p.rate_21k, p.rate_18k]))}</span>
      {children}
    </First.Provider>
  );
  const XAxis = ({ tickFormatter }: { tickFormatter: (v: string) => string }) => {
    const point = useContext(First);
    return point ? <span data-testid="tick">{tickFormatter(point.fetched_at)}</span> : null;
  };
  const YAxis = ({ tickFormatter }: { tickFormatter: (v: number) => string }) => {
    const point = useContext(First);
    return point ? <span data-testid="y-tick">{tickFormatter(point.rate_24k)}</span> : null;
  };
  const Tooltip = ({ formatter, labelFormatter }: { formatter: (v: number) => [string, string]; labelFormatter: (v: string) => string }) => {
    const point = useContext(First);
    if (!point) return null;
    const [value, name] = formatter(point.rate_24k);
    return <span data-testid="tooltip"><span>{labelFormatter(point.fetched_at)}</span><span>{name}</span><span>{value}</span></span>;
  };
  return { ResponsiveContainer: Pass, AreaChart, Area: Stub, LineChart: Stub, Line: Stub, XAxis, YAxis, Tooltip };
});

// GoldRateOut and GoldRateHistoryPoint as the API sends them (app/schemas/gold_rate.py).
// `source` is "live" for the polled feed and "override" while an admin override is active —
// and an override is never stale or market-closed.
const RATE: GoldRate = {
  rate_24k: 141.66, rate_22k: 129.9, rate_21k: 123.95, rate_18k: 106.25,
  source: "live", fetched_at: "2026-09-08T10:00:00Z", is_stale: false, market_closed: false,
};
const OVERRIDE: GoldRate = { ...RATE, rate_24k: 150.5, rate_22k: 138.01, rate_21k: 131.69, rate_18k: 112.88, source: "override" };
const HISTORY = [
  { rate_24k: 141.66, rate_22k: 129.9, rate_21k: 123.95, rate_18k: 106.25, per_karat_backfilled: false, fetched_at: "2026-09-08T10:00:00Z" },
  { rate_24k: 141.9, rate_22k: 130.12, rate_21k: 124.16, rate_18k: 106.43, per_karat_backfilled: false, fetched_at: "2026-09-08T10:15:00Z" },
];
const arTime = formatDateTime(RATE.fetched_at, localeFor("ar"));

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
// Karat codes, and the market symbol and vendor name in the chart title. Nothing else is data here.
const DATA = /\b(K?\d\dK?|XAU\/USD|TradingView)\b/g;
/** Physical-direction utilities that would not flip in RTL. */
const physicalClasses = (root: HTMLElement) =>
  Array.from(root.querySelectorAll("[class]")).flatMap((el) => Array.from(el.classList)).filter((c) => /^(text-(left|right)|-?m[lr]-|p[lr]-|(left|right)-)/.test(c));

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
    for (const text of [g.heroLabel, ar.goldRate.live, ar.goldRate.sources.live, g.liveChartTitle, g.realTimeData, g.historyTitle, g.noHistory, g.overrideTitle, g.noOverride, g.auditNote]) {
      expect(screen.getByText(text), text).toBeInTheDocument();
    }
    for (const range of ["24h", "7d", "30d"] as const) expect(screen.getByRole("button", { name: g.ranges[range] })).toBeInTheDocument();
    // The calendar filter under the range buttons is shared with the orders page.
    for (const name of [ar.calendar.allTime, ar.calendar.granularity.day, ar.calendar.granularity.month, ar.calendar.granularity.year]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: g.setOverride })).toBeDisabled();
    // The hero's timestamp is the shop's (Beirut) time in Arabic; the source ("live") is translated above.
    expect(screen.getByText(arTime)).toBeInTheDocument();
    expect(arTime).toMatch(/أيلول|سبتمبر/);
    expect(englishLeft(container, DATA)).toEqual([]);
    expect(physicalClasses(container)).toEqual([]);
  });

  it("Arabic: the history chart's axis and tooltip dates go through the shared formatter", () => {
    swr.history = HISTORY;
    const { container } = renderPage("ar");
    expect(screen.getByTestId("tick")).toHaveTextContent(arTime);
    const tooltip = screen.getByTestId("tooltip");
    expect(tooltip).toHaveTextContent(arTime);
    expect(tooltip).toHaveTextContent(ar.goldPrice.tooltipRate("24K"));
    expect(tooltip).toHaveTextContent("$141.66");
    expect(englishLeft(container, DATA)).toEqual([]);
  });

  it("English: the same chart dates are Beirut time, not the browser's", () => {
    swr.history = HISTORY;
    renderPage("en");
    // 10:00Z is 13:00 in Beirut.
    expect(screen.getByTestId("tick")).toHaveTextContent(formatDateTime(RATE.fetched_at, localeFor("en")));
    expect(screen.getByTestId("tick")).toHaveTextContent(/08 Sept? 2026.*13:00/);
    expect(screen.getByTestId("tooltip")).toHaveTextContent("24K rate");
  });

  it("Arabic: the two override inputs are named, with translated placeholders", () => {
    renderPage("ar");
    const g = ar.goldPrice;
    expect(screen.getByLabelText(g.rateInputLabel)).toHaveAttribute("placeholder", g.ratePlaceholder);
    expect(screen.getByLabelText(g.reasonInputLabel)).toHaveAttribute("placeholder", g.reasonPlaceholder);
  });

  it("Arabic: market closed and stale, on the live feed", () => {
    hook.rate = { ...RATE, is_stale: true, market_closed: true };
    const { container } = renderPage("ar");
    const g = ar.goldPrice;
    expect(screen.getByText(ar.goldRate.marketClosedTitle)).toBeInTheDocument();
    expect(screen.getByText(g.marketClosedBody(arTime))).toBeInTheDocument();
    expect(screen.getByText(ar.goldRate.stale)).toBeInTheDocument();
    expect(screen.getByText(g.noOverride)).toBeInTheDocument();
    expect(englishLeft(container, DATA)).toEqual([]);
  });

  it("Arabic: an active override — its source is named and its amount stays in one left-to-right run", () => {
    hook.rate = OVERRIDE;
    const { container } = renderPage("ar");
    const g = ar.goldPrice;
    expect(screen.getByText(ar.goldRate.sources.override)).toBeInTheDocument();
    expect(screen.getByText(g.overrideActive, { exact: false })).toHaveTextContent(`${g.overrideActive} $150.50${ar.products.perGram}`);
    expect(container.querySelector('strong bdi[dir="ltr"]')).toHaveTextContent(`$150.50${ar.products.perGram}`);
    expect(screen.getByRole("button", { name: g.clear })).toBeInTheDocument();
    expect(englishLeft(container, DATA)).toEqual([]);
  });

  it("keeps the English wording it had", () => {
    hook.rate = OVERRIDE;
    const { container } = renderPage("en");
    for (const text of ["24K Gold — USD/gram", "LIVE", "XAU/USD — Live Chart (TradingView)", "Polled Rate History", "No polled rates for this period", "Manual Override", "Set Override", "24H", "7D", "30D"]) {
      expect(screen.getByText(text), text).toBeInTheDocument();
    }
    expect(screen.getByText("Override active:", { exact: false })).toHaveTextContent("Override active: $150.50/g");
    expect(screen.getByText("override", { selector: ".capitalize" })).toBeInTheDocument();
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

  it("a refusal from the server is shown as the server worded it", async () => {
    api.post.mockRejectedValueOnce(new ApiError(403, "Admin access required"));
    renderPage("ar");
    const g = ar.goldPrice;
    fireEvent.change(screen.getByLabelText(g.rateInputLabel), { target: { value: "150.5" } });
    fireEvent.change(screen.getByLabelText(g.reasonInputLabel), { target: { value: "feed is down" } });
    fireEvent.click(screen.getByRole("button", { name: g.setOverride }));
    expect(await screen.findByText("Admin access required")).toBeInTheDocument();
    expect(hook.refresh).not.toHaveBeenCalled();
  });

  it("clearing an override deletes it, then refreshes", async () => {
    hook.rate = OVERRIDE;
    renderPage("ar");
    fireEvent.click(screen.getByRole("button", { name: ar.goldPrice.clear }));
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith("/gold-price/override"));
    await waitFor(() => expect(hook.refresh).toHaveBeenCalled());
  });
});

// NEX-54: the backend is moving the rates on GET /gold-price and on every
// /gold-price/history point from JSON numbers to exact decimal strings. The
// frontend ships first, so each payload below is rendered in both shapes.
describe("gold price — rates as decimal strings or numbers (NEX-54)", () => {
  const RATE_S: GoldRate = { ...RATE, rate_24k: "141.66", rate_22k: "129.90", rate_21k: "123.95", rate_18k: "106.25" };
  const OVERRIDE_S: GoldRate = { ...OVERRIDE, rate_24k: "150.50", rate_22k: "138.01", rate_21k: "131.69", rate_18k: "112.88" };
  // The second point crosses 100 on the way down to 18K: "99.80" sorts after "106.25" as text.
  const HISTORY_N = [
    { rate_24k: 141.66, rate_22k: 129.9, rate_21k: 123.95, rate_18k: 106.25, per_karat_backfilled: false, fetched_at: "2026-09-08T10:00:00Z" },
    { rate_24k: 133.07, rate_22k: 122.03, rate_21k: 116.44, rate_18k: 99.8, per_karat_backfilled: false, fetched_at: "2026-09-08T10:15:00Z" },
  ];
  const HISTORY_S = [
    { rate_24k: "141.66", rate_22k: "129.90", rate_21k: "123.95", rate_18k: "106.25", per_karat_backfilled: false, fetched_at: "2026-09-08T10:00:00Z" },
    { rate_24k: "133.07", rate_22k: "122.03", rate_21k: "116.44", rate_18k: "99.80", per_karat_backfilled: false, fetched_at: "2026-09-08T10:15:00Z" },
  ];

  beforeEach(() => {
    hook.rate = RATE;
    swr.history = [];
  });

  function markup(rate: GoldRate, history: unknown) {
    hook.rate = rate;
    swr.history = history;
    const view = renderPage("en");
    const html = view.container.innerHTML;
    view.unmount();
    return html;
  }

  it("hero and karat cards: identical page for both shapes", () => {
    expect(markup(RATE_S, HISTORY_S)).toBe(markup(RATE, HISTORY_N));
    hook.rate = RATE_S;
    swr.history = []; // no chart: the tooltip stub would print the 24K figure a second time
    renderPage("en");
    for (const figure of ["$141.66", "$129.90", "$123.95", "$106.25"]) expect(screen.getByText(figure), figure).toBeInTheDocument();
  });

  it("the override banner prints the same amount for both shapes", () => {
    expect(markup(OVERRIDE_S, [])).toBe(markup(OVERRIDE, []));
    hook.rate = OVERRIDE_S;
    renderPage("en");
    expect(screen.getByText("Override active:", { exact: false })).toHaveTextContent("Override active: $150.50/g");
  });

  it("the chart is handed numbers either way, so its axis is scaled by value and not as text", () => {
    swr.history = HISTORY_S;
    renderPage("en");
    const series = JSON.parse(screen.getByTestId("series").textContent ?? "[]");
    expect(series).toEqual([[141.66, 129.9, 123.95, 106.25], [133.07, 122.03, 116.44, 99.8]]);
    expect(screen.getByTestId("y-tick")).toHaveTextContent("$142");
    expect(screen.getByTestId("tooltip")).toHaveTextContent("$141.66");
  });

  it("a rate that cannot be read shows the missing-amount dash, never NaN", () => {
    hook.rate = { ...RATE, rate_24k: "n/a", rate_18k: null };
    const { container } = renderPage("en");
    expect(screen.getAllByText("—")).toHaveLength(2);
    expect(screen.getByText("$129.90")).toBeInTheDocument();
    expect(container).not.toHaveTextContent("NaN");
  });
});

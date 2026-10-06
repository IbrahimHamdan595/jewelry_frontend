import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DashboardPage from "@/app/admin/dashboard/page";
import { LanguageProvider } from "@/context/LanguageContext";
import ar from "@/i18n/ar";
import type { DashboardData } from "@/types/api";

const swr = vi.hoisted(() => ({
  state: { data: undefined as unknown, error: undefined as unknown, isLoading: false, isValidating: false },
  mutate: vi.fn(() => Promise.resolve()),
}));
vi.mock("swr", () => ({ default: () => ({ ...swr.state, mutate: swr.mutate }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/admin/dashboard" }));
// The stale-rate banner reads GET /gold-price through its own hook; not this page's payload.
vi.mock("@/hooks/useGoldRate", () => ({ useGoldRate: () => ({ rate: undefined, refresh: vi.fn(), error: undefined, isLoading: false, isValidating: false }) }));
// recharts needs a measured canvas. These stand-ins keep what the page owns:
// the series it hands to the chart (recharts scales the axis by comparing
// those values) and the formatters for the axis and the tooltip.
vi.mock("recharts", async () => {
  type Point = { date: string; revenue: number; is_today: boolean };
  const { createContext, useContext } = await import("react");
  const Series = createContext<Point[]>([]);
  const Stub = () => null;
  const Pass = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  const BarChart = ({ data, children }: { data: Point[]; children?: React.ReactNode }) => (
    <Series.Provider value={data}>
      <span data-testid="series">{JSON.stringify(data.map((p) => p.revenue))}</span>
      {children}
    </Series.Provider>
  );
  const YAxis = ({ tickFormatter }: { tickFormatter: (v: number) => string }) => {
    const top = Math.max(...useContext(Series).map((p) => p.revenue));
    return <span data-testid="y-tick">{tickFormatter(top)}</span>;
  };
  const Tooltip = ({ formatter }: { formatter: (v: number) => string }) => (
    <span data-testid="tooltip">{useContext(Series).map((p) => formatter(p.revenue)).join(" ")}</span>
  );
  return { ResponsiveContainer: Pass, BarChart, Bar: Pass, Cell: Stub, XAxis: Stub, YAxis, Tooltip };
});

describe("dashboard error state", () => {
  it("shows an error with a retry instead of an endless skeleton when the fetch fails", () => {
    swr.state = { data: undefined, error: new Error("500 {\"detail\":\"db down\"}"), isLoading: false, isValidating: false };
    render(<DashboardPage />);
    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't load/i);
    expect(screen.queryByText(/db down/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(swr.mutate).toHaveBeenCalledTimes(1);
  });
});

// NEX-54. GET /reports/dashboard as app/api/reports.py assembles it, twice:
// TODAY is what the API sends now (money as floats), EXACT is what it will send
// (money as decimal strings at cent scale). Counts, gram weights and
// gross_margin_pct are numbers in both. The frontend ships first, so the page
// has to read the same either way.
const SHARED: Pick<DashboardData, "today_orders" | "gold_rate_is_stale" | "gold_rate_fetched_at" | "inventory" | "gold_weight_sold_today_by_karat" | "gold_weight_sold_week_by_karat" | "inventory_aging" | "dead_stock_count" | "loss_prevention"> = {
  today_orders: 4,
  gold_rate_is_stale: false,
  gold_rate_fetched_at: "2026-09-08T10:00:00+00:00",
  inventory: {
    pure_gold_by_karat: [{ karat: "K21", grams_remaining: 412.5, lot_count: 3 }],
    coins: { on_hand_total: 42, distinct_types: 5 },
    ounces: { on_hand_total: 7, distinct_types: 2 },
    low_stock_alerts: 2,
  },
  gold_weight_sold_today_by_karat: [{ karat: "K21", grams: 14.25 }],
  gold_weight_sold_week_by_karat: [{ karat: "K21", grams: 61.5 }, { karat: "K18", grams: 9.125 }],
  inventory_aging: { d0_90: 120, d90_180: 31, d180_365: 12, d365_plus: 4 },
  dead_stock_count: 4,
  loss_prevention: { order_voids: 1, rate_overrides: 0, excess_discount_orders: 2 },
};
const DAYS = ["2026-09-02", "2026-09-03", "2026-09-04", "2026-09-05", "2026-09-06", "2026-09-07", "2026-09-08"];

const TODAY: DashboardData = {
  ...SHARED,
  today_revenue: 5123.5,
  week_revenue: 20572.48,
  prev_week_revenue: 16457.98,
  gold_rate_24k: 141.66,
  avg_invoice_value_today: 1280.88,
  making_charges_today: 60,
  making_charges_week: 255.5,
  // 980.5 → 12000 → 0: three different digit counts, which text comparison would misorder.
  chart_data: [980.5, 12000, 0, 2450.75, 880, 1137.73, 5123.5].map((revenue, i) => ({ date: DAYS[i], revenue, is_today: i === 6 })),
  top_sellers: [{ code: "FN-21K-0001", name: "Twisted Ring", karat: "K21", units: 3, revenue: 2090.22 }],
  recent_orders: [{ id: "o1", order_number: "FN-20260908-0004", status: "COMPLETED", total_usd: 773.38, cashier: "Rima", created_at: "2026-09-08T09:30:00+00:00" }],
  recent_purchases: [{ id: "sp1", supplier: "Beirut Bullion", occurred_at: "2026-09-07T12:00:00+00:00", total_cash_due: 1500, item_count: 2 }],
  receivables: { total: 3200.1, b0_30: 2000, b31_60: 700.1, b61_90: 500, b90_plus: 0 },
  payables_aging: { cash_total: 8400, b0_30: 6000, b31_60: 2400, b61_90: 0, b90_plus: 0, metal_owed_by_karat: { K21: 12.5 } },
  cash_bank_balance: 15234.07,
  vat_position: { net_payable: 842.19, direction: "PAYABLE", period_label: "Q3 2026" },
  profitability: { gross_profit: 3120.4, gross_margin_pct: 15.17, profit_per_gram: 9.87, since: "2026-09-02" },
  inventory_value: { total_usd: 254310.55, pure_gold_usd: 120000.1, coins_usd: 34000.25, ounces_usd: 51000.3, products_usd: 49309.9, rate_24k: 141.66, method: "market" },
};
const EXACT: DashboardData = {
  ...SHARED,
  today_revenue: "5123.50",
  week_revenue: "20572.48",
  prev_week_revenue: "16457.98",
  gold_rate_24k: "141.66",
  avg_invoice_value_today: "1280.88",
  making_charges_today: "60.00",
  making_charges_week: "255.50",
  chart_data: ["980.50", "12000.00", "0.00", "2450.75", "880.00", "1137.73", "5123.50"].map((revenue, i) => ({ date: DAYS[i], revenue, is_today: i === 6 })),
  top_sellers: [{ code: "FN-21K-0001", name: "Twisted Ring", karat: "K21", units: 3, revenue: "2090.22" }],
  recent_orders: [{ id: "o1", order_number: "FN-20260908-0004", status: "COMPLETED", total_usd: "773.38", cashier: "Rima", created_at: "2026-09-08T09:30:00+00:00" }],
  recent_purchases: [{ id: "sp1", supplier: "Beirut Bullion", occurred_at: "2026-09-07T12:00:00+00:00", total_cash_due: "1500.00", item_count: 2 }],
  receivables: { total: "3200.10", b0_30: "2000.00", b31_60: "700.10", b61_90: "500.00", b90_plus: "0.00" },
  payables_aging: { cash_total: "8400.00", b0_30: "6000.00", b31_60: "2400.00", b61_90: "0.00", b90_plus: "0.00", metal_owed_by_karat: { K21: 12.5 } },
  cash_bank_balance: "15234.07",
  vat_position: { net_payable: "842.19", direction: "PAYABLE", period_label: "Q3 2026" },
  profitability: { gross_profit: "3120.40", gross_margin_pct: 15.17, profit_per_gram: "9.87", since: "2026-09-02" },
  inventory_value: { total_usd: "254310.55", pure_gold_usd: "120000.10", coins_usd: "34000.25", ounces_usd: "51000.30", products_usd: "49309.90", rate_24k: "141.66", method: "market" },
};

function renderWith(data: unknown) {
  swr.state = { data, error: undefined, isLoading: false, isValidating: false };
  return render(<DashboardPage />);
}
/** The card that carries a caption (the first, where a caption also titles the chart). */
const card = (caption: string) => screen.getAllByText(caption)[0].closest(".rounded-lg") as HTMLElement;

describe("dashboard — money as decimal strings or numbers (NEX-54)", () => {
  beforeEach(() => swr.mutate.mockClear());

  it("renders the identical page for both shapes", () => {
    const numeric = renderWith(TODAY);
    const expected = numeric.container.innerHTML;
    numeric.unmount();
    const { container } = renderWith(EXACT);
    expect(container.innerHTML).toBe(expected);
    expect(container).not.toHaveTextContent("NaN");
  });

  it.each([["numbers", TODAY], ["decimal strings", EXACT]])("%s: every money figure is formatted, none concatenated or NaN", (_name, data) => {
    const { container } = renderWith(data);
    expect(card("Today's Revenue")).toHaveTextContent("$5,123.50");
    // (20572.48 − 16457.98) ÷ 16457.98 = +25.0%
    expect(card("7-Day Revenue")).toHaveTextContent("$20,572.48+25.0% vs last week");
    expect(card("Gold Rate 24K")).toHaveTextContent("$141.66");
    expect(card("Making Charges Earned")).toHaveTextContent("$60.00This week: $255.50");
    expect(card("Avg. Invoice Value")).toHaveTextContent("$1,280.88");
    expect(card("Top Sellers This Week")).toHaveTextContent("$2,090.22");
    // Coins + ounces is a sum: 34000.25 + 51000.30, not "34000.2551000.30".
    expect(card("Inventory Value")).toHaveTextContent("$254,310.55");
    expect(screen.getByText("Coins & Ounces", { selector: "span" }).parentElement).toHaveTextContent("$85,000.55");
    expect(card("Receivables (AR)")).toHaveTextContent("$3,200.10$2,000.000–30d$700.1031–60d$500.0061–90d$0.0090d+");
    expect(card("Payables (AP)")).toHaveTextContent("$8,400.00$6,000.000–30d$2,400.0031–60d");
    expect(card("Payables (AP)")).toHaveTextContent("12.500g");
    expect(card("Cash & Bank")).toHaveTextContent("$15,234.07");
    expect(card("VAT Position")).toHaveTextContent("$842.19Payable · Q3 2026");
    expect(card("Gross Profit")).toHaveTextContent("$3,120.40");
    expect(card("Gross Margin")).toHaveTextContent("15.17%");
    expect(card("Profit / gram")).toHaveTextContent("$9.87");
    expect(screen.getByRole("row", { name: /FN-20260908-0004/ })).toHaveTextContent("$773.38");
    expect(screen.getByRole("row", { name: /Beirut Bullion/ })).toHaveTextContent("$1,500.00");
    expect(container).not.toHaveTextContent("NaN");
  });

  it("the revenue chart is handed numbers either way, so its bars and axis are scaled by value", () => {
    renderWith(EXACT);
    expect(JSON.parse(screen.getByTestId("series").textContent ?? "[]")).toEqual([980.5, 12000, 0, 2450.75, 880, 1137.73, 5123.5]);
    expect(screen.getByTestId("y-tick")).toHaveTextContent("$12k");
    expect(screen.getByTestId("tooltip")).toHaveTextContent("$980.50 $12,000.00 $0.00 $2,450.75 $880.00 $1,137.73 $5,123.50");
  });

  it.each([
    ["a number", 22000.5],
    ["a decimal string", "22000.50"],
  ])("a worse week is a negative change in red, with last week as %s", (_name, prev) => {
    renderWith({ ...EXACT, prev_week_revenue: prev });
    const delta = screen.getByText(/vs last week/);
    expect(delta).toHaveTextContent("-6.5% vs last week");
    expect(delta).toHaveClass("text-red-500");
  });

  it.each([
    ["zero as a number", 0],
    ["zero as a decimal string", "0.00"],
    ["unreadable", "n/a"],
    ["missing", null],
  ])("no week-over-week line when last week's revenue is %s", (_name, prev) => {
    const { container } = renderWith({ ...EXACT, prev_week_revenue: prev });
    expect(screen.queryByText(/vs last week/)).toBeNull();
    expect(container).not.toHaveTextContent("NaN");
    expect(container).not.toHaveTextContent("Infinity");
  });

  it("figures that are null or unreadable show the missing-amount dash — never NaN, never a made-up zero", () => {
    const { container } = renderWith({
      ...EXACT,
      gold_rate_24k: null,
      today_revenue: "n/a",
      inventory_value: { ...EXACT.inventory_value, coins_usd: "n/a" },
      cash_bank_balance: null,
      vat_position: null,
      profitability: { ...EXACT.profitability, profit_per_gram: null, gross_margin_pct: null },
    });
    expect(card("Gold Rate 24K")).toHaveTextContent("Gold Rate 24K—USD / gram");
    expect(card("Today's Revenue")).toHaveTextContent("Today's Revenue—");
    // One unreadable half does not turn the sum into the other half.
    expect(screen.getByText("Coins & Ounces", { selector: "span" }).parentElement).toHaveTextContent("Coins & Ounces—");
    expect(screen.queryByText("Cash & Bank")).toBeNull();
    expect(screen.queryByText("VAT Position")).toBeNull();
    expect(card("Profit / gram")).toHaveTextContent("Profit / gram—");
    expect(card("Gross Margin")).toHaveTextContent("Gross Margin—");
    expect(container).not.toHaveTextContent("NaN");
  });
});

// Arabic text is right-to-left. A "$" or a sign next to digits is a neutral
// character, so inside an Arabic sentence it drifts to the far side of the
// number ("هذا الأسبوع: 0.00$") unless the figure is isolated left-to-right.
describe("dashboard in Arabic — figures inside a sentence keep their own order", () => {
  const renderArabic = (data: unknown) => {
    swr.state = { data, error: undefined, isLoading: false, isValidating: false };
    return render(<LanguageProvider initialLang="ar"><DashboardPage /></LanguageProvider>);
  };
  const isolated = (text: string) => screen.getByText(text, { selector: "bdi" });

  it("the making-charges week amount is isolated after its Arabic caption", () => {
    renderArabic(EXACT);
    const amount = isolated("$255.50");
    expect(amount).toHaveAttribute("dir", "ltr");
    expect(amount.parentElement).toHaveTextContent(`${ar.dashboard.soldWeek}: $255.50`);
  });

  it.each([
    ["a better week", "16457.98", "+25.0%"],
    ["a worse week", "22000.50", "-6.5%"],
  ])("%s: the signed change is isolated before the Arabic words", (_name, prev, change) => {
    renderArabic({ ...EXACT, prev_week_revenue: prev });
    const figure = isolated(change);
    expect(figure).toHaveAttribute("dir", "ltr");
    expect(figure.parentElement).toHaveTextContent(`${change} ${ar.dashboard.vsLastWeek}`);
  });

  // A losing week, an overdrawn account, a VAT refund: figures that stand alone
  // in their tile, where a leading "-" would otherwise land after the digits.
  it("negative amounts and percentages are isolated, sign first", () => {
    renderArabic({
      ...EXACT,
      cash_bank_balance: "-1520.75",
      vat_position: { net_payable: "-310.40", direction: "REFUNDABLE", period_label: "Q3 2026" },
      profitability: { gross_profit: "-120.40", gross_margin_pct: -4.25, profit_per_gram: "-0.85", since: "2026-09-02" },
      receivables: { ...EXACT.receivables, total: "-45.00", b0_30: "-45.00" },
    });
    for (const figure of ["-$1,520.75", "-$310.40", "-$120.40", "-4.25%", "-$0.85"]) {
      expect(isolated(figure), figure).toHaveAttribute("dir", "ltr");
    }
    expect(screen.getAllByText("-$45.00", { selector: "bdi" })).toHaveLength(2); // the AR total and its 0–30 chip
  });

  it("the same tiles read normally when the figures are positive", () => {
    renderArabic(EXACT);
    for (const figure of ["$15,234.07", "$842.19", "$3,120.40", "15.17%", "$9.87"]) {
      expect(isolated(figure), figure).toHaveAttribute("dir", "ltr");
    }
  });

  it("the profitability start date keeps its year-month-day order", () => {
    renderArabic(EXACT);
    expect(isolated("2026-09-02")).toHaveAttribute("dir", "ltr");
    expect(isolated("2026-09-02").parentElement).toHaveTextContent(`${ar.dashboard.since} 2026-09-02`);
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import KpisPage from "@/app/admin/accounting/kpis/page";
import { LanguageProvider } from "@/context/LanguageContext";
import ar from "@/i18n/ar";

const kpi = (value: string | null) => ({ value });
const data = {
  start: "2026-09-01", end: "2026-09-30", days: 30,
  dsi: kpi("45"), inventory_turnover: kpi("2.1"), dpo: kpi(null), gross_margin: kpi("18.5"), net_margin: kpi("9.2"),
  metal_turnover: kpi("1.4"), dso: kpi("12"), ccc: kpi("57"), current_ratio: kpi("1.8"), quick_ratio: kpi("0.9"),
};
const lib = vi.hoisted(() => ({ compute: vi.fn() }));
vi.mock("@/lib/accounting", () => ({ kpis: { compute: lib.compute } }));
vi.mock("@/lib/api-client", async (orig) => ({ ...(await orig<typeof import("@/lib/api-client")>()), downloadFile: vi.fn() }));

function renderPage(lang: "en" | "ar") {
  return render(<LanguageProvider initialLang={lang}><KpisPage /></LanguageProvider>);
}

beforeEach(() => { lib.compute.mockReset().mockResolvedValue(data); });

describe("KPI page i18n and labels (NEX-64)", () => {
  it("translates the window line, the day suffix and the missing-value marker", async () => {
    renderPage("ar");
    expect(await screen.findByText(ar.accounting.extra.kpiWindow("2026-09-01", "2026-09-30", 30))).toBeInTheDocument();
    expect(screen.getByText("45", { selector: "bdi" }).parentElement).toHaveTextContent(`45${ar.accounting.extra.daysSuffix}`);
    expect(screen.getByText(ar.accounting.extra.notAvailable)).toBeInTheDocument();
    expect(screen.queryByText("n/a")).toBeNull();
    expect(screen.queryByText(/Window/)).toBeNull();
  });

  it("names the two date fields", async () => {
    renderPage("ar");
    expect(screen.getByLabelText(ar.accounting.common.from)).toHaveAttribute("type", "date");
    expect(screen.getByLabelText(ar.accounting.common.until)).toHaveAttribute("type", "date");
    await screen.findByText(ar.accounting.extra.notAvailable);
  });

  it("reads exactly as before in English", async () => {
    renderPage("en");
    expect(await screen.findByText("Window: 2026-09-01 → 2026-09-30 (30 days)")).toBeInTheDocument();
    expect(screen.getByText("45", { selector: "bdi" }).parentElement).toHaveTextContent("45 d");
    expect(screen.getByText("18.5%")).toBeInTheDocument();
    expect(screen.getByText("n/a")).toBeInTheDocument();
  });
});

// A losing month has negative margins, and a negative cash-conversion cycle is
// a good one. Alone in its tile on an Arabic page, a leading "-" is a neutral
// character and would land after the digits.
describe("KPI page — signed figures keep their sign in front", () => {
  it("Arabic: negative percentages, ratios and day counts are isolated; the Arabic unit stays outside", async () => {
    lib.compute.mockResolvedValue({ ...data, gross_margin: kpi("-4.25"), net_margin: kpi("-11.8"), ccc: kpi("-12"), inventory_turnover: kpi("2.1") });
    renderPage("ar");
    for (const figure of ["-4.25%", "-11.8%", "2.1×"]) {
      const el = await screen.findByText(figure, { selector: "bdi" });
      expect(el, figure).toHaveAttribute("dir", "ltr");
    }
    const days = screen.getByText("-12", { selector: "bdi" });
    expect(days).toHaveAttribute("dir", "ltr");
    expect(days.textContent).not.toMatch(/[\u0600-\u06FF]/);
    expect(days.parentElement).toHaveTextContent(`-12${ar.accounting.extra.daysSuffix}`);
  });
});

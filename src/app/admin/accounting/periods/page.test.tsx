import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import PeriodsPage from "@/app/admin/accounting/periods/page";
import { LanguageProvider } from "@/context/LanguageContext";
import ar from "@/i18n/ar";

const lib = vi.hoisted(() => ({
  listPeriods: vi.fn(),
  openPeriod: vi.fn(() => Promise.resolve({})),
  yearPreview: vi.fn(),
  closeYear: vi.fn(),
}));
vi.mock("@/lib/accounting", () => ({
  accounting: { listPeriods: lib.listPeriods, openPeriod: lib.openPeriod, closePeriod: vi.fn(), reopenPeriod: vi.fn() },
  periodClose: { readiness: vi.fn(), yearPreview: lib.yearPreview, closeYear: lib.closeYear },
}));

const periods = [
  { id: "p9", year: 2026, period_no: 9, status: "OPEN", closed_at: null },
  { id: "p1", year: 2026, period_no: 1, status: "CLOSED", closed_at: "2026-02-01T00:00:00Z" },
];

async function renderPage(lang: "en" | "ar") {
  const view = render(<LanguageProvider initialLang={lang}><PeriodsPage /></LanguageProvider>);
  await screen.findAllByText("2026"); // the periods table has loaded
  return view;
}

describe("accounting periods i18n and labels (NEX-64)", () => {
  beforeEach(() => {
    lib.listPeriods.mockResolvedValue({ items: periods });
    lib.openPeriod.mockClear();
  });

  it("names months and statuses in Arabic, matched to the right period", async () => {
    await renderPage("ar");
    const open = screen.getByText(ar.accounting.extra.periodStatus.OPEN).closest("tr") as HTMLElement;
    expect(within(open).getByText("أيلول")).toBeInTheDocument();
    const closed = screen.getByText(ar.accounting.extra.periodStatus.CLOSED).closest("tr") as HTMLElement;
    expect(within(closed).getByText("كانون الثاني")).toBeInTheDocument();
    for (const english of ["OPEN", "CLOSED", "Sep", "Jan"]) {
      expect(screen.queryByText(english), english).toBeNull();
    }
  });

  it("still sends the month's number when a period is opened by its Arabic name", async () => {
    await renderPage("ar");
    const month = screen.getByLabelText(ar.accounting.periods.month);
    expect(within(month).getAllByRole("option")).toHaveLength(12);
    fireEvent.change(month, { target: { value: String(ar.accounting.extra.months.indexOf("آذار") + 1) } });
    fireEvent.change(screen.getAllByLabelText(ar.accounting.periods.year)[0], { target: { value: "2027" } });
    fireEvent.click(screen.getByRole("button", { name: ar.accounting.periods.openPeriod }));
    expect(lib.openPeriod).toHaveBeenCalledWith(2027, 3);
  });

  it("gives the actions column a name for screen readers", async () => {
    await renderPage("ar");
    expect(screen.getByRole("columnheader", { name: ar.common.actions })).toBeInTheDocument();
  });

  it("reports the year-end close in Arabic", async () => {
    lib.yearPreview.mockResolvedValue({ net_income: "1200.00", already_closed: false, lines: [] });
    lib.closeYear.mockResolvedValue({ entry_id: "e1", entry_no: "JE-000123", opened_periods: Array(12).fill("x") });
    await renderPage("ar");
    fireEvent.click(screen.getByRole("button", { name: ar.accounting.periods.preview }));
    fireEvent.click(await screen.findByRole("button", { name: `${ar.accounting.periods.closeYear} 2026` }));
    expect(await screen.findByText(ar.accounting.extra.yearClosed(2026, "JE-000123", 12, 2027))).toBeInTheDocument();
  });

  it("reads exactly as before in English", async () => {
    lib.yearPreview.mockResolvedValue({ net_income: "1200.00", already_closed: false, lines: [] });
    lib.closeYear.mockResolvedValue({ entry_id: "e1", entry_no: "JE-000123", opened_periods: Array(12).fill("x") });
    await renderPage("en");
    expect(within(screen.getByText("OPEN").closest("tr") as HTMLElement).getByText("Sep")).toBeInTheDocument();
    expect(within(screen.getByText("CLOSED").closest("tr") as HTMLElement).getByText("Jan")).toBeInTheDocument();
    expect(within(screen.getByLabelText("Month")).getAllByRole("option").map((o) => o.textContent)).toEqual(
      ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    );
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    fireEvent.click(await screen.findByRole("button", { name: "Close Year 2026" }));
    expect(await screen.findByText("Year 2026 closed — entry JE-000123. Opened 12 periods for 2027.")).toBeInTheDocument();
  });
});

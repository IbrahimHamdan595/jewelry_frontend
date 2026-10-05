import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import TaxPage from "@/app/admin/accounting/tax/page";
import { LanguageProvider } from "@/context/LanguageContext";
import ar from "@/i18n/ar";

const lib = vi.hoisted(() => ({ listCodes: vi.fn(), vatReturn: vi.fn() }));
vi.mock("@/lib/accounting", () => ({ tax: { listCodes: lib.listCodes, seedCodes: vi.fn(), vatReturn: lib.vatReturn } }));
vi.mock("@/lib/api-client", async (orig) => ({ ...(await orig<typeof import("@/lib/api-client")>()), downloadFile: vi.fn() }));

const vatReturn = { year: 2026, quarter: 3, output_vat: "110.00", input_vat: "40.00", net_payable: "70.00", direction: "PAYABLE", cash_split: null, transactions: [] };

function renderPage(lang: "en" | "ar") {
  return render(<LanguageProvider initialLang={lang}><TaxPage /></LanguageProvider>);
}

describe("tax page i18n and labels (NEX-64)", () => {
  beforeEach(() => {
    lib.listCodes.mockResolvedValue({ items: [] });
    lib.vatReturn.mockReset().mockResolvedValue(vatReturn);
  });

  it("names the year and quarter fields and translates the quarters", async () => {
    renderPage("ar");
    expect(screen.getByLabelText(ar.accounting.periods.year)).toHaveAttribute("type", "number");
    const quarter = screen.getByLabelText(ar.accounting.extra.quarterLabel);
    expect(within(quarter).getAllByRole("option").map((o) => o.textContent)).toEqual([1, 2, 3, 4].map(ar.accounting.extra.quarter));
    expect(screen.queryByText("Q1")).toBeNull();
    await screen.findByText(ar.accounting.common.noData);
  });

  it("still runs the return for the chosen quarter, and words its direction in Arabic", async () => {
    renderPage("ar");
    fireEvent.change(screen.getByLabelText(ar.accounting.extra.quarterLabel), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: ar.accounting.tax.runBtn }));
    expect(await screen.findByText(`${ar.accounting.tax.netLabel} ${ar.accounting.extra.vatDirection.PAYABLE}`)).toBeInTheDocument();
    expect(lib.vatReturn).toHaveBeenCalledWith(2026, 3);
    expect(screen.queryByText(/PAYABLE/)).toBeNull();
  });

  it("falls back to the server's word for a direction it does not know", async () => {
    lib.vatReturn.mockResolvedValue({ ...vatReturn, direction: "DEFERRED" });
    renderPage("ar");
    fireEvent.click(screen.getByRole("button", { name: ar.accounting.tax.runBtn }));
    expect(await screen.findByText(`${ar.accounting.tax.netLabel} DEFERRED`)).toBeInTheDocument();
  });

  it("reads exactly as before in English", async () => {
    renderPage("en");
    expect(within(screen.getByLabelText("Quarter")).getAllByRole("option").map((o) => o.textContent)).toEqual(["Q1", "Q2", "Q3", "Q4"]);
    fireEvent.click(screen.getByRole("button", { name: "Run" }));
    expect(await screen.findByText("Net PAYABLE")).toBeInTheDocument();
  });
});

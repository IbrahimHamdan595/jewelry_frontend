import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import TaxPage from "@/app/admin/accounting/tax/page";
import { LanguageProvider } from "@/context/LanguageContext";
import en from "@/i18n/en";
import ar from "@/i18n/ar";
import { ApiError } from "@/lib/api-client";
import { renderWithSwitch } from "@/test/language-shell";

const lib = vi.hoisted(() => ({ listCodes: vi.fn(), vatReturn: vi.fn(), seedCodes: vi.fn() }));
vi.mock("@/lib/accounting", () => ({ tax: { listCodes: lib.listCodes, seedCodes: lib.seedCodes, vatReturn: lib.vatReturn } }));
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

describe("tax — seeding and the language of a failure (NEX-64)", () => {
  const switchLanguage = () => fireEvent.click(screen.getByRole("button", { name: "switch language" }));
  beforeEach(() => {
    lib.listCodes.mockReset().mockResolvedValue({ items: [] });
    lib.vatReturn.mockReset().mockResolvedValue(vatReturn);
    lib.seedCodes.mockReset();
    document.cookie = "mz_lang=; path=/; max-age=0";
    localStorage.clear();
  });

  it("a failed 'seed tax codes' is no longer silent", async () => {
    lib.seedCodes.mockRejectedValueOnce(new ApiError(409, "Seed the chart of accounts first")).mockRejectedValueOnce(new ApiError(500, undefined));
    renderWithSwitch(<TaxPage />, "ar");
    const seed = await screen.findByRole("button", { name: ar.accounting.tax.seedCodes });
    fireEvent.click(seed);
    expect(await screen.findByRole("alert")).toHaveTextContent("Seed the chart of accounts first");
    fireEvent.click(seed);
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(ar.errors.actionFailed));
  });

  it("a failed VAT return is a failed read, and retranslates when the language changes", async () => {
    lib.vatReturn.mockRejectedValue(new TypeError("Failed to fetch"));
    renderWithSwitch(<TaxPage />, "ar");
    await screen.findByText(ar.accounting.common.noData);
    fireEvent.click(screen.getByRole("button", { name: ar.accounting.common.run }));
    expect(await screen.findByRole("alert")).toHaveTextContent(ar.errors.loadFailed);
    switchLanguage();
    expect(screen.getByRole("alert")).toHaveTextContent(en.errors.loadFailed);
  });
});

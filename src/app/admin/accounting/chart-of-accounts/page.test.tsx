import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import ChartOfAccounts from "@/app/admin/accounting/chart-of-accounts/page";
import { ApiError } from "@/lib/api-client";
import { LanguageProvider } from "@/context/LanguageContext";
import en from "@/i18n/en";
import ar from "@/i18n/ar";

const lib = vi.hoisted(() => ({ listAccounts: vi.fn(), seedCoa: vi.fn() }));
vi.mock("@/lib/accounting", () => ({ accounting: { listAccounts: lib.listAccounts, seedCoa: lib.seedCoa } }));

// GLAccount rows as GET /accounting/accounts sends them, taken from the system
// chart (backend app/core/coa_seed.py). type / denomination / normal_balance are
// enums (AccountType, Denomination, NormalBalance in app/models); code, name,
// currency and system_key are data.
const account = (code: string, name: string, type: string, denomination: string, normal_balance: string, currency: string, system_key: string | null) =>
  ({ id: `acc-${code}`, code, name, type, denomination, normal_balance, parent_id: null, currency, system_key, is_active: true });
const ACCOUNTS = [
  account("530001", "Cash (USD)", "ASSET", "MONEY", "DEBIT", "USD", "CASH"),
  account("370011", "Metal Inventory", "ASSET", "DUAL", "DEBIT", "USD", "METAL_INVENTORY"),
  account("401101", "Accounts Payable", "LIABILITY", "MONEY", "CREDIT", "USD", "AP"),
  account("101401", "Retained Earnings", "EQUITY", "MONEY", "CREDIT", "USD", "RETAINED_EARNINGS"),
  account("701000", "Sales Revenue", "INCOME", "MONEY", "CREDIT", "USD", "SALES_REVENUE"),
  account("611701", "Metal COGS", "EXPENSE", "DUAL", "DEBIT", "USD", "METAL_COGS"),
  account("190001", "Gold Position (memo)", "ASSET", "METAL", "DEBIT", "USD", null),
];

const renderPage = (lang: "en" | "ar") => render(<LanguageProvider initialLang={lang}><ChartOfAccounts /></LanguageProvider>);
/** The type / denomination / normal-side cells of the row for an account code. */
async function enumsOf(code: string) {
  const row = (await screen.findByText(code)).closest("tr") as HTMLElement;
  const cells = within(row).getAllByRole("cell").map((td) => td.textContent);
  return { type: cells[2], denomination: cells[3], normal: cells[4] };
}

describe("chart of accounts — enum columns (NEX-64)", () => {
  beforeEach(() => {
    lib.listAccounts.mockReset().mockResolvedValue({ items: ACCOUNTS });
  });

  it("Arabic: account type, denomination and normal side are named, not printed as codes", async () => {
    const { container } = renderPage("ar");
    const c = ar.accounting.coa;
    expect(await enumsOf("530001")).toEqual({ type: c.types.ASSET, denomination: c.denominations.MONEY, normal: c.normalBalances.DEBIT });
    expect(await enumsOf("401101")).toEqual({ type: c.types.LIABILITY, denomination: c.denominations.MONEY, normal: c.normalBalances.CREDIT });
    expect(await enumsOf("101401")).toEqual({ type: c.types.EQUITY, denomination: c.denominations.MONEY, normal: c.normalBalances.CREDIT });
    expect(await enumsOf("701000")).toEqual({ type: c.types.INCOME, denomination: c.denominations.MONEY, normal: c.normalBalances.CREDIT });
    expect(await enumsOf("611701")).toEqual({ type: c.types.EXPENSE, denomination: c.denominations.DUAL, normal: c.normalBalances.DEBIT });
    expect((await enumsOf("190001")).denomination).toBe(c.denominations.METAL);
    for (const code of ["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE", "MONEY", "METAL", "DUAL", "DEBIT", "CREDIT"]) {
      expect(within(container).queryByText(code), code).toBeNull();
    }
  });

  it("Arabic: account names, currency codes and system keys stay as stored — they are data", async () => {
    renderPage("ar");
    const row = (await screen.findByText("370011")).closest("tr") as HTMLElement;
    expect(row).toHaveTextContent("Metal Inventory");
    expect(row).toHaveTextContent("USD");
    expect(within(row).getByText("METAL_INVENTORY")).toHaveClass("font-mono");
    // No Arabic inside a monospace run, which RTL lays out left-to-right.
    for (const mono of Array.from(document.querySelectorAll(".font-mono"))) expect(mono.textContent).not.toMatch(/[؀-ۿ]/);
  });

  it("every Arabic enum label is Arabic and differs from the code", () => {
    const c = ar.accounting.coa;
    for (const [group, labels] of Object.entries({ types: c.types, denominations: c.denominations, normalBalances: c.normalBalances })) {
      for (const [code, label] of Object.entries(labels)) {
        expect(label, `${group}.${code}`).toMatch(/[؀-ۿ]/);
        expect(label, `${group}.${code}`).not.toBe(code);
      }
    }
  });

  it("English reads as it did: the codes", async () => {
    renderPage("en");
    expect(await enumsOf("530001")).toEqual({ type: "ASSET", denomination: "MONEY", normal: "DEBIT" });
    expect(await enumsOf("611701")).toEqual({ type: "EXPENSE", denomination: "DUAL", normal: "DEBIT" });
    expect(en.accounting.coa.types.INCOME).toBe("INCOME");
  });

  it("a value this build has no name for is shown as sent", async () => {
    lib.listAccounts.mockResolvedValue({ items: [account("999999", "Suspense", "CONTRA", "TRIPLE", "NEITHER", "USD", null)] });
    renderPage("ar");
    expect(await enumsOf("999999")).toEqual({ type: "CONTRA", denomination: "TRIPLE", normal: "NEITHER" });
  });
});

describe("chart of accounts — a failed load (NEX-64)", () => {
  it.each([
    ["the connection drops", new TypeError("Failed to fetch")],
    ["the server answers 500 with no reason", new ApiError(500, undefined)],
  ])("Arabic, when %s: the translated message", async (_name, failure) => {
    lib.listAccounts.mockReset().mockRejectedValue(failure);
    renderPage("ar");
    expect(await screen.findByText(ar.errors.loadFailed)).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/Failed to fetch|API error/);
  });

  it("the server's own reason is shown as sent", async () => {
    lib.listAccounts.mockReset().mockRejectedValue(new ApiError(403, "Accounting access required"));
    renderPage("ar");
    expect(await screen.findByText("Accounting access required")).toBeInTheDocument();
  });
});

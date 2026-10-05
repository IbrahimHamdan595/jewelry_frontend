import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import BankPage from "@/app/admin/accounting/bank/page";
import { ApiError } from "@/lib/api-client";
import { renderWithSwitch } from "@/test/language-shell";
import en from "@/i18n/en";
import ar from "@/i18n/ar";

const lib = vi.hoisted(() => ({ cashPosition: vi.fn(), adoptSeeded: vi.fn(), createAccount: vi.fn(), transfer: vi.fn() }));
vi.mock("@/lib/accounting", () => ({ bank: lib }));

// GET /accounting/bank/cash-position: accounts with their balances as decimal strings.
const ACCOUNTS = [
  { id: "b1", name: "Cash (USD)", account_type: "CASH", currency: "USD", balance_money: "1200.00", balance_base: "1200.00", last_reconciled_at: null },
  { id: "b2", name: "Bank Audi", account_type: "BANK", currency: "USD", balance_money: "8000.00", balance_base: "8000.00", last_reconciled_at: "2026-09-01T00:00:00Z" },
];
const switchLanguage = () => fireEvent.click(screen.getByRole("button", { name: "switch language" }));

beforeEach(() => {
  for (const fn of Object.values(lib)) fn.mockReset();
  lib.cashPosition.mockResolvedValue({ accounts: ACCOUNTS });
  document.cookie = "mz_lang=; path=/; max-age=0";
  localStorage.clear();
});

async function transfer(dict: typeof en) {
  await screen.findByText("Bank Audi");
  const [from, to] = screen.getAllByRole("combobox").slice(-2);
  fireEvent.change(from, { target: { value: "b1" } });
  fireEvent.change(to, { target: { value: "b2" } });
  fireEvent.change(screen.getByPlaceholderText(dict.accounting.bank.amountPlaceholder), { target: { value: "250" } });
  fireEvent.click(screen.getByRole("button", { name: dict.accounting.bank.transfer }));
}

describe("bank — a posted transfer is confirmed in the UI language (NEX-64)", () => {
  it("Arabic: 'posted', with the entry number kept as the server sent it", async () => {
    lib.transfer.mockResolvedValue({ entry_no: "JE-2026-000042" });
    renderWithSwitch(<BankPage />, "ar");
    await transfer(ar);
    expect(await screen.findByText(ar.accounting.extra.posted("JE-2026-000042"))).toBeInTheDocument();
    expect(screen.queryByText(/Posted/)).toBeNull();
    expect(lib.transfer).toHaveBeenCalledWith(expect.objectContaining({ from_account_id: "b1", to_account_id: "b2", amount: "250" }));
  });

  it("English keeps its wording, and the confirmation follows a language switch", async () => {
    lib.transfer.mockResolvedValue({ entry_no: "JE-2026-000042" });
    renderWithSwitch(<BankPage />, "en");
    await transfer(en);
    expect(await screen.findByText("Posted JE-2026-000042")).toBeInTheDocument();
    switchLanguage();
    expect(screen.getByText(ar.accounting.extra.posted("JE-2026-000042"))).toBeInTheDocument();
    expect(screen.queryByText("Posted JE-2026-000042")).toBeNull();
  });
});

describe("bank — failures are said, in the UI language (NEX-64)", () => {
  it("'Adopt seeded accounts' failing is no longer silent", async () => {
    lib.adoptSeeded.mockRejectedValue(new TypeError("Failed to fetch"));
    renderWithSwitch(<BankPage />, "ar");
    await screen.findByText("Bank Audi");
    fireEvent.click(screen.getByRole("button", { name: ar.accounting.bank.adoptSeeded }));
    expect(await screen.findByRole("alert")).toHaveTextContent(ar.errors.actionFailed);
    expect(document.body).not.toHaveTextContent("Failed to fetch");
  });

  it("'Adopt seeded accounts' refused by the server shows the server's reason", async () => {
    lib.adoptSeeded.mockRejectedValue(new ApiError(409, "Seed the chart of accounts first"));
    renderWithSwitch(<BankPage />, "ar");
    await screen.findByText("Bank Audi");
    fireEvent.click(screen.getByRole("button", { name: ar.accounting.bank.adoptSeeded }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Seed the chart of accounts first");
  });

  it("a successful adopt reloads the list and clears an earlier error", async () => {
    lib.adoptSeeded.mockRejectedValueOnce(new ApiError(500, undefined)).mockResolvedValueOnce({ created: 2 });
    renderWithSwitch(<BankPage />, "en");
    await screen.findByText("Bank Audi");
    const adopt = screen.getByRole("button", { name: en.accounting.bank.adoptSeeded });
    fireEvent.click(adopt);
    await screen.findByRole("alert");
    fireEvent.click(adopt);
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    expect(lib.cashPosition).toHaveBeenCalledTimes(2);
  });

  it("a failed load is translated, and retranslates when the language changes", async () => {
    lib.cashPosition.mockRejectedValue(new ApiError(500, undefined));
    renderWithSwitch(<BankPage />, "ar");
    expect(await screen.findByRole("alert")).toHaveTextContent(ar.errors.loadFailed);
    switchLanguage();
    expect(screen.getByRole("alert")).toHaveTextContent(en.errors.loadFailed);
    expect(screen.getByRole("alert")).not.toHaveTextContent(ar.errors.loadFailed);
  });

  it("a failed transfer is an action failure, and retranslates too", async () => {
    lib.transfer.mockRejectedValue(new TypeError("Failed to fetch"));
    renderWithSwitch(<BankPage />, "ar");
    await transfer(ar);
    expect(await screen.findByRole("alert")).toHaveTextContent(ar.errors.actionFailed);
    switchLanguage();
    expect(screen.getByRole("alert")).toHaveTextContent(en.errors.actionFailed);
  });
});

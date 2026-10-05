import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, within } from "@testing-library/react";
import Expenses from "@/app/admin/accounting/expenses/page";
import { renderWithSwitch } from "@/test/language-shell";
import en from "@/i18n/en";
import ar from "@/i18n/ar";

const lib = vi.hoisted(() => ({
  expenseAccounts: vi.fn(), listBills: vi.fn(), byCategory: vi.fn(), verify: vi.fn(), createBill: vi.fn(), listCodes: vi.fn(),
}));
vi.mock("@/lib/accounting", () => ({
  expenses: { expenseAccounts: lib.expenseAccounts, listBills: lib.listBills, byCategory: lib.byCategory, verify: lib.verify, createBill: lib.createBill },
  tax: { listCodes: lib.listCodes },
}));
vi.mock("@/lib/api-client", async (orig) => ({
  ...(await orig<typeof import("@/lib/api-client")>()),
  apiFetcher: vi.fn(() => Promise.resolve({ lbp_exchange_rate: "89500.00" })),
  downloadFile: vi.fn(),
}));

// Vendor bills as GET /accounting/expenses/bills sends them. `status` is the
// VendorBillStatus enum (app/models): OPEN, PARTIAL, PAID, VOID.
const bill = (bill_no: string, status: string, amount_paid: string) =>
  ({ id: `id-${bill_no}`, bill_no, vendor_name: "EDL", bill_date: "2026-09-01", total: "120.00", amount_paid, status });
const BILLS = [bill("BILL-000001", "OPEN", "0.00"), bill("BILL-000002", "PARTIAL", "50.00"), bill("BILL-000003", "PAID", "120.00"), bill("BILL-000004", "VOID", "0.00")];
const switchLanguage = () => fireEvent.click(screen.getByRole("button", { name: "switch language" }));

beforeEach(() => {
  for (const fn of Object.values(lib)) fn.mockReset();
  lib.expenseAccounts.mockResolvedValue({ items: [{ id: "a1", code: "626000", name: "Utilities", system_key: null }] });
  lib.listCodes.mockResolvedValue({ items: [] });
  lib.listBills.mockResolvedValue({ items: BILLS });
  lib.byCategory.mockResolvedValue({ accounts: [], total: "0.00" });
  lib.verify.mockResolvedValue({ gl: "120.00", subledger: "120.00", matches: true });
  document.cookie = "mz_lang=; path=/; max-age=0";
  localStorage.clear();
});

async function recordBill(dict: typeof en) {
  await screen.findByText("BILL-000001");
  const x = dict.accounting.expenses;
  fireEvent.change(screen.getByPlaceholderText(x.vendorPlaceholder), { target: { value: "EDL" } });
  fireEvent.change(screen.getByPlaceholderText(x.amountPlaceholder), { target: { value: "120" } });
  fireEvent.click(screen.getByRole("button", { name: x.recordBtn }));
}

describe("expenses — a recorded bill is confirmed in the UI language (NEX-64)", () => {
  // POST /accounting/expenses/bills → { bill_no, total, status }
  const RECORDED = { bill_no: "BILL-000005", total: "133.20", status: "OPEN" };

  it("Arabic: the sentence and the bill's status are Arabic; the number and the total keep their own order", async () => {
    lib.createBill.mockResolvedValue(RECORDED);
    renderWithSwitch(<Expenses />, "ar");
    await recordBill(ar);
    const x = ar.accounting.expenses;
    const said = await screen.findByText(x.billRecorded("BILL-000005", x.billStatus.OPEN, "133.20"));
    expect(said.textContent).toContain("⁦BILL-000005⁩");
    expect(said.textContent).toContain("⁦133.20⁩");
    expect(said.textContent).not.toMatch(/Bill |total|OPEN/);
  });

  it("English keeps its wording, and the confirmation follows a language switch", async () => {
    lib.createBill.mockResolvedValue(RECORDED);
    renderWithSwitch(<Expenses />, "en");
    await recordBill(en);
    expect(await screen.findByText("Bill BILL-000005 (OPEN, total 133.20)")).toBeInTheDocument();
    switchLanguage();
    const x = ar.accounting.expenses;
    expect(screen.getByText(x.billRecorded("BILL-000005", x.billStatus.OPEN, "133.20"))).toBeInTheDocument();
  });

  it("a status this build has no name for is shown as sent", async () => {
    lib.createBill.mockResolvedValue({ ...RECORDED, status: "DISPUTED" });
    renderWithSwitch(<Expenses />, "ar");
    await recordBill(ar);
    expect(await screen.findByText(ar.accounting.expenses.billRecorded("BILL-000005", "DISPUTED", "133.20"))).toBeInTheDocument();
  });
});

describe("expenses — the bills table names each status (NEX-64)", () => {
  const statusOf = async (billNo: string) => within((await screen.findByText(billNo)).closest("tr") as HTMLElement).getAllByRole("cell")[5].textContent;

  it("Arabic: OPEN / PARTIAL / PAID / VOID are translated", async () => {
    renderWithSwitch(<Expenses />, "ar");
    const s = ar.accounting.expenses.billStatus;
    expect(await statusOf("BILL-000001")).toBe(s.OPEN);
    expect(await statusOf("BILL-000002")).toBe(s.PARTIAL);
    expect(await statusOf("BILL-000003")).toBe(s.PAID);
    expect(await statusOf("BILL-000004")).toBe(s.VOID);
    for (const label of Object.values(s)) expect(label).toMatch(/[؀-ۿ]/);
    expect(new Set(Object.values(s)).size).toBe(4);
  });

  it("English reads as it did: the codes", async () => {
    renderWithSwitch(<Expenses />, "en");
    expect(await statusOf("BILL-000002")).toBe("PARTIAL");
  });
});

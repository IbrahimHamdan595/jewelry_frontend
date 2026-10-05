import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import Receivables from "@/app/admin/accounting/receivables/page";
import { ApiError } from "@/lib/api-client";
import { renderWithSwitch } from "@/test/language-shell";
import en from "@/i18n/en";
import ar from "@/i18n/ar";

const lib = vi.hoisted(() => ({ listCustomers: vi.fn(), verify: vi.fn(), aging: vi.fn(), createCustomer: vi.fn(), createReceipt: vi.fn() }));
vi.mock("@/lib/accounting", () => ({ ar: lib }));
vi.mock("@/lib/api-client", async (orig) => ({
  ...(await orig<typeof import("@/lib/api-client")>()),
  apiFetcher: vi.fn(() => Promise.resolve({ lbp_exchange_rate: "89500.00" })),
  downloadFile: vi.fn(),
}));

// GET /accounting/ar/customers, /verify and /aging: money as decimal strings.
const CUSTOMER = { id: "c1", name: "Rima Haddad", phone: null, currency: "USD", credit_limit: null, open_balance: "400.00" };
const switchLanguage = () => fireEvent.click(screen.getByRole("button", { name: "switch language" }));

beforeEach(() => {
  for (const fn of Object.values(lib)) fn.mockReset();
  lib.listCustomers.mockResolvedValue({ items: [CUSTOMER] });
  lib.verify.mockResolvedValue({ gl_ar_balance: "400.00", subledger_balance: "400.00", matches: true });
  lib.aging.mockResolvedValue({ totals: { "0_30": "400.00", "31_60": "0.00", "61_90": "0.00", "90_plus": "0.00" }, grand_total: "400.00" });
  document.cookie = "mz_lang=; path=/; max-age=0";
  localStorage.clear();
});

async function recordReceipt(dict: typeof en) {
  await screen.findByRole("option", { name: "Rima Haddad" });
  fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "c1" } });
  fireEvent.change(screen.getByPlaceholderText(dict.accounting.receivables.amountPlaceholder), { target: { value: "150" } });
  fireEvent.click(screen.getByRole("button", { name: dict.accounting.receivables.recordBtn }));
}

describe("receivables — a recorded receipt is confirmed in the UI language (NEX-64)", () => {
  // POST /accounting/ar/receipts → { receipt_no, unapplied_amount }
  const RECEIPT = { receipt_no: "RC-2026-000007", unapplied_amount: "25.00" };

  it("Arabic: the sentence is Arabic; the receipt number and the amount keep their own order", async () => {
    lib.createReceipt.mockResolvedValue(RECEIPT);
    renderWithSwitch(<Receivables />, "ar");
    await recordReceipt(ar);
    const said = await screen.findByText(ar.accounting.receivables.receiptRecorded("RC-2026-000007", "25.00"));
    expect(said.textContent).toMatch(/[؀-ۿ]/);
    expect(said.textContent).toContain("⁦RC-2026-000007⁩");
    expect(said.textContent).toContain("⁦25.00⁩");
    expect(said.textContent).not.toMatch(/Receipt|unapplied/);
  });

  it("English keeps its wording, and the confirmation follows a language switch", async () => {
    lib.createReceipt.mockResolvedValue(RECEIPT);
    renderWithSwitch(<Receivables />, "en");
    await recordReceipt(en);
    expect(await screen.findByText("Receipt RC-2026-000007 (unapplied 25.00)")).toBeInTheDocument();
    switchLanguage();
    expect(screen.getByText(ar.accounting.receivables.receiptRecorded("RC-2026-000007", "25.00"))).toBeInTheDocument();
  });
});

describe("receivables — failures follow the UI language (NEX-64)", () => {
  it("a failed load is translated, and retranslates when the language changes", async () => {
    lib.listCustomers.mockRejectedValue(new TypeError("Failed to fetch"));
    renderWithSwitch(<Receivables />, "ar");
    expect(await screen.findByRole("alert")).toHaveTextContent(ar.errors.loadFailed);
    switchLanguage();
    expect(screen.getByRole("alert")).toHaveTextContent(en.errors.loadFailed);
  });

  it("a refused receipt shows the server's reason; one with no reason, the translated fallback", async () => {
    lib.createReceipt.mockRejectedValueOnce(new ApiError(400, "Receipt exceeds the open balance")).mockRejectedValueOnce(new ApiError(500, undefined));
    renderWithSwitch(<Receivables />, "ar");
    await recordReceipt(ar);
    expect(await screen.findByRole("alert")).toHaveTextContent("Receipt exceeds the open balance");
    fireEvent.click(screen.getByRole("button", { name: ar.accounting.receivables.recordBtn }));
    expect(await screen.findByText(ar.errors.actionFailed)).toBeInTheDocument();
  });
});

// The tie-out line in the header prints two ledger balances as the API sent
// them. A net credit balance is negative.
describe("receivables — the tie-out balances keep their sign in front", () => {
  it("Arabic: both balances sit in one left-to-right run", async () => {
    lib.verify.mockResolvedValue({ gl_ar_balance: "-45.00", subledger_balance: "-45.00", matches: true });
    renderWithSwitch(<Receivables />, "ar");
    const run = await screen.findByText("-45.00 / -45.00", { selector: "bdi" });
    expect(run).toHaveAttribute("dir", "ltr");
    expect(run.parentElement).toHaveTextContent("✓ -45.00 / -45.00");
  });
});

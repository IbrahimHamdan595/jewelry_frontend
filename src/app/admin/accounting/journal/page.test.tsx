import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import JournalPage from "@/app/admin/accounting/journal/page";
import { LanguageProvider } from "@/context/LanguageContext";
import ar from "@/i18n/ar";

const lib = vi.hoisted(() => ({ postEntry: vi.fn() }));
const accounts = [{ id: "a1", code: "1000", name: "Cash" }, { id: "a2", code: "4000", name: "Sales" }];
vi.mock("@/lib/accounting", () => ({
  accounting: {
    listAccounts: vi.fn(() => Promise.resolve({ items: accounts })),
    listEntries: vi.fn(() => Promise.resolve({ items: [] })),
    postEntry: lib.postEntry,
  },
}));
vi.mock("@/lib/api-client", () => ({ apiFetcher: vi.fn(() => Promise.resolve({ lbp_exchange_rate: 89500 })) }));

async function renderPage(lang: "en" | "ar") {
  render(<LanguageProvider initialLang={lang}><JournalPage /></LanguageProvider>);
  await screen.findAllByRole("option", { name: "1000 Cash" }); // accounts have loaded
}

describe("journal page i18n and labels (NEX-64)", () => {
  beforeEach(() => lib.postEntry.mockReset().mockResolvedValue({ entry_no: "JE-000123" }));

  it("words the balance line in Arabic", async () => {
    await renderPage("ar");
    fireEvent.change(screen.getAllByLabelText(ar.accounting.journal.colDebit)[0], { target: { value: "50" } });
    expect(screen.getByText(new RegExp(ar.accounting.extra.moneyBalance("50.00", "0.00").replace(/[()]/g, "\\$&")))).toBeInTheDocument();
    expect(screen.queryByText(/DR|CR/)).toBeNull();
  });

  it("names every entry field after its column, on every row", async () => {
    await renderPage("ar");
    const j = ar.accounting.journal;
    const c = ar.accounting.common;
    expect(screen.getByLabelText(c.date)).toHaveAttribute("type", "date");
    expect(screen.getByLabelText(j.memoPlaceholder)).toBeInTheDocument();
    for (const name of [c.account, c.currency, c.fxRate, j.colDebit, j.colCredit, j.colKarat, j.colGramsDr, j.colGramsCr]) {
      expect(screen.getAllByLabelText(name), name).toHaveLength(2);
    }
  });

  it("still posts a balanced entry and confirms it in Arabic", async () => {
    await renderPage("ar");
    const j = ar.accounting.journal;
    const c = ar.accounting.common;
    fireEvent.change(screen.getByLabelText(c.date), { target: { value: "2026-09-05" } });
    fireEvent.change(screen.getAllByLabelText(c.account)[0], { target: { value: "a1" } });
    fireEvent.change(screen.getAllByLabelText(j.colDebit)[0], { target: { value: "50" } });
    fireEvent.change(screen.getAllByLabelText(c.account)[1], { target: { value: "a2" } });
    fireEvent.change(screen.getAllByLabelText(j.colCredit)[1], { target: { value: "50" } });
    fireEvent.click(screen.getByRole("button", { name: c.post }));
    expect(await screen.findByText(ar.accounting.extra.posted("JE-000123"))).toBeInTheDocument();
    expect(lib.postEntry.mock.calls[0][0].lines.map((l: { account_id: string; base_debit: string; base_credit: string }) => [l.account_id, l.base_debit, l.base_credit])).toEqual([
      ["a1", "50.00", "0.00"],
      ["a2", "0.00", "50.00"],
    ]);
  });

  it("reads exactly as before in English", async () => {
    await renderPage("en");
    fireEvent.change(screen.getAllByLabelText("Debit (USD)")[0], { target: { value: "50" } });
    expect(screen.getByText("Balance (USD): DR 50.00 / CR 0.00 ✗")).toBeInTheDocument();
  });
});

import { api } from "./api-client";

export type GLAccount = {
  id: string; code: string; name: string; type: string;
  denomination: "MONEY" | "METAL" | "DUAL"; normal_balance: "DEBIT" | "CREDIT";
  parent_id: string | null; currency: string | null; system_key: string | null;
  is_active: boolean;
};

export type JournalLineIn = {
  account_id: string; base_debit?: string; base_credit?: string;
  money_debit?: string; money_credit?: string; currency?: string; fx_rate?: string;
  metal_debit_grams?: string; metal_credit_grams?: string; karat?: string | null; memo?: string;
};

export type JournalEntry = {
  id: string; entry_no: string; entry_date: string; memo: string;
  source_type: string; entry_hash: string; prev_hash: string;
  lines: (JournalLineIn & { id: string; line_no: number })[];
};

export type Period = { id: string; year: number; period_no: number; status: string; closed_at: string | null };

export type TrialBalance = {
  as_of: string; balanced: boolean; metal_balanced: boolean;
  total_base_debit: string; total_base_credit: string;
  metal_by_karat: Record<string, { debit_grams: string; credit_grams: string }>;
  accounts: Array<{
    account_id: string; code: string; name: string; type: string; system_key: string | null;
    base_debit: string; base_credit: string; net_base: string;
    money_by_currency: Record<string, { debit: string; credit: string }>;
    metal_by_karat: Record<string, { debit_grams: string; credit_grams: string; net_grams: string }>;
  }>;
};

export const accounting = {
  listAccounts: () => api.get<{ items: GLAccount[] }>("/accounting/accounts"),
  seedCoa: () => api.post<{ created: number }>("/accounting/seed-coa"),
  createAccount: (b: Partial<GLAccount>) => api.post<GLAccount>("/accounting/accounts", b),
  listPeriods: () => api.get<{ items: Period[] }>("/accounting/periods"),
  openPeriod: (year: number, period_no: number) => api.post<Period>("/accounting/periods", { year, period_no }),
  closePeriod: (id: string) => api.post<Period>(`/accounting/periods/${id}/close`),
  reopenPeriod: (id: string) => api.post<Period>(`/accounting/periods/${id}/reopen`),
  listEntries: () => api.get<{ items: JournalEntry[]; total: number }>("/accounting/journal-entries"),
  getEntry: (id: string) => api.get<JournalEntry>(`/accounting/journal-entries/${id}`),
  postEntry: (b: { entry_date: string; memo: string; source_type: string; lines: JournalLineIn[] }) =>
    api.post<JournalEntry>("/accounting/journal-entries", b),
  reverseEntry: (id: string) => api.post<JournalEntry>(`/accounting/journal-entries/${id}/reverse`),
  trialBalance: (asOf: string) => api.get<TrialBalance>(`/accounting/trial-balance?as_of=${asOf}`),
  verify: () => api.get<{ status: string; head_matches: boolean }>("/accounting/ledger/verify"),
};

export type BankAccountT = {
  id: string; name: string; account_type: string; currency: string;
  balance_money?: string; balance_base?: string; last_reconciled_at: string | null;
};

export const bank = {
  adoptSeeded: () => api.post<{ created: number }>("/accounting/bank/adopt-seeded"),
  listAccounts: () => api.get<{ items: BankAccountT[] }>("/accounting/bank/accounts"),
  createAccount: (b: { name: string; account_type: string; currency: string; bank_name?: string; account_number?: string }) =>
    api.post<BankAccountT>("/accounting/bank/accounts", b),
  cashPosition: () => api.get<{ accounts: BankAccountT[] }>("/accounting/bank/cash-position"),
  transfer: (b: { from_account_id: string; to_account_id: string; amount: string; dest_amount?: string; memo: string; entry_date: string }) =>
    api.post<{ entry_no: string }>("/accounting/bank/transfers", b),
  startRec: (b: { bank_account_id: string; statement_date: string; statement_balance: string }) =>
    api.post<Record<string, unknown>>("/accounting/bank/reconciliations", b),
  autoMatch: (recId: string) => api.post<Record<string, unknown>>(`/accounting/bank/reconciliations/${recId}/auto-match`),
  complete: (recId: string) => api.post<{ status: string }>(`/accounting/bank/reconciliations/${recId}/complete`),
};

export type CustomerT = { id: string; name: string; phone: string | null; currency: string; credit_limit: string | null; open_balance?: string };

export const ar = {
  listCustomers: () => api.get<{ items: CustomerT[] }>("/accounting/ar/customers"),
  createCustomer: (b: { name: string; phone?: string; credit_limit?: string }) => api.post<CustomerT>("/accounting/ar/customers", b),
  listInvoices: (customerId?: string) => api.get<{ items: Array<{ id: string; invoice_no: string; invoice_date: string; total: string; amount_paid: string; status: string }> }>(`/accounting/ar/invoices${customerId ? `?customer_id=${customerId}` : ""}`),
  createInvoice: (b: { customer_id: string; invoice_date: string; vat_percent: string; memo?: string; lines: { description: string; quantity: number; unit_price: string }[] }) =>
    api.post<{ invoice_no: string; total: string }>("/accounting/ar/invoices", b),
  createReceipt: (b: { customer_id: string; receipt_date: string; amount: string; payment_system_key: string }) =>
    api.post<{ receipt_no: string; unapplied_amount: string }>("/accounting/ar/receipts", b),
  aging: (asOf: string) => api.get<{ totals: Record<string, string>; grand_total: string }>(`/accounting/ar/aging?as_of=${asOf}`),
  verify: () => api.get<{ gl_ar_balance: string; subledger_balance: string; matches: boolean }>("/accounting/ar/verify"),
};

export const ap = {
  verify: () => api.get<{ ap: { gl: string; subledger: string; matches: boolean }; metal_ap: { matches: boolean; by_karat: Record<string, { gl: string; subledger: string; matches: boolean }> } }>("/accounting/ap/verify"),
  aging: (asOf: string) => api.get<{ cash_buckets: Record<string, string>; cash_total: string; metal_owed_by_karat: Record<string, string> }>(`/accounting/ap/aging?as_of=${asOf}`),
  balances: () => api.get<{ suppliers: Array<{ id: string; name: string; cash_owed: string; gold_owed_by_karat: Record<string, string> }> }>("/accounting/ap/balances"),
};

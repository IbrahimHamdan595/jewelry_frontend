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

export type ExpenseAccountT = { id: string; code: string; name: string; system_key: string | null };

export const expenses = {
  expenseAccounts: () => api.get<{ items: ExpenseAccountT[] }>("/accounting/expenses/expense-accounts"),
  createBill: (b: { vendor_name: string; bill_date: string; payment_system_key?: string | null; tax_code_id?: string; memo?: string; lines: { description: string; expense_account_id: string; amount: string }[] }) =>
    api.post<{ bill_no: string; total: string; status: string }>("/accounting/expenses/bills", b),
  listBills: (vendor?: string) => api.get<{ items: Array<{ id: string; bill_no: string; vendor_name: string; bill_date: string; total: string; amount_paid: string; status: string }> }>(`/accounting/expenses/bills${vendor ? `?vendor_name=${encodeURIComponent(vendor)}` : ""}`),
  pay: (b: { vendor_name: string; payment_date: string; amount: string; payment_system_key: string }) =>
    api.post<{ payment_no: string; unapplied_amount: string }>("/accounting/expenses/payments", b),
  byCategory: (from: string, until: string) => api.get<{ accounts: Array<{ code: string; name: string; system_key: string | null; amount: string }>; total: string }>(`/accounting/expenses/reports/by-category?from=${from}&until=${until}`),
  verify: () => api.get<{ gl: string; subledger: string; matches: boolean }>("/accounting/expenses/verify"),
};

export type TaxCodeT = { id: string; code: string; name: string; rate: string; is_active: boolean };

export const tax = {
  seedCodes: () => api.post<{ created: number }>("/accounting/tax/seed-codes"),
  listCodes: () => api.get<{ items: TaxCodeT[] }>("/accounting/tax/codes"),
  vatReturn: (year: number, quarter: number) => api.get<{ year: number; quarter: number; output_vat: string; input_vat: string; net_payable: string; direction: string; cash_split: { cash_75: string; transfer_25: string; bdl_account: string; note: string } | null; transactions: Array<{ entry_no: string; date: string; kind: string; vat: string }> }>(`/accounting/tax/vat-return?year=${year}&quarter=${quarter}`),
};

export type StatementLineT = { code: string; name: string; system_key: string | null; amount: string };

export const statements = {
  incomeStatement: (start: string, end: string) =>
    api.get<{ start: string; end: string; revenue_lines: StatementLineT[]; cogs_lines: StatementLineT[];
      opex_lines: StatementLineT[]; revenue: string; cogs: string; gross_profit: string;
      operating_expenses: string; net_profit: string }>(
      `/accounting/statements/income-statement?start=${start}&end=${end}`),
  balanceSheet: (as_of: string) =>
    api.get<{ as_of: string; all_current: boolean; asset_lines: StatementLineT[];
      liability_lines: StatementLineT[]; equity_lines: StatementLineT[];
      total_assets: string; total_liabilities: string; total_equity: string;
      balanced: boolean; metal_position: { karat: string; net_grams: string }[] }>(
      `/accounting/statements/balance-sheet?as_of=${as_of}`),
  cashFlow: (start: string, end: string) =>
    api.get<{ start: string; end: string; opening_cash: string; closing_cash: string;
      categories: { key: string; label: string; amount: string }[];
      net_change: string; reconciles: boolean }>(
      `/accounting/statements/cash-flow?start=${start}&end=${end}`),
};

export type ReadinessT = {
  year: number; period_no: number; can_close: boolean;
  hard: { key: string; ok: boolean; detail: string }[];
  soft: { key: string; count: number; detail: string }[];
};
export type YearPreviewT = {
  year: number; net_income: string; already_closed: boolean;
  lines: { code: string; name: string; system_key: string | null; debit: string; credit: string }[];
};

export const periodClose = {
  readiness: (year: number, period_no: number) =>
    api.get<ReadinessT>(`/accounting/periods/close-readiness?year=${year}&period_no=${period_no}`),
  yearPreview: (year: number) =>
    api.get<YearPreviewT>(`/accounting/periods/year-close-preview?year=${year}`),
  closeYear: (year: number) =>
    api.post<{ entry_id: string; entry_no: string; opened_periods: string[] }>(
      "/accounting/periods/close-year", { year }),
};

export type KpiT = { value: string | null; [k: string]: string | null };

export const kpis = {
  compute: (start: string, end: string) =>
    api.get<{ start: string; end: string; days: number;
      dsi: KpiT; inventory_turnover: KpiT; dpo: KpiT; gross_margin: KpiT; net_margin: KpiT;
      metal_turnover: KpiT; dso: KpiT; ccc: KpiT; current_ratio: KpiT; quick_ratio: KpiT }>(
      `/accounting/statements/kpis?start=${start}&end=${end}`),
};

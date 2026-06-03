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

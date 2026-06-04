"use client";

import { useEffect, useState } from "react";
import { expenses, tax, ExpenseAccountT, TaxCodeT } from "@/lib/accounting";
import { useLang } from "@/context/LanguageContext";
import { PageHeader } from "@/components/accounting/PageHeader";
import { SectionCard } from "@/components/accounting/SectionCard";
import { ActionBar } from "@/components/accounting/ActionBar";
import { DataTable } from "@/components/accounting/DataTable";
import { Money } from "@/components/accounting/Money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const SELECT = "border border-gray-200 rounded px-3 py-2.5 text-sm bg-white focus:border-gold focus:outline-none";

type BillT = Awaited<ReturnType<typeof expenses.listBills>>["items"][number];

export default function Expenses() {
  const { t } = useLang();
  const a = t.accounting.expenses;
  const c = t.accounting.common;

  const [accts, setAccts] = useState<ExpenseAccountT[]>([]);
  const [taxCodes, setTaxCodes] = useState<TaxCodeT[]>([]);
  const [bills, setBills] = useState<Awaited<ReturnType<typeof expenses.listBills>>["items"]>([]);
  const [cat, setCat] = useState<Awaited<ReturnType<typeof expenses.byCategory>> | null>(null);
  const [tie, setTie] = useState<{ gl: string; subledger: string; matches: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [vendor, setVendor] = useState("");
  const [acct, setAcct] = useState("");
  const [amt, setAmt] = useState("");
  const [paid, setPaid] = useState("");
  const [taxCode, setTaxCode] = useState("");
  const [ok, setOk] = useState<string | null>(null);

  async function load() {
    try {
      const a = (await expenses.expenseAccounts()).items;
      setAccts(a);
      if (!acct && a.length) setAcct(a[0].id);
      setTaxCodes((await tax.listCodes()).items);
      setBills((await expenses.listBills()).items);
      setCat(await expenses.byCategory("2026-06-01", "2026-06-30"));
      setTie(await expenses.verify());
    } catch (e) { setError((e as Error).message); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function record() {
    setError(null); setOk(null);
    try {
      const b = await expenses.createBill({ vendor_name: vendor, bill_date: "2026-06-30",
        payment_system_key: paid || null, tax_code_id: taxCode || undefined, memo: "",
        lines: [{ description: "", expense_account_id: acct, amount: amt }] });
      setOk(`Bill ${b.bill_no} (${b.status}, total ${b.total})`); setVendor(""); setAmt(""); await load();
    } catch (e) { setError((e as Error).message); }
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        eyebrow={a.eyebrow}
        title={a.title}
        description={a.description}
        actions={tie && (
          <span className={`text-xs ${tie.matches ? "text-green-700" : "text-red-700"}`}>
            {tie.matches ? "✓" : "✗"} {tie.gl} / {tie.subledger}
          </span>
        )}
      />
      {error && <div className="text-sm text-red-600">{error}</div>}

      <ActionBar hint={a.recordBill}>
        <Input placeholder={a.vendorPlaceholder} value={vendor} onChange={(e) => setVendor(e.target.value)} className="w-48" />
        <select value={acct} onChange={(e) => setAcct(e.target.value)} className={SELECT}>
          {accts.map((ac) => <option key={ac.id} value={ac.id}>{ac.code} {ac.name}</option>)}
        </select>
        <Input placeholder={a.amountPlaceholder} value={amt} onChange={(e) => setAmt(e.target.value)} className="w-32 text-end" />
        <select value={paid} onChange={(e) => setPaid(e.target.value)} className={SELECT}>
          <option value="">{a.onCredit}</option>
          <option value="CASH">{a.paidCash}</option>
          <option value="BANK">{a.paidBank}</option>
        </select>
        <select value={taxCode} onChange={(e) => setTaxCode(e.target.value)} className={SELECT}>
          <option value="">{a.noVat}</option>
          {taxCodes.map((tc) => <option key={tc.id} value={tc.id}>{tc.code} ({tc.rate}%)</option>)}
        </select>
        <Button onClick={record} disabled={!vendor || !acct || !amt}>{a.recordBtn}</Button>
        {ok && <span className="text-sm text-green-700 ms-1">{ok}</span>}
      </ActionBar>

      <SectionCard title={a.title} flush>
        <DataTable
          columns={[
            { key: "bill_no", label: a.colBill, render: (b: BillT) => <span className="font-mono">{b.bill_no}</span> },
            { key: "vendor_name", label: a.colVendor },
            { key: "bill_date", label: a.colDate },
            { key: "total", label: a.colTotal, align: "end", render: (b: BillT) => <Money value={b.total} dash /> },
            { key: "amount_paid", label: a.colPaid, align: "end", render: (b: BillT) => <Money value={b.amount_paid} dash /> },
            { key: "status", label: a.colStatus },
          ]}
          rows={bills}
          rowKey={(b) => b.id}
          empty={a.empty}
        />
      </SectionCard>

      {cat && (
        <SectionCard title={a.byCategory}>
          <div className="space-y-1.5 text-sm">
            {cat.accounts.map((ac) => (
              <div key={ac.code} className="flex items-center justify-between gap-4">
                <span className="text-gray-600">{ac.code} {ac.name}</span>
                <span className="text-gray-800 font-medium"><Money value={ac.amount} dash /></span>
              </div>
            ))}
            <div className="flex items-center justify-between gap-4 border-t border-gray-100 pt-1.5 mt-1.5">
              <span className="text-gray-500 uppercase tracking-widest text-[10px]">{c.total}</span>
              <span className="text-gray-900 font-semibold"><Money value={cat.total} dash /></span>
            </div>
          </div>
        </SectionCard>
      )}
    </div>
  );
}

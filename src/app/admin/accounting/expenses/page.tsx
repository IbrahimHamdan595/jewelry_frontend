"use client";

import { useEffect, useState } from "react";
import { expenses, tax, ExpenseAccountT, TaxCodeT } from "@/lib/accounting";

export default function Expenses() {
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Expenses</h1>
        {tie && <span className={tie.matches ? "text-green-700 text-sm" : "text-red-700 text-sm"}>
          Vendor AP {tie.gl} (sub {tie.subledger}) {tie.matches ? "✓" : "✗"}</span>}
      </div>
      {error && <div className="text-red-600">{error}</div>}

      <div className="border rounded-xl p-4 space-y-2">
        <div className="font-medium">Record expense / bill</div>
        <div className="flex flex-wrap gap-2 items-center">
          <input placeholder="Vendor" value={vendor} onChange={(e) => setVendor(e.target.value)} className="border rounded px-3 py-2" />
          <select value={acct} onChange={(e) => setAcct(e.target.value)} className="border rounded px-3 py-2">
            {accts.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
          </select>
          <input placeholder="Amount" value={amt} onChange={(e) => setAmt(e.target.value)} className="border rounded px-3 py-2 w-32 text-right" />
          <select value={paid} onChange={(e) => setPaid(e.target.value)} className="border rounded px-3 py-2">
            <option value="">On credit (Vendor AP)</option><option value="CASH">Paid — Cash</option><option value="BANK">Paid — Bank</option>
          </select>
          <select value={taxCode} onChange={(e) => setTaxCode(e.target.value)} className="border rounded px-3 py-2">
            <option value="">No VAT</option>{taxCodes.map((c) => <option key={c.id} value={c.id}>{c.code} ({c.rate}%)</option>)}
          </select>
          <button onClick={record} disabled={!vendor || !acct || !amt} className="px-4 py-2 rounded bg-amber-600 text-white disabled:opacity-40">Record</button>
        </div>
        {ok && <div className="text-green-700">{ok}</div>}
      </div>

      {cat && (
        <div className="text-sm border rounded-xl p-4">
          <div className="font-medium mb-1">Expense by category (June 2026)</div>
          {cat.accounts.map((a) => <div key={a.code}>{a.code} {a.name}: <b>{a.amount}</b></div>)}
          <div className="mt-1">Total: <b>{cat.total}</b></div>
        </div>
      )}

      <table className="w-full text-sm border">
        <thead className="bg-gray-50"><tr><th className="p-2 text-left">Bill</th><th className="p-2 text-left">Vendor</th><th className="p-2 text-left">Date</th><th className="p-2 text-right">Total</th><th className="p-2 text-right">Paid</th><th className="p-2 text-left">Status</th></tr></thead>
        <tbody>
          {bills.map((b) => (
            <tr key={b.id} className="border-t"><td className="p-2 font-mono">{b.bill_no}</td><td className="p-2">{b.vendor_name}</td>
              <td className="p-2">{b.bill_date}</td><td className="p-2 text-right">{b.total}</td><td className="p-2 text-right">{b.amount_paid}</td><td className="p-2">{b.status}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

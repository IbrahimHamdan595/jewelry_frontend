"use client";

import { useEffect, useState } from "react";
import { ar, CustomerT } from "@/lib/accounting";

export default function Receivables() {
  const [customers, setCustomers] = useState<CustomerT[]>([]);
  const [name, setName] = useState("");
  const [limit, setLimit] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [tie, setTie] = useState<{ matches: boolean; gl_ar_balance: string; subledger_balance: string } | null>(null);
  const [aging, setAging] = useState<{ totals: Record<string, string>; grand_total: string } | null>(null);
  const [rcCust, setRcCust] = useState("");
  const [rcAmt, setRcAmt] = useState("");
  const [ok, setOk] = useState<string | null>(null);

  async function load() {
    try {
      setCustomers((await ar.listCustomers()).items);
      setTie(await ar.verify());
      setAging(await ar.aging("2026-06-30"));
    } catch (e) { setError((e as Error).message); }
  }
  useEffect(() => { load(); }, []);

  async function create() {
    setError(null);
    try { await ar.createCustomer({ name, credit_limit: limit || undefined }); setName(""); setLimit(""); await load(); }
    catch (e) { setError((e as Error).message); }
  }
  async function receipt() {
    setError(null); setOk(null);
    try {
      const r = await ar.createReceipt({ customer_id: rcCust, receipt_date: "2026-06-30", amount: rcAmt, payment_system_key: "CASH" });
      setOk(`Receipt ${r.receipt_no} (unapplied ${r.unapplied_amount})`); setRcAmt(""); await load();
    } catch (e) { setError((e as Error).message); }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Accounts Receivable</h1>
        {tie && <span className={tie.matches ? "text-green-700 text-sm" : "text-red-700 text-sm"}>
          Control {tie.gl_ar_balance} vs subledger {tie.subledger_balance} {tie.matches ? "✓" : "✗"}</span>}
      </div>
      {error && <div className="text-red-600">{error}</div>}

      {aging && (
        <div className="text-sm border rounded-xl p-4">
          <span className="font-medium">Aging: </span>
          0–30 {aging.totals["0_30"]} · 31–60 {aging.totals["31_60"]} · 61–90 {aging.totals["61_90"]} · 90+ {aging.totals["90_plus"]} · <b>total {aging.grand_total}</b>
        </div>
      )}

      <table className="w-full text-sm border">
        <thead className="bg-gray-50"><tr><th className="p-2 text-left">Customer</th><th className="p-2 text-left">Currency</th><th className="p-2 text-right">Credit limit</th><th className="p-2 text-right">Open balance</th></tr></thead>
        <tbody>
          {customers.map((c) => (
            <tr key={c.id} className="border-t"><td className="p-2">{c.name}</td><td className="p-2">{c.currency}</td>
              <td className="p-2 text-right">{c.credit_limit ?? "—"}</td><td className="p-2 text-right">{c.open_balance}</td></tr>
          ))}
        </tbody>
      </table>

      <div className="border rounded-xl p-4 space-y-2">
        <div className="font-medium">New customer</div>
        <div className="flex gap-2 flex-wrap">
          <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="border rounded px-3 py-2" />
          <input placeholder="Credit limit (blank = unlimited)" value={limit} onChange={(e) => setLimit(e.target.value)} className="border rounded px-3 py-2 w-56" />
          <button onClick={create} disabled={!name} className="px-4 py-2 rounded bg-amber-600 text-white disabled:opacity-40">Create</button>
        </div>
      </div>

      <div className="border rounded-xl p-4 space-y-2">
        <div className="font-medium">Record receipt</div>
        <div className="flex gap-2 items-center">
          <select value={rcCust} onChange={(e) => setRcCust(e.target.value)} className="border rounded px-3 py-2">
            <option value="">Customer…</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input placeholder="Amount" value={rcAmt} onChange={(e) => setRcAmt(e.target.value)} className="border rounded px-3 py-2 w-32 text-right" />
          <button onClick={receipt} disabled={!rcCust || !rcAmt} className="px-4 py-2 rounded bg-amber-600 text-white disabled:opacity-40">Record</button>
        </div>
        {ok && <div className="text-green-700">{ok}</div>}
      </div>
    </div>
  );
}

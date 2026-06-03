"use client";

import { useEffect, useState } from "react";
import { bank, BankAccountT } from "@/lib/accounting";

export default function BankPage() {
  const [accounts, setAccounts] = useState<BankAccountT[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [ccy, setCcy] = useState("USD");
  const [type, setType] = useState("BANK");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [destAmount, setDestAmount] = useState("");
  const [tDate, setTDate] = useState("2026-06-05");
  const [ok, setOk] = useState<string | null>(null);

  async function load() {
    try { setAccounts((await bank.cashPosition()).accounts); }
    catch (e) { setError((e as Error).message); }
  }
  useEffect(() => { load(); }, []);

  async function adopt() { await bank.adoptSeeded(); await load(); }
  async function create() {
    setError(null);
    try { await bank.createAccount({ name, account_type: type, currency: ccy }); setName(""); await load(); }
    catch (e) { setError((e as Error).message); }
  }
  async function doTransfer() {
    setError(null); setOk(null);
    try {
      const r = await bank.transfer({ from_account_id: from, to_account_id: to, amount,
        dest_amount: destAmount || undefined, memo: "transfer", entry_date: tDate });
      setOk(`Posted ${r.entry_no}`); await load();
    } catch (e) { setError((e as Error).message); }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Cash &amp; Bank</h1>
        {accounts.length === 0 && <button onClick={adopt} className="px-4 py-2 rounded bg-amber-600 text-white">Adopt seeded accounts</button>}
      </div>
      {error && <div className="text-red-600">{error}</div>}

      <table className="w-full text-sm border">
        <thead className="bg-gray-50"><tr>
          <th className="p-2 text-left">Account</th><th className="p-2 text-left">Type</th>
          <th className="p-2 text-left">Ccy</th><th className="p-2 text-right">Balance</th>
          <th className="p-2 text-right">USD base</th><th className="p-2 text-left">Last reconciled</th>
        </tr></thead>
        <tbody>
          {accounts.map((a) => (
            <tr key={a.id} className="border-t">
              <td className="p-2">{a.name}</td><td className="p-2">{a.account_type}</td>
              <td className="p-2">{a.currency}</td><td className="p-2 text-right">{a.balance_money}</td>
              <td className="p-2 text-right">{a.balance_base}</td>
              <td className="p-2">{a.last_reconciled_at ? a.last_reconciled_at.slice(0, 10) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border rounded-xl p-4 space-y-2">
        <div className="font-medium">New account</div>
        <div className="flex gap-2 flex-wrap">
          <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="border rounded px-3 py-2" />
          <select value={type} onChange={(e) => setType(e.target.value)} className="border rounded px-3 py-2">
            <option>BANK</option><option>CASH</option><option>PETTY_CASH</option>
          </select>
          <select value={ccy} onChange={(e) => setCcy(e.target.value)} className="border rounded px-3 py-2">
            <option>USD</option><option>LBP</option>
          </select>
          <button onClick={create} disabled={!name} className="px-4 py-2 rounded bg-amber-600 text-white disabled:opacity-40">Create</button>
        </div>
      </div>

      <div className="border rounded-xl p-4 space-y-2">
        <div className="font-medium">Transfer</div>
        <div className="flex flex-wrap gap-2 items-center">
          <select value={from} onChange={(e) => setFrom(e.target.value)} className="border rounded px-3 py-2">
            <option value="">From…</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>)}
          </select>
          <select value={to} onChange={(e) => setTo(e.target.value)} className="border rounded px-3 py-2">
            <option value="">To…</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>)}
          </select>
          <input placeholder="Amount (from ccy)" value={amount} onChange={(e) => setAmount(e.target.value)} className="border rounded px-3 py-2 w-40 text-right" />
          <input placeholder="Dest amount (cross-ccy)" value={destAmount} onChange={(e) => setDestAmount(e.target.value)} className="border rounded px-3 py-2 w-48 text-right" />
          <input type="date" value={tDate} onChange={(e) => setTDate(e.target.value)} className="border rounded px-3 py-2" />
          <button onClick={doTransfer} disabled={!from || !to || !amount} className="px-4 py-2 rounded bg-amber-600 text-white disabled:opacity-40">Transfer</button>
        </div>
        {ok && <div className="text-green-700">{ok}</div>}
      </div>
    </div>
  );
}

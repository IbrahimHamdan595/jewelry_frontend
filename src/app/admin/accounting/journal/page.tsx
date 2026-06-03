"use client";

import { useEffect, useMemo, useState } from "react";
import { accounting, GLAccount, JournalEntry } from "@/lib/accounting";

type Row = {
  account_id: string; base_debit: string; base_credit: string;
  metal_debit_grams: string; metal_credit_grams: string; karat: string;
};

const EMPTY: Row = { account_id: "", base_debit: "", base_credit: "", metal_debit_grams: "", metal_credit_grams: "", karat: "" };
const KARATS = ["", "K18", "K21", "K22", "K24"];

export default function Journal() {
  const [accounts, setAccounts] = useState<GLAccount[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [rows, setRows] = useState<Row[]>([{ ...EMPTY }, { ...EMPTY }]);
  const [entryDate, setEntryDate] = useState("");
  const [memo, setMemo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function load() {
    const [a, e] = await Promise.all([accounting.listAccounts(), accounting.listEntries()]);
    setAccounts(a.items);
    setEntries(e.items);
  }
  useEffect(() => { load(); }, []);

  const num = (s: string) => (s.trim() === "" ? 0 : Number(s));
  const moneyDebit = useMemo(() => rows.reduce((t, r) => t + num(r.base_debit), 0), [rows]);
  const moneyCredit = useMemo(() => rows.reduce((t, r) => t + num(r.base_credit), 0), [rows]);
  const moneyBalanced = Math.abs(moneyDebit - moneyCredit) < 0.005;

  const metalByKarat = useMemo(() => {
    const m: Record<string, { d: number; c: number }> = {};
    rows.forEach((r) => {
      if (!r.karat) return;
      const d = num(r.metal_debit_grams), c = num(r.metal_credit_grams);
      if (d || c) { m[r.karat] = m[r.karat] || { d: 0, c: 0 }; m[r.karat].d += d; m[r.karat].c += c; }
    });
    return m;
  }, [rows]);
  const metalBalanced = Object.values(metalByKarat).every((v) => Math.abs(v.d - v.c) < 0.0005);

  function setRow(i: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function submit() {
    setError(null); setOk(null);
    try {
      const lines = rows
        .filter((r) => r.account_id)
        .map((r) => ({
          account_id: r.account_id,
          base_debit: r.base_debit || "0", base_credit: r.base_credit || "0",
          money_debit: r.base_debit || "0", money_credit: r.base_credit || "0",
          metal_debit_grams: r.metal_debit_grams || "0", metal_credit_grams: r.metal_credit_grams || "0",
          karat: r.karat || null,
        }));
      const e = await accounting.postEntry({ entry_date: entryDate, memo, source_type: "MANUAL", lines });
      setOk(`Posted ${e.entry_no}`);
      setRows([{ ...EMPTY }, { ...EMPTY }]); setMemo("");
      await load();
    } catch (e) { setError((e as Error).message); }
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Journal Entry</h1>

      <div className="flex gap-4">
        <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className="border rounded px-3 py-2" />
        <input placeholder="Memo" value={memo} onChange={(e) => setMemo(e.target.value)} className="border rounded px-3 py-2 flex-1" />
      </div>

      <table className="w-full text-sm border">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-2 text-left">Account</th><th className="p-2">Debit (USD)</th><th className="p-2">Credit (USD)</th>
            <th className="p-2">Karat</th><th className="p-2">Grams DR</th><th className="p-2">Grams CR</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t">
              <td className="p-1">
                <select value={r.account_id} onChange={(e) => setRow(i, { account_id: e.target.value })} className="border rounded px-2 py-1 w-full">
                  <option value="">—</option>
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
                </select>
              </td>
              <td className="p-1"><input value={r.base_debit} onChange={(e) => setRow(i, { base_debit: e.target.value })} className="border rounded px-2 py-1 w-28 text-right" /></td>
              <td className="p-1"><input value={r.base_credit} onChange={(e) => setRow(i, { base_credit: e.target.value })} className="border rounded px-2 py-1 w-28 text-right" /></td>
              <td className="p-1">
                <select value={r.karat} onChange={(e) => setRow(i, { karat: e.target.value })} className="border rounded px-2 py-1">
                  {KARATS.map((k) => <option key={k} value={k}>{k || "—"}</option>)}
                </select>
              </td>
              <td className="p-1"><input value={r.metal_debit_grams} onChange={(e) => setRow(i, { metal_debit_grams: e.target.value })} className="border rounded px-2 py-1 w-24 text-right" /></td>
              <td className="p-1"><input value={r.metal_credit_grams} onChange={(e) => setRow(i, { metal_credit_grams: e.target.value })} className="border rounded px-2 py-1 w-24 text-right" /></td>
            </tr>
          ))}
        </tbody>
      </table>

      <button onClick={() => setRows((rs) => [...rs, { ...EMPTY }])} className="text-sm text-amber-700">+ Add line</button>

      <div className="flex items-center gap-6 text-sm">
        <span className={moneyBalanced ? "text-green-700" : "text-red-700"}>
          Money: DR {moneyDebit.toFixed(2)} / CR {moneyCredit.toFixed(2)} {moneyBalanced ? "✓" : "✗"}
        </span>
        <span className={metalBalanced ? "text-green-700" : "text-red-700"}>
          Metal: {Object.entries(metalByKarat).map(([k, v]) => `${k} ${v.d}/${v.c}`).join("  ") || "—"} {metalBalanced ? "✓" : "✗"}
        </span>
      </div>

      {error && <div className="text-red-600">{error}</div>}
      {ok && <div className="text-green-700">{ok}</div>}

      <button onClick={submit} disabled={!moneyBalanced || !metalBalanced || !entryDate} className="px-5 py-2 rounded bg-amber-600 text-white disabled:opacity-40">
        Post entry
      </button>

      <h2 className="text-xl font-semibold pt-4">Recent entries</h2>
      <table className="w-full text-sm border">
        <thead className="bg-gray-50"><tr><th className="p-2 text-left">Entry no</th><th className="p-2 text-left">Date</th><th className="p-2 text-left">Memo</th><th className="p-2 text-left">Source</th></tr></thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id} className="border-t">
              <td className="p-2 font-mono">{e.entry_no}</td><td className="p-2">{e.entry_date}</td>
              <td className="p-2">{e.memo}</td><td className="p-2">{e.source_type}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

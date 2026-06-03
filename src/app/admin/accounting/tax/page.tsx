"use client";

import { useEffect, useState } from "react";
import { tax, TaxCodeT } from "@/lib/accounting";

export default function Tax() {
  const [codes, setCodes] = useState<TaxCodeT[]>([]);
  const [ret, setRet] = useState<Awaited<ReturnType<typeof tax.vatReturn>> | null>(null);
  const [year, setYear] = useState(2026);
  const [quarter, setQuarter] = useState(2);
  const [error, setError] = useState<string | null>(null);

  async function loadCodes() {
    try { setCodes((await tax.listCodes()).items); } catch (e) { setError((e as Error).message); }
  }
  useEffect(() => { loadCodes(); }, []);

  async function seed() { await tax.seedCodes(); await loadCodes(); }
  async function runReturn() {
    setError(null);
    try { setRet(await tax.vatReturn(year, quarter)); } catch (e) { setError((e as Error).message); }
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Tax / VAT</h1>
      {error && <div className="text-red-600">{error}</div>}

      <div className="border rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="font-medium">Tax codes</div>
          {codes.length === 0 && <button onClick={seed} className="px-3 py-1.5 rounded bg-amber-600 text-white text-sm">Seed standard codes</button>}
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50"><tr><th className="p-2 text-left">Code</th><th className="p-2 text-left">Name</th><th className="p-2 text-right">Rate %</th></tr></thead>
          <tbody>{codes.map((c) => <tr key={c.id} className="border-t"><td className="p-2 font-mono">{c.code}</td><td className="p-2">{c.name}</td><td className="p-2 text-right">{c.rate}</td></tr>)}</tbody>
        </table>
      </div>

      <div className="border rounded-xl p-4 space-y-3">
        <div className="flex gap-2 items-center">
          <div className="font-medium">VAT return</div>
          <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="border rounded px-3 py-2 w-28" />
          <select value={quarter} onChange={(e) => setQuarter(Number(e.target.value))} className="border rounded px-3 py-2">
            <option value={1}>Q1</option><option value={2}>Q2</option><option value={3}>Q3</option><option value={4}>Q4</option>
          </select>
          <button onClick={runReturn} className="px-4 py-2 rounded bg-amber-600 text-white">Run</button>
        </div>
        {ret && (
          <div className="text-sm space-y-1">
            <div>Output VAT (sales): <b>{ret.output_vat}</b></div>
            <div>Input VAT (purchases): <b>{ret.input_vat}</b></div>
            <div>Net <b>{ret.direction}</b>: <b>{ret.net_payable}</b></div>
            {ret.cash_split && (
              <div className="text-amber-800 bg-amber-50 rounded p-2">
                Pay {ret.cash_split.cash_75} in cash (75%) + {ret.cash_split.transfer_25} by transfer (25%) to BdL acct {ret.cash_split.bdl_account}.
                <div className="text-xs mt-1">{ret.cash_split.note}</div>
              </div>
            )}
            <table className="w-full mt-2"><thead className="bg-gray-50"><tr><th className="p-1 text-left">Entry</th><th className="p-1 text-left">Date</th><th className="p-1 text-left">Kind</th><th className="p-1 text-right">VAT</th></tr></thead>
              <tbody>{ret.transactions.map((t, i) => <tr key={i} className="border-t"><td className="p-1 font-mono">{t.entry_no}</td><td className="p-1">{t.date}</td><td className="p-1">{t.kind}</td><td className="p-1 text-right">{t.vat}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

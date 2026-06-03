"use client";

import { useState } from "react";
import { accounting, TrialBalance } from "@/lib/accounting";

export default function TrialBalancePage() {
  const [asOf, setAsOf] = useState("2026-06-30");
  const [tb, setTb] = useState<TrialBalance | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try { setTb(await accounting.trialBalance(asOf)); }
    catch (e) { setError((e as Error).message); }
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Trial Balance</h1>
      <div className="flex gap-3 items-center">
        <input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className="border rounded px-3 py-2" />
        <button onClick={load} className="px-4 py-2 rounded bg-amber-600 text-white">Run</button>
        {tb && (
          <span className={tb.balanced && tb.metal_balanced ? "text-green-700" : "text-red-700"}>
            {tb.balanced ? "Money balanced ✓" : "Money OUT OF BALANCE ✗"} · {tb.metal_balanced ? "Metal balanced ✓" : "Metal OUT ✗"}
          </span>
        )}
      </div>
      {error && <div className="text-red-600">{error}</div>}
      {tb && (
        <>
          <table className="w-full text-sm border">
            <thead className="bg-gray-50"><tr>
              <th className="p-2 text-left">Code</th><th className="p-2 text-left">Account</th>
              <th className="p-2 text-right">Debit (USD)</th><th className="p-2 text-right">Credit (USD)</th>
              <th className="p-2 text-left">Metal (g/karat)</th>
            </tr></thead>
            <tbody>
              {tb.accounts.map((a) => (
                <tr key={a.account_id} className="border-t">
                  <td className="p-2 font-mono">{a.code}</td><td className="p-2">{a.name}</td>
                  <td className="p-2 text-right">{a.base_debit}</td><td className="p-2 text-right">{a.base_credit}</td>
                  <td className="p-2">{Object.entries(a.metal_by_karat).map(([k, v]) => `${k}: ${v.net_grams}`).join(", ")}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 font-semibold">
              <tr><td className="p-2" colSpan={2}>Total</td>
                <td className="p-2 text-right">{tb.total_base_debit}</td>
                <td className="p-2 text-right">{tb.total_base_credit}</td><td /></tr>
            </tfoot>
          </table>
          <div className="text-sm">
            <span className="font-semibold">Metal position (grams per karat): </span>
            {Object.entries(tb.metal_by_karat).map(([k, v]) => `${k}: DR ${v.debit_grams} / CR ${v.credit_grams}`).join("   ") || "—"}
          </div>
        </>
      )}
    </div>
  );
}

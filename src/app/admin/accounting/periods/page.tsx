"use client";

import { useEffect, useState } from "react";
import { accounting, Period } from "@/lib/accounting";

const MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function PeriodsPage() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(6);
  const [error, setError] = useState<string | null>(null);

  async function load() { setPeriods((await accounting.listPeriods()).items); }
  useEffect(() => { load(); }, []);

  async function open() {
    setError(null);
    try { await accounting.openPeriod(year, month); await load(); }
    catch (e) { setError((e as Error).message); }
  }
  async function toggle(p: Period) {
    if (p.status === "OPEN") await accounting.closePeriod(p.id);
    else await accounting.reopenPeriod(p.id);
    await load();
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Accounting Periods</h1>
      <div className="flex gap-3 items-center">
        <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="border rounded px-3 py-2 w-28" />
        <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="border rounded px-3 py-2">
          {MONTHS.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
        </select>
        <button onClick={open} className="px-4 py-2 rounded bg-amber-600 text-white">Open period</button>
      </div>
      {error && <div className="text-red-600">{error}</div>}
      <table className="w-full text-sm border">
        <thead className="bg-gray-50"><tr><th className="p-2 text-left">Year</th><th className="p-2 text-left">Month</th><th className="p-2 text-left">Status</th><th className="p-2" /></tr></thead>
        <tbody>
          {periods.map((p) => (
            <tr key={p.id} className="border-t">
              <td className="p-2">{p.year}</td><td className="p-2">{MONTHS[p.period_no]}</td>
              <td className="p-2">{p.status}</td>
              <td className="p-2"><button onClick={() => toggle(p)} className="text-amber-700">{p.status === "OPEN" ? "Close" : "Reopen"}</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

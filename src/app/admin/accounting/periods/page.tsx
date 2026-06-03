"use client";

import { Fragment, useEffect, useState } from "react";
import { accounting, periodClose, Period, ReadinessT, YearPreviewT } from "@/lib/accounting";

const MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function PeriodsPage() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(6);
  const [error, setError] = useState<string | null>(null);

  // Per-period close readiness (keyed by period id)
  const [checking, setChecking] = useState<Record<string, ReadinessT>>({});

  // Year-end close
  const [yr, setYr] = useState(2026);
  const [preview, setPreview] = useState<YearPreviewT | null>(null);
  const [yearMsg, setYearMsg] = useState<string | null>(null);

  async function load() { setPeriods((await accounting.listPeriods()).items); }
  useEffect(() => { load(); }, []);

  async function open() {
    setError(null);
    try { await accounting.openPeriod(year, month); await load(); }
    catch (e) { setError((e as Error).message); }
  }

  async function check(p: Period) {
    setError(null);
    try {
      const r = await periodClose.readiness(p.year, p.period_no);
      setChecking((c) => ({ ...c, [p.id]: r }));
    } catch (e) { setError((e as Error).message); }
  }
  async function close(p: Period) {
    setError(null);
    try {
      await accounting.closePeriod(p.id);
      setChecking((c) => { const n = { ...c }; delete n[p.id]; return n; });
      await load();
    } catch (e) { setError((e as Error).message); }
  }
  async function reopen(p: Period) {
    setError(null);
    try { await accounting.reopenPeriod(p.id); await load(); }
    catch (e) { setError((e as Error).message); }
  }

  async function previewYear() {
    setYearMsg(null);
    try { setPreview(await periodClose.yearPreview(yr)); } catch (e) { setYearMsg((e as Error).message); }
  }
  async function doCloseYear() {
    setYearMsg(null);
    try {
      const r = await periodClose.closeYear(yr);
      setYearMsg(`Year ${yr} closed — entry ${r.entry_no}. Opened ${r.opened_periods.length} periods for ${yr + 1}.`);
      setPreview(null);
      await load();
    } catch (e) { setYearMsg((e as Error).message); }
  }

  return (
    <div className="p-6 space-y-6">
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
          {periods.map((p) => {
            const r = checking[p.id];
            return (
              <Fragment key={p.id}>
                <tr className="border-t">
                  <td className="p-2">{p.year}</td><td className="p-2">{MONTHS[p.period_no]}</td>
                  <td className="p-2">{p.status}</td>
                  <td className="p-2 text-right">
                    {p.status === "OPEN"
                      ? <button onClick={() => check(p)} className="text-amber-700">Check &amp; Close</button>
                      : <button onClick={() => reopen(p)} className="text-amber-700">Reopen</button>}
                  </td>
                </tr>
                {r && p.status === "OPEN" && (
                  <tr className="border-t bg-gray-50/50">
                    <td colSpan={4} className="p-3">
                      <div className="space-y-1">
                        {r.hard.map((h) => (
                          <div key={h.key} className={h.ok ? "text-green-700" : "text-red-700"}>
                            {h.ok ? "✓" : "✗"} {h.detail}
                          </div>
                        ))}
                        {r.soft.map((s) => (
                          <div key={s.key} className={s.count > 0 ? "text-amber-700" : "text-gray-400"}>
                            {s.count > 0 ? "⚠" : "·"} {s.detail}
                          </div>
                        ))}
                        <button onClick={() => close(p)} disabled={!r.can_close}
                          className="mt-1 px-4 py-1.5 rounded bg-amber-600 text-white disabled:opacity-40">
                          {r.can_close ? "Close period" : "Blocked"}
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>

      <div className="border rounded-xl p-4 space-y-3">
        <div className="flex gap-2 items-center">
          <div className="font-medium">Year-End Close</div>
          <input type="number" value={yr} onChange={(e) => setYr(Number(e.target.value))} className="border rounded px-3 py-2 w-28" />
          <button onClick={previewYear} className="px-4 py-2 rounded border">Preview</button>
        </div>
        {preview && (
          <div className="text-sm space-y-2">
            <div>Net income: <b>{preview.net_income}</b>{preview.already_closed && <span className="text-amber-700"> · already closed</span>}</div>
            <table className="w-full"><thead className="bg-gray-50"><tr><th className="p-1 text-left">Account</th><th className="p-1 text-right">Debit</th><th className="p-1 text-right">Credit</th></tr></thead>
              <tbody>{preview.lines.map((l) => (
                <tr key={l.code + l.name} className="border-t"><td className="p-1">{l.name}</td><td className="p-1 text-right">{l.debit}</td><td className="p-1 text-right">{l.credit}</td></tr>
              ))}</tbody>
            </table>
            <button onClick={doCloseYear} disabled={preview.already_closed}
              className="px-4 py-2 rounded bg-amber-600 text-white disabled:opacity-40">Close Year {yr}</button>
          </div>
        )}
        {yearMsg && <div className="text-green-700 text-sm">{yearMsg}</div>}
      </div>
    </div>
  );
}

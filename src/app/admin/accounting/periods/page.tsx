"use client";

import { Fragment, useEffect, useState } from "react";
import { accounting, periodClose, Period, ReadinessT, YearPreviewT } from "@/lib/accounting";
import { useLang } from "@/context/LanguageContext";
import { PageHeader } from "@/components/accounting/PageHeader";
import { SectionCard } from "@/components/accounting/SectionCard";
import { ActionBar } from "@/components/accounting/ActionBar";
import { DataTable } from "@/components/accounting/DataTable";
import { TableSkeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const SELECT = "border border-gray-200 rounded px-3 py-2.5 text-sm bg-white focus:border-gold focus:outline-none";

export default function PeriodsPage() {
  const { t } = useLang();
  const a = t.accounting.periods;
  const c = t.accounting.common;

  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(6);
  const [error, setError] = useState<string | null>(null);

  // Per-period close readiness (keyed by period id)
  const [checking, setChecking] = useState<Record<string, ReadinessT>>({});

  // Year-end close
  const [yr, setYr] = useState(2026);
  const [preview, setPreview] = useState<YearPreviewT | null>(null);
  const [yearMsg, setYearMsg] = useState<string | null>(null);

  async function load() {
    try { setPeriods((await accounting.listPeriods()).items); }
    finally { setLoading(false); }
  }
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
      <PageHeader eyebrow={a.eyebrow} title={a.title} description={a.description} />
      {error && <div className="text-sm text-red-600">{error}</div>}

      <ActionBar>
        <Input
          type="number"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="w-28"
        />
        <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className={SELECT}>
          {MONTHS.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
        </select>
        <Button onClick={open}>{a.openPeriod}</Button>
      </ActionBar>

      <SectionCard title={a.title} flush>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: 540 }}>
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400 text-start">{a.colYear}</th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400 text-start">{a.colMonth}</th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400 text-start">{a.colStatus}</th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400 text-end" />
              </tr>
            </thead>
            <tbody>
              {loading ? <TableSkeleton cols={4} /> : periods.map((p) => {
                const r = checking[p.id];
                return (
                  <Fragment key={p.id}>
                    <tr className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-gray-700 text-start">{p.year}</td>
                      <td className="px-4 py-3 text-gray-700 text-start">{MONTHS[p.period_no]}</td>
                      <td className="px-4 py-3 text-gray-700 text-start">{p.status}</td>
                      <td className="px-4 py-3 text-end">
                        {p.status === "OPEN"
                          ? <Button variant="ghost" size="sm" onClick={() => check(p)}>{a.checkClose}</Button>
                          : <Button variant="ghost" size="sm" onClick={() => reopen(p)}>{a.reopen}</Button>}
                      </td>
                    </tr>
                    {r && p.status === "OPEN" && (
                      <tr className="border-b border-gray-50 bg-gray-50/50">
                        <td colSpan={4} className="px-4 py-3">
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
                            <Button onClick={() => close(p)} disabled={!r.can_close} size="sm" className="mt-1">
                              {r.can_close ? a.closePeriod : a.blocked}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
              }
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title={a.yearEndClose}>
        <div className="flex flex-wrap gap-2 items-center">
          <Input
            type="number"
            value={yr}
            onChange={(e) => setYr(Number(e.target.value))}
            className="w-28"
          />
          <Button variant="outline" onClick={previewYear}>{a.preview}</Button>
        </div>
        {preview && (
          <div className="mt-4 space-y-3">
            <div className="text-sm">
              {a.netIncome}: <b>{preview.net_income}</b>
              {preview.already_closed && <span className="text-amber-700"> · {a.alreadyClosed}</span>}
            </div>
            <DataTable
              columns={[
                { key: "name", label: a.colAccount },
                { key: "debit", label: a.colDebit, align: "end", render: (l) => l.debit },
                { key: "credit", label: a.colCredit, align: "end", render: (l) => l.credit },
              ]}
              rows={preview.lines}
              rowKey={(l) => l.code + l.name}
              empty={c.noData}
            />
            <Button onClick={doCloseYear} disabled={preview.already_closed}>
              {a.closeYear} {yr}
            </Button>
          </div>
        )}
        {yearMsg && <div className="mt-3 text-sm text-green-700">{yearMsg}</div>}
      </SectionCard>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { accounting, GLAccount, JournalEntry } from "@/lib/accounting";
import { useLang } from "@/context/LanguageContext";
import { PageHeader } from "@/components/accounting/PageHeader";
import { SectionCard } from "@/components/accounting/SectionCard";
import { DataTable } from "@/components/accounting/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const SELECT = "border border-gray-200 rounded px-3 py-2.5 text-sm bg-white focus:border-gold focus:outline-none";

type Row = {
  account_id: string; base_debit: string; base_credit: string;
  metal_debit_grams: string; metal_credit_grams: string; karat: string;
};

const EMPTY: Row = { account_id: "", base_debit: "", base_credit: "", metal_debit_grams: "", metal_credit_grams: "", karat: "" };
const KARATS = ["", "K18", "K21", "K22", "K24"];

export default function Journal() {
  const { t } = useLang();
  const a = t.accounting.journal;
  const c = t.accounting.common;

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
      <PageHeader eyebrow={a.eyebrow} title={a.title} description={a.description} />

      <SectionCard title={a.title}>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className="w-48" />
            <Input placeholder={a.memoPlaceholder} value={memo} onChange={(e) => setMemo(e.target.value)} className="flex-1 min-w-[12rem]" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: 640 }}>
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400 text-start">{c.account}</th>
                  <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400 text-end">{a.colDebit}</th>
                  <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400 text-end">{a.colCredit}</th>
                  <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400 text-start">{a.colKarat}</th>
                  <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400 text-end">{a.colGramsDr}</th>
                  <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400 text-end">{a.colGramsCr}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="px-2 py-1.5">
                      <select value={r.account_id} onChange={(e) => setRow(i, { account_id: e.target.value })} className={`${SELECT} w-full`}>
                        <option value="">—</option>
                        {accounts.map((ac) => <option key={ac.id} value={ac.id}>{ac.code} {ac.name}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1.5"><Input value={r.base_debit} onChange={(e) => setRow(i, { base_debit: e.target.value })} className="w-28 text-end" /></td>
                    <td className="px-2 py-1.5"><Input value={r.base_credit} onChange={(e) => setRow(i, { base_credit: e.target.value })} className="w-28 text-end" /></td>
                    <td className="px-2 py-1.5">
                      <select value={r.karat} onChange={(e) => setRow(i, { karat: e.target.value })} className={SELECT}>
                        {KARATS.map((k) => <option key={k} value={k}>{k || "—"}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1.5"><Input value={r.metal_debit_grams} onChange={(e) => setRow(i, { metal_debit_grams: e.target.value })} className="w-24 text-end" /></td>
                    <td className="px-2 py-1.5"><Input value={r.metal_credit_grams} onChange={(e) => setRow(i, { metal_credit_grams: e.target.value })} className="w-24 text-end" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Button variant="ghost" size="sm" onClick={() => setRows((rs) => [...rs, { ...EMPTY }])}>+ {t.common.add}</Button>

          <div className="flex flex-wrap items-center gap-6 text-sm">
            <span className={moneyBalanced ? "text-green-700" : "text-red-700"}>
              {c.amount}: DR {moneyDebit.toFixed(2)} / CR {moneyCredit.toFixed(2)} {moneyBalanced ? "✓" : "✗"}
            </span>
            <span className={metalBalanced ? "text-green-700" : "text-red-700"}>
              {c.grams}: {Object.entries(metalByKarat).map(([k, v]) => `${k} ${v.d}/${v.c}`).join("  ") || "—"} {metalBalanced ? "✓" : "✗"}
            </span>
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}
          {ok && <div className="text-sm text-green-700">{ok}</div>}

          <Button onClick={submit} disabled={!moneyBalanced || !metalBalanced || !entryDate}>
            {c.post}
          </Button>
        </div>
      </SectionCard>

      <SectionCard title={a.recentEntries} flush>
        <DataTable
          columns={[
            { key: "entry_no", label: a.colEntryNo, render: (e: JournalEntry) => <span className="font-mono">{e.entry_no}</span> },
            { key: "entry_date", label: a.colDate },
            { key: "memo", label: a.colMemo },
            { key: "source_type", label: a.colSource },
          ]}
          rows={entries}
          rowKey={(e) => e.id}
          empty={a.empty}
        />
      </SectionCard>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { accounting, GLAccount, JournalEntry } from "@/lib/accounting";
import { apiFetcher } from "@/lib/api-client";
import { useLang } from "@/context/LanguageContext";
import { PageHeader } from "@/components/accounting/PageHeader";
import { SectionCard } from "@/components/accounting/SectionCard";
import { DataTable } from "@/components/accounting/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const SELECT = "border border-gray-200 rounded px-3 py-2.5 text-sm bg-white focus:border-gold focus:outline-none";

// A row is entered in its transaction currency (money_*). The USD base used for
// balancing is derived: base = money / fx_rate. fx_rate is LBP-per-USD, so a USD
// line always has rate 1 and base == money.
type Row = {
  account_id: string; currency: string; fx_rate: string;
  money_debit: string; money_credit: string;
  metal_debit_grams: string; metal_credit_grams: string; karat: string;
};

const EMPTY: Row = {
  account_id: "", currency: "USD", fx_rate: "1",
  money_debit: "", money_credit: "",
  metal_debit_grams: "", metal_credit_grams: "", karat: "",
};
const KARATS = ["", "K18", "K21", "K22", "K24"];
const CURRENCIES = ["USD", "LBP"];

export default function Journal() {
  const { t } = useLang();
  const a = t.accounting.journal;
  const c = t.accounting.common;

  const [accounts, setAccounts] = useState<GLAccount[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [lbpRate, setLbpRate] = useState("1");
  const [rows, setRows] = useState<Row[]>([{ ...EMPTY }, { ...EMPTY }]);
  const [entryDate, setEntryDate] = useState("");
  const [memo, setMemo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function load() {
    try {
      const [acc, e] = await Promise.all([accounting.listAccounts(), accounting.listEntries()]);
      setAccounts(acc.items);
      setEntries(e.items);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  // Live LBP exchange rate (LBP per USD), used as the editable default for new
  // LBP lines. Back-dated entries can override it per line.
  useEffect(() => {
    apiFetcher<{ lbp_exchange_rate: number | string | null }>("/settings")
      .then((s) => { if (s.lbp_exchange_rate) setLbpRate(String(s.lbp_exchange_rate)); })
      .catch(() => {});
  }, []);

  const num = (s: string) => (s.trim() === "" ? 0 : Number(s));
  const rate = (r: Row) => { const v = num(r.fx_rate); return v > 0 ? v : 1; };
  const baseDebit = (r: Row) => num(r.money_debit) / rate(r);
  const baseCredit = (r: Row) => num(r.money_credit) / rate(r);

  const totalDebit = useMemo(() => rows.reduce((t, r) => t + baseDebit(r), 0), [rows]);
  const totalCredit = useMemo(() => rows.reduce((t, r) => t + baseCredit(r), 0), [rows]);
  const moneyBalanced = Math.abs(totalDebit - totalCredit) < 0.005;

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

  // Switching currency resets the rate: USD locks to 1, LBP prefills the live
  // settings rate (still editable for back-dated entries).
  function setCurrency(i: number, currency: string) {
    setRow(i, { currency, fx_rate: currency === "USD" ? "1" : lbpRate });
  }

  async function submit() {
    setError(null); setOk(null);
    try {
      const lines = rows
        .filter((r) => r.account_id)
        .map((r) => {
          const fx = r.currency === "USD" ? "1" : (r.fx_rate || "1");
          return {
            account_id: r.account_id,
            currency: r.currency, fx_rate: fx,
            money_debit: r.money_debit || "0", money_credit: r.money_credit || "0",
            base_debit: baseDebit(r).toFixed(2), base_credit: baseCredit(r).toFixed(2),
            metal_debit_grams: r.metal_debit_grams || "0", metal_credit_grams: r.metal_credit_grams || "0",
            karat: r.karat || null,
          };
        });
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
            <table className="w-full text-sm" style={{ minWidth: 820 }}>
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400 text-start">{c.account}</th>
                  <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400 text-start">{c.currency}</th>
                  <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400 text-end">{c.fxRate}</th>
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
                    <td className="px-2 py-1.5">
                      <select value={r.currency} onChange={(e) => setCurrency(i, e.target.value)} className={SELECT}>
                        {CURRENCIES.map((cy) => <option key={cy} value={cy}>{cy}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1.5">
                      <Input value={r.fx_rate} onChange={(e) => setRow(i, { fx_rate: e.target.value })}
                             disabled={r.currency === "USD"} className="w-28 text-end disabled:bg-gray-50 disabled:text-gray-400" />
                    </td>
                    <td className="px-2 py-1.5"><Input value={r.money_debit} onChange={(e) => setRow(i, { money_debit: e.target.value })} className="w-28 text-end" /></td>
                    <td className="px-2 py-1.5"><Input value={r.money_credit} onChange={(e) => setRow(i, { money_credit: e.target.value })} className="w-28 text-end" /></td>
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
              {c.balance} (USD): DR {totalDebit.toFixed(2)} / CR {totalCredit.toFixed(2)} {moneyBalanced ? "✓" : "✗"}
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
          loading={loading}
        />
      </SectionCard>
    </div>
  );
}

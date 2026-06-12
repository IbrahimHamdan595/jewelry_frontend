"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { accounting, GLAccount, GLDrilldown, GLDrilldownRow } from "@/lib/accounting";
import { downloadFile } from "@/lib/api-client";
import { firstOfMonth, today } from "@/lib/utils";
import { useLang } from "@/context/LanguageContext";
import { PageHeader } from "@/components/accounting/PageHeader";
import { SectionCard } from "@/components/accounting/SectionCard";
import { ActionBar } from "@/components/accounting/ActionBar";
import { DataTable } from "@/components/accounting/DataTable";
import { StatTile } from "@/components/accounting/StatTile";
import { Money } from "@/components/accounting/Money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const SELECT = "border border-gray-200 rounded px-3 py-2.5 text-sm bg-white focus:border-gold focus:outline-none";

export default function GeneralLedger() {
  const { t } = useLang();
  const a = t.accounting.generalLedger;
  const c = t.accounting.common;

  const [accounts, setAccounts] = useState<GLAccount[]>([]);
  const [accountId, setAccountId] = useState("");
  const [start, setStart] = useState(firstOfMonth());
  const [end, setEnd] = useState(today());
  const [gl, setGl] = useState<GLDrilldown | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    accounting.listAccounts()
      .then((r) => { setAccounts(r.items); if (r.items.length && !accountId) setAccountId(r.items[0].id); })
      .catch((e) => setError((e as Error).message));
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  // A DUAL/METAL account carries grams; show the grams columns only then.
  const showGrams = useMemo(
    () => (gl?.rows ?? []).some((r) => r.metal_debit_grams !== "0.000" || r.metal_credit_grams !== "0.000"),
    [gl],
  );

  async function run() {
    setError(null);
    if (!accountId) return;
    setRunning(true);
    try { setGl(await accounting.generalLedger(accountId, start, end)); }
    catch (e) { setError((e as Error).message); }
    finally { setRunning(false); }
  }

  async function dl() {
    setError(null);
    if (!accountId) return;
    try {
      await downloadFile(
        `/accounting/general-ledger?account_id=${accountId}&start=${start}&end=${end}&format=xlsx`,
        `general-ledger-${gl?.code ?? accountId}-${start}-${end}.xlsx`);
    } catch (e) { setError((e as Error).message); }
  }

  const columns = [
    { key: "date", label: a.colDate, render: (r: GLDrilldownRow) => r.date },
    {
      key: "entry_no", label: a.colEntry,
      render: (r: GLDrilldownRow) => (
        <Link href={`/admin/accounting/journal?entry=${r.entry_id}`} className="font-mono text-gold hover:underline">
          {r.entry_no}
        </Link>
      ),
    },
    { key: "memo", label: a.colMemo, render: (r: GLDrilldownRow) => <span className="text-gray-600">{r.memo || "—"}</span> },
    { key: "debit", label: a.colDebit, align: "end" as const, render: (r: GLDrilldownRow) => <Money value={r.debit} dash /> },
    { key: "credit", label: a.colCredit, align: "end" as const, render: (r: GLDrilldownRow) => <Money value={r.credit} dash /> },
    { key: "running_balance", label: a.colRunning, align: "end" as const, render: (r: GLDrilldownRow) => <Money value={r.running_balance} /> },
    ...(showGrams ? [
      { key: "metal_debit_grams", label: a.colGramsDr, align: "end" as const, render: (r: GLDrilldownRow) => <span className="tabular-nums">{r.metal_debit_grams}</span> },
      { key: "metal_credit_grams", label: a.colGramsCr, align: "end" as const, render: (r: GLDrilldownRow) => <span className="tabular-nums">{r.metal_credit_grams}</span> },
      { key: "running_grams", label: a.colRunningGrams, align: "end" as const, render: (r: GLDrilldownRow) => <span className="tabular-nums">{r.running_grams}</span> },
    ] : []),
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader eyebrow={a.eyebrow} title={a.title} description={a.description} />
      {error && <div className="text-sm text-red-600">{error}</div>}

      <ActionBar>
        <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={`${SELECT} min-w-[16rem]`}>
          <option value="">{a.account}…</option>
          {accounts.map((ac) => <option key={ac.id} value={ac.id}>{ac.code} {ac.name}</option>)}
        </select>
        <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="w-44" />
        <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="w-44" />
        <Button onClick={run} disabled={!accountId || running}>{c.run}</Button>
        <Button variant="outline" onClick={dl} disabled={!gl}>{c.downloadExcel}</Button>
      </ActionBar>

      {gl && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatTile label={a.opening} value={<Money value={gl.opening_balance} />} />
          <StatTile label={a.closing} value={<Money value={gl.closing_balance} />} />
          {showGrams && <StatTile label={`${a.opening} (${c.grams})`} value={<span className="tabular-nums">{gl.opening_grams}</span>} />}
          {showGrams && <StatTile label={`${a.closing} (${c.grams})`} value={<span className="tabular-nums">{gl.closing_grams}</span>} />}
        </div>
      )}

      <SectionCard
        title={gl ? `${gl.code} ${gl.name}` : a.title}
        flush
      >
        <DataTable
          columns={columns}
          rows={gl?.rows ?? []}
          rowKey={(r: GLDrilldownRow, i: number) => `${r.entry_id}-${i}`}
          empty={a.empty}
          minWidth={showGrams ? 900 : 640}
          loading={running}
        />
      </SectionCard>
    </div>
  );
}

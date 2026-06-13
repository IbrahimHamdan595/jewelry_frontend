"use client";

import { useState } from "react";
import { accounting, TrialBalance } from "@/lib/accounting";
import { downloadFile } from "@/lib/api-client";
import { today } from "@/lib/utils";
import { useLang } from "@/context/LanguageContext";
import { PageHeader } from "@/components/accounting/PageHeader";
import { SectionCard } from "@/components/accounting/SectionCard";
import { ActionBar } from "@/components/accounting/ActionBar";
import { DataTable } from "@/components/accounting/DataTable";
import { Money } from "@/components/accounting/Money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type TBAccount = TrialBalance["accounts"][number];

export default function TrialBalancePage() {
  const { t } = useLang();
  const a = t.accounting.trialBalance;
  const c = t.accounting.common;

  const [asOf, setAsOf] = useState(today());
  const [tb, setTb] = useState<TrialBalance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  async function load() {
    setError(null);
    setRunning(true);
    try { setTb(await accounting.trialBalance(asOf)); }
    catch (e) { setError((e as Error).message); }
    finally { setRunning(false); }
  }

  const balanced = tb ? tb.balanced && tb.metal_balanced : false;

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        eyebrow={a.eyebrow}
        title={a.title}
        description={a.description}
        actions={tb && (
          <span className={`text-xs font-semibold ${balanced ? "text-green-700" : "text-red-700"}`}>
            {balanced ? a.balanced : a.notBalanced}
          </span>
        )}
      />
      {error && <div className="text-sm text-red-600">{error}</div>}

      <ActionBar>
        <Input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className="w-44" />
        <Button onClick={load} disabled={running}>{c.run}</Button>
        {tb && (
          <Button variant="outline" onClick={() => downloadFile(
            `/accounting/trial-balance?as_of=${asOf}&format=xlsx`, `trial-balance-${asOf}.xlsx`)}>
            {c.downloadExcel}
          </Button>
        )}
      </ActionBar>

      <SectionCard flush>
        <DataTable
          columns={[
            { key: "code", label: a.colCode, render: (r: TBAccount) => <span className="font-mono">{r.code}</span> },
            { key: "name", label: a.colAccount },
            { key: "base_debit", label: a.colDebit, align: "end", render: (r: TBAccount) => <Money value={r.base_debit} dash /> },
            { key: "base_credit", label: a.colCredit, align: "end", render: (r: TBAccount) => <Money value={r.base_credit} dash /> },
            {
              key: "metal",
              label: a.colMetal,
              render: (r: TBAccount) =>
                Object.entries(r.metal_by_karat).map(([k, v]) => `${k}: ${v.net_grams}`).join(", ") || "—",
            },
          ]}
          rows={tb?.accounts ?? []}
          rowKey={(r) => r.account_id}
          empty={a.empty}
          loading={running}
        />
      </SectionCard>
    </div>
  );
}

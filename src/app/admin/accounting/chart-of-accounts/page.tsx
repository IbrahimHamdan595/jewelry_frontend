"use client";

import { useEffect, useState } from "react";
import { accounting, GLAccount } from "@/lib/accounting";
import { useLang } from "@/context/LanguageContext";
import { PageHeader } from "@/components/accounting/PageHeader";
import { SectionCard } from "@/components/accounting/SectionCard";
import { ActionBar } from "@/components/accounting/ActionBar";
import { DataTable } from "@/components/accounting/DataTable";
import { Button } from "@/components/ui/button";
import { ErrorNote, type Failure } from "@/components/accounting/ErrorNote";

/** An enum value's label in the UI language; a value with no label prints as the API sent it. */
const named = (labels: Record<string, string>, value: string) => labels[value] ?? value;

export default function ChartOfAccounts() {
  const { t } = useLang();
  const a = t.accounting.coa;
  const c = t.accounting.common;

  const [accounts, setAccounts] = useState<GLAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<Failure | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await accounting.listAccounts();
      setAccounts(r.items);
    } catch (e) { setFailure({ err: e, during: "load" }); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function seed() {
    setFailure(null);
    try {
      await accounting.seedCoa();
      await load();
    } catch (e) { setFailure({ err: e, during: "action" }); }
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader eyebrow={a.eyebrow} title={a.title} description={a.description} />
      <ErrorNote failure={failure} />

      {!loading && accounts.length === 0 && (
        <ActionBar>
          <Button onClick={seed}>{a.seedBtn}</Button>
        </ActionBar>
      )}

      <SectionCard title={a.title} flush>
        <DataTable
          columns={[
            { key: "code", label: a.colCode, render: (r: GLAccount) => <span className="font-mono">{r.code}</span> },
            { key: "name", label: a.colName },
            { key: "type", label: a.colType, render: (r: GLAccount) => named(a.types, r.type) },
            { key: "denomination", label: a.colDenom, render: (r: GLAccount) => named(a.denominations, r.denomination) },
            { key: "normal_balance", label: a.colNormal, render: (r: GLAccount) => named(a.normalBalances, r.normal_balance) },
            { key: "currency", label: a.colCurrency, render: (r: GLAccount) => r.currency ?? "—" },
            { key: "system_key", label: a.colSystemKey, render: (r: GLAccount) => <span className="font-mono text-xs">{r.system_key ?? ""}</span> },
            { key: "is_active", label: a.colActive, render: (r: GLAccount) => (r.is_active ? "✓" : "—") },
          ]}
          rows={accounts}
          rowKey={(r) => r.id}
          empty={a.empty}
          loading={loading}
        />
      </SectionCard>
    </div>
  );
}

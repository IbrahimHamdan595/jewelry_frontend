"use client";

import { useEffect, useState } from "react";
import { accounting, GLAccount } from "@/lib/accounting";
import { useLang } from "@/context/LanguageContext";
import { PageHeader } from "@/components/accounting/PageHeader";
import { SectionCard } from "@/components/accounting/SectionCard";
import { ActionBar } from "@/components/accounting/ActionBar";
import { DataTable } from "@/components/accounting/DataTable";
import { Button } from "@/components/ui/button";

export default function ChartOfAccounts() {
  const { t } = useLang();
  const a = t.accounting.coa;
  const c = t.accounting.common;

  const [accounts, setAccounts] = useState<GLAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await accounting.listAccounts();
      setAccounts(r.items);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function seed() {
    await accounting.seedCoa();
    await load();
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader eyebrow={a.eyebrow} title={a.title} description={a.description} />
      {error && <div className="text-sm text-red-600">{error}</div>}

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
            { key: "type", label: a.colType },
            { key: "denomination", label: a.colDenom },
            { key: "normal_balance", label: a.colNormal },
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

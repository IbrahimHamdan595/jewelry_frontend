"use client";

import { useEffect, useState } from "react";
import { accounting, GLAccount } from "@/lib/accounting";
import { useLang } from "@/context/LanguageContext";
import { PageHeader } from "@/components/accounting/PageHeader";
import { SectionCard } from "@/components/accounting/SectionCard";
import { ActionBar } from "@/components/accounting/ActionBar";
import { DataTable } from "@/components/accounting/DataTable";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/api-client";

/** An enum value's label in the UI language; a value with no label prints as the API sent it. */
const named = (labels: Record<string, string>, value: string) => labels[value] ?? value;

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
    } catch (e) { setError(errorMessage(e, "")); }
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
      {/* "" is a failed read that came back with no reason of its own. */}
      {error !== null && <div className="text-sm text-red-600">{error || t.errors.loadFailed}</div>}

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

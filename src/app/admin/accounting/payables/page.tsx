"use client";

import { useEffect, useState } from "react";
import { ap } from "@/lib/accounting";
import { today } from "@/lib/utils";
import { useLang } from "@/context/LanguageContext";
import { PageHeader } from "@/components/accounting/PageHeader";
import { SectionCard } from "@/components/accounting/SectionCard";
import { DataTable } from "@/components/accounting/DataTable";
import { CardSkeleton, TableSkeleton } from "@/components/ui/skeleton";
import { Money } from "@/components/accounting/Money";

type Supplier = Awaited<ReturnType<typeof ap.balances>>["suppliers"][number];

export default function Payables() {
  const { t } = useLang();
  const a = t.accounting.payables;
  const c = t.accounting.common;

  const [tie, setTie] = useState<Awaited<ReturnType<typeof ap.verify>> | null>(null);
  const [aging, setAging] = useState<Awaited<ReturnType<typeof ap.aging>> | null>(null);
  const [sups, setSups] = useState<Awaited<ReturnType<typeof ap.balances>>["suppliers"]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setTie(await ap.verify());
        setAging(await ap.aging(today()));
        setSups((await ap.balances()).suppliers);
      } catch (e) { setError((e as Error).message); }
      finally { setLoading(false); }
    })();
  }, []);

  const goldByKarat = (byKarat: Record<string, string>) =>
    Object.entries(byKarat).map(([k, g]) => `${k} · ${g}${c.grams}`).join("  ");

  const agingCells = aging ? [
    { label: a.agingCurrent, v: aging.cash_buckets["0_30"] },
    { label: a.aging3160, v: aging.cash_buckets["31_60"] },
    { label: a.aging6190, v: aging.cash_buckets["61_90"] },
    { label: a.aging90, v: aging.cash_buckets["90_plus"] },
    { label: c.total, v: aging.cash_total },
  ] : [];

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        eyebrow={a.eyebrow}
        title={a.title}
        description={a.description}
        actions={tie && (
          <span className={`text-xs ${tie.ap.matches && tie.metal_ap.matches ? "text-green-700" : "text-red-700"}`}>
            {tie.ap.matches ? "✓" : "✗"} {tie.ap.gl} / {tie.ap.subledger}
          </span>
        )}
      />
      {error && <div className="text-sm text-red-600">{error}</div>}

      {loading && !aging && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
          <div className="rounded-lg border border-gray-100 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                <TableSkeleton cols={3} />
              </tbody>
            </table>
          </div>
        </div>
      )}

      {aging && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {agingCells.map((cell, i) => (
            <div key={cell.label} className={`rounded-xl border p-4 ${i === 4 ? "border-gold/30 bg-gold/5" : "border-gray-100 bg-white"}`}>
              <div className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">{cell.label}</div>
              <div className="text-lg font-semibold text-gray-800"><Money value={cell.v} dash /></div>
            </div>
          ))}
        </div>
      )}

      {!loading && (
        <SectionCard title={a.title} flush>
          <DataTable
            columns={[
              { key: "name", label: a.colSupplier },
              { key: "cash_owed", label: a.colCashOwed, align: "end", render: (s: Supplier) => <Money value={s.cash_owed} dash /> },
              { key: "gold_owed", label: a.colGoldOwed, render: (s: Supplier) => goldByKarat(s.gold_owed_by_karat) || <span className="tabular-nums text-gray-300">—</span> },
            ]}
            rows={sups}
            rowKey={(s) => s.id}
            empty={a.empty}
            loading={loading}
          />
        </SectionCard>
      )}
    </div>
  );
}

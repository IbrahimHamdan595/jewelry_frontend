"use client";

import { useEffect, useState } from "react";
import { kpis } from "@/lib/accounting";
import { downloadFile, errorMessage } from "@/lib/api-client";
import { firstOfMonth, today } from "@/lib/utils";
import { useLang } from "@/context/LanguageContext";
import { CardSkeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/accounting/PageHeader";
import { ActionBar } from "@/components/accounting/ActionBar";
import { StatTile } from "@/components/accounting/StatTile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Kpis() {
  const { t } = useLang();
  const a = t.accounting.kpis;
  const c = t.accounting.common;
  const x = t.accounting.extra;

  const [start, setStart] = useState(firstOfMonth());
  const [end, setEnd] = useState(today());
  const [data, setData] = useState<Awaited<ReturnType<typeof kpis.compute>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setError(null);
    try { setData(await kpis.compute(start, end)); } catch (e) { setError(errorMessage(e, t.errors.loadFailed)); }
  }
  useEffect(() => { run(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const cards: { key: keyof NonNullable<typeof data>; label: string; suffix?: string }[] = [
    { key: "dsi", label: a.dsi, suffix: x.daysSuffix },
    { key: "inventory_turnover", label: a.turnover, suffix: "×" },
    { key: "dpo", label: a.dpo, suffix: x.daysSuffix },
    { key: "dso", label: a.dso, suffix: x.daysSuffix },
    { key: "ccc", label: a.ccc, suffix: x.daysSuffix },
    { key: "gross_margin", label: a.grossMargin, suffix: "%" },
    { key: "net_margin", label: a.netMargin, suffix: "%" },
    { key: "metal_turnover", label: a.metalTurnover, suffix: "×" },
    { key: "current_ratio", label: a.currentRatio, suffix: "×" },
    { key: "quick_ratio", label: a.quickRatio, suffix: "×" },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader eyebrow={a.eyebrow} title={a.title} description={a.description} />
      {error && <div className="text-sm text-red-600">{error}</div>}

      <ActionBar>
        <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} aria-label={c.from} className="w-40" />
        <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} aria-label={c.until} className="w-40" />
        <Button onClick={run}>{c.run}</Button>
        <Button
          variant="outline"
          onClick={() => downloadFile(`/accounting/statements/kpis?start=${start}&end=${end}&format=xlsx`, `kpis-${start}-${end}.xlsx`)}
        >
          {a.downloadExcel}
        </Button>
      </ActionBar>

      {!data && !error && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      )}

      {data && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {cards.map((card) => {
            const k = data[card.key] as { value: string | null };
            return (
              <StatTile
                key={card.key}
                label={card.label}
                value={
                  k.value === null
                    ? <span className="text-gray-400 text-base">{x.notAvailable}</span>
                    : <>{k.value}{card.suffix}</>
                }
              />
            );
          })}
        </div>
      )}

      {data && (
        <div className="text-xs text-gray-400">{x.kpiWindow(data.start, data.end, data.days)}</div>
      )}
    </div>
  );
}

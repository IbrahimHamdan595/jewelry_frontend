"use client";

import { useEffect, useState } from "react";
import { kpis } from "@/lib/accounting";
import { downloadFile } from "@/lib/api-client";

const CARDS: { key: string; label: string; suffix?: string }[] = [
  { key: "dsi", label: "Days Sales of Inventory", suffix: " d" },
  { key: "inventory_turnover", label: "Inventory Turnover", suffix: "×" },
  { key: "dpo", label: "Days Payable Outstanding", suffix: " d" },
  { key: "dso", label: "Days Sales Outstanding", suffix: " d" },
  { key: "ccc", label: "Cash Conversion Cycle", suffix: " d" },
  { key: "gross_margin", label: "Gross Margin", suffix: "%" },
  { key: "net_margin", label: "Net Margin", suffix: "%" },
  { key: "metal_turnover", label: "Metal Turnover (grams)", suffix: "×" },
  { key: "current_ratio", label: "Current Ratio", suffix: "×" },
  { key: "quick_ratio", label: "Quick Ratio", suffix: "×" },
];

export default function Kpis() {
  const [start, setStart] = useState("2026-06-01");
  const [end, setEnd] = useState("2026-06-30");
  const [data, setData] = useState<Awaited<ReturnType<typeof kpis.compute>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setError(null);
    try { setData(await kpis.compute(start, end)); } catch (e) { setError((e as Error).message); }
  }
  useEffect(() => { run(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Financial KPIs</h1>
      <div className="flex flex-wrap gap-2 items-center">
        <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="border rounded px-3 py-2" />
        <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="border rounded px-3 py-2" />
        <button onClick={run} className="px-4 py-2 rounded bg-amber-600 text-white">Run</button>
        <button onClick={() => downloadFile(`/accounting/statements/kpis?start=${start}&end=${end}&format=xlsx`, `kpis-${start}-${end}.xlsx`)}
          className="px-4 py-2 rounded border">Download Excel</button>
      </div>
      {error && <div className="text-red-600">{error}</div>}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {CARDS.map((c) => {
            const k = data[c.key as keyof typeof data] as { value: string | null };
            return (
              <div key={c.key} className="rounded-xl border p-4">
                <div className="text-sm text-gray-500">{c.label}</div>
                <div className="text-2xl font-semibold mt-1">
                  {k.value === null ? <span className="text-gray-400 text-base">n/a</span> : <>{k.value}{c.suffix}</>}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {data && <div className="text-xs text-gray-400">Window: {data.start} → {data.end} ({data.days} days)</div>}
    </div>
  );
}

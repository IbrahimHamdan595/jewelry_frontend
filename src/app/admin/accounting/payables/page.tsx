"use client";

import { useEffect, useState } from "react";
import { ap } from "@/lib/accounting";

export default function Payables() {
  const [tie, setTie] = useState<Awaited<ReturnType<typeof ap.verify>> | null>(null);
  const [aging, setAging] = useState<Awaited<ReturnType<typeof ap.aging>> | null>(null);
  const [sups, setSups] = useState<Awaited<ReturnType<typeof ap.balances>>["suppliers"]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setTie(await ap.verify());
        setAging(await ap.aging("2026-06-30"));
        setSups((await ap.balances()).suppliers);
      } catch (e) { setError((e as Error).message); }
    })();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Accounts Payable</h1>
        {tie && <span className={tie.ap.matches && tie.metal_ap.matches ? "text-green-700 text-sm" : "text-red-700 text-sm"}>
          AP {tie.ap.gl} (sub {tie.ap.subledger}) {tie.ap.matches ? "✓" : "✗"} · Metal {tie.metal_ap.matches ? "✓" : "✗"}</span>}
      </div>
      {error && <div className="text-red-600">{error}</div>}

      {aging && (
        <div className="text-sm border rounded-xl p-4">
          <span className="font-medium">Cash aging: </span>
          0–30 {aging.cash_buckets["0_30"]} · 31–60 {aging.cash_buckets["31_60"]} · 61–90 {aging.cash_buckets["61_90"]} · 90+ {aging.cash_buckets["90_plus"]} · <b>total {aging.cash_total}</b>
          <div className="mt-1"><span className="font-medium">Gold owed: </span>
            {Object.entries(aging.metal_owed_by_karat).map(([k, g]) => `${k}: ${g}g`).join(" · ") || "—"}</div>
        </div>
      )}

      <table className="w-full text-sm border">
        <thead className="bg-gray-50"><tr><th className="p-2 text-left">Supplier</th><th className="p-2 text-right">Cash owed</th><th className="p-2 text-left">Gold owed</th></tr></thead>
        <tbody>
          {sups.map((s) => (
            <tr key={s.id} className="border-t"><td className="p-2">{s.name}</td><td className="p-2 text-right">{s.cash_owed}</td>
              <td className="p-2">{Object.entries(s.gold_owed_by_karat).map(([k, g]) => `${k}: ${g}g`).join(", ") || "—"}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

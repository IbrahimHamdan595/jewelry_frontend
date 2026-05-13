"use client";
import { useState } from "react";
import useSWR from "swr";
import { apiFetcher, api } from "@/lib/api-client";
import { useGoldRate } from "@/hooks/useGoldRate";
import { formatDateTime } from "@/lib/utils";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { TradingViewChart } from "@/components/admin/TradingViewChart";
import type { GoldRateHistoryPoint } from "@/types/api";

type Range = "24h" | "7d" | "30d";

export default function GoldPricePage() {
  const { rate, refresh } = useGoldRate();
  const [range, setRange] = useState<Range>("24h");
  const [overrideInput, setOverrideInput] = useState("");

  const { data: history } = useSWR<GoldRateHistoryPoint[]>(`/gold-price/history?range=${range}`, apiFetcher, { refreshInterval: 60000 });

  async function handleSetOverride() {
    if (!overrideInput) return;
    await api.post("/gold-price/override", { rate_24k: parseFloat(overrideInput) });
    refresh();
    setOverrideInput("");
  }

  async function handleClearOverride() {
    await api.delete("/gold-price/override");
    refresh();
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Hero card */}
      <div className="bg-admin-sidebar rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-white/40 text-xs uppercase tracking-widest mb-2">24K Gold — USD/gram</div>
            <div className="font-serif text-kpi text-gold leading-none">{rate ? `$${rate.rate_24k.toFixed(2)}` : "—"}</div>
            {rate && (
              <div className="flex items-center gap-2 mt-2">
                <span className={`w-2 h-2 rounded-full ${rate.is_stale ? "bg-yellow-400" : "bg-green-400"}`} />
                <span className="text-white/40 text-xs uppercase tracking-widest">{rate.is_stale ? "STALE" : "LIVE"}</span>
                <span className="text-white/20 text-xs">{formatDateTime(rate.fetched_at)}</span>
                <span className="text-white/20 text-xs capitalize">{rate.source}</span>
              </div>
            )}
          </div>
          <div className="text-right space-y-3">
            <div>
              <div className="text-white/40 text-xs uppercase tracking-widest">21K</div>
              <div className="text-white text-xl font-semibold">{rate ? `$${rate.rate_21k.toFixed(2)}` : "—"}</div>
            </div>
            <div>
              <div className="text-white/40 text-xs uppercase tracking-widest">18K</div>
              <div className="text-white text-xl font-semibold">{rate ? `$${rate.rate_18k.toFixed(2)}` : "—"}</div>
            </div>
          </div>
        </div>
      </div>

      {/* TradingView real-time chart */}
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5">
        <div className="text-sm font-semibold text-gray-700 mb-4">XAU/USD — Live Chart (TradingView)</div>
        <TradingViewChart />
      </div>

      {/* Internal rate history */}
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-semibold text-gray-700">Polled Rate History</div>
          <div className="flex gap-1">
            {(["24h", "7d", "30d"] as Range[]).map((r) => (
              <button key={r} onClick={() => setRange(r)} className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${range === r ? "bg-gold text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {r.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={history ?? []}>
            <defs>
              <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#C9A84C" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#C9A84C" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="fetched_at" tick={{ fontSize: 10 }} tickFormatter={(v) => new Date(v).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} />
            <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v.toFixed(0)}`} />
            <Tooltip formatter={(v) => [`$${Number(v).toFixed(2)}`, "24K rate"]} labelFormatter={(v) => new Date(v).toLocaleString()} />
            <Area type="monotone" dataKey="rate_24k" stroke="#C9A84C" strokeWidth={2} fill="url(#goldGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Override */}
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5 space-y-4">
        <div className="text-sm font-semibold text-gray-700">Manual Override</div>
        {rate?.source === "override" ? (
          <div className="flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded p-3">
            <span className="text-sm text-yellow-800">Override active: <strong>${rate.rate_24k.toFixed(2)}/g</strong></span>
            <button onClick={handleClearOverride} className="text-xs text-red-600 underline hover:no-underline">Clear</button>
          </div>
        ) : (
          <div className="text-xs text-gray-400">No override active — using live feed</div>
        )}
        <div className="flex gap-3">
          <input
            type="number"
            step="0.01"
            value={overrideInput}
            onChange={(e) => setOverrideInput(e.target.value)}
            placeholder="Enter rate USD/g…"
            className="flex-1 border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-gold"
          />
          <button onClick={handleSetOverride} className="px-4 py-2 bg-gold text-white text-sm rounded hover:bg-gold-dark transition-colors">Set Override</button>
        </div>
      </div>
    </div>
  );
}

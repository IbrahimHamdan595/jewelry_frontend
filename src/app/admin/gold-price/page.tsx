"use client";
import { useState, useEffect } from "react";
import useSWR from "swr";
import { apiFetcher, api } from "@/lib/api-client";
import { useGoldRate } from "@/hooks/useGoldRate";
import { formatDateTime } from "@/lib/utils";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { TradingViewChart } from "@/components/admin/TradingViewChart";
import { CalendarFilter, calendarParams, type CalendarValue } from "@/components/admin/CalendarFilter";
import { AlertTriangle } from "lucide-react";
import type { GoldRateHistoryPoint } from "@/types/api";

type Range = "24h" | "7d" | "30d";
type KaratKey = "24k" | "22k" | "21k" | "18k";
const KARATS: { key: KaratKey; label: string }[] = [
  { key: "24k", label: "24K" },
  { key: "22k", label: "22K" },
  { key: "21k", label: "21K" },
  { key: "18k", label: "18K" },
];

export default function GoldPricePage() {
  const { rate, refresh } = useGoldRate();
  const [range, setRange] = useState<Range>("24h");
  const [karat, setKarat] = useState<KaratKey>("24k");
  const [cal, setCal] = useState<CalendarValue>({ granularity: "", date: "" });
  const [overrideInput, setOverrideInput] = useState("");
  const [reasonInput, setReasonInput] = useState("");
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [chartHeight, setChartHeight] = useState(520);

  useEffect(() => {
    function updateHeight() {
      const w = window.innerWidth;
      setChartHeight(w < 640 ? 300 : w < 1024 ? 420 : 520);
    }
    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  // Calendar selection (day/month/year) takes precedence over the relative range.
  const calQs = calendarParams(cal);
  const historyQuery = Object.keys(calQs).length
    ? new URLSearchParams(calQs).toString()
    : `range=${range}`;
  const { data: history } = useSWR<GoldRateHistoryPoint[]>(`/gold-price/history?${historyQuery}`, apiFetcher, { refreshInterval: 30000 });

  async function handleSetOverride() {
    setOverrideError(null);
    if (!overrideInput) return;
    if (reasonInput.trim().length < 3) {
      setOverrideError("Reason is required (min 3 characters).");
      return;
    }
    try {
      await api.post("/gold-price/override", {
        rate_24k: parseFloat(overrideInput),
        reason: reasonInput.trim(),
      });
      refresh();
      setOverrideInput("");
      setReasonInput("");
    } catch (e: any) {
      setOverrideError(e.message ?? "Failed to set override");
    }
  }

  async function handleClearOverride() {
    setOverrideError(null);
    try {
      await api.delete("/gold-price/override");
      refresh();
    } catch (e: any) {
      setOverrideError(e.message ?? "Failed to clear override");
    }
  }

  return (
    <div className="space-y-6">
      {/* Market-closed / feed-down banner (Phase 6 #6) */}
      {rate?.market_closed && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <div>
            <div className="text-sm font-semibold text-red-800">Market closed / gold feed down</div>
            <div className="text-xs text-red-700">
              The rate hasn&apos;t refreshed since {formatDateTime(rate.fetched_at)}. Customers are
              being served the last known rate. Set a manual override below if you need to trade.
            </div>
          </div>
        </div>
      )}

      {/* Hero card */}
      <div className="bg-admin-sidebar rounded-xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
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
              <div className="text-white/40 text-xs uppercase tracking-widest">22K</div>
              <div className="text-white text-xl font-semibold">{rate ? `$${rate.rate_22k.toFixed(2)}` : "—"}</div>
            </div>
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
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-semibold text-gray-700">XAU/USD — Live Chart (TradingView)</div>
          <div className="text-[10px] uppercase tracking-widest text-gray-400">Real-time market data</div>
        </div>
        <TradingViewChart height={chartHeight} />
      </div>

      {/* Internal rate history — per-karat + calendar (Phase 6 #7) */}
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="text-sm font-semibold text-gray-700">Polled Rate History</div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Karat filter */}
            <div className="flex gap-1">
              {KARATS.map((k) => (
                <button key={k.key} onClick={() => setKarat(k.key)} className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${karat === k.key ? "bg-gold text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                  {k.label}
                </button>
              ))}
            </div>
            {/* Relative range (disabled when a calendar selection is active) */}
            <div className="flex gap-1">
              {(["24h", "7d", "30d"] as Range[]).map((r) => (
                <button
                  key={r}
                  onClick={() => { setRange(r); setCal({ granularity: "", date: "" }); }}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${!cal.granularity && range === r ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                >
                  {r.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
        {/* Calendar: pick a specific day/month/year of polled points */}
        <div className="mb-4">
          <CalendarFilter value={cal} onChange={setCal} />
        </div>
        {history && history.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-sm text-gray-400">
            No polled rates for this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={history ?? []}>
              <defs>
                <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#C9A84C" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#C9A84C" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="fetched_at" tick={{ fontSize: 10 }} tickFormatter={(v) => new Date(v).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })} />
              <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v.toFixed(0)}`} />
              <Tooltip formatter={(v) => [`$${Number(v).toFixed(2)}`, `${karat.toUpperCase()} rate`]} labelFormatter={(v) => new Date(v).toLocaleString()} />
              <Area type="monotone" dataKey={`rate_${karat}`} stroke="#C9A84C" strokeWidth={2} fill="url(#goldGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
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
        <div className="space-y-2">
          <input
            type="number"
            step="0.01"
            value={overrideInput}
            onChange={(e) => setOverrideInput(e.target.value)}
            placeholder="Enter rate USD/g…"
            className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-gold"
          />
          <input
            type="text"
            value={reasonInput}
            onChange={(e) => setReasonInput(e.target.value)}
            maxLength={500}
            placeholder="Reason (required, recorded in audit log)…"
            className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-gold"
          />
          <p className="text-[11px] text-gray-400">
            Every override is logged with actor, rate, prior rate, and reason. Reason is mandatory.
          </p>
          {overrideError && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">{overrideError}</p>
          )}
          <button
            onClick={handleSetOverride}
            disabled={!overrideInput || reasonInput.trim().length < 3}
            className="w-full px-4 py-2 bg-gold text-white text-sm rounded hover:bg-gold-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Set Override
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";
import { useState, useEffect, useMemo } from "react";
import useSWR from "swr";
import { apiFetcher, api } from "@/lib/api-client";
import { ErrorState, RefreshFailedNotice } from "@/components/ui/error-state";
import { useGoldRate } from "@/hooks/useGoldRate";
import { useFormat } from "@/hooks/useFormat";
import { useLang } from "@/context/LanguageContext";
import { formatRate, toFiniteNumber } from "@/lib/utils";
import { Ltr } from "@/components/shared/Ltr";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { TradingViewChart } from "@/components/admin/TradingViewChart";
import { CalendarFilter, calendarParams, type CalendarValue } from "@/components/admin/CalendarFilter";
import { AlertTriangle } from "lucide-react";
import type { GoldRateHistoryPoint } from "@/types/api";
import { Skeleton, CardSkeleton } from "@/components/ui/skeleton";

type Range = "24h" | "7d" | "30d";
type KaratKey = "24k" | "22k" | "21k" | "18k";
const KARATS: { key: KaratKey; label: string }[] = [
  { key: "24k", label: "24K" },
  { key: "22k", label: "22K" },
  { key: "21k", label: "21K" },
  { key: "18k", label: "18K" },
];

export default function GoldPricePage() {
  const { formatDateTime } = useFormat();
  const { t } = useLang();
  const gp = t.goldPrice;
  const { rate, refresh, error: rateError, isValidating: rateValidating } = useGoldRate();
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
  const { data: history, error: historyError, isValidating: historyValidating, mutate: mutateHistory } = useSWR<GoldRateHistoryPoint[]>(`/gold-price/history?${historyQuery}`, apiFetcher, { refreshInterval: 30000 });
  // The rates arrive as decimal strings (NEX-54). recharts scales an axis by
  // comparing the values it is given, and "99.80" sorts after "106.25" as text,
  // so the series is converted to numbers once, here. A point that cannot be
  // read becomes a gap (null), not a zero.
  const series = useMemo(
    () =>
      history?.map((p) => ({
        ...p,
        rate_24k: toFiniteNumber(p.rate_24k),
        rate_22k: toFiniteNumber(p.rate_22k),
        rate_21k: toFiniteNumber(p.rate_21k),
        rate_18k: toFiniteNumber(p.rate_18k),
      })),
    [history],
  );

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
            <div className="text-sm font-semibold text-red-800">{t.goldRate.marketClosedTitle}</div>
            <div className="text-xs text-red-700">
              {gp.marketClosedBody(formatDateTime(rate.fetched_at))}
            </div>
          </div>
        </div>
      )}

      {/* Hero card */}
      {rateError && rate && <RefreshFailedNotice onRetry={() => refresh()} retrying={rateValidating} />}
      {rateError && !rate ? (
        <ErrorState className="h-[120px]" error={rateError} onRetry={() => refresh()} retrying={rateValidating} />
      ) : !rate ? (
        <CardSkeleton className="bg-admin-sidebar border-0 h-[120px]" />
      ) : (
        <div className="bg-admin-sidebar rounded-xl p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-white/40 text-xs uppercase tracking-widest mb-2">{gp.heroLabel}</div>
              <div className="font-serif text-kpi text-gold leading-none">{formatRate(rate.rate_24k)}</div>
              <div className="flex items-center gap-2 mt-2">
                <span className={`w-2 h-2 rounded-full ${rate.is_stale ? "bg-yellow-400" : "bg-green-400"}`} />
                <span className="text-white/40 text-xs uppercase tracking-widest">{rate.is_stale ? t.goldRate.stale : t.goldRate.live}</span>
                <span className="text-white/20 text-xs">{formatDateTime(rate.fetched_at)}</span>
                <span className="text-white/20 text-xs capitalize">{t.goldRate.sources[rate.source as keyof typeof t.goldRate.sources] ?? rate.source}</span>
              </div>
            </div>
            <div className="text-end space-y-3">
              <div>
                <div className="text-white/40 text-xs uppercase tracking-widest">22K</div>
                <div className="text-white text-xl font-semibold">{formatRate(rate.rate_22k)}</div>
              </div>
              <div>
                <div className="text-white/40 text-xs uppercase tracking-widest">21K</div>
                <div className="text-white text-xl font-semibold">{formatRate(rate.rate_21k)}</div>
              </div>
              <div>
                <div className="text-white/40 text-xs uppercase tracking-widest">18K</div>
                <div className="text-white text-xl font-semibold">{formatRate(rate.rate_18k)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TradingView real-time chart */}
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-semibold text-gray-700">{gp.liveChartTitle}</div>
          <div className="text-[10px] uppercase tracking-widest text-gray-400">{gp.realTimeData}</div>
        </div>
        <TradingViewChart height={chartHeight} />
      </div>

      {/* Internal rate history — per-karat + calendar (Phase 6 #7) */}
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="text-sm font-semibold text-gray-700">{gp.historyTitle}</div>
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
                  {gp.ranges[r]}
                </button>
              ))}
            </div>
          </div>
        </div>
        {/* Calendar: pick a specific day/month/year of polled points */}
        <div className="mb-4">
          <CalendarFilter value={cal} onChange={setCal} />
        </div>
        {historyError && !history ? (
          <ErrorState className="h-[200px]" error={historyError} onRetry={() => mutateHistory()} retrying={historyValidating} />
        ) : !series ? (
          <Skeleton className="h-[200px]" />
        ) : series.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-sm text-gray-400">
            {gp.noHistory}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={series}>
              <defs>
                <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#C9A84C" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#C9A84C" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="fetched_at" tick={{ fontSize: 10 }} tickFormatter={(v) => formatDateTime(v)} />
              <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10 }} tickFormatter={(v) => `$${Number(v).toFixed(0)}`} />
              <Tooltip formatter={(v) => [`$${Number(v).toFixed(2)}`, gp.tooltipRate(karat.toUpperCase())]} labelFormatter={(v) => formatDateTime(v)} />
              <Area type="monotone" dataKey={`rate_${karat}`} stroke="#C9A84C" strokeWidth={2} fill="url(#goldGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Override */}
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5 space-y-4">
        <div className="text-sm font-semibold text-gray-700">{gp.overrideTitle}</div>
        {rate?.source === "override" ? (
          <div className="flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded p-3">
            <span className="text-sm text-yellow-800">{gp.overrideActive} <strong><Ltr>{formatRate(rate.rate_24k)}{t.products.perGram}</Ltr></strong></span>
            <button onClick={handleClearOverride} className="text-xs text-red-600 underline hover:no-underline">{gp.clear}</button>
          </div>
        ) : (
          <div className="text-xs text-gray-400">{gp.noOverride}</div>
        )}
        <div className="space-y-2">
          <input
            type="number"
            step="0.01"
            value={overrideInput}
            onChange={(e) => setOverrideInput(e.target.value)}
            placeholder={gp.ratePlaceholder}
            aria-label={gp.rateInputLabel}
            className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-gold"
          />
          <input
            type="text"
            value={reasonInput}
            onChange={(e) => setReasonInput(e.target.value)}
            maxLength={500}
            placeholder={gp.reasonPlaceholder}
            aria-label={gp.reasonInputLabel}
            className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-gold"
          />
          <p className="text-[11px] text-gray-400">
            {gp.auditNote}
          </p>
          {overrideError && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">{overrideError}</p>
          )}
          <button
            onClick={handleSetOverride}
            disabled={!overrideInput || reasonInput.trim().length < 3}
            className="w-full px-4 py-2 bg-gold text-white text-sm rounded hover:bg-gold-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {gp.setOverride}
          </button>
        </div>
      </div>
    </div>
  );
}

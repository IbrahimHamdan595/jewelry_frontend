"use client";
import useSWR from "swr";
import { apiFetcher } from "@/lib/api-client";
import { formatUSD, formatDateTime } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { KaratBadge } from "@/components/shared/KaratBadge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { DashboardData } from "@/types/api";

export default function DashboardPage() {
  const { data, isLoading } = useSWR<DashboardData>("/reports/dashboard", apiFetcher, { refreshInterval: 60000 });

  if (isLoading || !data) {
    return <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-gray-200 animate-pulse rounded-lg" />)}</div>;
  }

  const weekDelta = data.prev_week_revenue > 0
    ? ((data.week_revenue - data.prev_week_revenue) / data.prev_week_revenue * 100).toFixed(1)
    : null;

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-5 border border-gray-100 shadow-sm">
          <div className="text-xs text-gray-400 uppercase tracking-widest mb-2">Today's Orders</div>
          <div className="text-kpi font-bold text-gray-900">{data.today_orders}</div>
        </div>
        <div className="bg-white rounded-lg p-5 border border-gray-100 shadow-sm">
          <div className="text-xs text-gray-400 uppercase tracking-widest mb-2">Today's Revenue</div>
          <div className="text-kpi font-bold text-gray-900">{formatUSD(data.today_revenue)}</div>
        </div>
        <div className="bg-white rounded-lg p-5 border border-gray-100 shadow-sm">
          <div className="text-xs text-gray-400 uppercase tracking-widest mb-2">7-Day Revenue</div>
          <div className="text-kpi font-bold text-gray-900">{formatUSD(data.week_revenue)}</div>
          {weekDelta && (
            <div className={`text-xs mt-1 ${Number(weekDelta) >= 0 ? "text-green-600" : "text-red-500"}`}>
              {Number(weekDelta) >= 0 ? "+" : ""}{weekDelta}% vs last week
            </div>
          )}
        </div>
        <div className="bg-admin-sidebar rounded-lg p-5 shadow-sm">
          <div className="text-xs text-white/40 uppercase tracking-widest mb-2">Gold Rate 24K</div>
          <div className="text-kpi font-serif font-bold text-gold">
            {data.gold_rate_24k ? `$${data.gold_rate_24k.toFixed(2)}` : "—"}
          </div>
          <div className="text-white/40 text-xs mt-1">USD / gram</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Revenue chart */}
        <div className="col-span-2 bg-white rounded-lg p-5 border border-gray-100 shadow-sm">
          <div className="text-sm font-semibold text-gray-700 mb-4">7-Day Revenue</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.chart_data} barSize={28}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => formatUSD(Number(v))} />
              <Bar dataKey="revenue" radius={[3, 3, 0, 0]}>
                {data.chart_data.map((d, i) => (
                  <Cell key={i} fill={d.is_today ? "#C9A84C" : "#E8DCC8"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top sellers */}
        <div className="bg-white rounded-lg p-5 border border-gray-100 shadow-sm">
          <div className="text-sm font-semibold text-gray-700 mb-4">Top Sellers This Week</div>
          <div className="space-y-3">
            {data.top_sellers.length === 0 && <p className="text-gray-400 text-sm">No sales yet</p>}
            {data.top_sellers.map((s, i) => (
              <div key={s.code} className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-4">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">{s.name}</div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <KaratBadge karat={s.karat} />
                    <span className="text-xs text-gray-400">{s.units} units</span>
                  </div>
                </div>
                <span className="text-xs font-semibold text-gray-700 shrink-0">{formatUSD(s.revenue)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent orders */}
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm">
        <div className="p-5 border-b border-gray-100">
          <div className="text-sm font-semibold text-gray-700">Recent Orders</div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {["Order #", "Cashier", "Total", "Status", "Date"].map((h) => (
                <th key={h} className="text-left text-xs text-gray-400 uppercase tracking-widest px-5 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.recent_orders.map((o) => (
              <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="px-5 py-3 font-mono text-xs">{o.order_number}</td>
                <td className="px-5 py-3 text-gray-600">{o.cashier}</td>
                <td className="px-5 py-3 font-semibold">{formatUSD(o.total_usd)}</td>
                <td className="px-5 py-3"><StatusBadge status={o.status} /></td>
                <td className="px-5 py-3 text-gray-400 text-xs">{formatDateTime(o.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

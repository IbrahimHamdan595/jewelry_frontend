"use client";
import useSWR from "swr";
import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { apiFetcher } from "@/lib/api-client";
import { formatUSD, formatDateTime } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { KaratBadge } from "@/components/shared/KaratBadge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useLang } from "@/context/LanguageContext";
import type { DashboardData } from "@/types/api";

export default function DashboardPage() {
  const { data, isLoading } = useSWR<DashboardData>("/reports/dashboard", apiFetcher, { refreshInterval: 60000 });
  const { t } = useLang();

  if (isLoading || !data) {
    return <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-gray-200 animate-pulse rounded-lg" />)}</div>;
  }

  const weekDelta = data.prev_week_revenue > 0
    ? ((data.week_revenue - data.prev_week_revenue) / data.prev_week_revenue * 100).toFixed(1)
    : null;

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-5 border border-gray-100 shadow-sm">
          <div className="text-xs text-gray-400 uppercase tracking-widest mb-2">{t.dashboard.todayOrders}</div>
          <div className="text-kpi font-bold text-gray-900">{data.today_orders}</div>
        </div>
        <div className="bg-white rounded-lg p-5 border border-gray-100 shadow-sm">
          <div className="text-xs text-gray-400 uppercase tracking-widest mb-2">{t.dashboard.todayRevenue}</div>
          <div className="text-kpi font-bold text-gray-900">{formatUSD(data.today_revenue)}</div>
        </div>
        <div className="bg-white rounded-lg p-5 border border-gray-100 shadow-sm">
          <div className="text-xs text-gray-400 uppercase tracking-widest mb-2">{t.dashboard.weekRevenue}</div>
          <div className="text-kpi font-bold text-gray-900">{formatUSD(data.week_revenue)}</div>
          {weekDelta && (
            <div className={`text-xs mt-1 ${Number(weekDelta) >= 0 ? "text-green-600" : "text-red-500"}`}>
              {Number(weekDelta) >= 0 ? "+" : ""}{weekDelta}% {t.dashboard.vsLastWeek}
            </div>
          )}
        </div>
        <div className="bg-admin-sidebar rounded-lg p-5 shadow-sm">
          <div className="text-xs text-white/40 uppercase tracking-widest mb-2">{t.dashboard.goldRate24k}</div>
          <div className="text-kpi font-serif font-bold text-gold">
            {data.gold_rate_24k ? `$${data.gold_rate_24k.toFixed(2)}` : "—"}
          </div>
          <div className="text-white/40 text-xs mt-1">{t.dashboard.usdPerGram}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue chart */}
        <div className="lg:col-span-2 bg-white rounded-lg p-5 border border-gray-100 shadow-sm">
          <div className="text-sm font-semibold text-gray-700 mb-4">{t.dashboard.weekRevenue}</div>
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
          <div className="text-sm font-semibold text-gray-700 mb-4">{t.dashboard.topSellers}</div>
          <div className="space-y-3">
            {data.top_sellers.length === 0 && <p className="text-gray-400 text-sm">{t.dashboard.noSales}</p>}
            {data.top_sellers.map((s, i) => (
              <div key={s.code} className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-4">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">{s.name}</div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <KaratBadge karat={s.karat} />
                    <span className="text-xs text-gray-400">{s.units} {t.dashboard.units}</span>
                  </div>
                </div>
                <span className="text-xs font-semibold text-gray-700 shrink-0">{formatUSD(s.revenue)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Inventory + AP pulse */}
      {(data.inventory || data.accounts_payable) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.inventory && (
            <Link
              href="/admin/inventory/lots"
              className="bg-white rounded-lg p-5 border border-gray-100 shadow-sm hover:border-gold/40 transition-colors group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-gray-700">{t.dashboard.purePools}</div>
                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gold transition-colors rtl:rotate-180" />
              </div>
              {data.inventory.pure_gold_by_karat.length === 0 ? (
                <div className="text-sm text-gray-400">{t.dashboard.noActiveLots}</div>
              ) : (
                <div className="space-y-2">
                  {data.inventory.pure_gold_by_karat.map((row) => (
                    <div key={row.karat} className="flex items-baseline justify-between">
                      <span className="text-xs px-2 py-0.5 rounded bg-gold/10 text-gold font-medium">
                        {row.karat}
                      </span>
                      <div className="text-end">
                        <div className="text-sm font-semibold text-gray-800">
                          {row.grams_remaining.toFixed(3)}
                          <span className="text-xs text-gray-400 ms-1">g</span>
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {t.dashboard.lotCount(row.lot_count)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Link>
          )}

          {data.inventory && (
            <Link
              href="/admin/inventory/coins"
              className="bg-white rounded-lg p-5 border border-gray-100 shadow-sm hover:border-gold/40 transition-colors group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-gray-700">{t.dashboard.coinsOunces}</div>
                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gold transition-colors rtl:rotate-180" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-widest mb-1">{t.dashboard.coins}</div>
                  <div className="text-xl font-semibold text-gray-800">
                    {data.inventory.coins.on_hand_total}
                  </div>
                  <div className="text-[10px] text-gray-400">
                    {t.dashboard.distinctTypes(data.inventory.coins.distinct_types)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-widest mb-1">{t.dashboard.ounces}</div>
                  <div className="text-xl font-semibold text-gray-800">
                    {data.inventory.ounces.on_hand_total}
                  </div>
                  <div className="text-[10px] text-gray-400">
                    {t.dashboard.distinctTypes(data.inventory.ounces.distinct_types)}
                  </div>
                </div>
              </div>
              {data.inventory.low_stock_alerts > 0 && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-600">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {data.inventory.low_stock_alerts} {t.dashboard.belowThreshold}
                </div>
              )}
            </Link>
          )}

          {data.accounts_payable && (
            <Link
              href="/admin/accounts-payable"
              className="bg-white rounded-lg p-5 border border-gray-100 shadow-sm hover:border-gold/40 transition-colors group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-gray-700">{t.dashboard.accountsPayable}</div>
                <span className="text-[10px] text-gray-300">
                  {t.dashboard.supplierCount(data.accounts_payable.supplier_count)}
                </span>
              </div>
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-widest mb-1">{t.dashboard.cashOwed}</div>
                <div className="text-xl font-semibold text-gray-800">
                  {formatUSD(data.accounts_payable.total_cash_owed)}
                </div>
              </div>
              {Object.keys(data.accounts_payable.total_grams_owed_by_karat).length > 0 && (
                <div className="mt-3 space-y-1">
                  <div className="text-xs text-gray-400 uppercase tracking-widest">{t.dashboard.goldOwed}</div>
                  {Object.entries(data.accounts_payable.total_grams_owed_by_karat).map(([karat, grams]) => (
                    <div key={karat} className="flex items-baseline justify-between text-sm">
                      <span className="text-xs px-2 py-0.5 rounded bg-gold/10 text-gold font-medium">{karat}</span>
                      <span className="font-mono text-gray-800">{Number(grams).toFixed(3)}g</span>
                    </div>
                  ))}
                </div>
              )}
            </Link>
          )}
        </div>
      )}

      {/* Recent orders */}
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm">
        <div className="p-5 border-b border-gray-100">
          <div className="text-sm font-semibold text-gray-700">{t.dashboard.recentOrders}</div>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[540px] text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {[t.dashboard.orderNum, t.dashboard.cashier, t.dashboard.total, t.dashboard.status, t.dashboard.date].map((h) => (
                <th key={h} className="text-start text-xs text-gray-400 uppercase tracking-widest px-5 py-3 font-medium">{h}</th>
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
    </div>
  );
}

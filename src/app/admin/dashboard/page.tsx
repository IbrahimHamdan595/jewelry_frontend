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
import { MarketClosedBanner } from "@/components/shared/MarketClosedBanner";
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
      <MarketClosedBanner />
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
          <div className="flex items-center gap-2 mb-2">
            <div className="text-xs text-white/40 uppercase tracking-widest">{t.dashboard.goldRate24k}</div>
            <span className={`w-2 h-2 rounded-full ${data.gold_rate_is_stale ? "bg-amber-400" : "bg-green-400"}`}
              title={data.gold_rate_fetched_at ? `${t.dashboard.rateAsOf} ${formatDateTime(data.gold_rate_fetched_at)}` : ""} />
          </div>
          <div className="text-kpi font-serif font-bold text-gold">
            {data.gold_rate_24k ? `$${data.gold_rate_24k.toFixed(2)}` : "—"}
          </div>
          <div className="text-white/40 text-xs mt-1">{t.dashboard.usdPerGram}</div>
        </div>
      </div>

      {data.gold_rate_is_stale && (
        <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {t.dashboard.marketStale}
          {data.gold_rate_fetched_at && <span className="text-amber-500 text-xs">· {t.dashboard.rateAsOf} {formatDateTime(data.gold_rate_fetched_at)}</span>}
        </div>
      )}

      {/* Phase A — jeweler headline KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-5 border border-gray-100 shadow-sm">
          <div className="text-xs text-gray-400 uppercase tracking-widest mb-3">{t.dashboard.goldWeightSold} · {t.dashboard.byKarat}</div>
          <div className="grid grid-cols-2 gap-x-4">
            <div>
              <div className="text-[10px] text-gray-400 mb-1">{t.dashboard.soldToday}</div>
              {data.gold_weight_sold_today_by_karat.length === 0 ? <div className="text-sm text-gray-300">—</div> :
                data.gold_weight_sold_today_by_karat.map((r) => (
                  <div key={r.karat} className="flex items-baseline justify-between text-sm">
                    <KaratBadge karat={r.karat} />
                    <span className="font-semibold text-gray-800">{r.grams.toFixed(3)}<span className="text-xs text-gray-400 ms-0.5">{t.dashboard.grams}</span></span>
                  </div>
                ))}
            </div>
            <div>
              <div className="text-[10px] text-gray-400 mb-1">{t.dashboard.soldWeek}</div>
              {data.gold_weight_sold_week_by_karat.length === 0 ? <div className="text-sm text-gray-300">—</div> :
                data.gold_weight_sold_week_by_karat.map((r) => (
                  <div key={r.karat} className="flex items-baseline justify-between text-sm">
                    <KaratBadge karat={r.karat} />
                    <span className="font-semibold text-gray-800">{r.grams.toFixed(3)}<span className="text-xs text-gray-400 ms-0.5">{t.dashboard.grams}</span></span>
                  </div>
                ))}
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-5 border border-gray-100 shadow-sm">
          <div className="text-xs text-gray-400 uppercase tracking-widest mb-2">{t.dashboard.makingCharges}</div>
          <div className="text-kpi font-bold text-gray-900">{formatUSD(data.making_charges_today)}</div>
          <div className="text-xs text-gray-400 mt-1">{t.dashboard.soldWeek}: {formatUSD(data.making_charges_week)}</div>
        </div>
        <div className="bg-white rounded-lg p-5 border border-gray-100 shadow-sm">
          <div className="text-xs text-gray-400 uppercase tracking-widest mb-2">{t.dashboard.avgInvoice}</div>
          <div className="text-kpi font-bold text-gray-900">{formatUSD(data.avg_invoice_value_today)}</div>
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

      {/* Inventory pulse */}
      {data.inventory && (
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

          <div className="bg-white rounded-lg p-5 border border-gray-100 shadow-sm">
            <div className="text-sm font-semibold text-gray-700 mb-3">{t.dashboard.inventoryValue}</div>
            <div className="text-kpi font-bold text-gray-900">{formatUSD(data.inventory_value.total_usd)}</div>
            <div className="text-[10px] text-gray-400 mt-1">{t.dashboard.atMarketRate}</div>
            <div className="mt-3 space-y-1 text-xs text-gray-500">
              <div className="flex justify-between"><span>{t.dashboard.purePools}</span><span>{formatUSD(data.inventory_value.pure_gold_usd)}</span></div>
              <div className="flex justify-between"><span>{t.dashboard.coinsOunces}</span><span>{formatUSD(data.inventory_value.coins_usd + data.inventory_value.ounces_usd)}</span></div>
              <div className="flex justify-between"><span>{t.dashboard.products}</span><span>{formatUSD(data.inventory_value.products_usd)}</span></div>
            </div>
          </div>
        </div>
      )}

      {/* Phase D — inventory aging + dead-stock + low-stock link */}
      {data.inventory && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-5 border border-gray-100 shadow-sm">
            <div className="text-sm font-semibold text-gray-700 mb-3">{t.dashboard.inventoryAging}</div>
            <div className="grid grid-cols-4 gap-2 text-center">
              {([[t.dashboard.aging0_90, data.inventory_aging.d0_90], [t.dashboard.aging90_180, data.inventory_aging.d90_180], [t.dashboard.aging180_365, data.inventory_aging.d180_365], [t.dashboard.aging365Plus, data.inventory_aging.d365_plus]] as [string, number][]).map(([label, n]) => (
                <div key={label}>
                  <div className="text-lg font-semibold text-gray-800">{n}</div>
                  <div className="text-[10px] text-gray-400">{label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-lg p-5 border border-gray-100 shadow-sm">
            <div className="text-xs text-gray-400 uppercase tracking-widest mb-2">{t.dashboard.deadStock}</div>
            <div className="text-kpi font-bold text-gray-900">{data.dead_stock_count}</div>
          </div>
          <Link href="/admin/inventory/alerts" className="bg-white rounded-lg p-5 border border-gray-100 shadow-sm hover:border-gold/40 transition-colors group">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-gray-400 uppercase tracking-widest">{t.dashboard.belowThreshold}</div>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gold transition-colors rtl:rotate-180" />
            </div>
            <div className={`text-kpi font-bold ${data.inventory.low_stock_alerts > 0 ? "text-amber-600" : "text-gray-900"}`}>{data.inventory.low_stock_alerts}</div>
          </Link>
        </div>
      )}

      {/* Phase B — money pulse */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/admin/accounting/receivables" className="bg-white rounded-lg p-5 border border-gray-100 shadow-sm hover:border-gold/40 transition-colors group">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-gray-400 uppercase tracking-widest">{t.dashboard.receivables}</div>
            <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gold transition-colors rtl:rotate-180" />
          </div>
          <div className="text-xl font-bold text-gray-900">{formatUSD(data.receivables.total)}</div>
          <AgingChips a={data.receivables} t={t} />
        </Link>
        <Link href="/admin/accounting/payables" className="bg-white rounded-lg p-5 border border-gray-100 shadow-sm hover:border-gold/40 transition-colors group">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-gray-400 uppercase tracking-widest">{t.dashboard.payables}</div>
            <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gold transition-colors rtl:rotate-180" />
          </div>
          <div className="text-xl font-bold text-gray-900">{formatUSD(data.payables_aging.cash_total)}</div>
          <AgingChips a={data.payables_aging} t={t} />
          {Object.keys(data.payables_aging.metal_owed_by_karat).length > 0 && (
            <div className="mt-2 space-y-0.5">
              <div className="text-[10px] text-gray-400 uppercase">{t.dashboard.metalOwed}</div>
              {Object.entries(data.payables_aging.metal_owed_by_karat).map(([k, g]) => (
                <div key={k} className="flex justify-between text-xs"><span className="text-gold">{k}</span><span className="font-mono">{Number(g).toFixed(3)}g</span></div>
              ))}
            </div>
          )}
        </Link>
        {data.cash_bank_balance !== null && (
          <div className="bg-white rounded-lg p-5 border border-gray-100 shadow-sm">
            <div className="text-xs text-gray-400 uppercase tracking-widest mb-2">{t.dashboard.cashBank}</div>
            <div className="text-xl font-bold text-gray-900">{formatUSD(data.cash_bank_balance)}</div>
          </div>
        )}
        {data.vat_position !== null && (
          <div className="bg-white rounded-lg p-5 border border-gray-100 shadow-sm">
            <div className="text-xs text-gray-400 uppercase tracking-widest mb-2">{t.dashboard.vatPosition}</div>
            <div className="text-xl font-bold text-gray-900">{formatUSD(data.vat_position.net_payable)}</div>
            <div className="text-[10px] text-gray-400 mt-1">
              {data.vat_position.direction === "REFUNDABLE" ? t.dashboard.vatRefundable : t.dashboard.vatPayable} · {data.vat_position.period_label}
            </div>
          </div>
        )}
      </div>

      {/* Phase C — profitability (go-forward; null until cost-captured sales) */}
      {data.profitability && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-5 border border-gray-100 shadow-sm">
            <div className="text-xs text-gray-400 uppercase tracking-widest mb-2">{t.dashboard.grossProfit}</div>
            <div className="text-kpi font-bold text-gray-900">{formatUSD(data.profitability.gross_profit)}</div>
            <div className="text-[10px] text-gray-400 mt-1">{t.dashboard.since} {data.profitability.since}</div>
          </div>
          <div className="bg-white rounded-lg p-5 border border-gray-100 shadow-sm">
            <div className="text-xs text-gray-400 uppercase tracking-widest mb-2">{t.dashboard.grossMargin}</div>
            <div className="text-kpi font-bold text-gray-900">{data.profitability.gross_margin_pct !== null ? `${data.profitability.gross_margin_pct.toFixed(2)}%` : "—"}</div>
          </div>
          <div className="bg-white rounded-lg p-5 border border-gray-100 shadow-sm">
            <div className="text-xs text-gray-400 uppercase tracking-widest mb-2">{t.dashboard.profitPerGram}</div>
            <div className="text-kpi font-bold text-gray-900">{data.profitability.profit_per_gram !== null ? formatUSD(data.profitability.profit_per_gram) : "—"}</div>
          </div>
        </div>
      )}

      {/* Phase E — loss-prevention strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/admin/orders?status=VOIDED" className="bg-white rounded-lg p-5 border border-gray-100 shadow-sm hover:border-gold/40 transition-colors group">
          <div className="flex items-center justify-between mb-2"><div className="text-xs text-gray-400 uppercase tracking-widest">{t.dashboard.orderVoids}</div><ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gold rtl:rotate-180" /></div>
          <div className={`text-kpi font-bold ${data.loss_prevention.order_voids > 0 ? "text-red-500" : "text-gray-900"}`}>{data.loss_prevention.order_voids}</div>
        </Link>
        <Link href="/admin/gold-price" className="bg-white rounded-lg p-5 border border-gray-100 shadow-sm hover:border-gold/40 transition-colors group">
          <div className="flex items-center justify-between mb-2"><div className="text-xs text-gray-400 uppercase tracking-widest">{t.dashboard.rateOverrides}</div><ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gold rtl:rotate-180" /></div>
          <div className={`text-kpi font-bold ${data.loss_prevention.rate_overrides > 0 ? "text-amber-600" : "text-gray-900"}`}>{data.loss_prevention.rate_overrides}</div>
        </Link>
        <Link href="/admin/orders" className="bg-white rounded-lg p-5 border border-gray-100 shadow-sm hover:border-gold/40 transition-colors group">
          <div className="flex items-center justify-between mb-2"><div className="text-xs text-gray-400 uppercase tracking-widest">{t.dashboard.excessDiscounts}</div><ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gold rtl:rotate-180" /></div>
          <div className={`text-kpi font-bold ${data.loss_prevention.excess_discount_orders > 0 ? "text-amber-600" : "text-gray-900"}`}>{data.loss_prevention.excess_discount_orders}</div>
        </Link>
      </div>

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

      {/* Recent supplier purchases (Phase 4) */}
      {data.recent_purchases && data.recent_purchases.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm">
          <div className="p-5 border-b border-gray-100">
            <div className="text-sm font-semibold text-gray-700">Recent supplier purchases</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[540px] text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {["Supplier", "Items", "Cash due", "Date", "Receipt"].map((h) => (
                    <th key={h} className="text-start text-xs text-gray-400 uppercase tracking-widest px-5 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.recent_purchases.map((p) => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-5 py-3 text-gray-700">{p.supplier}</td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{p.item_count}</td>
                    <td className="px-5 py-3 font-semibold">{formatUSD(p.total_cash_due)}</td>
                    <td className="px-5 py-3 text-gray-400 text-xs">{formatDateTime(p.occurred_at)}</td>
                    <td className="px-5 py-3">
                      <a
                        href={`/admin/suppliers/purchases/${p.id}/receipt`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-gold hover:text-gold-dark"
                      >
                        Receipt →
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function AgingChips({ a, t }: {
  a: { b0_30: number; b31_60: number; b61_90: number; b90_plus: number };
  t: ReturnType<typeof useLang>["t"];
}) {
  const chips: [string, number][] = [
    [t.dashboard.aging0_30, a.b0_30], [t.dashboard.aging31_60, a.b31_60],
    [t.dashboard.aging61_90, a.b61_90], [t.dashboard.aging90Plus, a.b90_plus],
  ];
  return (
    <div className="grid grid-cols-4 gap-1 mt-2 text-center">
      {chips.map(([label, v]) => (
        <div key={label}>
          <div className="text-xs font-semibold text-gray-700">{formatUSD(v)}</div>
          <div className="text-[9px] text-gray-400">{label}</div>
        </div>
      ))}
    </div>
  );
}

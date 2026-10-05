"use client";
import { Ltr } from "@/components/shared/Ltr";
import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Download } from "lucide-react";
import { apiFetcher, apiUrl } from "@/lib/api-client";
import { ErrorRow } from "@/components/ui/error-state";
import { formatUSD } from "@/lib/utils";
import { useFormat } from "@/hooks/useFormat";
import { useLang } from "@/context/LanguageContext";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { CalendarFilter, calendarParams, type CalendarValue } from "@/components/admin/CalendarFilter";
import type {
  OrderListResponse,
  PurchaseListResponse,
  BuybackListResponse,
} from "@/types/api";
import { TableSkeleton } from "@/components/ui/skeleton";

type Tab = "sell" | "purchases" | "buybacks";

export default function OrdersPage() {
  const { t } = useLang();
  const o = t.orders;
  const TABS: { key: Tab; label: string }[] = [
    { key: "sell", label: o.tabSell },
    { key: "purchases", label: o.tabPurchases },
    { key: "buybacks", label: o.tabBuybacks },
  ];
  const [tab, setTab] = useState<Tab>("sell");
  const [cal, setCal] = useState<CalendarValue>({ granularity: "", date: "" });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold text-gray-800">{o.title}</h2>
        {tab === "sell" && (
          <a
            href={apiUrl("/orders/export")}
            className="flex items-center gap-2 border border-gray-200 rounded px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" /> {o.exportCsv}
          </a>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setTab(key); }}
            className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors ${
              tab === key
                ? "border-gold text-gold"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Calendar filter (shared across tabs) */}
      <CalendarFilter value={cal} onChange={setCal} />

      {tab === "sell" && <SellTab cal={cal} />}
      {tab === "purchases" && <PurchasesTab cal={cal} />}
      {tab === "buybacks" && <BuybacksTab cal={cal} />}
    </div>
  );
}

function Pager({ page, total, onPrev, onNext }: { page: number; total: number; onPrev: () => void; onNext: () => void }) {
  const { t } = useLang();
  if (total <= 20) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
      <span className="text-xs text-gray-400">{t.orders.showing((page - 1) * 20 + 1, Math.min(page * 20, total), total)}</span>
      <div className="flex gap-2">
        <button disabled={page === 1} onClick={onPrev} className="px-3 py-1 text-xs border rounded disabled:opacity-40">{t.orders.prev}</button>
        <button disabled={page * 20 >= total} onClick={onNext} className="px-3 py-1 text-xs border rounded disabled:opacity-40">{t.common.next}</button>
      </div>
    </div>
  );
}

function EmptyRow({ cols, label }: { cols: number; label: string }) {
  return <tr><td colSpan={cols} className="px-4 py-10 text-center text-sm text-gray-400">{label}</td></tr>;
}

// ── Sell tab ──────────────────────────────────────────────────────────────────
function SellTab({ cal }: { cal: CalendarValue }) {
  const { formatDateTime } = useFormat();
  const { t } = useLang();
  const o = t.orders;
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const params = new URLSearchParams({ status, page: String(page), ...calendarParams(cal) });
  const { data, error, isValidating, mutate } = useSWR<OrderListResponse>(`/orders?${params}`, apiFetcher);

  return (
    <div className="space-y-4">
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Stat label={o.statTotalOrders} value={String(data.total)} />
          <Stat label={o.statRevenue} value={formatUSD(data.total_revenue)} />
          <Stat label={o.statAvgOrder} value={formatUSD(data.avg_order_value)} />
        </div>
      )}
      <div className="flex gap-2 flex-wrap">
        {(["", "COMPLETED", "PARTIALLY_REFUNDED", "REFUNDED", "VOIDED"] as const).map((s) => (
          <button key={s} onClick={() => { setStatus(s); setPage(1); }} className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${status === s ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {s ? o.status[s] : o.filterAll}
          </button>
        ))}
      </div>
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {[t.dashboard.orderNum, t.dashboard.date, t.dashboard.cashier, t.common.customer, o.colItems, t.common.total, t.common.status, ""].map((h) => (
                  <th key={h} className="text-start text-xs text-gray-400 uppercase tracking-widest px-4 py-3 font-medium">{h.includes("#") ? <Ltr>{h}</Ltr> : h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {error && !data && <ErrorRow cols={8} error={error} onRetry={() => mutate()} retrying={isValidating} />}
              {!error && !data && <TableSkeleton cols={8} />}
              {data && data.items.length === 0 && <EmptyRow cols={8} label={o.emptySell} />}
              {data?.items.map((order) => (
                <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-mono text-xs"><Ltr>{order.order_number}</Ltr></td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDateTime(order.created_at)}</td>
                  <td className="px-4 py-3 text-gray-600">{order.cashier.name}</td>
                  <td className="px-4 py-3 text-gray-600">{order.customer_name ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{order.item_count}</td>
                  <td className="px-4 py-3 font-semibold">{formatUSD(order.total_usd)}</td>
                  <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Link href={`/admin/orders/${order.id}`} className="text-gray-400 hover:text-gold text-xs underline me-3">{o.view}</Link>
                    <a href={`/pos/receipt/${order.id}`} target="_blank" rel="noopener noreferrer" className="text-gold hover:text-gold-dark text-xs">{o.receipt}</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data && <Pager page={page} total={data.total} onPrev={() => setPage(p => p - 1)} onNext={() => setPage(p => p + 1)} />}
      </div>
    </div>
  );
}

// ── Supplier purchases tab ──────────────────────────────────────────────────────
function PurchasesTab({ cal }: { cal: CalendarValue }) {
  const { formatDateTime } = useFormat();
  const { t } = useLang();
  const o = t.orders;
  const [page, setPage] = useState(1);
  const params = new URLSearchParams({ page: String(page), ...calendarParams(cal) });
  const { data, error, isValidating, mutate } = useSWR<PurchaseListResponse>(`/suppliers/purchases/list?${params}`, apiFetcher);

  return (
    <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              {[t.dashboard.date, t.accounting.common.supplier, o.colMode, o.colItems, o.colCashDue, o.colGoldDue, ""].map((h) => (
                <th key={h} className="text-start text-xs text-gray-400 uppercase tracking-widest px-4 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {error && !data && <ErrorRow cols={7} error={error} onRetry={() => mutate()} retrying={isValidating} />}
            {!error && !data && <TableSkeleton cols={7} />}
            {data && data.items.length === 0 && <EmptyRow cols={7} label={o.emptyPurchases} />}
            {data?.items.map((p) => (
              <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="px-4 py-3 text-gray-500 text-xs">{formatDateTime(p.occurred_at)}</td>
                <td className="px-4 py-3 text-gray-800">{p.supplier_name}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{o.purchaseMode[p.payment_mode] ?? p.payment_mode}</td>
                <td className="px-4 py-3 text-gray-500">{p.item_count}</td>
                <td className="px-4 py-3 font-semibold">{formatUSD(p.total_cash_due)}</td>
                {/* Only the karat code and the number are .font-mono (laid out
                    left-to-right in RTL by globals.css); the unit is a
                    translated word and follows them in reading order. */}
                <td className="px-4 py-3 text-xs ltr:font-mono text-gray-600">
                  {Object.keys(p.total_grams_due_by_karat).length === 0
                    ? "—"
                    : Object.entries(p.total_grams_due_by_karat).map(([k, g], i) => (
                        <span key={k}>
                          {i > 0 && ", "}
                          <span className="font-mono">{k} {Number(g).toFixed(2)}</span>{t.dashboard.grams}
                        </span>
                      ))}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <Link href={`/admin/suppliers/${p.supplier_id}`} className="text-gray-400 hover:text-gold text-xs underline me-3">{t.accounting.common.supplier}</Link>
                  <a href={`/admin/suppliers/purchases/${p.id}/receipt`} target="_blank" rel="noopener noreferrer" className="text-gold hover:text-gold-dark text-xs">{o.receipt}</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data && <Pager page={page} total={data.total} onPrev={() => setPage(p => p - 1)} onNext={() => setPage(p => p + 1)} />}
    </div>
  );
}

// ── Buybacks tab ────────────────────────────────────────────────────────────────
function BuybacksTab({ cal }: { cal: CalendarValue }) {
  const { formatDateTime } = useFormat();
  const { t } = useLang();
  const o = t.orders;
  const [page, setPage] = useState(1);
  const params = new URLSearchParams({ page: String(page), ...calendarParams(cal) });
  const { data, error, isValidating, mutate } = useSWR<BuybackListResponse>(`/buybacks?${params}`, apiFetcher);

  return (
    <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              {[t.dashboard.date, o.colSeller, o.colKind, o.colKaratWeight, o.colQty, o.colPaid, ""].map((h) => (
                <th key={h} className="text-start text-xs text-gray-400 uppercase tracking-widest px-4 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {error && !data && <ErrorRow cols={7} error={error} onRetry={() => mutate()} retrying={isValidating} />}
            {!error && !data && <TableSkeleton cols={7} />}
            {data && data.items.length === 0 && <EmptyRow cols={7} label={o.emptyBuybacks} />}
            {data?.items.map((b) => (
              <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="px-4 py-3 text-gray-500 text-xs">{formatDateTime(b.occurred_at)}</td>
                <td className="px-4 py-3">
                  <div className="text-gray-800">{b.seller_name}</div>
                  <div className="text-xs text-gray-400 font-mono">{b.seller_phone}</div>
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">{o.buybackKind[b.kind] ?? b.kind.replace(/_/g, " ")}</td>
                <td className="px-4 py-3 text-xs text-gray-600">
                  {b.karat ? <span className="px-1.5 py-0.5 rounded bg-gold/10 text-gold me-1">{b.karat}</span> : null}
                  {b.weight_grams != null ? `${Number(b.weight_grams).toFixed(3)}${t.dashboard.grams}` : ""}
                </td>
                <td className="px-4 py-3 text-gray-500">{b.quantity ?? "—"}</td>
                <td className="px-4 py-3 font-semibold">{formatUSD(b.buy_price_usd)}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <a href={`/pos/buyback-receipt/${b.id}`} target="_blank" rel="noopener noreferrer" className="text-gold hover:text-gold-dark text-xs">{o.receipt}</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data && <Pager page={page} total={data.total} onPrev={() => setPage(p => p - 1)} onNext={() => setPage(p => p + 1)} />}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-gray-100 rounded-lg p-4">
      <div className="text-xs text-gray-400 uppercase tracking-widest">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}

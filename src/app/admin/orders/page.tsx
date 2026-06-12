"use client";
import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Download } from "lucide-react";
import { apiFetcher } from "@/lib/api-client";
import { formatUSD, formatDateTime } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { CalendarFilter, calendarParams, type CalendarValue } from "@/components/admin/CalendarFilter";
import type {
  OrderListResponse,
  PurchaseListResponse,
  BuybackListResponse,
} from "@/types/api";
import { TableSkeleton } from "@/components/ui/skeleton";

type Tab = "sell" | "purchases" | "buybacks";

const TABS: { key: Tab; label: string }[] = [
  { key: "sell", label: "Sell" },
  { key: "purchases", label: "Supplier Purchases" },
  { key: "buybacks", label: "Buybacks" },
];

export default function OrdersPage() {
  const [tab, setTab] = useState<Tab>("sell");
  const [cal, setCal] = useState<CalendarValue>({ granularity: "", date: "" });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold text-gray-800">Transactions</h2>
        {tab === "sell" && (
          <a
            href={`${process.env.NEXT_PUBLIC_API_URL}/orders/export`}
            className="flex items-center gap-2 border border-gray-200 rounded px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" /> Export CSV
          </a>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); }}
            className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors ${
              tab === t.key
                ? "border-gold text-gold"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
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
  if (total <= 20) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
      <span className="text-xs text-gray-400">Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}</span>
      <div className="flex gap-2">
        <button disabled={page === 1} onClick={onPrev} className="px-3 py-1 text-xs border rounded disabled:opacity-40">Prev</button>
        <button disabled={page * 20 >= total} onClick={onNext} className="px-3 py-1 text-xs border rounded disabled:opacity-40">Next</button>
      </div>
    </div>
  );
}

function EmptyRow({ cols, label }: { cols: number; label: string }) {
  return <tr><td colSpan={cols} className="px-4 py-10 text-center text-sm text-gray-400">{label}</td></tr>;
}

// ── Sell tab ──────────────────────────────────────────────────────────────────
function SellTab({ cal }: { cal: CalendarValue }) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const params = new URLSearchParams({ status, page: String(page), ...calendarParams(cal) });
  const { data } = useSWR<OrderListResponse>(`/orders?${params}`, apiFetcher);

  return (
    <div className="space-y-4">
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Stat label="Total Orders" value={String(data.total)} />
          <Stat label="Revenue" value={formatUSD(data.total_revenue)} />
          <Stat label="Avg Order Value" value={formatUSD(data.avg_order_value)} />
        </div>
      )}
      <div className="flex gap-2 flex-wrap">
        {["", "COMPLETED", "PARTIALLY_REFUNDED", "REFUNDED", "VOIDED"].map((s) => (
          <button key={s} onClick={() => { setStatus(s); setPage(1); }} className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${status === s ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {s ? s.replace(/_/g, " ").toLowerCase() : "All"}
          </button>
        ))}
      </div>
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {["Order #", "Date", "Cashier", "Customer", "Items", "Total", "Status", ""].map((h) => (
                  <th key={h} className="text-left text-xs text-gray-400 uppercase tracking-widest px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!data && <TableSkeleton cols={8} />}
              {data && data.items.length === 0 && <EmptyRow cols={8} label="No orders for this period" />}
              {data?.items.map((o) => (
                <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-mono text-xs">{o.order_number}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDateTime(o.created_at)}</td>
                  <td className="px-4 py-3 text-gray-600">{o.cashier.name}</td>
                  <td className="px-4 py-3 text-gray-600">{o.customer_name ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{o.item_count}</td>
                  <td className="px-4 py-3 font-semibold">{formatUSD(o.total_usd)}</td>
                  <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Link href={`/admin/orders/${o.id}`} className="text-gray-400 hover:text-gold text-xs underline mr-3">View</Link>
                    <a href={`/pos/receipt/${o.id}`} target="_blank" rel="noopener noreferrer" className="text-gold hover:text-gold-dark text-xs">Receipt</a>
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
  const [page, setPage] = useState(1);
  const params = new URLSearchParams({ page: String(page), ...calendarParams(cal) });
  const { data } = useSWR<PurchaseListResponse>(`/suppliers/purchases/list?${params}`, apiFetcher);

  return (
    <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              {["Date", "Supplier", "Mode", "Items", "Cash Due", "Gold Due", ""].map((h) => (
                <th key={h} className="text-left text-xs text-gray-400 uppercase tracking-widest px-4 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!data && <TableSkeleton cols={7} />}
            {data && data.items.length === 0 && <EmptyRow cols={7} label="No supplier purchases for this period" />}
            {data?.items.map((p) => (
              <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="px-4 py-3 text-gray-500 text-xs">{formatDateTime(p.occurred_at)}</td>
                <td className="px-4 py-3 text-gray-800">{p.supplier_name}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{p.payment_mode}</td>
                <td className="px-4 py-3 text-gray-500">{p.item_count}</td>
                <td className="px-4 py-3 font-semibold">{formatUSD(p.total_cash_due)}</td>
                <td className="px-4 py-3 text-xs font-mono text-gray-600">
                  {Object.keys(p.total_grams_due_by_karat).length === 0
                    ? "—"
                    : Object.entries(p.total_grams_due_by_karat).map(([k, g]) => `${k} ${Number(g).toFixed(2)}g`).join(", ")}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <Link href={`/admin/suppliers/${p.supplier_id}`} className="text-gray-400 hover:text-gold text-xs underline mr-3">Supplier</Link>
                  <a href={`/admin/suppliers/purchases/${p.id}/receipt`} target="_blank" rel="noopener noreferrer" className="text-gold hover:text-gold-dark text-xs">Receipt</a>
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
  const [page, setPage] = useState(1);
  const params = new URLSearchParams({ page: String(page), ...calendarParams(cal) });
  const { data } = useSWR<BuybackListResponse>(`/buybacks?${params}`, apiFetcher);

  return (
    <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              {["Date", "Seller", "Kind", "Karat / Weight", "Qty", "Paid", ""].map((h) => (
                <th key={h} className="text-left text-xs text-gray-400 uppercase tracking-widest px-4 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!data && <TableSkeleton cols={7} />}
            {data && data.items.length === 0 && <EmptyRow cols={7} label="No buybacks for this period" />}
            {data?.items.map((b) => (
              <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="px-4 py-3 text-gray-500 text-xs">{formatDateTime(b.occurred_at)}</td>
                <td className="px-4 py-3">
                  <div className="text-gray-800">{b.seller_name}</div>
                  <div className="text-xs text-gray-400 font-mono">{b.seller_phone}</div>
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">{b.kind.replace(/_/g, " ")}</td>
                <td className="px-4 py-3 text-xs text-gray-600">
                  {b.karat ? <span className="px-1.5 py-0.5 rounded bg-gold/10 text-gold mr-1">{b.karat}</span> : null}
                  {b.weight_grams != null ? `${Number(b.weight_grams).toFixed(3)}g` : ""}
                </td>
                <td className="px-4 py-3 text-gray-500">{b.quantity ?? "—"}</td>
                <td className="px-4 py-3 font-semibold">{formatUSD(b.buy_price_usd)}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <a href={`/pos/buyback-receipt/${b.id}`} target="_blank" rel="noopener noreferrer" className="text-gold hover:text-gold-dark text-xs">Receipt</a>
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

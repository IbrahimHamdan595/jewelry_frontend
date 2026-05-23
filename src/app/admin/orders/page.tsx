"use client";
import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Download } from "lucide-react";
import { apiFetcher } from "@/lib/api-client";
import { formatUSD, formatDateTime } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { OrderListResponse } from "@/types/api";

export default function OrdersPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");

  const params = new URLSearchParams({ status, page: String(page) });
  const { data } = useSWR<OrderListResponse>(`/orders?${params}`, apiFetcher);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Orders</h2>
        <a
          href={`${process.env.NEXT_PUBLIC_API_URL}/orders/export`}
          className="flex items-center gap-2 border border-gray-200 rounded px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
        >
          <Download className="w-4 h-4" /> Export CSV
        </a>
      </div>

      {/* Summary strip */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-100 rounded-lg p-4">
            <div className="text-xs text-gray-400 uppercase tracking-widest">Total Orders</div>
            <div className="text-2xl font-bold mt-1">{data.total}</div>
          </div>
          <div className="bg-white border border-gray-100 rounded-lg p-4">
            <div className="text-xs text-gray-400 uppercase tracking-widest">Revenue</div>
            <div className="text-2xl font-bold mt-1">{formatUSD(data.total_revenue)}</div>
          </div>
          <div className="bg-white border border-gray-100 rounded-lg p-4">
            <div className="text-xs text-gray-400 uppercase tracking-widest">Avg Order Value</div>
            <div className="text-2xl font-bold mt-1">{formatUSD(data.avg_order_value)}</div>
          </div>
        </div>
      )}

      {/* Status filter */}
      <div className="flex gap-2">
        {["", "COMPLETED", "REFUNDED", "VOIDED"].map((s) => (
          <button key={s} onClick={() => { setStatus(s); setPage(1); }} className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${status === s ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {s || "All"}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              {["Order #", "Date", "Cashier", "Items", "Total", "Payment", "Status", ""].map((h) => (
                <th key={h} className="text-left text-xs text-gray-400 uppercase tracking-widest px-4 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!data && Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}><td colSpan={8}><div className="h-10 px-4 py-3"><div className="h-4 bg-gray-100 animate-pulse rounded" /></div></td></tr>
            ))}
            {data?.items.map((o) => (
              <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="px-4 py-3 font-mono text-xs">{o.order_number}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{formatDateTime(o.created_at)}</td>
                <td className="px-4 py-3 text-gray-600">{o.cashier.name}</td>
                <td className="px-4 py-3 text-gray-500">{o.item_count}</td>
                <td className="px-4 py-3 font-semibold">{formatUSD(o.total_usd)}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{o.payment_method}</td>
                <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                <td className="px-4 py-3"><Link href={`/admin/orders/${o.id}`} className="text-gray-400 hover:text-gold text-xs underline">View</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {data && data.total > 20 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-xs text-gray-400">Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, data.total)} of {data.total}</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-xs border rounded disabled:opacity-40">Prev</button>
              <button disabled={page * 20 >= data.total} onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-xs border rounded disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { apiFetcher, api } from "@/lib/api-client";
import { formatUSD, formatLBP, formatDateTime } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { KaratBadge } from "@/components/shared/KaratBadge";
import type { Order, OrderItemKind } from "@/types/api";

function KindPill({ kind }: { kind: OrderItemKind }) {
  const map: Record<OrderItemKind, string> = {
    PRODUCT: "bg-gold/10 text-gold",
    COIN: "bg-indigo-50 text-indigo-700",
    OUNCE: "bg-blue-50 text-blue-700",
  };
  return (
    <span className={`text-[11px] px-2 py-0.5 rounded font-mono ${map[kind]}`}>
      {kind}
    </span>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: order, mutate } = useSWR<Order>(`/orders/${id}`, apiFetcher);
  const [voidReason, setVoidReason] = useState("");
  const [showVoid, setShowVoid] = useState(false);

  if (!order) return <div className="animate-pulse h-64 bg-gray-100 rounded-lg" />;

  async function handleVoid() {
    if (!voidReason.trim()) return;
    await api.post(`/orders/${id}/void`, { reason: voidReason });
    mutate();
    setShowVoid(false);
  }

  async function handleRefund() {
    await api.post(`/orders/${id}/refund`);
    mutate();
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">{order.order_number}</h2>
          <div className="flex items-center gap-3 mt-1">
            <StatusBadge status={order.status} />
            <span className="text-xs text-gray-400">{formatDateTime(order.created_at)}</span>
            <span className="text-xs text-gray-400">Cashier: {order.cashier.name}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {order.status === "COMPLETED" && (
            <>
              <button onClick={handleRefund} className="px-3 py-2 text-xs border border-yellow-300 text-yellow-700 rounded hover:bg-yellow-50 transition-colors">Refund</button>
              <button onClick={() => setShowVoid(true)} className="px-3 py-2 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50 transition-colors">Void Order</button>
            </>
          )}
        </div>
      </div>

      {/* Void overlay */}
      {showVoid && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium text-red-800">Void Order</p>
          <input
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
            placeholder="Reason for voiding…"
            className="w-full border border-red-200 rounded px-3 py-2 text-sm focus:outline-none"
          />
          <div className="flex gap-2">
            <button onClick={handleVoid} className="px-4 py-2 bg-red-600 text-white text-xs rounded hover:bg-red-700">Confirm Void</button>
            <button onClick={() => setShowVoid(false)} className="px-4 py-2 border rounded text-xs">Cancel</button>
          </div>
        </div>
      )}

      {/* Items */}
      <div className={`bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden relative ${order.status === "VOIDED" ? "opacity-70" : ""}`}>
        {order.status === "VOIDED" && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <span className="text-red-500/30 text-8xl font-bold rotate-[-30deg] select-none tracking-widest">VOIDED</span>
          </div>
        )}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              {["Item", "Kind", "Qty", "Karat", "Weight", "Rate at Sale", "Margin", "Making", "Price"].map((h) => (
                <th key={h} className="text-left text-xs text-gray-400 uppercase tracking-widest px-4 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="border-b border-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-800">{item.product_name}</div>
                  <div className="text-xs text-gray-400 font-mono">{item.product_code}</div>
                </td>
                <td className="px-4 py-3">
                  <KindPill kind={item.item_kind} />
                </td>
                <td className="px-4 py-3 text-gray-700 font-semibold">×{item.quantity}</td>
                <td className="px-4 py-3"><KaratBadge karat={item.karat} /></td>
                <td className="px-4 py-3 text-gray-600">{Number(item.weight_grams).toFixed(3)}g</td>
                <td className="px-4 py-3 text-gray-600">${Number(item.gold_rate_at_sale).toFixed(2)}/g</td>
                <td className="px-4 py-3 text-gray-500">
                  {item.item_kind === "PRODUCT" ? `${item.margin_percent}%` : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {Number(item.making_charge) > 0 ? formatUSD(item.making_charge) : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3 font-semibold">{formatUSD(item.final_price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5 space-y-2 text-sm">
        <div className="flex justify-between text-gray-500">
          <span>Subtotal</span><span>{formatUSD(order.subtotal)}</span>
        </div>
        <div className="flex justify-between text-gray-500">
          <span>VAT {order.vat_percent}%</span><span>{formatUSD(order.vat_amount)}</span>
        </div>
        <div className="flex justify-between text-xl font-bold text-gray-900 border-t border-gray-100 pt-2 mt-2">
          <span>Total</span><span className="font-serif text-gold">{formatUSD(order.total_usd)}</span>
        </div>
        <div className="flex justify-between text-xs text-gray-400">
          <span>LBP Equivalent</span><span>{formatLBP(order.total_lbp)}</span>
        </div>
        <div className="flex justify-between text-xs text-gray-400">
          <span>Payment Method</span><span>{order.payment_method}</span>
        </div>
      </div>
    </div>
  );
}

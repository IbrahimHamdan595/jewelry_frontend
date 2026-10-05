"use client";
import { Ltr } from "@/components/shared/Ltr";
import { useState } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { apiFetcher, api } from "@/lib/api-client";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton, SkeletonText, CardSkeleton } from "@/components/ui/skeleton";
import { formatUSD, formatLBP } from "@/lib/utils";
import { useFormat } from "@/hooks/useFormat";
import { useLang } from "@/context/LanguageContext";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { KaratBadge } from "@/components/shared/KaratBadge";
import { Dialog } from "@/components/ui/dialog";
import type { Order, OrderItem, OrderItemKind } from "@/types/api";

function KindPill({ kind }: { kind: OrderItemKind }) {
  const { t } = useLang();
  const map: Record<OrderItemKind, string> = {
    PRODUCT: "bg-gold/10 text-gold",
    COIN: "bg-indigo-50 text-indigo-700",
    OUNCE: "bg-blue-50 text-blue-700",
  };
  return (
    <span className={`text-[11px] px-2 py-0.5 rounded ltr:font-mono ${map[kind]}`}>
      {t.orders.itemKind[kind] ?? kind}
    </span>
  );
}

export default function OrderDetailPage() {
  const { formatDateTime } = useFormat();
  const { t } = useLang();
  const o = t.orders;
  const { id } = useParams<{ id: string }>();
  const { data: order, error: loadError, isValidating, mutate } = useSWR<Order>(`/orders/${id}`, apiFetcher);
  const [voidReason, setVoidReason] = useState("");
  const [showVoid, setShowVoid] = useState(false);
  const [refundItem, setRefundItem] = useState<OrderItem | null>(null);
  const [refundQty, setRefundQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loadError && !order)
    return <ErrorState error={loadError} onRetry={() => mutate()} retrying={isValidating} />;
  if (!order)
    return (
      <div className="max-w-3xl space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="rounded-lg border border-gray-100 bg-white p-5 shadow-sm">
          <SkeletonText lines={8} />
        </div>
        <CardSkeleton />
      </div>
    );

  const canModify = order.status === "COMPLETED";
  const canRefundItems = order.status === "COMPLETED" || order.status === "PARTIALLY_REFUNDED";

  // Cash actually returned to the customer for a given pre-discount line value:
  // VAT is added (charged on the pre-discount subtotal) and the order discount
  // is subtracted proportionally — mirrors the backend refund recompute.
  const cashFactor = 1 + Number(order.vat_percent) / 100 - Number(order.discount_percent) / 100;
  const refundCash = (lineSubtotal: number) => lineSubtotal * cashFactor;

  async function handleVoid() {
    if (!voidReason.trim()) return;
    await api.post(`/orders/${id}/void`, { reason: voidReason });
    mutate();
    setShowVoid(false);
  }

  function openRefund(item: OrderItem) {
    setError(null);
    setRefundItem(item);
    setRefundQty(item.quantity - item.refunded_qty); // default: all remaining
  }

  async function confirmRefund() {
    if (!refundItem) return;
    setBusy(true);
    setError(null);
    try {
      // Products are quantity-based too (Phase 3), so always send the quantity.
      await api.post(`/orders/${id}/items/${refundItem.id}/refund`, { quantity: refundQty });
      await mutate();
      setRefundItem(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : o.refundFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800"><Ltr>{order.order_number}</Ltr></h2>
          <div className="flex items-center gap-3 mt-1">
            <StatusBadge status={order.status} />
            <span className="text-xs text-gray-400">{formatDateTime(order.created_at)}</span>
            <span className="text-xs text-gray-400">{o.cashierLine(order.cashier.name)}</span>
            {order.customer_name && (
              <span className="text-xs text-gray-400">{o.customerLine(order.customer_name)}</span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <a
            href={`/pos/receipt/${id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 text-xs border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
          >
            {o.printReceipt}
          </a>
          {canModify && (
            <button onClick={() => setShowVoid(true)} className="px-3 py-2 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50 transition-colors">{o.voidOrder}</button>
          )}
        </div>
      </div>

      {/* Void overlay */}
      {showVoid && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium text-red-800">{o.voidOrder}</p>
          <input
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
            placeholder={o.voidReason}
            aria-label={o.voidReason}
            className="w-full border border-red-200 rounded px-3 py-2 text-sm focus:outline-none"
          />
          <div className="flex gap-2">
            <button onClick={handleVoid} className="px-4 py-2 bg-red-600 text-white text-xs rounded hover:bg-red-700">{o.confirmVoid}</button>
            <button onClick={() => setShowVoid(false)} className="px-4 py-2 border rounded text-xs">{o.dismiss}</button>
          </div>
        </div>
      )}

      {/* Items */}
      <div className={`bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden relative ${order.status === "VOIDED" ? "opacity-70" : ""}`}>
        {order.status === "VOIDED" && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <span className="text-red-500/30 text-8xl font-bold rotate-[-30deg] select-none tracking-widest">{o.voidedStamp}</span>
          </div>
        )}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              {[o.colItem, o.colKind, o.colQty, t.products.karat, t.products.colWeight, o.colRateAtSale, t.common.price, ""].map((h, i) => (
                <th key={i} className="text-start text-xs text-gray-400 uppercase tracking-widest px-4 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => {
              const remaining = item.quantity - item.refunded_qty;
              return (
                <tr key={item.id} className="border-b border-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800">{item.product_name}</div>
                    <div className="text-xs text-gray-400 font-mono">{item.product_code}</div>
                    {item.refunded_qty > 0 && (
                      <div className="text-[11px] mt-0.5 text-status-refunded font-medium">
                        {o.refundedLine(item.refunded_qty, item.quantity, formatUSD(refundCash(Number(item.refunded_amount))))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3"><KindPill kind={item.item_kind} /></td>
                  <td className="px-4 py-3 text-gray-700 font-semibold">×{item.quantity}</td>
                  <td className="px-4 py-3"><KaratBadge karat={item.karat} /></td>
                  <td className="px-4 py-3 text-gray-600">{Number(item.weight_grams).toFixed(3)}{t.dashboard.grams}</td>
                  <td className="px-4 py-3 text-gray-600">${Number(item.gold_rate_at_sale).toFixed(2)}{t.products.perGram}</td>
                  <td className="px-4 py-3 font-semibold">{formatUSD(item.final_price)}</td>
                  <td className="px-4 py-3 text-end">
                    {canRefundItems && remaining > 0 ? (
                      <button
                        onClick={() => openRefund(item)}
                        className="px-2.5 py-1 text-[11px] border border-yellow-300 text-yellow-700 rounded hover:bg-yellow-50 transition-colors"
                      >
                        {o.refund}
                      </button>
                    ) : remaining === 0 ? (
                      <span className="text-[11px] text-gray-300">{o.status.REFUNDED}</span>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5 space-y-2 text-sm">
        <div className="flex justify-between text-gray-500">
          <span>{t.common.subtotal}</span><span>{formatUSD(order.subtotal)}</span>
        </div>
        <div className="flex justify-between text-gray-500">
          <span>{t.common.vat} {order.vat_percent}%</span><span>{formatUSD(order.vat_amount)}</span>
        </div>
        {Number(order.discount_amount) > 0 && (
          <div className="flex justify-between text-status-refunded">
            <span>{o.discountPct(Number(order.discount_percent))}</span>
            <span>−{formatUSD(order.discount_amount)}</span>
          </div>
        )}
        <div className="flex justify-between text-xl font-bold text-gray-900 border-t border-gray-100 pt-2 mt-2">
          <span>{t.common.total}</span><span className="font-serif text-gold">{formatUSD(order.total_usd)}</span>
        </div>
        <div className="flex justify-between text-xs text-gray-400">
          <span>{o.lbpEquivalent}</span><span>{formatLBP(order.total_lbp)}</span>
        </div>
        <div className="flex justify-between text-xs text-gray-400">
          <span>{o.paymentMethod}</span><span>{o.payment[order.payment_method] ?? order.payment_method}</span>
        </div>
        {(order.status === "PARTIALLY_REFUNDED" || order.status === "REFUNDED") && (
          <p className="text-[11px] text-status-refunded pt-1">
            {o.refundTotalsNote}
          </p>
        )}
      </div>

      {/* Per-item refund confirm */}
      <Dialog open={!!refundItem} onClose={() => setRefundItem(null)} title={o.refundItem}>
        {refundItem && (
          <div className="space-y-4">
            <div>
              <div className="font-medium text-gray-800">{refundItem.product_name}</div>
              <div className="text-xs text-gray-400 font-mono">{refundItem.product_code}</div>
            </div>
            {(() => {
              const maxQty = refundItem.quantity - refundItem.refunded_qty;
              const unitSubtotal = Number(refundItem.final_price) / refundItem.quantity;
              const estCash = refundCash(unitSubtotal * refundQty);
              return (
                <div className="space-y-2">
                  {maxQty > 1 ? (
                    <label className="block space-y-2">
                      <span className="text-sm text-gray-600">{o.refundQty(maxQty)}</span>
                      <input
                        type="number"
                        min={1}
                        max={maxQty}
                        value={refundQty}
                        onChange={(e) => setRefundQty(Math.max(1, Math.min(maxQty, Number(e.target.value))))}
                        className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gold"
                      />
                    </label>
                  ) : (
                    <p className="text-sm text-gray-600">
                      {refundItem.item_kind === "PRODUCT"
                        ? o.unitReturnsToStock
                        : o.lineWillRefund}
                    </p>
                  )}
                  <p className="text-xs text-gray-400">
                    {o.returnedToCustomer} <span className="font-medium text-gray-600">{formatUSD(estCash)}</span>
                    {(Number(order.discount_percent) > 0 || Number(order.vat_percent) > 0) && (
                      <> {o.refundIncl(Number(order.vat_percent), Number(order.discount_percent))}</>
                    )}
                    {" · "}{o.returnsUnits(refundQty)}
                  </p>
                </div>
              );
            })()}
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-2 justify-end">
              <button onClick={() => setRefundItem(null)} className="px-4 py-2 border rounded text-xs">{o.dismiss}</button>
              <button
                onClick={confirmRefund}
                disabled={busy}
                className="px-4 py-2 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700 disabled:opacity-50"
              >
                {busy ? o.refunding : o.confirmRefund}
              </button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}

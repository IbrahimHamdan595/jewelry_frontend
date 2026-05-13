"use client";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { apiFetcher } from "@/lib/api-client";
import { formatUSD, formatLBP, formatDateTime } from "@/lib/utils";
import type { Order } from "@/types/api";

export default function ReceiptPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { data: order } = useSWR<Order>(`/orders/${orderId}`, apiFetcher);

  if (!order) return <div className="min-h-screen bg-pos-bg flex items-center justify-center"><div className="animate-pulse text-pos-gray">Loading receipt…</div></div>;

  return (
    <div className="min-h-screen bg-pos-bg flex flex-col items-center justify-center py-8 print:bg-white print:min-h-0 print:py-0">
      <div className="mb-4 flex gap-3 print:hidden">
        <button onClick={() => window.print()} className="px-5 py-2.5 bg-gold text-pos-bg rounded text-sm font-medium hover:bg-gold-dark transition-colors">Print Receipt</button>
        <button onClick={() => window.history.back()} className="px-5 py-2.5 border border-white/20 rounded text-sm text-pos-cream hover:bg-white/5 transition-colors">Back</button>
      </div>

      <div id="receipt" className="bg-white text-gray-900 p-6 font-mono text-xs" style={{ width: "80mm" }}>
        {/* Header */}
        <div className="text-center mb-4">
          <div className="font-serif text-lg font-bold tracking-widest">MAISON ZAHAB</div>
          <div className="text-[10px] mt-1 text-gray-500">Gold Jewellery</div>
        </div>

        <div className="border-t border-dashed border-gray-300 my-3" />

        {/* Metadata */}
        <div className="space-y-1 text-[10px]">
          <div className="flex justify-between"><span className="text-gray-500">ORDER</span><span>{order.order_number}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">DATE</span><span>{formatDateTime(order.created_at)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">CASHIER</span><span>{order.cashier.name}</span></div>
          {order.customer_name && <div className="flex justify-between"><span className="text-gray-500">CUSTOMER</span><span>{order.customer_name}</span></div>}
        </div>

        <div className="border-t border-dashed border-gray-300 my-3" />

        {/* Line items */}
        <div className="space-y-2">
          {order.items.map((item) => (
            <div key={item.id}>
              <div className="flex justify-between">
                <span className="flex-1 truncate pr-2">{item.product_name}</span>
                <span className="font-bold">{formatUSD(item.final_price)}</span>
              </div>
              <div className="text-gray-400 text-[9px]">
                {item.product_code} · {item.karat} · {item.weight_grams}g @ ${Number(item.gold_rate_at_sale).toFixed(2)}/g
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-dashed border-gray-300 my-3" />

        {/* Totals */}
        <div className="space-y-1 text-[10px]">
          <div className="flex justify-between"><span>Subtotal</span><span>{formatUSD(order.subtotal)}</span></div>
          <div className="flex justify-between"><span>VAT {order.vat_percent}%</span><span>{formatUSD(order.vat_amount)}</span></div>
          <div className="flex justify-between font-bold text-sm mt-1"><span>TOTAL</span><span>{formatUSD(order.total_usd)}</span></div>
          <div className="flex justify-between text-gray-400"><span>LBP Equiv.</span><span>{formatLBP(order.total_lbp)}</span></div>
          <div className="flex justify-between"><span>Payment</span><span>{order.payment_method}</span></div>
        </div>

        <div className="border-t border-dashed border-gray-300 my-3" />

        {/* Footer */}
        <div className="text-center text-[9px] text-gray-400 space-y-1">
          <div>Thank you for shopping at MAISON ZAHAB</div>
          <div>Exchange within 7 days with receipt</div>
          <div className="mt-2 font-bold text-gray-600">{order.order_number}</div>
        </div>
      </div>
    </div>
  );
}

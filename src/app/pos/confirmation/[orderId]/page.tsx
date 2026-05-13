"use client";
import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import Link from "next/link";
import { apiFetcher } from "@/lib/api-client";
import { formatUSD, formatLBP } from "@/lib/utils";
import type { Order } from "@/types/api";

export default function ConfirmationPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const router = useRouter();
  const { data: order } = useSWR<Order>(`/orders/${orderId}`, apiFetcher);

  useEffect(() => {
    const timer = setTimeout(() => router.push("/pos"), 30000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-pos-bg flex flex-col items-center justify-center px-4">
      {/* Animated checkmark */}
      <div className="mb-8 animate-scale-in">
        <svg width="80" height="80" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="36" fill="none" stroke="#C9A84C" strokeWidth="3" />
          <path
            d="M24 40 L35 52 L56 28"
            fill="none"
            stroke="#C9A84C"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="50"
            className="animate-check-draw"
          />
        </svg>
      </div>

      <h1 className="font-serif text-3xl text-gold tracking-widest mb-2">SALE COMPLETE</h1>
      {order?.customer_name && (
        <p className="font-serif italic text-xl text-pos-cream/70 mb-8">Thank you, {order.customer_name}</p>
      )}

      {order && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-8 w-full max-w-sm space-y-4 text-center">
          <div className="font-mono text-xs text-pos-gray">{order.order_number}</div>
          <div className="font-serif text-5xl text-gold font-bold">{formatUSD(order.total_usd)}</div>
          <div className="text-pos-gray text-xs">{formatLBP(order.total_lbp)}</div>
          <div className="grid grid-cols-3 gap-4 pt-2 border-t border-white/10">
            <div>
              <div className="text-pos-gray text-[10px] uppercase tracking-widest">Payment</div>
              <div className="text-pos-cream text-sm mt-1">{order.payment_method}</div>
            </div>
            <div>
              <div className="text-pos-gray text-[10px] uppercase tracking-widest">Items</div>
              <div className="text-pos-cream text-sm mt-1">{order.items.length}</div>
            </div>
            <div>
              <div className="text-pos-gray text-[10px] uppercase tracking-widest">Cashier</div>
              <div className="text-pos-cream text-sm mt-1 truncate">{order.cashier.name}</div>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3 mt-8">
        <Link href={`/pos/receipt/${orderId}`} className="px-5 py-3 border border-white/20 rounded text-sm hover:bg-white/5 transition-colors">Print Receipt</Link>
        <Link href="/pos" className="px-8 py-3 bg-gold hover:bg-gold-dark text-pos-bg font-semibold rounded text-sm tracking-wider transition-colors">+ New Order</Link>
      </div>

      <p className="text-pos-gray/40 text-xs mt-6">Returning to POS in 30 seconds…</p>
    </div>
  );
}

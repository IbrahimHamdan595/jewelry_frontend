"use client";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { CheckCircle, Printer, RotateCw } from "lucide-react";
import { apiFetcher } from "@/lib/api-client";
import { formatUSD, formatDateTime } from "@/lib/utils";
import type { WalkinBuyback } from "@/types/api";

export default function BuybackReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: bb } = useSWR<WalkinBuyback>(`/buybacks/${id}`, apiFetcher);

  if (!bb) {
    return (
      <div className="min-h-screen bg-pos-bg flex items-center justify-center text-pos-cream">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pos-bg text-pos-cream p-8">
      <div className="max-w-xl mx-auto">
        {/* Success header — non-printable */}
        <div className="flex flex-col items-center mb-6 print:hidden">
          <CheckCircle className="w-14 h-14 text-green-400 mb-3" />
          <div className="text-lg font-medium">Buy back recorded</div>
          <div className="text-xs text-pos-gray mt-1">
            Paid {formatUSD(bb.buy_price_usd)} for {bb.kind.replace("_", " ").toLowerCase()}
          </div>
        </div>

        {/* The receipt itself */}
        <div className="bg-white text-gray-900 rounded-lg shadow-lg p-8 space-y-6 print:shadow-none print:rounded-none">
          <div className="text-center pb-4 border-b border-gray-200">
            <div className="font-serif text-2xl text-gold tracking-widest">MAISON ZAHAB</div>
            <div className="text-xs text-gray-500 uppercase tracking-widest mt-1">
              Buy-back receipt
            </div>
          </div>

          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <div className="text-gray-500">Reference</div>
            <div className="text-right font-mono">{bb.id.slice(0, 12)}…</div>
            <div className="text-gray-500">Date</div>
            <div className="text-right">{formatDateTime(bb.occurred_at)}</div>
            <div className="text-gray-500">Seller</div>
            <div className="text-right">{bb.seller_name}</div>
            <div className="text-gray-500">Phone</div>
            <div className="text-right font-mono">{bb.seller_phone}</div>
          </div>

          <div className="border-t border-gray-200 pt-4 space-y-2 text-sm">
            <div className="grid grid-cols-2">
              <div className="text-gray-500">Kind</div>
              <div className="text-right font-medium">{bb.kind.replace("_", " ")}</div>
            </div>
            {bb.karat && (
              <div className="grid grid-cols-2">
                <div className="text-gray-500">Karat</div>
                <div className="text-right">
                  <span className="px-2 py-0.5 rounded bg-gold/10 text-gold text-xs font-medium">
                    {bb.karat}
                  </span>
                </div>
              </div>
            )}
            {bb.weight_grams != null && (
              <div className="grid grid-cols-2">
                <div className="text-gray-500">Weight</div>
                <div className="text-right font-mono">{Number(bb.weight_grams).toFixed(3)}g</div>
              </div>
            )}
            {bb.quantity != null && (
              <div className="grid grid-cols-2">
                <div className="text-gray-500">Quantity</div>
                <div className="text-right">× {bb.quantity}</div>
              </div>
            )}
            <div className="grid grid-cols-2">
              <div className="text-gray-500">Rate at buy</div>
              <div className="text-right font-mono">${Number(bb.gold_rate_at_buy).toFixed(2)}/g</div>
            </div>
            <div className="grid grid-cols-2">
              <div className="text-gray-500">Price mode</div>
              <div className="text-right text-xs uppercase tracking-widest">{bb.price_mode}</div>
            </div>
            {bb.notes && (
              <div className="grid grid-cols-2">
                <div className="text-gray-500">Notes</div>
                <div className="text-right text-xs italic">{bb.notes}</div>
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 pt-4 flex justify-between text-lg">
            <span className="font-medium">Paid to seller</span>
            <span className="font-bold text-gold font-serif">
              {formatUSD(bb.buy_price_usd)}
            </span>
          </div>

          <div className="text-center text-[10px] text-gray-400 pt-2">
            Seller signature: ____________________________
          </div>
        </div>

        {/* Actions — non-printable */}
        <div className="flex justify-center gap-3 mt-6 print:hidden">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-sm text-pos-cream transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button
            onClick={() => router.push("/pos/buyback")}
            className="flex items-center gap-2 px-5 py-2.5 bg-gold hover:bg-gold-dark text-black text-sm font-semibold rounded transition-colors"
          >
            <RotateCw className="w-4 h-4" />
            New buy back
          </button>
        </div>
      </div>
    </div>
  );
}

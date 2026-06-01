"use client";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { CheckCircle, Printer, RotateCw } from "lucide-react";
import { apiFetcher } from "@/lib/api-client";
import { formatUSD } from "@/lib/utils";
import { Receipt, ReceiptPrintStyles } from "@/components/shared/Receipt";
import type { Receipt as ReceiptData } from "@/types/api";

export default function BuybackReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: receipt } = useSWR<ReceiptData>(`/buybacks/${id}/receipt`, apiFetcher);

  if (!receipt) {
    return (
      <div className="min-h-screen bg-pos-bg flex items-center justify-center text-pos-cream">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pos-bg text-pos-cream p-8 print:bg-white print:p-0">
      <ReceiptPrintStyles />
      <div className="max-w-xl mx-auto flex flex-col items-center">
        {/* Success header — non-printable */}
        <div className="flex flex-col items-center mb-6 receipt-print-hidden print:hidden">
          <CheckCircle className="w-14 h-14 text-green-400 mb-3" />
          <div className="text-lg font-medium">Buy back recorded</div>
          <div className="text-xs text-pos-gray mt-1">
            Paid {formatUSD(receipt.totals.total_usd)} to {receipt.party.name}
          </div>
        </div>

        <Receipt data={receipt} />

        {/* Actions — non-printable */}
        <div className="flex justify-center gap-3 mt-6 receipt-print-hidden print:hidden">
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

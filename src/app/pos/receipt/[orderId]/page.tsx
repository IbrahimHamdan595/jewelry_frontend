"use client";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { apiFetcher } from "@/lib/api-client";
import { ErrorState } from "@/components/ui/error-state";
import { ReceiptScreen } from "@/components/shared/Receipt";
import type { Receipt } from "@/types/api";

export default function ReceiptPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { data: receipt, error, isValidating, mutate } = useSWR<Receipt>(`/orders/${orderId}/receipt`, apiFetcher);

  if (error && !receipt)
    return (
      <div className="min-h-screen bg-pos-bg flex items-center justify-center p-6">
        <ErrorState variant="dark" error={error} onRetry={() => mutate()} retrying={isValidating} />
      </div>
    );
  if (!receipt)
    return (
      <div className="min-h-screen bg-pos-bg flex items-center justify-center">
        <div className="animate-pulse text-pos-gray">Loading receipt…</div>
      </div>
    );

  return <ReceiptScreen data={receipt} />;
}

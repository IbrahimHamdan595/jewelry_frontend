"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import Link from "next/link";
import {
  ClipboardCheck,
  Plus,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { apiFetcher, api } from "@/lib/api-client";
import type { StockTake, StockTakeList } from "@/types/stock-take";

export default function StockTakeIndexPage() {
  const router = useRouter();
  const { data, mutate } = useSWR<StockTakeList>(
    "/stock-takes?page_size=50",
    apiFetcher,
  );
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    setStarting(true);
    setError(null);
    try {
      const t = await api.post<StockTake>("/stock-takes", { notes: null });
      router.push(`/admin/stock-take/${t.id}`);
    } catch (e: any) {
      setError(e.message ?? "Failed to start stock-take");
      setStarting(false);
    }
  }

  const items = data?.items ?? [];

  return (
    <div className="max-w-6xl space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-gold" />
            Stock-take
          </h2>
          <p className="text-xs text-gray-500 mt-1 max-w-2xl">
            Physically count coin and ounce stock; submit for review; approve
            or reject each variance. <span className="font-medium">Nothing
            touches inventory until you click Approve on a specific line.</span>
          </p>
        </div>
        <button
          onClick={handleStart}
          disabled={starting}
          className="px-4 py-2 bg-gold text-white text-sm rounded hover:bg-gold-dark disabled:opacity-50 flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          {starting ? "Starting…" : "Start new count"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {!data ? (
        <div className="h-32 bg-gray-100 animate-pulse rounded-lg" />
      ) : items.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-10 text-center">
          <ClipboardCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <div className="text-sm font-medium text-gray-800">No stock-takes yet</div>
          <div className="text-xs text-gray-500 mt-1">
            Click "Start new count" to begin a physical count.
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-xs text-gray-400 uppercase tracking-widest font-medium">
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Started</th>
                <th className="text-left px-4 py-3">Closed</th>
                <th className="text-right px-4 py-3">Lines</th>
                <th className="text-right px-4 py-3">Variances</th>
                <th className="text-right px-4 py-3">Approved</th>
                <th className="text-right px-4 py-3">Rejected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((t) => {
                const hasRejected = t.rejected_count > 0;
                return (
                  <tr
                    key={t.id}
                    className={
                      hasRejected
                        ? "hover:bg-red-50/40 cursor-pointer"
                        : "hover:bg-gray-50 cursor-pointer"
                    }
                    onClick={() => router.push(`/admin/stock-take/${t.id}`)}
                  >
                    <td className="px-4 py-3">
                      <StatusBadge status={t.status} hasRejected={hasRejected} />
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {new Date(t.started_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {t.closed_at ? new Date(t.closed_at).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">{t.line_count}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{t.variance_line_count}</td>
                    <td className="px-4 py-3 text-right">
                      {t.approved_count > 0 ? (
                        <span className="text-emerald-700">{t.approved_count}</span>
                      ) : (
                        <span className="text-gray-300">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {/* Rejected count rendered prominently — these are
                         the "knowingly wrong" decisions and the operator
                         must be able to spot them in the list at a glance. */}
                      {t.rejected_count > 0 ? (
                        <span className="text-red-700 font-semibold inline-flex items-center gap-1">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          {t.rejected_count}
                        </span>
                      ) : (
                        <span className="text-gray-300">0</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


function StatusBadge({
  status,
  hasRejected,
}: {
  status: "DRAFT" | "SUBMITTED" | "CLOSED";
  hasRejected: boolean;
}) {
  // Closed-with-rejected gets its own visual treatment so it does NOT
  // collapse under the generic green CLOSED. The backend B2 guarantee
  // (drift survives rejection) is made visible HERE.
  if (status === "CLOSED" && hasRejected) {
    return (
      <span className="px-2 py-1 bg-red-50 text-red-800 border border-red-200 text-xs rounded inline-flex items-center gap-1.5">
        <ShieldAlert className="w-3 h-3" />
        Closed with rejection
      </span>
    );
  }
  if (status === "CLOSED") {
    return (
      <span className="px-2 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs rounded inline-flex items-center gap-1.5">
        <CheckCircle2 className="w-3 h-3" />
        Closed
      </span>
    );
  }
  if (status === "SUBMITTED") {
    return (
      <span className="px-2 py-1 bg-amber-50 text-amber-800 border border-amber-200 text-xs rounded inline-flex items-center gap-1.5">
        <AlertTriangle className="w-3 h-3" />
        Awaiting review
      </span>
    );
  }
  return (
    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded inline-flex items-center gap-1.5">
      <Clock className="w-3 h-3" />
      Draft
    </span>
  );
}

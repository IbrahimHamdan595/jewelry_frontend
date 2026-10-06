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
import { apiFetcher, api, errorMessage } from "@/lib/api-client";
import { ErrorState } from "@/components/ui/error-state";
import { useLang } from "@/context/LanguageContext";
import { useFormat } from "@/hooks/useFormat";
import type { StockTake, StockTakeList } from "@/types/stock-take";

export default function StockTakeIndexPage() {
  const router = useRouter();
  const { t } = useLang();
  const s = t.stockTake;
  const { formatDateTime } = useFormat();
  const { data, error: loadError, isValidating, mutate } = useSWR<StockTakeList>(
    "/stock-takes?page_size=50",
    apiFetcher,
  );
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    setStarting(true);
    setError(null);
    try {
      const created = await api.post<StockTake>("/stock-takes", { notes: null });
      router.push(`/admin/stock-take/${created.id}`);
    } catch (e) {
      setError(errorMessage(e, s.startFailed));
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
            {t.nav.stockTake}
          </h2>
          <p className="text-xs text-gray-500 mt-1 max-w-2xl">
            {s.intro}{" "}
            <span className="font-medium">{s.introStrong}</span>
          </p>
        </div>
        <button
          onClick={handleStart}
          disabled={starting}
          className="px-4 py-2 bg-gold text-white text-sm rounded hover:bg-gold-dark disabled:opacity-50 flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          {starting ? s.starting : s.startNew}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {loadError && !data ? (
        <ErrorState error={loadError} onRetry={() => mutate()} retrying={isValidating} />
      ) : !data ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-10 text-center">
          <ClipboardCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <div className="text-sm font-medium text-gray-800">{s.emptyTitle}</div>
          <div className="text-xs text-gray-500 mt-1">
            {s.emptyHint}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-xs text-gray-400 uppercase tracking-widest font-medium">
                <th className="text-start px-4 py-3">{t.common.status}</th>
                <th className="text-start px-4 py-3">{s.colStarted}</th>
                <th className="text-start px-4 py-3">{s.colClosed}</th>
                <th className="text-end px-4 py-3">{s.colLines}</th>
                <th className="text-end px-4 py-3">{s.colVariances}</th>
                <th className="text-end px-4 py-3">{s.colApproved}</th>
                <th className="text-end px-4 py-3">{s.colRejected}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((take) => {
                const hasRejected = take.rejected_count > 0;
                return (
                  <tr
                    key={take.id}
                    className={
                      hasRejected
                        ? "hover:bg-red-50/40 cursor-pointer"
                        : "hover:bg-gray-50 cursor-pointer"
                    }
                    onClick={() => router.push(`/admin/stock-take/${take.id}`)}
                  >
                    <td className="px-4 py-3">
                      <StatusBadge status={take.status} hasRejected={hasRejected} />
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {formatDateTime(take.started_at)}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {take.closed_at ? formatDateTime(take.closed_at) : "—"}
                    </td>
                    <td className="px-4 py-3 text-end text-gray-700">{take.line_count}</td>
                    <td className="px-4 py-3 text-end text-gray-700">{take.variance_line_count}</td>
                    <td className="px-4 py-3 text-end">
                      {take.approved_count > 0 ? (
                        <span className="text-emerald-700">{take.approved_count}</span>
                      ) : (
                        <span className="text-gray-300">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-end">
                      {/* Rejected count rendered prominently — these are
                         the "knowingly wrong" decisions and the operator
                         must be able to spot them in the list at a glance. */}
                      {take.rejected_count > 0 ? (
                        <span className="text-red-700 font-semibold inline-flex items-center gap-1">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          {take.rejected_count}
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
  const { t } = useLang();
  const s = t.stockTake;
  // Closed-with-rejected gets its own visual treatment so it does NOT
  // collapse under the generic green CLOSED. The backend B2 guarantee
  // (drift survives rejection) is made visible HERE.
  if (status === "CLOSED" && hasRejected) {
    return (
      <span className="px-2 py-1 bg-red-50 text-red-800 border border-red-200 text-xs rounded inline-flex items-center gap-1.5">
        <ShieldAlert className="w-3 h-3" />
        {s.statusClosedRejected}
      </span>
    );
  }
  if (status === "CLOSED") {
    return (
      <span className="px-2 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs rounded inline-flex items-center gap-1.5">
        <CheckCircle2 className="w-3 h-3" />
        {s.statusClosed}
      </span>
    );
  }
  if (status === "SUBMITTED") {
    return (
      <span className="px-2 py-1 bg-amber-50 text-amber-800 border border-amber-200 text-xs rounded inline-flex items-center gap-1.5">
        <AlertTriangle className="w-3 h-3" />
        {s.statusSubmitted}
      </span>
    );
  }
  return (
    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded inline-flex items-center gap-1.5">
      <Clock className="w-3 h-3" />
      {s.statusDraft}
    </span>
  );
}

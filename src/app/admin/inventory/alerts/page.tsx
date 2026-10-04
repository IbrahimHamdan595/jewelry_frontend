"use client";
import useSWR from "swr";
import Link from "next/link";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { apiFetcher } from "@/lib/api-client";
import { ErrorState } from "@/components/ui/error-state";
import { useLang } from "@/context/LanguageContext";
import type { InventoryAlertsResponse } from "@/types/api";

/** The setting this page watches: a machine identifier shown as-is, not copy. */
const MIN_STOCK_FIELD = "min_stock_qty";

export default function InventoryAlertsPage() {
  const { t } = useLang();
  const a = t.stockAlerts;
  const { data, error, isLoading, isValidating, mutate } = useSWR<InventoryAlertsResponse>(
    "/inventory/alerts",
    apiFetcher,
    { refreshInterval: 60000 },
  );

  if (error && !data) {
    return <ErrorState error={error} onRetry={() => mutate()} retrying={isValidating} />;
  }
  if (isLoading || !data) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>
    );
  }

  if (data.total === 0) {
    // A whole sentence with one slot, so each language places it where it reads best.
    const [hintBefore, hintAfter] = a.healthyHint.split("{field}");
    return (
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-10 text-center">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" aria-hidden />
        <div className="text-sm font-medium text-gray-800">{a.allHealthy}</div>
        <div className="text-xs text-gray-500 mt-1">
          {hintBefore}<span className="font-mono">{MIN_STOCK_FIELD}</span>{hintAfter}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" aria-hidden />
        <div>
          <div className="text-sm font-medium text-amber-900">
            {a.belowMinimum(data.total)}
          </div>
          <div className="text-xs text-amber-800/80 mt-0.5">
            {a.adjustHint}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">
                {a.kind}
              </th>
              <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">
                {a.code}
              </th>
              <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">
                {t.common.name}
              </th>
              <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">
                {a.onHand}
              </th>
              <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">
                {a.minimum}
              </th>
              <th className="px-4 py-3" aria-label={t.common.actions} />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.below_threshold.map((row) => (
              <tr key={`${row.kind}:${row.id}`} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                    {a.kinds[row.kind] ?? row.kind}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-700">{row.code}</td>
                <td className="px-4 py-3 text-gray-800">{row.name_en}</td>
                <td className="px-4 py-3">
                  <span className="font-semibold text-amber-700">{row.on_hand_qty}</span>
                </td>
                <td className="px-4 py-3 text-gray-600">{row.min_stock_qty}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={
                      row.kind === "COIN"
                        ? "/admin/products?tab=coins"
                        : row.kind === "OUNCE"
                          ? "/admin/products?tab=ounces"
                          : `/admin/products/${row.id}`
                    }
                    className="text-xs text-gold hover:text-gold-dark"
                  >
                    {a.manage}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

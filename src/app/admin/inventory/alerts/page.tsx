"use client";
import useSWR from "swr";
import Link from "next/link";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { apiFetcher } from "@/lib/api-client";
import type { InventoryAlertsResponse } from "@/types/api";

export default function InventoryAlertsPage() {
  const { data, isLoading } = useSWR<InventoryAlertsResponse>(
    "/inventory/alerts",
    apiFetcher,
    { refreshInterval: 60000 },
  );

  if (isLoading || !data) {
    return <div className="h-32 bg-gray-100 animate-pulse rounded-lg" />;
  }

  if (data.total === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-10 text-center">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
        <div className="text-sm font-medium text-gray-800">All stock above thresholds</div>
        <div className="text-xs text-gray-500 mt-1">
          Coin and ounce types you&apos;ve set <span className="font-mono">min_stock_qty</span> on are healthy.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <div className="text-sm font-medium text-amber-900">
            {data.total} item{data.total !== 1 ? "s" : ""} at or below minimum stock
          </div>
          <div className="text-xs text-amber-800/80 mt-0.5">
            Adjust stock through buybacks, supplier purchases, or manual adjustments.
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">
                Kind
              </th>
              <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">
                Code
              </th>
              <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">
                Name
              </th>
              <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">
                On hand
              </th>
              <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-widest font-medium">
                Minimum
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.below_threshold.map((row) => (
              <tr key={`${row.kind}:${row.id}`} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                    {row.kind}
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
                        ? "/admin/inventory/coins"
                        : row.kind === "OUNCE"
                          ? "/admin/inventory/ounces"
                          : `/admin/products/${row.id}`
                    }
                    className="text-xs text-gold hover:text-gold-dark"
                  >
                    Manage →
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

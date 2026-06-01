"use client";
/**
 * In-app "market closed / gold feed down" banner (Phase 6 #6). Renders only when
 * the gold rate has been stale long enough that the backend flags
 * `market_closed` (mirrors the Discord alert threshold). Clears automatically on
 * feed recovery. Safe to drop on any admin page.
 */
import { AlertTriangle } from "lucide-react";
import { useGoldRate } from "@/hooks/useGoldRate";
import { formatDateTime } from "@/lib/utils";

export function MarketClosedBanner() {
  const { rate } = useGoldRate();
  if (!rate?.market_closed) return null;
  return (
    <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
      <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
      <div>
        <div className="text-sm font-semibold text-red-800">Market closed / gold feed down</div>
        <div className="text-xs text-red-700">
          The gold rate hasn&apos;t refreshed since {formatDateTime(rate.fetched_at)}. Customers are
          being served the last known rate — set a manual override on the Gold Price page if needed.
        </div>
      </div>
    </div>
  );
}

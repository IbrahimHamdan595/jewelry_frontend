"use client";
/**
 * Stale-gold-rate banner. Two levels, matching the two thresholds the backend
 * computes (app/core/gold_api.py):
 *
 *   is_stale      → amber. Informational. The rate is ageing; nothing is blocked.
 *   market_closed → red.   Sales and buybacks now require an explicit
 *                          acknowledgement (app/core/gold_guard.py), so the admin
 *                          should consider setting a manual override.
 *
 * On a local/on-premise deployment this is the PRIMARY notification channel:
 * the Discord alert cannot be delivered during the outage that causes the
 * staleness in the first place.
 *
 * `variant="dark"` is for the POS (bg-pos-bg); the default light variant is what
 * the admin pages already use.
 */
import { AlertTriangle } from "lucide-react";
import { useGoldRate } from "@/hooks/useGoldRate";
import { formatDateTime } from "@/lib/utils";

interface Props {
  variant?: "light" | "dark";
}

const STYLES = {
  light: {
    amber: "bg-amber-50 border-amber-200 text-amber-900",
    red: "bg-red-50 border-red-200 text-red-800",
    amberIcon: "text-amber-600",
    redIcon: "text-red-600",
    body: "opacity-80",
  },
  dark: {
    amber: "bg-amber-500/10 border-amber-500/40 text-amber-200",
    red: "bg-red-500/15 border-red-500/50 text-red-200",
    amberIcon: "text-amber-400",
    redIcon: "text-red-400",
    body: "opacity-90",
  },
} as const;

export function MarketClosedBanner({ variant = "light" }: Props) {
  const { rate } = useGoldRate();
  if (!rate?.is_stale && !rate?.market_closed) return null;

  const s = STYLES[variant];
  const closed = rate.market_closed;
  const since = formatDateTime(rate.fetched_at);

  return (
    <div
      // Red blocks transactions, so it asserts; amber is informational.
      role={closed ? "alert" : "status"}
      className={`flex items-center gap-3 border rounded-lg p-4 ${closed ? s.red : s.amber}`}
    >
      <AlertTriangle className={`w-5 h-5 shrink-0 ${closed ? s.redIcon : s.amberIcon}`} />
      <div>
        <div className="text-sm font-semibold">
          {closed ? "Market closed / gold feed down" : "Gold rate is ageing"}
        </div>
        <div className={`text-xs ${s.body}`}>
          {closed ? (
            <>
              The rate hasn&apos;t refreshed since {since}. Sales and buybacks now need
              an on-screen confirmation — set a manual override on the Gold Price page
              to price deliberately instead.
            </>
          ) : (
            <>Last refreshed {since}. Still trading on it; no action needed yet.</>
          )}
        </div>
      </div>
    </div>
  );
}

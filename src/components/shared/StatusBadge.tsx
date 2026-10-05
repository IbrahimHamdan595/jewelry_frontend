"use client";
import { cn } from "@/lib/utils";
import { useLang } from "@/context/LanguageContext";
import type { OrderStatus } from "@/types/api";

const MAP: Record<OrderStatus, string> = {
  COMPLETED: "bg-status-completed/15 text-status-completed",
  REFUNDED: "bg-status-refunded/15 text-status-refunded",
  PARTIALLY_REFUNDED: "bg-status-refunded/15 text-status-refunded",
  VOIDED: "bg-status-voided/15 text-status-voided",
};

/**
 * The order-status pill on the orders list, the order detail and the
 * dashboard. The wording is the dictionary's (t.orders.status — the same map
 * the list's filter buttons use); a status this build has no name for falls
 * back to the enum, spaced and lowercased, rather than an empty pill.
 */
export function StatusBadge({ status }: { status: OrderStatus }) {
  const { t } = useLang();
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase", MAP[status])}>
      {t.orders.status[status] ?? status.replace(/_/g, " ").toLowerCase()}
    </span>
  );
}

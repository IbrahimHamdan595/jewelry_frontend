import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/types/api";

const MAP: Record<OrderStatus, string> = {
  COMPLETED: "bg-status-completed/15 text-status-completed",
  REFUNDED: "bg-status-refunded/15 text-status-refunded",
  PARTIALLY_REFUNDED: "bg-status-refunded/15 text-status-refunded",
  VOIDED: "bg-status-voided/15 text-status-voided",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase", MAP[status])}>
      {status.replace(/_/g, " ").toLowerCase()}
    </span>
  );
}

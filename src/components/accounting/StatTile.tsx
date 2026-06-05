import { cn } from "@/lib/utils";

interface StatTileProps {
  label: string;
  value: React.ReactNode;
  sub?: string;
  tone?: "default" | "good" | "warn" | "bad";
  /** render on the dark sidebar background (e.g. a headline figure) */
  dark?: boolean;
  className?: string;
}

const TONE: Record<string, string> = {
  default: "text-gray-900",
  good: "text-green-600",
  warn: "text-amber-600",
  bad: "text-red-500",
};

/**
 * A big-number tile for trial balance / statements / KPIs.
 */
export function StatTile({ label, value, sub, tone = "default", dark, className }: StatTileProps) {
  return (
    <div
      className={cn(
        "rounded-xl p-5",
        dark ? "bg-admin-sidebar" : "bg-white border border-gray-100 shadow-sm",
        className,
      )}
    >
      <div className={cn("text-[10px] font-semibold uppercase tracking-widest mb-2", dark ? "text-white/40" : "text-gray-400")}>
        {label}
      </div>
      <div className={cn("text-kpi font-bold tabular-nums", dark ? "font-serif text-gold" : TONE[tone])}>
        {value}
      </div>
      {sub && <div className={cn("text-xs mt-1", dark ? "text-white/40" : "text-gray-400")}>{sub}</div>}
    </div>
  );
}

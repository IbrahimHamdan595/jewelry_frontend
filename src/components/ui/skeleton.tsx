import { cn } from "@/lib/utils";

/** Single pulse block; size it with className (e.g. "h-64", "h-4 w-24"). */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-gray-200", className)} />;
}

/** Stacked thin text bars; last line is shorter. */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn("h-3 animate-pulse rounded bg-gray-100", i === lines - 1 && "w-2/3")}
        />
      ))}
    </div>
  );
}

/**
 * Skeleton rows for an existing <table>; render inside <tbody> so the real
 * <thead> keeps column widths. cols must match the table's column count.
 */
export function TableSkeleton({ cols, rows = 6 }: { cols: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-b border-gray-50">
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="px-4 py-3">
              <div className="h-4 animate-pulse rounded bg-gray-100" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/** KPI/stat card placeholder matching the admin card chrome. */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg border border-gray-100 bg-white p-5 shadow-sm", className)}>
      <div className="mb-3 h-3 w-24 animate-pulse rounded bg-gray-100" />
      <div className="h-7 w-32 animate-pulse rounded bg-gray-200" />
    </div>
  );
}

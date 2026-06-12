import { cn } from "@/lib/utils";
import { TableSkeleton } from "@/components/ui/skeleton";

export interface Column<T> {
  key: string;
  label: string;
  align?: "start" | "end";
  /** custom cell renderer; defaults to String(row[key]) */
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T, i: number) => string;
  empty: string;
  /** min table width before horizontal scroll kicks in */
  minWidth?: number;
  className?: string;
  /** show skeleton rows instead of empty/rows */
  loading?: boolean;
}

/**
 * The one readable accounting table: uppercase light headers, hover rows,
 * right-aligned tabular numbers via `align: "end"`, built-in empty state,
 * horizontal scroll on small screens. RTL-safe (text-start/text-end).
 */
export function DataTable<T>({ columns, rows, rowKey, empty, minWidth = 540, className, loading }: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className={cn("w-full text-sm", className)} style={{ minWidth }}>
        <thead>
          <tr className="border-b border-gray-100">
            {columns.map((c) => (
              <th
                key={c.key}
                className={cn(
                  "px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400",
                  c.align === "end" ? "text-end" : "text-start",
                )}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <TableSkeleton cols={columns.length} />
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-gray-400">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={rowKey(row, i)} className="border-b border-gray-50 hover:bg-gray-50/50">
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn(
                      "px-4 py-3 text-gray-700",
                      c.align === "end" ? "text-end tabular-nums" : "text-start",
                      c.className,
                    )}
                  >
                    {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

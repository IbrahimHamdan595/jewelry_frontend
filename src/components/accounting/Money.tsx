import { formatUSD } from "@/lib/utils";

interface MoneyProps {
  /** value as number or numeric string (the accounting API returns strings) */
  value: number | string | null | undefined;
  /** render a muted em-dash for null / zero instead of $0.00 */
  dash?: boolean;
  className?: string;
}

/**
 * Consistent money cell: tabular-nums, formatted via the shared formatUSD,
 * with an optional "—" for zero/empty values (keeps tables readable).
 */
export function Money({ value, dash, className }: MoneyProps) {
  const n = value === null || value === undefined || value === "" ? 0 : Number(value);
  if (dash && (Number.isNaN(n) || n === 0)) {
    return <span className={`tabular-nums text-gray-300 ${className ?? ""}`}>—</span>;
  }
  return <span className={`tabular-nums ${className ?? ""}`}>{formatUSD(Number.isNaN(n) ? 0 : n)}</span>;
}

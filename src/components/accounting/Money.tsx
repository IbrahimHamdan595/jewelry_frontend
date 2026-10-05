import { formatUSD } from "@/lib/utils";
import { Ltr } from "@/components/shared/Ltr";

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
 *
 * The amount is isolated left-to-right. Alone in a cell on an Arabic page a
 * negative one ("-$70.00") has no strong character to lean on, so its sign
 * would drift to the far side of the digits; inside the isolate it stays put.
 */
export function Money({ value, dash, className }: MoneyProps) {
  const raw = value === null || value === undefined || value === "" ? 0 : value;
  const n = Number(raw);
  if (dash && (Number.isNaN(n) || n === 0)) {
    return <span className={`tabular-nums text-gray-300 ${className ?? ""}`}>—</span>;
  }
  // A non-numeric string comes back from formatUSD as a dash, not a fake $0.00.
  return <Ltr className={`tabular-nums ${className ?? ""}`}>{formatUSD(raw)}</Ltr>;
}

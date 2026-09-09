import { cn } from "@/lib/utils";

interface Props {
  checked: boolean;
  disabled?: boolean;
  onClick: () => void;
  /** Accessible name; the visible label lives next to the control. */
  label: string;
  className?: string;
}

/** A plain button with switch semantics — no Radix needed for one control. */
export function Switch({ checked, disabled = false, onClick, label, className }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:cursor-not-allowed disabled:opacity-40",
        checked ? "bg-gold" : "bg-gray-300",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "inline-block h-5 w-5 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-5 rtl:-translate-x-5" : "translate-x-0",
        )}
      />
    </button>
  );
}

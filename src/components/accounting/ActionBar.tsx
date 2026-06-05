import { cn } from "@/lib/utils";

interface ActionBarProps {
  /** inline hint shown after the controls (e.g. "pays off oldest invoices first") */
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * The gold action strip: a page's single clear primary action (inputs + one
 * primary Button), with an optional inline hint explaining what it does.
 */
export function ActionBar({ hint, children, className }: ActionBarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-xl border border-gold/20 bg-gold/5 p-3",
        className,
      )}
    >
      {children}
      {hint && <span className="text-xs text-gold-dark/70 ms-1">↳ {hint}</span>}
    </div>
  );
}

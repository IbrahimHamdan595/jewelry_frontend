import { cn } from "@/lib/utils";

interface SectionCardProps {
  title?: string;
  /** small muted hint shown next to the title */
  hint?: string;
  /** optional right-aligned actions slot */
  actions?: React.ReactNode;
  children: React.ReactNode;
  /** drop the inner padding (e.g. when wrapping a full-bleed DataTable) */
  flush?: boolean;
  className?: string;
}

/**
 * A white card section within a page, with an optional title + inline hint and
 * an actions slot. Wraps forms and tables to give each page clear sub-sections.
 */
export function SectionCard({ title, hint, actions, children, flush, className }: SectionCardProps) {
  return (
    <div className={cn("bg-white border border-gray-100 rounded-xl shadow-sm", className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 border-b border-gray-100">
          <div className="flex items-baseline gap-2">
            {title && <h2 className="text-sm font-semibold text-gray-700">{title}</h2>}
            {hint && <span className="text-xs text-gray-400">{hint}</span>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={flush ? "" : "p-5"}>{children}</div>
    </div>
  );
}

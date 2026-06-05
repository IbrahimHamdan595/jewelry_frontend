import { cn } from "@/lib/utils";

interface PageHeaderProps {
  /** small uppercase gold label above the title */
  eyebrow?: string;
  /** serif gold page title */
  title: string;
  /** plain-language explainer paragraph */
  description?: string;
  /** optional right-aligned slot (date picker, verify badge, etc.) */
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Standard accounting page header: eyebrow + serif gold title + a plain-language
 * explainer paragraph telling the admin what the page is for / what to do.
 * RTL-safe (logical utilities only).
 */
export function PageHeader({ eyebrow, title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-4 mb-6", className)}>
      <div className="min-w-0">
        {eyebrow && (
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-dark mb-1">
            {eyebrow}
          </div>
        )}
        <h1 className="font-serif text-3xl font-semibold text-gray-900">{title}</h1>
        {description && (
          <p className="text-sm leading-relaxed text-gray-500 max-w-2xl mt-2">{description}</p>
        )}
      </div>
      {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
    </div>
  );
}

import { Spinner } from "@/components/ui/spinner";

/**
 * The one loading state for accounting pages: a centred gold spinner with an
 * optional label. Use while a primary dataset is being fetched; table-shaped
 * data should instead lean on `DataTable`'s built-in empty state once loaded.
 */
export function Loading({ label, className }: { label?: string; className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-2 py-16 text-sm text-gray-400 ${className ?? ""}`}>
      <Spinner className="w-4 h-4 text-gold" />
      {label && <span>{label}</span>}
    </div>
  );
}

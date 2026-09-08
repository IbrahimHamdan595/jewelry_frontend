"use client";
/**
 * The one UI behind every error.tsx. Deliberately generic: a render error's
 * message is a stack frame or a raw payload, neither of which belongs on a
 * screen a customer can see over the cashier's shoulder. Developers get the
 * real error in the console; support gets Next's `digest` as a reference.
 */
import { useEffect } from "react";
import { useSWRConfig } from "swr";
import { AlertTriangle } from "lucide-react";
import { useLang } from "@/context/LanguageContext";
import { RetryButton } from "@/components/ui/error-state";
import { cn } from "@/lib/utils";

export interface ErrorScreenProps {
  error: Error & { digest?: string };
  reset: () => void;
  variant: "light" | "dark";
  hint?: string;
  /** Plain anchor, not a Link: a full navigation is a clean slate, and the cart is in sessionStorage. */
  home?: { href: string; label: string };
  className?: string;
}

export function ErrorScreen({ error, reset, variant, hint, home, className }: ErrorScreenProps) {
  const { t } = useLang();
  const { mutate } = useSWRConfig();
  const dark = variant === "dark";

  useEffect(() => {
    console.error("[error boundary]", error);
  }, [error]);

  async function retry() {
    // The usual cause of a render error is a payload the UI did not expect.
    // Re-rendering against the same cached data would throw again at once, so
    // clear every SWR key and refetch the mounted ones before resetting.
    try {
      await mutate(() => true, undefined, { revalidate: true });
    } catch {
      // Whatever is still wrong will show up again through the boundary.
    }
    reset();
  }

  const linkClass = cn(
    "inline-flex items-center rounded px-3 py-1.5 text-xs font-medium transition-colors",
    dark ? "border border-white/15 text-pos-cream hover:bg-white/5" : "border border-gray-200 text-gray-700 hover:bg-gray-50",
  );

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center min-h-[50vh]",
        dark ? "text-pos-cream" : "text-gray-800",
        className,
      )}
    >
      <AlertTriangle className={cn("w-8 h-8", dark ? "text-red-400" : "text-red-500")} />
      <h2 className="font-serif text-2xl tracking-widest">{t.errors.somethingWentWrong}</h2>
      <p className={cn("max-w-md text-sm", dark ? "text-pos-gray" : "text-gray-500")}>
        {hint ?? t.errors.boundaryHint}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <RetryButton onRetry={retry} variant={variant} />
        <button type="button" onClick={() => window.location.reload()} className={linkClass}>
          {t.errors.reloadPage}
        </button>
        {home && (
          <a href={home.href} className={linkClass}>
            {home.label}
          </a>
        )}
      </div>
      {error.digest && (
        <p className={cn("font-mono text-[10px]", dark ? "text-pos-gray/60" : "text-gray-400")}>
          {t.errors.reference}: {error.digest}
        </p>
      )}
    </div>
  );
}

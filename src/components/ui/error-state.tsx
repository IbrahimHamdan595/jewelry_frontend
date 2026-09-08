"use client";
/**
 * Error states for data screens — the "broken" counterpart to the skeletons in
 * ./skeleton.tsx, so a failed fetch stops looking like a slow one.
 *
 *   ErrorState           block placeholder; drop it where the skeleton went
 *   ErrorRow             the same, as a <tr> for a table body
 *   RefreshFailedNotice  slim strip for "data is on screen but the latest
 *                        refresh failed" — the data stays, the strip warns
 *   RetryButton          the shared button; every retry backs off (useRetryBackoff)
 *
 * None of these render an error message or payload. Backend `detail` strings
 * are for mutations the user initiated; a failed read has nothing to tell a
 * cashier beyond "not now, try again".
 */
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useLang } from "@/context/LanguageContext";
import { ApiError } from "@/lib/api-client";
import { useRetryBackoff } from "@/hooks/useRetryBackoff";
import { cn } from "@/lib/utils";

type Variant = "light" | "dark";

interface RetryProps {
  onRetry?: () => void | Promise<unknown>;
  /** SWR's isValidating — disables the button while a retry is in flight. */
  retrying?: boolean;
  variant?: Variant;
}

export function RetryButton({ onRetry, retrying = false, variant = "light", className }: RetryProps & { className?: string }) {
  const { t } = useLang();
  const { retry, cooldownSec } = useRetryBackoff(onRetry ?? (() => {}));
  const disabled = retrying || cooldownSec > 0;
  const label = retrying
    ? t.errors.retrying
    : cooldownSec > 0
      ? t.errors.retryIn(cooldownSec)
      : t.errors.tryAgain;

  return (
    <button
      type="button"
      onClick={retry}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none",
        variant === "dark"
          ? "border border-white/15 text-pos-cream hover:border-white/30 hover:bg-white/5"
          : "border border-gray-200 text-gray-700 hover:bg-gray-50",
        className,
      )}
    >
      <RefreshCw className={cn("w-3.5 h-3.5", retrying && "animate-spin")} />
      {label}
    </button>
  );
}

interface ErrorStateProps extends RetryProps {
  title?: string;
  description?: string;
  /** Inspected for a 404 only — a missing record gets "not found" and no retry. Never rendered. */
  error?: unknown;
  className?: string;
}

function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

export function ErrorState({ title, description, error, onRetry, retrying, variant = "light", className }: ErrorStateProps) {
  const { t } = useLang();
  const dark = variant === "dark";
  const missing = isNotFound(error);
  const heading = title ?? (missing ? t.errors.recordNotFound : t.errors.loadFailed);
  const body = description ?? (missing ? t.errors.recordNotFoundHint : t.errors.loadFailedHint);
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border p-8 text-center",
        dark ? "border-red-500/30 bg-red-500/10 text-red-200" : "border-red-200 bg-red-50 text-red-800",
        className,
      )}
    >
      <AlertTriangle className={cn("w-6 h-6", dark ? "text-red-400" : "text-red-500")} />
      <div>
        <div className="text-sm font-semibold">{heading}</div>
        <div className={cn("text-xs mt-1", dark ? "text-red-200/80" : "text-red-700/80")}>{body}</div>
      </div>
      {onRetry && !missing && <RetryButton onRetry={onRetry} retrying={retrying} variant={variant} />}
    </div>
  );
}

/** ErrorState shaped as a table row; `cols` must match the table's column count. */
export function ErrorRow({ cols, ...rest }: ErrorStateProps & { cols: number }) {
  return (
    <tr>
      <td colSpan={cols} className="p-4">
        <ErrorState {...rest} />
      </td>
    </tr>
  );
}

/** Data is on screen but the latest refresh failed. Keeps the data; warns. */
export function RefreshFailedNotice({ onRetry, retrying, variant = "light", className }: RetryProps & { className?: string }) {
  const { t } = useLang();
  const dark = variant === "dark";
  return (
    <div
      role="status"
      className={cn(
        "flex items-center gap-3 rounded-lg border px-4 py-2 text-xs",
        dark ? "border-amber-500/40 bg-amber-500/10 text-amber-200" : "border-amber-200 bg-amber-50 text-amber-800",
        className,
      )}
    >
      <AlertTriangle className={cn("w-4 h-4 shrink-0", dark ? "text-amber-400" : "text-amber-600")} />
      <span className="flex-1">{t.errors.refreshFailed}</span>
      {onRetry && <RetryButton onRetry={onRetry} retrying={retrying} variant={variant} />}
    </div>
  );
}

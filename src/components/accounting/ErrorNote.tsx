"use client";
import { useLang } from "@/context/LanguageContext";
import { errorMessage } from "@/lib/api-client";

/**
 * A failure as it was caught, and what was being attempted. Keep THIS in
 * state, not a message: the words are chosen when it is rendered, so they are
 * in the language on screen now — including after the user switches language
 * with the error still showing — and a loader run from a mount effect does not
 * have to depend on the dictionary.
 */
export interface Failure {
  err: unknown;
  /** "load": a read (list, report). "action": something the user asked to be done. */
  during: "load" | "action";
}

/** The red line above an accounting page: the server's reason, or the translated fallback for what failed. */
export function ErrorNote({ failure }: { failure: Failure | null }) {
  const { t } = useLang();
  if (!failure) return null;
  const fallback = failure.during === "load" ? t.errors.loadFailed : t.errors.actionFailed;
  return (
    <div role="alert" className="text-sm text-red-600">
      {errorMessage(failure.err, fallback)}
    </div>
  );
}

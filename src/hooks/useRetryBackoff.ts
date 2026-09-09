"use client";
import { useCallback, useEffect, useState } from "react";

const BASE_MS = 2_000;
const MAX_MS = 30_000;

/** Wait before the (attempt+1)th manual retry: 2s, 4s, 8s, 16s, then capped at 30s. */
export function backoffMs(attempt: number): number {
  return Math.min(MAX_MS, BASE_MS * 2 ** attempt);
}

/**
 * Throttle a manual "try again" so a cashier can't hammer a backend that is
 * already down. Each consecutive click waits twice as long as the last.
 *
 * The count is local to the component: when the data finally arrives the error
 * UI unmounts, which is exactly when the backoff should reset.
 */
export function useRetryBackoff(onRetry: () => void | Promise<unknown>) {
  const [attempt, setAttempt] = useState(0);
  // Absolute deadline rather than a decrementing counter: one timeout re-enables
  // the button at exactly the right moment, and the 1s tick is display-only.
  const [deadline, setDeadline] = useState(0);
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (!deadline) return;
    const tick = setInterval(() => setNow(Date.now()), 1_000);
    const done = setTimeout(() => setDeadline(0), Math.max(0, deadline - Date.now()));
    return () => {
      clearInterval(tick);
      clearTimeout(done);
    };
  }, [deadline]);

  const cooldownSec = deadline ? Math.max(0, Math.ceil((deadline - now) / 1_000)) : 0;

  const retry = useCallback(() => {
    if (deadline) return;
    const at = Date.now();
    setNow(at);
    setDeadline(at + backoffMs(attempt));
    setAttempt((a) => a + 1);
    void onRetry();
  }, [attempt, deadline, onRetry]);

  return { retry, cooldownSec, attempt };
}

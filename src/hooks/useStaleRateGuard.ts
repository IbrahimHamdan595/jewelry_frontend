"use client";
import { useEffect, useMemo, useState } from "react";
import { useGoldRate } from "./useGoldRate";
import type { StaleRateAck } from "@/types/api";

/**
 * Drives the "I accept this stale rate" confirmation for a money-moving submit.
 *
 * The backend (app/core/gold_guard.py) rejects a sale or buyback with 409 once
 * the rate is `market_closed`, unless the request names the exact rate timestamp
 * being accepted. This hook owns that small state machine so all four submit
 * paths behave identically.
 *
 * The acceptance resets whenever the rate changes: a cashier who ticked the box
 * for a 09:12 rate has not accepted the 09:42 one, and the server would reject
 * it as a mismatch anyway.
 */
export function useStaleRateGuard() {
  const { rate } = useGoldRate();
  const [accepted, setAccepted] = useState(false);

  const required = Boolean(rate?.market_closed);
  const fetchedAt = rate?.fetched_at;

  useEffect(() => {
    setAccepted(false);
  }, [fetchedAt]);

  // Memoised so a consumer can safely put `ack` in a dependency array.
  const ack = useMemo<StaleRateAck | undefined>(
    () =>
      required && accepted && fetchedAt ? { rate_fetched_at: fetchedAt } : undefined,
    [required, accepted, fetchedAt]
  );

  return {
    /** The rate is stale enough that the server will demand an acknowledgement. */
    required,
    /** The cashier has ticked the box. */
    accepted,
    setAccepted,
    /** Submit must stay disabled while this is true. */
    blocked: required && !accepted,
    /**
     * Spread into the request body. Undefined unless an ack is both required and
     * given — the token is never issued on the cashier's behalf, so a submit that
     * slips past a disabled button fails safe with a 409 instead of silently
     * accepting a stale price.
     */
    ack,
    /** The timestamp being acknowledged — feed straight to StaleRateAckNotice. */
    fetchedAt,
    rate,
  };
}

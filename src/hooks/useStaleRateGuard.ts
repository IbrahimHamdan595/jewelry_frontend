"use client";
import { useEffect, useState } from "react";
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

  return {
    /** The rate is stale enough that the server will demand an acknowledgement. */
    required,
    /** The cashier has ticked the box. */
    accepted,
    setAccepted,
    /** Submit must stay disabled while this is true. */
    blocked: required && !accepted,
    /** Spread into the request body; undefined when no ack is needed. */
    ack: required && fetchedAt ? ({ rate_fetched_at: fetchedAt } as StaleRateAck) : undefined,
    rate,
  };
}

import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useStaleRateGuard } from "@/hooks/useStaleRateGuard";
import type { GoldRate } from "@/types/api";

const gold = vi.hoisted(() => ({ rate: undefined as unknown, refresh: vi.fn() }));
vi.mock("@/hooks/useGoldRate", () => ({
  useGoldRate: () => ({ rate: gold.rate, refresh: gold.refresh, error: undefined, isLoading: false, isValidating: false }),
}));

// GoldRateOut (GET /gold-price) while the feed has been down long enough to be
// market_closed. `fetched_at` is a timestamptz and carries Postgres' microseconds.
// NEX-54 turns the four rates from JSON numbers into exact decimal strings.
const FETCHED_AT = "2026-09-08T10:00:00.123456Z";
const CLOSED_NUMBERS: GoldRate = {
  rate_24k: 141.66, rate_22k: 129.9, rate_21k: 123.95, rate_18k: 106.25,
  source: "live", fetched_at: FETCHED_AT, is_stale: true, market_closed: true,
};
const CLOSED_STRINGS: GoldRate = { ...CLOSED_NUMBERS, rate_24k: "141.66", rate_22k: "129.90", rate_21k: "123.95", rate_18k: "106.25" };

describe("useStaleRateGuard — the acknowledgement names the timestamp, never the rate (NEX-54)", () => {
  it.each([
    ["numbers", CLOSED_NUMBERS],
    ["decimal strings", CLOSED_STRINGS],
  ])("rates as %s: blocked until accepted, then sends fetched_at exactly as the API gave it", (_name, rate) => {
    gold.rate = rate;
    const { result } = renderHook(() => useStaleRateGuard());
    expect(result.current.required).toBe(true);
    expect(result.current.blocked).toBe(true);
    expect(result.current.ack).toBeUndefined();

    act(() => result.current.setAccepted(true));
    expect(result.current.blocked).toBe(false);
    // The backend (app/core/gold_guard.py) compares this timestamp with the
    // rate's own, within a second. It is the string from GET /gold-price,
    // untouched: no Date round-trip, no rate in the body.
    expect(result.current.ack).toEqual({ rate_fetched_at: FETCHED_AT });
  });

  it("the backend switching shape mid-shift does not un-tick the box: same rate, same timestamp", () => {
    gold.rate = CLOSED_NUMBERS;
    const { result, rerender } = renderHook(() => useStaleRateGuard());
    act(() => result.current.setAccepted(true));

    gold.rate = CLOSED_STRINGS; // the next poll, answered by the new backend
    rerender();
    expect(result.current.accepted).toBe(true);
    expect(result.current.ack).toEqual({ rate_fetched_at: FETCHED_AT });
  });

  it("a newer rate is a different rate: the acceptance is withdrawn", () => {
    gold.rate = CLOSED_STRINGS;
    const { result, rerender } = renderHook(() => useStaleRateGuard());
    act(() => result.current.setAccepted(true));

    gold.rate = { ...CLOSED_STRINGS, rate_24k: "142.10", fetched_at: "2026-09-08T10:30:00.654321Z" };
    rerender();
    expect(result.current.accepted).toBe(false);
    expect(result.current.ack).toBeUndefined();
  });

  it("a fresh rate asks for nothing and attaches nothing, in either shape", () => {
    for (const rate of [CLOSED_NUMBERS, CLOSED_STRINGS]) {
      gold.rate = { ...rate, is_stale: false, market_closed: false };
      const { result, unmount } = renderHook(() => useStaleRateGuard());
      expect(result.current.required).toBe(false);
      expect(result.current.blocked).toBe(false);
      act(() => result.current.setAccepted(true));
      expect(result.current.ack).toBeUndefined();
      unmount();
    }
  });
});

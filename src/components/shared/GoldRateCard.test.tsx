import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GoldRateCard } from "@/components/shared/GoldRateCard";
import { formatDateTime } from "@/lib/utils";
import type { GoldRate } from "@/types/api";

type HookValue = {
  rate?: GoldRate;
  error?: Error;
  isLoading: boolean;
  isValidating: boolean;
  refresh: () => Promise<unknown>;
};

const hook = vi.hoisted(() => ({ value: {} as HookValue }));
vi.mock("@/hooks/useGoldRate", () => ({ useGoldRate: () => hook.value }));
vi.mock("@/lib/api-client", () => ({ api: { post: vi.fn(() => Promise.resolve()) } }));

const rate: GoldRate = {
  rate_24k: 141.66,
  rate_22k: 130.1,
  rate_21k: 123.95,
  rate_18k: 106.25,
  source: "test",
  fetched_at: "2026-09-08T10:00:00Z",
  is_stale: false,
  market_closed: false,
};

const refresh = vi.fn(() => Promise.resolve());

function setHook(partial: Partial<HookValue>) {
  hook.value = { rate: undefined, error: undefined, isLoading: false, isValidating: false, refresh, ...partial };
}

describe("GoldRateCard", () => {
  beforeEach(() => refresh.mockClear());

  it("labels the loading skeleton so slow does not look broken", () => {
    setHook({ isLoading: true, isValidating: true });
    render(<GoldRateCard />);
    expect(screen.getByText(/fetching rate/i)).toBeInTheDocument();
  });

  it("shows an explicit failure with a retry when there is no rate at all", () => {
    setHook({ error: new Error("ECONNREFUSED 127.0.0.1:8001") });
    render(<GoldRateCard />);
    expect(screen.getByText(/rate unavailable/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("keeps the last known rate on screen when a refresh fails", () => {
    setHook({ rate, error: new Error("ECONNREFUSED") });
    render(<GoldRateCard />);
    expect(screen.getByText("141.66")).toBeInTheDocument();
    expect(screen.getByText("123.95")).toBeInTheDocument();
    expect(screen.getByText("106.25")).toBeInTheDocument();
  });

  it("marks a last-known rate as feed down, with the time it was fetched", () => {
    setHook({ rate, error: new Error("ECONNREFUSED") });
    render(<GoldRateCard />);
    expect(screen.getByText(/feed down/i)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(formatDateTime(rate.fetched_at)))).toBeInTheDocument();
    expect(screen.queryByText(/live/i)).toBeNull();
  });

  it("never prints the error message", () => {
    setHook({ rate, error: new Error("ECONNREFUSED 127.0.0.1:8001") });
    render(<GoldRateCard />);
    expect(screen.queryByText(/ECONNREFUSED/)).toBeNull();
  });

  it("offers a backed-off retry in the feed-down state", () => {
    setHook({ rate, error: new Error("down") });
    render(<GoldRateCard />);
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("compact variant keeps the values and the feed-down marker", () => {
    setHook({ rate, error: new Error("down") });
    render(<GoldRateCard compact />);
    expect(screen.getByText("141.66")).toBeInTheDocument();
    expect(screen.getByText(/feed down/i)).toBeInTheDocument();
  });

  it("shows LIVE when the rate is fresh and the feed is healthy", () => {
    setHook({ rate });
    render(<GoldRateCard />);
    expect(screen.getByText(/live/i)).toBeInTheDocument();
    expect(screen.queryByText(/feed down/i)).toBeNull();
  });

  it("still shows STALE when the server flags the rate as stale", () => {
    setHook({ rate: { ...rate, is_stale: true } });
    render(<GoldRateCard compact />);
    expect(screen.getByText(/stale/i)).toBeInTheDocument();
  });
});

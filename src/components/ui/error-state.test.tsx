import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ErrorState } from "@/components/ui/error-state";

describe("ErrorState retry", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("calls onRetry when the retry button is clicked", () => {
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} />);
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("disables the retry button while a retry is in flight", () => {
    render(<ErrorState onRetry={() => {}} retrying />);
    expect(screen.getByRole("button", { name: /retrying/i })).toBeDisabled();
  });

  it("backs off between manual retries: 2s, then 4s, then 8s", () => {
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} />);
    const button = () => screen.getByRole("button");

    fireEvent.click(button());
    expect(button()).toBeDisabled();
    act(() => vi.advanceTimersByTime(1999));
    expect(button()).toBeDisabled();
    act(() => vi.advanceTimersByTime(1));
    expect(button()).toBeEnabled();

    fireEvent.click(button());
    act(() => vi.advanceTimersByTime(3999));
    expect(button()).toBeDisabled();
    act(() => vi.advanceTimersByTime(1));
    expect(button()).toBeEnabled();

    fireEvent.click(button());
    act(() => vi.advanceTimersByTime(7999));
    expect(button()).toBeDisabled();
    act(() => vi.advanceTimersByTime(1));
    expect(button()).toBeEnabled();

    expect(onRetry).toHaveBeenCalledTimes(3);
  });

  it("caps the cooldown at 30s", () => {
    render(<ErrorState onRetry={() => {}} />);
    const button = () => screen.getByRole("button");
    // 2, 4, 8, 16, 32→30: after the fifth click the wait must be 30s, not 32s.
    for (let i = 0; i < 4; i++) {
      fireEvent.click(button());
      act(() => vi.advanceTimersByTime(60_000));
    }
    fireEvent.click(button());
    act(() => vi.advanceTimersByTime(29_999));
    expect(button()).toBeDisabled();
    act(() => vi.advanceTimersByTime(1));
    expect(button()).toBeEnabled();
  });

  it("shows the remaining cooldown so the wait reads as deliberate", () => {
    render(<ErrorState onRetry={() => {}} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("button")).toHaveTextContent(/2/);
  });
});

describe("ErrorRow", () => {
  it("spans the table's columns so it replaces the skeleton rows in place", async () => {
    const { ErrorRow } = await import("@/components/ui/error-state");
    render(<table><tbody><ErrorRow cols={7} onRetry={() => {}} /></tbody></table>);
    expect(screen.getByRole("cell")).toHaveAttribute("colspan", "7");
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});

describe("RefreshFailedNotice", () => {
  it("is a status strip with a retry, not an alert that hides the data", async () => {
    const { RefreshFailedNotice } = await import("@/components/ui/error-state");
    const onRetry = vi.fn();
    render(<RefreshFailedNotice onRetry={onRetry} />);
    expect(screen.getByRole("status")).toHaveTextContent(/couldn't refresh/i);
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe("ErrorState with a 404", () => {
  it("says the record is missing and offers no retry", async () => {
    const { ErrorState } = await import("@/components/ui/error-state");
    const { ApiError } = await import("@/lib/api-client");
    render(<ErrorState error={new ApiError(404, "Product 8f3a not found")} onRetry={() => {}} />);
    expect(screen.getByRole("alert")).toHaveTextContent(/not found/i);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByText(/8f3a/)).toBeNull();
  });

  it("still offers a retry for any other failure", async () => {
    const { ErrorState } = await import("@/components/ui/error-state");
    const { ApiError } = await import("@/lib/api-client");
    render(<ErrorState error={new ApiError(503, "upstream down")} onRetry={() => {}} />);
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    expect(screen.queryByText(/upstream/)).toBeNull();
  });
});

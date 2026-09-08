import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DashboardPage from "@/app/admin/dashboard/page";

const swr = vi.hoisted(() => ({
  state: { data: undefined as unknown, error: undefined as unknown, isLoading: false, isValidating: false },
  mutate: vi.fn(() => Promise.resolve()),
}));
vi.mock("swr", () => ({ default: () => ({ ...swr.state, mutate: swr.mutate }) }));

describe("dashboard error state", () => {
  it("shows an error with a retry instead of an endless skeleton when the fetch fails", () => {
    swr.state = { data: undefined, error: new Error("500 {\"detail\":\"db down\"}"), isLoading: false, isValidating: false };
    render(<DashboardPage />);
    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't load/i);
    expect(screen.queryByText(/db down/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(swr.mutate).toHaveBeenCalledTimes(1);
  });
});

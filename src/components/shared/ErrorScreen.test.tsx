import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ErrorScreen } from "@/components/shared/ErrorScreen";

const swr = vi.hoisted(() => ({ mutate: vi.fn(() => Promise.resolve([])) }));
vi.mock("swr", async (importOriginal) => ({
  ...(await importOriginal<typeof import("swr")>()),
  useSWRConfig: () => ({ mutate: swr.mutate }),
}));

const leaky = Object.assign(new Error('Unexpected token < in JSON {"detail":"card 4111 declined"}'), {
  stack: "Error: at renderPrices (src/app/pos/page.tsx:88:12)",
});

describe("ErrorScreen", () => {
  beforeEach(() => {
    swr.mutate.mockClear();
    vi.spyOn(console, "error").mockImplementation(() => {}); // ErrorScreen logs on purpose
  });

  it("never prints the error message, payload or stack", () => {
    render(<ErrorScreen error={leaky} reset={() => {}} variant="dark" />);
    expect(screen.queryByText(/Unexpected token/)).toBeNull();
    expect(screen.queryByText(/4111/)).toBeNull();
    expect(screen.queryByText(/renderPrices/)).toBeNull();
    expect(screen.queryByText(/page\.tsx/)).toBeNull();
  });

  it("shows a generic title and hint instead", () => {
    render(<ErrorScreen error={leaky} reset={() => {}} variant="light" />);
    expect(screen.getByRole("alert")).toHaveTextContent(/something went wrong/i);
  });

  it("shows the digest as a support reference when Next supplies one", () => {
    render(<ErrorScreen error={Object.assign(new Error("x"), { digest: "1234567890" })} reset={() => {}} variant="light" />);
    expect(screen.getByText(/1234567890/)).toBeInTheDocument();
  });

  it("clears and revalidates every SWR key before resetting, so a bad cached payload is refetched", async () => {
    const reset = vi.fn();
    render(<ErrorScreen error={leaky} reset={reset} variant="dark" />);
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(swr.mutate).toHaveBeenCalledTimes(1);
    expect(reset).not.toHaveBeenCalled();
    await waitFor(() => expect(reset).toHaveBeenCalledTimes(1));
  });

  it("backs off after a retry so the button cannot be hammered", () => {
    render(<ErrorScreen error={leaky} reset={() => {}} variant="dark" />);
    const button = screen.getByRole("button", { name: /try again/i });
    fireEvent.click(button);
    expect(button).toBeDisabled();
  });

  it("offers the home link it was given", () => {
    render(<ErrorScreen error={leaky} reset={() => {}} variant="light" home={{ href: "/admin/dashboard", label: "Dashboard" }} />);
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/admin/dashboard");
  });
});

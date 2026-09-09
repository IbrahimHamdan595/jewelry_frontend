import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import RootError from "@/app/error";
import AdminError from "@/app/admin/error";
import NotFound from "@/app/not-found";

vi.mock("swr", async (importOriginal) => ({
  ...(await importOriginal<typeof import("swr")>()),
  useSWRConfig: () => ({ mutate: vi.fn(() => Promise.resolve([])) }),
}));

const err = new Error("boom");

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {}); // ErrorScreen logs on purpose
});

describe("error pages", () => {
  it("root boundary offers a way back to sign in", () => {
    render(<RootError error={err} reset={() => {}} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /sign in/i })).toHaveAttribute("href", "/login");
  });

  it("admin boundary offers the dashboard", () => {
    render(<AdminError error={err} reset={() => {}} />);
    expect(screen.getByRole("link", { name: /dashboard/i })).toHaveAttribute("href", "/admin/dashboard");
  });

  it("not-found names the problem and links to both entry points", () => {
    render(<NotFound />);
    expect(screen.getByText(/page not found/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /register/i })).toHaveAttribute("href", "/pos");
    expect(screen.getByRole("link", { name: /dashboard/i })).toHaveAttribute("href", "/admin/dashboard");
  });
});

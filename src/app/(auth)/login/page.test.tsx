import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoginPage from "@/app/(auth)/login/page";

const nav = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: nav.push }) }));

const auth = vi.hoisted(() => ({ login: vi.fn() }));
vi.mock("@/lib/auth", () => ({ login: auth.login }));

async function signInAs(role: string, next?: string) {
  window.history.replaceState({}, "", next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  auth.login.mockResolvedValue({ id: "u1", email: "x@y.z", name: "X", role, is_active: true });
  render(<LoginPage />);
  fireEvent.change(screen.getByPlaceholderText(/@/), { target: { value: "x@y.z" } });
  fireEvent.change(screen.getByPlaceholderText("••••••••"), { target: { value: "pw" } });
  fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
  await waitFor(() => expect(auth.login).toHaveBeenCalled());
}

describe("login landing", () => {
  beforeEach(() => {
    nav.push.mockClear();
    auth.login.mockReset();
  });

  it("ADMIN lands on the dashboard", async () => {
    await signInAs("ADMIN");
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith("/admin/dashboard"));
  });

  it("ACCOUNTANT lands on the accounting hub", async () => {
    await signInAs("ACCOUNTANT");
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith("/admin/accounting"));
  });

  it("CASHIER lands on the POS", async () => {
    await signInAs("CASHIER");
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith("/pos"));
  });

  it("honours a deep link the role is allowed to open", async () => {
    await signInAs("ACCOUNTANT", "/admin/accounting/journal?period=2026-09");
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith("/admin/accounting/journal?period=2026-09"));
  });

  it("ignores a deep link the role cannot open and goes home instead", async () => {
    await signInAs("CASHIER", "/admin/accounting/journal");
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith("/pos"));
  });

  it("ignores an external redirect target", async () => {
    await signInAs("ADMIN", "//evil.example/phish");
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith("/admin/dashboard"));
  });

  it("tells a MANAGER the role has no screens yet instead of bouncing them", async () => {
    await signInAs("MANAGER");
    expect(await screen.findByText(/no screens/i)).toBeInTheDocument();
    expect(nav.push).not.toHaveBeenCalled();
  });
});

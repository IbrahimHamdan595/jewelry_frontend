import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import AdminLayout from "@/app/admin/layout";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/accounting",
  useRouter: () => ({ push: vi.fn() }),
}));

function renderAs(role: string | null) {
  sessionStorage.clear();
  if (role) sessionStorage.setItem("mz_user", JSON.stringify({ id: "u1", email: "x@y.z", name: "X", role, is_active: true }));
  render(<AdminLayout><div>page</div></AdminLayout>);
}

const link = (name: RegExp) => screen.queryByRole("link", { name });

describe("admin navigation by role", () => {
  beforeEach(() => sessionStorage.clear());

  it("ADMIN sees every section", () => {
    renderAs("ADMIN");
    for (const n of [/dashboard/i, /products/i, /suppliers/i, /settings/i, /audit ledger/i, /accounting/i]) {
      expect(link(n), String(n)).toBeInTheDocument();
    }
  });

  it("ACCOUNTANT sees only what it can open", () => {
    renderAs("ACCOUNTANT");
    expect(link(/accounting/i)).toBeInTheDocument();
    for (const n of [/dashboard/i, /products/i, /suppliers/i, /settings/i, /audit ledger/i, /inventory/i]) {
      expect(link(n), String(n)).not.toBeInTheDocument();
    }
  });

  it("shows no links until the user is known", () => {
    renderAs(null);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });
});

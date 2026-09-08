import { describe, it, expect, vi, beforeEach } from "vitest";
import { logout } from "@/lib/auth";

vi.mock("@/lib/api-client", () => ({ api: { post: vi.fn(() => Promise.resolve()) } }));

describe("logout", () => {
  beforeEach(() => sessionStorage.clear());

  it("drops the persisted cart so the next cashier does not inherit it", async () => {
    sessionStorage.setItem("mz_cart", JSON.stringify({ items: [{ cartId: "x" }] }));
    sessionStorage.setItem("mz_user", "{}");
    await logout();
    expect(sessionStorage.getItem("mz_cart")).toBeNull();
    expect(sessionStorage.getItem("mz_user")).toBeNull();
  });
});

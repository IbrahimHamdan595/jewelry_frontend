import { describe, it, expect, vi, beforeEach } from "vitest";
import { login, logout } from "@/lib/auth";

const apiMock = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock("@/lib/api-client", () => ({ api: apiMock }));

const admin = { id: "u1", email: "a@b.c", name: "A", role: "ADMIN", is_active: true };

describe("login", () => {
  beforeEach(() => {
    sessionStorage.clear();
    apiMock.post.mockReset();
  });

  it("stores the user for the UI but never writes the token to a cookie", async () => {
    apiMock.post.mockResolvedValue({ access_token: "eyJhbGciOi.payload.sig", token_type: "bearer", user: admin });
    const user = await login("a@b.c", "pw");
    expect(user.role).toBe("ADMIN");
    expect(document.cookie).not.toMatch(/mz_token/);
    expect(document.cookie).not.toMatch(/eyJhbGciOi/);
    expect(JSON.parse(sessionStorage.getItem("mz_user")!).email).toBe("a@b.c");
  });
});

describe("logout", () => {
  beforeEach(() => {
    sessionStorage.clear();
    apiMock.post.mockReset();
    apiMock.post.mockResolvedValue(undefined);
  });

  it("asks the server to expire the HttpOnly cookie", async () => {
    await logout();
    expect(apiMock.post).toHaveBeenCalledWith("/auth/logout");
  });

  it("drops the stored user and the persisted cart so the next cashier inherits nothing", async () => {
    sessionStorage.setItem("mz_cart", JSON.stringify({ items: [{ cartId: "x" }] }));
    sessionStorage.setItem("mz_user", "{}");
    await logout();
    expect(sessionStorage.getItem("mz_cart")).toBeNull();
    expect(sessionStorage.getItem("mz_user")).toBeNull();
  });

  it("still clears local state when the server call fails", async () => {
    apiMock.post.mockRejectedValue(new Error("offline"));
    sessionStorage.setItem("mz_user", "{}");
    await logout();
    expect(sessionStorage.getItem("mz_user")).toBeNull();
  });
});

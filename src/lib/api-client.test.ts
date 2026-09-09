import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { api } from "@/lib/api-client";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("api client", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    sessionStorage.clear();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("talks to the same-origin /api proxy so the HttpOnly cookie is sent", async () => {
    fetchMock.mockResolvedValue(json({ ok: true }));
    await api.get("/gold-price");
    expect(fetchMock).toHaveBeenCalledWith("/api/gold-price", expect.objectContaining({ credentials: "include" }));
  });

  it("ignores NEXT_PUBLIC_API_URL: a cross-origin base would put the cookie out of the middleware's reach", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.elsewhere.example/api");
    fetchMock.mockResolvedValue(json({ ok: true }));
    await api.get("/settings");
    expect(fetchMock.mock.calls[0][0]).toBe("/api/settings");
  });

  it("a 401 forgets the stored user before sending the browser to /login", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {}); // jsdom cannot navigate
    sessionStorage.setItem("mz_user", JSON.stringify({ role: "ADMIN" }));
    fetchMock.mockResolvedValue(json({ detail: "Not authenticated" }, 401));
    await expect(api.get("/auth/me")).rejects.toThrow(/Unauthorized/);
    expect(sessionStorage.getItem("mz_user")).toBeNull();
  });
});

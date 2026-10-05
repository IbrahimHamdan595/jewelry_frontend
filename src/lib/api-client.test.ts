import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { api, ApiError, staleRateError } from "@/lib/api-client";

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

// The stale-rate guard (backend app/core/gold_guard.py) answers a sale or a
// buyback with 409 and a structured `detail`. NEX-54 changes one field of it:
// rate_24k was a JSON number and becomes an exact decimal string.
describe("stale-rate refusals — rate_24k as a number or a decimal string (NEX-54)", () => {
  beforeEach(() => fetchMock.mockReset());

  const detail = (code: string, rate_24k: number | string) => ({
    code,
    message: "Gold rate has not refreshed since 2026-09-08T10:00:00.123456+00:00 (95 minutes ago).",
    rate_24k,
    rate_fetched_at: "2026-09-08T10:00:00.123456+00:00",
    age_minutes: 95,
  });

  it.each([
    ["STALE_RATE_ACK_REQUIRED", 141.66],
    ["STALE_RATE_ACK_REQUIRED", "141.66"],
    ["STALE_RATE_ACK_MISMATCH", 141.66],
    ["STALE_RATE_ACK_MISMATCH", "141.66"],
  ])("%s with rate_24k=%j is recognised, message and timestamp intact", async (code, rate) => {
    fetchMock.mockResolvedValue(json({ detail: detail(code, rate) }, 409));
    const err = await api.post("/orders", {}).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    const stale = staleRateError(err);
    expect(stale).toEqual(detail(code, rate));
    // The cashier is shown the server's sentence, not "[object Object]".
    expect((err as ApiError).message).toBe(detail(code, rate).message);
  });

  it("any other 409 is not a stale-rate refusal", async () => {
    fetchMock.mockResolvedValue(json({ detail: "Insufficient stock for FN-21K-0001: requested 2, on hand 1" }, 409));
    const err = await api.post("/orders", {}).catch((e: unknown) => e);
    expect(staleRateError(err)).toBeNull();
  });
});

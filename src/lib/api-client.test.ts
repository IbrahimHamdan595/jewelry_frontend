import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { api, ApiError, downloadFile, errorMessage, errorStatus, staleRateError, uploadFile } from "@/lib/api-client";

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
    const navigation = vi.spyOn(console, "error").mockImplementation(() => {}); // jsdom cannot navigate, and says so
    window.history.replaceState({}, "", "/admin/orders");
    sessionStorage.setItem("mz_user", JSON.stringify({ role: "ADMIN" }));
    fetchMock.mockResolvedValue(json({ detail: "Not authenticated" }, 401));
    const err = await api.get("/auth/me").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(errorStatus(err)).toBe(401);
    expect(sessionStorage.getItem("mz_user")).toBeNull();
    expect(navigation).toHaveBeenCalled();
    navigation.mockRestore();
  });

  it("a 401 on the sign-in page itself is a wrong password: no reload, and the server's reason reaches the form", async () => {
    // Sending the browser to /login from /login reloads it, which wipes the
    // form, the ?next= deep link and the message the user is about to read.
    const navigation = vi.spyOn(console, "error").mockImplementation(() => {});
    window.history.replaceState({}, "", "/login?next=%2Fadmin%2Forders");
    fetchMock.mockResolvedValue(json({ detail: "Invalid credentials" }, 401));
    const err = await api.post("/auth/login", { email: "x@y.z", password: "nope" }).catch((e: unknown) => e);
    expect(errorStatus(err)).toBe(401);
    expect(errorMessage(err, "Login failed")).toBe("Invalid credentials");
    expect(navigation).not.toHaveBeenCalled();
    expect(window.location.search).toBe("?next=%2Fadmin%2Forders");
    navigation.mockRestore();
    window.history.replaceState({}, "", "/");
  });
});

// What a person is shown when a request fails. The backend's own `detail` is
// server data and is shown as it is; everything else — a dropped connection, a
// bare status, a body with no `detail` — has no words of its own, and the
// caller's translated fallback is used. The English "API error 500" and
// "Failed to fetch" must never reach the screen.
describe("errorMessage — the backend's words, or the caller's translated fallback", () => {
  const FALLBACK = "تعذّر الحفظ"; // what an Arabic screen passes
  beforeEach(() => { fetchMock.mockReset(); }); // braces: a returned function would be run as a teardown

  const failure = async (response: Response | Error) => {
    if (response instanceof Error) fetchMock.mockRejectedValue(response);
    else fetchMock.mockResolvedValue(response);
    return api.post("/suppliers", {}).catch((e: unknown) => e);
  };

  it("a string detail is shown as the server worded it", async () => {
    const err = await failure(json({ detail: "A supplier with this name already exists" }, 409));
    expect(errorMessage(err, FALLBACK)).toBe("A supplier with this name already exists");
    expect(errorStatus(err)).toBe(409);
  });

  it("a structured detail (the stale-rate guard) is shown through its message", async () => {
    const err = await failure(json({ detail: { code: "STALE_RATE_ACK_REQUIRED", message: "Gold rate has not refreshed since 10:00.", rate_24k: "141.66", rate_fetched_at: "2026-09-08T10:00:00+00:00", age_minutes: 95 } }, 409));
    expect(errorMessage(err, FALLBACK)).toBe("Gold rate has not refreshed since 10:00.");
  });

  it.each([
    ["a bare status with an empty JSON body", () => json({}, 500), 500],
    ["a gateway's HTML error page", () => new Response("<html>502 Bad Gateway</html>", { status: 502, headers: { "content-type": "text/html" } }), 502],
    ["the rate limiter's {\"error\": …} body, which has no detail", () => json({ error: "Rate limit exceeded: 5 per 1 minute" }, 429), 429],
    ["a validation list (422), which is not a sentence", () => json({ detail: [{ type: "string_too_short", loc: ["body", "new_password"], msg: "String should have at least 8 characters", input: "x" }] }, 422), 422],
    ["an empty detail", () => json({ detail: "" }, 400), 400],
  ])("%s falls back to the caller's translated message, and still carries the status", async (_name, response, status) => {
    const err = await failure(response());
    expect(errorMessage(err, FALLBACK)).toBe(FALLBACK);
    expect(errorStatus(err)).toBe(status);
    expect(String((err as Error).message)).not.toBe(FALLBACK); // the Error keeps a technical message for logs
  });

  it("a transport failure has no status and shows the fallback, not the browser's \"Failed to fetch\"", async () => {
    const err = await failure(new TypeError("Failed to fetch"));
    expect(errorMessage(err, FALLBACK)).toBe(FALLBACK);
    expect(errorStatus(err)).toBeUndefined();
  });

  it("anything else that was thrown shows the fallback too", () => {
    for (const thrown of [new Error("Cannot read properties of undefined"), "boom", undefined, null, { message: "not an Error" }]) {
      expect(errorMessage(thrown, FALLBACK)).toBe(FALLBACK);
      expect(errorStatus(thrown)).toBeUndefined();
    }
  });

  it("an upload refused without a reason shows the fallback; with one, the reason", async () => {
    fetchMock.mockResolvedValue(json({}, 500));
    const bare = await uploadFile("/uploads", new FormData()).catch((e: unknown) => e);
    expect(errorMessage(bare, FALLBACK)).toBe(FALLBACK);
    expect(errorStatus(bare)).toBe(500);

    fetchMock.mockResolvedValue(json({ detail: "File too large (max 5 MB)" }, 413));
    const told = await uploadFile("/uploads", new FormData()).catch((e: unknown) => e);
    expect(errorMessage(told, FALLBACK)).toBe("File too large (max 5 MB)");
  });

  it("a failed download shows the fallback and carries the status", async () => {
    fetchMock.mockResolvedValue(new Response("nope", { status: 500 }));
    const err = await downloadFile("/accounting/statements/balance-sheet?format=xlsx", "bs.xlsx").catch((e: unknown) => e);
    expect(errorMessage(err, FALLBACK)).toBe(FALLBACK);
    expect(errorStatus(err)).toBe(500);
  });
});


// The stale-rate guard (backend app/core/gold_guard.py) answers a sale or a
// buyback with 409 and a structured `detail`. NEX-54 changes one field of it:
// rate_24k was a JSON number and becomes an exact decimal string.
describe("stale-rate refusals — rate_24k as a number or a decimal string (NEX-54)", () => {
  beforeEach(() => { fetchMock.mockReset(); }); // braces: a returned function would be run as a teardown

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

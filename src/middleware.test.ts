// @vitest-environment node
import { describe, it, expect, vi, beforeAll } from "vitest";
import { SignJWT } from "jose";
import { NextRequest } from "next/server";

const SECRET = "nex-60-test-secret-with-enough-length";
vi.stubEnv("JWT_SECRET", SECRET);
vi.stubEnv("JWT_ALGORITHM", "HS256");
// The middleware derives its key at module load, so import after stubbing
// (a dynamic import in beforeAll rather than top-level await: tsconfig has no
// ES2017+ target, and next build type-checks test files too).
let middleware: typeof import("@/middleware").middleware;
beforeAll(async () => {
  ({ middleware } = await import("@/middleware"));
});

async function tokenFor(role: unknown, secret = SECRET) {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("user-1")
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(secret));
}

async function run(path: string, token?: string) {
  const req = new NextRequest(new URL(path, "http://till.test"));
  if (token) req.cookies.set("mz_token", token);
  const res = await middleware(req);
  const loc = res.headers.get("location");
  return { to: loc ? new URL(loc) : null, setCookie: res.headers.get("set-cookie") ?? "" };
}

const pass = (r: Awaited<ReturnType<typeof run>>) => r.to === null;

describe("route middleware", () => {
  it("ADMIN passes everywhere", async () => {
    const t = await tokenFor("ADMIN");
    for (const p of ["/admin/dashboard", "/admin/products", "/admin/ledger", "/admin/accounting/journal", "/pos"]) {
      expect(pass(await run(p, t)), p).toBe(true);
    }
  });

  it("ACCOUNTANT opens every accounting screen", async () => {
    const t = await tokenFor("ACCOUNTANT");
    for (const p of ["/admin/accounting", "/admin/accounting/journal", "/admin/accounting/trial-balance", "/admin/accounting/periods", "/admin/accounting/kpis"]) {
      expect(pass(await run(p, t)), p).toBe(true);
    }
  });

  it("ACCOUNTANT is sent to the accounting hub from products, suppliers, staff/settings and the inventory ledger", async () => {
    const t = await tokenFor("ACCOUNTANT");
    for (const p of ["/admin/products", "/admin/suppliers", "/admin/settings", "/admin/ledger", "/admin/dashboard"]) {
      const r = await run(p, t);
      expect(r.to?.pathname, p).toBe("/admin/accounting");
    }
  });

  it("CASHIER is sent to the POS from all of /admin", async () => {
    const t = await tokenFor("CASHIER");
    for (const p of ["/admin/dashboard", "/admin/accounting/journal", "/admin/settings"]) {
      expect((await run(p, t)).to?.pathname, p).toBe("/pos");
    }
    expect(pass(await run("/pos", t))).toBe(true);
  });

  it("a missing token goes to /login and remembers the deep link", async () => {
    const r = await run("/admin/accounting/journal?period=2026-09");
    expect(r.to?.pathname).toBe("/login");
    expect(r.to?.searchParams.get("next")).toBe("/admin/accounting/journal?period=2026-09");
  });

  it("an unknown role fails closed to /login with the cookie cleared", async () => {
    for (const role of ["OWNER", "admin", "", 7, undefined]) {
      const r = await run("/pos", await tokenFor(role));
      expect(r.to?.pathname, String(role)).toBe("/login");
      expect(r.setCookie, String(role)).toMatch(/mz_token=;/);
    }
  });

  it("MANAGER fails closed to /login until the backend wires the role", async () => {
    const r = await run("/admin/accounting", await tokenFor("MANAGER"));
    expect(r.to?.pathname).toBe("/login");
  });

  it("a token signed with the wrong secret fails closed", async () => {
    const r = await run("/admin/dashboard", await tokenFor("ADMIN", "some-other-secret-that-is-long-enough"));
    expect(r.to?.pathname).toBe("/login");
    expect(r.setCookie).toMatch(/mz_token=;/);
  });
});

describe("RS256 readiness (NEX-54)", () => {
  it("verifies with the public key only when JWT_PUBLIC_KEY is set, and rejects HS256 tokens", async () => {
    const { generateKeyPair, exportSPKI } = await import("jose");
    const { publicKey, privateKey } = await generateKeyPair("RS256");
    vi.stubEnv("JWT_PUBLIC_KEY", await exportSPKI(publicKey));
    vi.stubEnv("JWT_ALGORITHM", "RS256");
    vi.resetModules();
    const { middleware: mw } = await import("@/middleware");

    const rs = await new SignJWT({ role: "ADMIN" })
      .setProtectedHeader({ alg: "RS256" })
      .setSubject("user-1")
      .setExpirationTime("1h")
      .sign(privateKey);
    const ok = new NextRequest(new URL("/admin/dashboard", "http://till.test"));
    ok.cookies.set("mz_token", rs);
    expect((await mw(ok)).headers.get("location")).toBeNull();

    // The old shared-secret token must not get in once the public key is configured.
    const hs = new NextRequest(new URL("/admin/dashboard", "http://till.test"));
    hs.cookies.set("mz_token", await tokenFor("ADMIN"));
    expect(new URL((await mw(hs)).headers.get("location")!).pathname).toBe("/login");
  });
});

// @vitest-environment node
import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { SignJWT, UnsecuredJWT, base64url, exportPKCS8, exportSPKI, generateKeyPair, type KeyLike } from "jose";
import { NextRequest } from "next/server";

const SECRET = "nex-60-test-secret-with-enough-length";
vi.stubEnv("JWT_SECRET", SECRET);
// The middleware derives its keys at module load, so import after stubbing
// (a dynamic import in beforeAll rather than top-level await: tsconfig has no
// ES2017+ target, and next build type-checks test files too).
let middleware: typeof import("@/middleware").middleware;
beforeAll(async () => {
  ({ middleware } = await import("@/middleware"));
});

async function tokenFor(role: unknown, secret = SECRET, exp: string | number = "1h") {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("user-1")
    .setExpirationTime(exp)
    .sign(new TextEncoder().encode(secret));
}

async function run(path: string, token?: string, mw = middleware) {
  const req = new NextRequest(new URL(path, "http://till.test"));
  if (token) req.cookies.set("mz_token", token);
  const res = await mw(req);
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

describe("RS256 verification (NEX-54)", () => {
  let pem: string;
  let privateKey: KeyLike;
  beforeAll(async () => {
    const pair = await generateKeyPair("RS256", { extractable: true });
    pem = await exportSPKI(pair.publicKey);
    privateKey = pair.privateKey;
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  /** A fresh middleware for one key configuration: it resolves its keys at module load. */
  async function load(env: { publicKey?: string; secret?: string }) {
    vi.stubEnv("JWT_PUBLIC_KEY", env.publicKey);
    vi.stubEnv("JWT_SECRET", env.secret);
    vi.resetModules();
    return (await import("@/middleware")).middleware;
  }

  async function rsTokenFor(role: unknown, key: KeyLike = privateKey, exp: string | number = "1h") {
    return new SignJWT({ role })
      .setProtectedHeader({ alg: "RS256" })
      .setSubject("user-1")
      .setExpirationTime(exp)
      .sign(key);
  }

  /** Turned away like any bad token: to /login, cookie cleared. */
  const rejected = (r: Awaited<ReturnType<typeof run>>) => r.to?.pathname === "/login" && /mz_token=;/.test(r.setCookie);

  it("accepts an RS256 token with only the public key configured", async () => {
    const mw = await load({ publicKey: pem });
    expect(pass(await run("/admin/dashboard", await rsTokenFor("ADMIN"), mw))).toBe(true);
  });

  it("accepts the public key with literal \\n for newlines, as hosting dashboards store it", async () => {
    const mw = await load({ publicKey: pem.replace(/\n/g, "\\n") });
    expect(pass(await run("/admin/dashboard", await rsTokenFor("ADMIN"), mw))).toBe(true);
  });

  it("gates ADMIN, ACCOUNTANT and CASHIER under RS256 exactly as under HS256", async () => {
    const mw = await load({ publicKey: pem });

    const admin = await rsTokenFor("ADMIN");
    for (const p of ["/admin/dashboard", "/admin/products", "/admin/ledger", "/admin/accounting/journal", "/pos"]) {
      expect(pass(await run(p, admin, mw)), p).toBe(true);
    }

    const accountant = await rsTokenFor("ACCOUNTANT");
    for (const p of ["/admin/accounting", "/admin/accounting/journal", "/admin/accounting/trial-balance", "/admin/accounting/periods", "/admin/accounting/kpis"]) {
      expect(pass(await run(p, accountant, mw)), p).toBe(true);
    }
    for (const p of ["/admin/products", "/admin/suppliers", "/admin/settings", "/admin/ledger", "/admin/dashboard"]) {
      expect((await run(p, accountant, mw)).to?.pathname, p).toBe("/admin/accounting");
    }

    const cashier = await rsTokenFor("CASHIER");
    for (const p of ["/admin/dashboard", "/admin/accounting/journal", "/admin/settings"]) {
      expect((await run(p, cashier, mw)).to?.pathname, p).toBe("/pos");
    }
    expect(pass(await run("/pos", cashier, mw))).toBe(true);
  });

  it("fails closed on an unknown role under RS256 too", async () => {
    const mw = await load({ publicKey: pem });
    expect(pass(await run("/pos", await rsTokenFor("CASHIER"), mw))).toBe(true);
    for (const role of ["OWNER", "admin", "", 7, undefined]) {
      expect(rejected(await run("/pos", await rsTokenFor(role), mw)), String(role)).toBe(true);
    }
    expect((await run("/admin/accounting", await rsTokenFor("MANAGER"), mw)).to?.pathname).toBe("/login");
  });

  it("ignores claims it does not read, such as a token version from the backend", async () => {
    const mw = await load({ publicKey: pem });
    const versioned = await new SignJWT({ role: "CASHIER", token_version: 3 })
      .setProtectedHeader({ alg: "RS256" })
      .setSubject("user-1")
      .setExpirationTime("1h")
      .sign(privateKey);
    expect(pass(await run("/pos", versioned, mw))).toBe(true);
    expect((await run("/admin/dashboard", versioned, mw)).to?.pathname).toBe("/pos");
  });

  it("rejects HS256 once only the public key is configured", async () => {
    const mw = await load({ publicKey: pem });
    expect(pass(await run("/admin/dashboard", await rsTokenFor("ADMIN"), mw))).toBe(true);
    expect(rejected(await run("/admin/dashboard", await tokenFor("ADMIN"), mw))).toBe(true);
  });

  it("accepts both kinds during the migration window, each only with its own key", async () => {
    const mw = await load({ publicKey: pem, secret: SECRET });
    expect(pass(await run("/admin/dashboard", await rsTokenFor("ADMIN"), mw))).toBe(true);
    expect(pass(await run("/admin/dashboard", await tokenFor("ADMIN"), mw))).toBe(true);

    const stranger = await generateKeyPair("RS256");
    expect(rejected(await run("/admin/dashboard", await rsTokenFor("ADMIN", stranger.privateKey), mw))).toBe(true);
    expect(rejected(await run("/admin/dashboard", await tokenFor("ADMIN", "some-other-secret-that-is-long-enough"), mw))).toBe(true);
  });

  it("ignores a leftover JWT_ALGORITHM: the algorithm is pinned to the key, not configured", async () => {
    vi.stubEnv("JWT_ALGORITHM", "HS256");
    const rsOnly = await load({ publicKey: pem });
    expect(pass(await run("/admin/dashboard", await rsTokenFor("ADMIN"), rsOnly))).toBe(true);
    expect(rejected(await run("/admin/dashboard", await tokenFor("ADMIN"), rsOnly))).toBe(true);

    vi.stubEnv("JWT_ALGORITHM", "RS256");
    const hsOnly = await load({ secret: SECRET });
    expect(pass(await run("/admin/dashboard", await tokenFor("ADMIN"), hsOnly))).toBe(true);
    expect(rejected(await run("/admin/dashboard", await rsTokenFor("ADMIN"), hsOnly))).toBe(true);
  });

  it("rejects the algorithm-confusion token: HS256 keyed with the public key itself", async () => {
    // The public key is public. If the verifier let the header choose HS256
    // and used the key text as the HMAC secret, anyone could mint an ADMIN.
    const der = Buffer.from(pem.replace(/-----[^-]+-----|\s/g, ""), "base64");
    const guesses: Record<string, Uint8Array> = {
      "the PEM": new TextEncoder().encode(pem),
      "the PEM, trimmed": new TextEncoder().encode(pem.trim()),
      "the PEM with literal \\n": new TextEncoder().encode(pem.replace(/\n/g, "\\n")),
      "the DER bytes": new Uint8Array(der),
    };
    for (const env of [{ publicKey: pem }, { publicKey: pem.replace(/\n/g, "\\n") }, { publicKey: pem, secret: SECRET }]) {
      const mw = await load(env);
      expect(pass(await run("/admin/dashboard", await rsTokenFor("ADMIN"), mw))).toBe(true);
      for (const [name, key] of Object.entries(guesses)) {
        const forged = await new SignJWT({ role: "ADMIN" })
          .setProtectedHeader({ alg: "HS256" })
          .setSubject("user-1")
          .setExpirationTime("1h")
          .sign(key);
        expect(rejected(await run("/admin/dashboard", forged, mw)), name).toBe(true);
      }
    }
  });

  it("rejects alg none, with or without a signature attached", async () => {
    const unsecured = new UnsecuredJWT({ role: "ADMIN" }).setSubject("user-1").setExpirationTime("1h").encode();
    // A genuine token relabelled: same claims, header swapped to "none".
    const [, body, sig] = (await rsTokenFor("ADMIN")).split(".");
    const relabelled = ["none", "None", "NONE"].flatMap((alg) => {
      const head = base64url.encode(JSON.stringify({ alg, typ: "JWT" }));
      return [`${head}.${body}.`, `${head}.${body}.${sig}`];
    });
    for (const env of [{ publicKey: pem }, { secret: SECRET }, { publicKey: pem, secret: SECRET }]) {
      const mw = await load(env);
      const genuine = env.publicKey ? await rsTokenFor("ADMIN") : await tokenFor("ADMIN");
      expect(pass(await run("/admin/dashboard", genuine, mw))).toBe(true);
      for (const t of [unsecured, ...relabelled]) {
        expect(rejected(await run("/admin/dashboard", t, mw)), t).toBe(true);
      }
    }
  });

  it("rejects a tampered RS256 token", async () => {
    const mw = await load({ publicKey: pem });
    const cashier = await rsTokenFor("CASHIER");
    expect(pass(await run("/pos", cashier, mw))).toBe(true);

    // Promote the role in the payload and keep the original signature.
    const [head, body, sig] = cashier.split(".");
    const claims = JSON.parse(new TextDecoder().decode(base64url.decode(body)));
    const promoted = base64url.encode(JSON.stringify({ ...claims, role: "ADMIN" }));
    expect(rejected(await run("/admin/dashboard", `${head}.${promoted}.${sig}`, mw))).toBe(true);

    // And the untouched payload under a damaged signature.
    const damaged = (sig[0] === "A" ? "B" : "A") + sig.slice(1);
    expect(rejected(await run("/pos", `${head}.${body}.${damaged}`, mw))).toBe(true);
  });

  it("rejects an expired token of either kind", async () => {
    const mw = await load({ publicKey: pem, secret: SECRET });
    const aMinuteAgo = Math.floor(Date.now() / 1000) - 60;
    expect(pass(await run("/admin/dashboard", await rsTokenFor("ADMIN"), mw))).toBe(true);
    expect(rejected(await run("/admin/dashboard", await rsTokenFor("ADMIN", privateKey, aMinuteAgo), mw))).toBe(true);
    expect(rejected(await run("/admin/dashboard", await tokenFor("ADMIN", SECRET, aMinuteAgo), mw))).toBe(true);
  });

  it("fails closed when neither key is configured", async () => {
    const mw = await load({});
    for (const t of [await rsTokenFor("ADMIN"), await tokenFor("ADMIN")]) {
      expect(rejected(await run("/admin/dashboard", t, mw))).toBe(true);
    }
  });

  it("treats a public key that does not parse as no public key, and says so without printing it", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const broken = "-----BEGIN PUBLIC KEY-----\nbm90IGEga2V5\n-----END PUBLIC KEY-----";

    // Mid-migration the HS256 sessions keep working; RS256 has nothing to verify against.
    const midMigration = await load({ publicKey: broken, secret: SECRET });
    expect(pass(await run("/admin/dashboard", await tokenFor("ADMIN"), midMigration))).toBe(true);
    expect(rejected(await run("/admin/dashboard", await rsTokenFor("ADMIN"), midMigration))).toBe(true);

    // With the secret gone there is no key at all: everything fails closed.
    const afterCutover = await load({ publicKey: broken });
    expect(rejected(await run("/admin/dashboard", await rsTokenFor("ADMIN"), afterCutover))).toBe(true);
    expect(rejected(await run("/admin/dashboard", await tokenFor("ADMIN"), afterCutover))).toBe(true);

    expect(logged).toHaveBeenCalledTimes(2);
    for (const [message] of logged.mock.calls) {
      expect(String(message)).toContain("JWT_PUBLIC_KEY");
      expect(String(message)).not.toContain("bm90IGEga2V5");
    }
  });

  it("refuses a private key pasted into JWT_PUBLIC_KEY: this side must never hold a signing key", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const mw = await load({ publicKey: await exportPKCS8(privateKey) });
    expect(rejected(await run("/admin/dashboard", await rsTokenFor("ADMIN"), mw))).toBe(true);
    expect(logged).toHaveBeenCalledTimes(1);
  });
});

describe("security headers (NEX-55)", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("attaches a report-only CSP with a fresh nonce, and forwards the nonce to Next", async () => {
    const res = await middleware(new NextRequest(new URL("/login", "http://till.test")));
    const csp = res.headers.get("content-security-policy-report-only")!;
    expect(csp).toContain("frame-ancestors 'none'");
    const nonce = csp.match(/'nonce-([^']+)'/)![1];
    expect(nonce.length).toBeGreaterThanOrEqual(16);
    // Next reads the nonce from the request's CSP header (app-render.js) and
    // the x-nonce header is what server components can read explicitly.
    expect(res.headers.get("x-middleware-request-x-nonce")).toBe(nonce);
    expect(res.headers.get("x-middleware-request-content-security-policy-report-only")).toBe(csp);
    expect(res.headers.get("content-security-policy")).toBeNull();
  });

  it("uses a different nonce for every request", async () => {
    const a = await middleware(new NextRequest(new URL("/login", "http://till.test")));
    const b = await middleware(new NextRequest(new URL("/login", "http://till.test")));
    expect(a.headers.get("x-middleware-request-x-nonce")).not.toBe(b.headers.get("x-middleware-request-x-nonce"));
  });

  it("enforces the policy when CSP_MODE=enforce", async () => {
    vi.stubEnv("CSP_MODE", "enforce");
    const res = await middleware(new NextRequest(new URL("/login", "http://till.test")));
    expect(res.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
    expect(res.headers.get("content-security-policy-report-only")).toBeNull();
  });

  it("puts the CSP on redirects too, and still gates /admin and /pos", async () => {
    const res = await middleware(new NextRequest(new URL("/admin/dashboard", "http://till.test")));
    expect(new URL(res.headers.get("location")!).pathname).toBe("/login");
    expect(res.headers.get("content-security-policy-report-only")).toContain("frame-ancestors 'none'");
  });

  it("leaves routes outside /admin and /pos public: the root redirect and unknown URLs", async () => {
    for (const p of ["/", "/no-such-page"]) {
      const res = await middleware(new NextRequest(new URL(p, "http://till.test")));
      expect(res.headers.get("location"), p).toBeNull();
      expect(res.headers.get("content-security-policy-report-only"), p).toContain("script-src");
    }
  });

  it("matches every HTML route but not the API proxy or static assets", async () => {
    const { config } = await import("@/middleware");
    const { pathToRegexp } = await import("next/dist/compiled/path-to-regexp");
    const matches = (p: string) => config.matcher.some((m: string) => pathToRegexp(m).test(p));
    for (const p of ["/", "/login", "/pos", "/pos/buyback", "/admin/dashboard", "/no-such-page"]) expect(matches(p), p).toBe(true);
    for (const p of ["/api/settings", "/api/auth/login", "/_next/static/chunks/a.js", "/_next/image", "/favicon.ico", "/robots.txt"]) expect(matches(p), p).toBe(false);
  });
});

// @vitest-environment node
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach, type MockInstance } from "vitest";
import { generateKeyPairSync, sign as signWithNode } from "node:crypto";
import { SignJWT, UnsecuredJWT, base64url, exportPKCS8, exportSPKI, generateKeyPair, type JWTVerifyOptions, type KeyLike } from "jose";
import { NextRequest } from "next/server";

// Counts the middleware's signature checks; the real jwtVerify still runs.
const verifications = vi.hoisted(() => ({ count: 0 }));
vi.mock("jose", async (importOriginal) => {
  const jose = await importOriginal<typeof import("jose")>();
  return {
    ...jose,
    jwtVerify: (token: string, key: KeyLike | Uint8Array, options?: JWTVerifyOptions) => {
      verifications.count++;
      return jose.jwtVerify(token, key, options);
    },
  };
});

const SECRET = "nex-60-test-secret-with-enough-length";
vi.stubEnv("JWT_SECRET", SECRET);
// The middleware derives its keys at module load, so import after stubbing
// (a dynamic import in beforeAll rather than top-level await: tsconfig has no
// ES2017+ target, and next build type-checks test files too).
let middleware: typeof import("@/middleware").middleware;
beforeAll(async () => {
  ({ middleware } = await import("@/middleware"));
});

type TokenOptions = { alg?: string; key?: string | Uint8Array | KeyLike; exp?: string | number | null; claims?: Record<string, unknown> };

/** A session token as the backend issues it: HS256 under the shared secret unless told otherwise. */
async function tokenFor(role: unknown, { alg = "HS256", key = SECRET, exp = "1h", claims = {} }: TokenOptions = {}) {
  const jwt = new SignJWT({ role, ...claims }).setProtectedHeader({ alg }).setSubject("user-1");
  if (exp !== null) jwt.setExpirationTime(exp);
  return jwt.sign(typeof key === "string" ? new TextEncoder().encode(key) : key);
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
    const r = await run("/admin/dashboard", await tokenFor("ADMIN", { key: "some-other-secret-that-is-long-enough" }));
    expect(r.to?.pathname).toBe("/login");
    expect(r.setCookie).toMatch(/mz_token=;/);
  });
});

describe("RS256 verification (NEX-54)", () => {
  let pem: string;
  let rs: { alg: "RS256"; key: KeyLike };
  let logged: MockInstance<typeof console.error>;
  let warned: MockInstance<typeof console.warn>;
  beforeAll(async () => {
    const pair = await generateKeyPair("RS256", { extractable: true });
    pem = await exportSPKI(pair.publicKey);
    rs = { alg: "RS256", key: pair.privateKey };
  });
  beforeEach(() => {
    logged = vi.spyOn(console, "error").mockImplementation(() => {});
    warned = vi.spyOn(console, "warn").mockImplementation(() => {});
    verifications.count = 0;
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  /** A fresh middleware for one key configuration: it resolves its keys at module load. */
  async function load(env: { publicKey?: string; secret?: string; algorithm?: string }) {
    vi.stubEnv("JWT_PUBLIC_KEY", env.publicKey);
    vi.stubEnv("JWT_SECRET", env.secret);
    vi.stubEnv("JWT_ALGORITHM", env.algorithm);
    vi.resetModules();
    return (await import("@/middleware")).middleware;
  }

  /** Turned away like any bad token: to /login, cookie cleared. */
  const rejected = (r: Awaited<ReturnType<typeof run>>) => r.to?.pathname === "/login" && /mz_token=;/.test(r.setCookie);

  /** The same claims under another header alg, with the signature kept or dropped. */
  const relabel = (token: string, alg: unknown, keepSignature = true) => {
    const [, body, sig] = token.split(".");
    return `${base64url.encode(JSON.stringify({ alg, typ: "JWT" }))}.${body}.${keepSignature ? sig : ""}`;
  };

  const unsecured = () => new UnsecuredJWT({ role: "ADMIN" }).setSubject("user-1").setExpirationTime("1h").encode();

  it("accepts an RS256 token with only the public key configured", async () => {
    const mw = await load({ publicKey: pem });
    expect(pass(await run("/admin/dashboard", await tokenFor("ADMIN", rs), mw))).toBe(true);
  });

  it("accepts the public key however a dashboard or .env file hands it over", async () => {
    const shapes: Record<string, string> = {
      "literal \\n for newlines": pem.replace(/\n/g, "\\n"),
      "literal \\r\\n for newlines": pem.replace(/\n/g, "\\r\\n"),
      "real \\r\\n newlines": pem.replace(/\n/g, "\r\n"),
      "a leading newline and spaces": `\n  ${pem}`,
      "trailing spaces": `${pem}  `,
      "double quotes": `"${pem}"`,
      "single quotes": `'${pem}'`,
      "quotes around literal \\n, as .env.example shows it": `"${pem.replace(/\n/g, "\\n")}"`,
      "spaces around the quotes": `  "${pem}"  `,
      "spaces inside the quotes": `" ${pem} "`,
      "a leading literal \\n": `\\n${pem.replace(/\n/g, "\\n")}`,
    };
    for (const [shape, publicKey] of Object.entries(shapes)) {
      const mw = await load({ publicKey });
      expect(pass(await run("/admin/dashboard", await tokenFor("ADMIN", rs), mw)), shape).toBe(true);
    }
    expect(logged).not.toHaveBeenCalled();
  });

  it("gates ADMIN, ACCOUNTANT and CASHIER under RS256 exactly as under HS256", async () => {
    const mw = await load({ publicKey: pem });

    const admin = await tokenFor("ADMIN", rs);
    for (const p of ["/admin/dashboard", "/admin/products", "/admin/ledger", "/admin/accounting/journal", "/pos"]) {
      expect(pass(await run(p, admin, mw)), p).toBe(true);
    }

    const accountant = await tokenFor("ACCOUNTANT", rs);
    for (const p of ["/admin/accounting", "/admin/accounting/journal", "/admin/accounting/trial-balance", "/admin/accounting/periods", "/admin/accounting/kpis"]) {
      expect(pass(await run(p, accountant, mw)), p).toBe(true);
    }
    for (const p of ["/admin/products", "/admin/suppliers", "/admin/settings", "/admin/ledger", "/admin/dashboard"]) {
      expect((await run(p, accountant, mw)).to?.pathname, p).toBe("/admin/accounting");
    }

    const cashier = await tokenFor("CASHIER", rs);
    for (const p of ["/admin/dashboard", "/admin/accounting/journal", "/admin/settings"]) {
      expect((await run(p, cashier, mw)).to?.pathname, p).toBe("/pos");
    }
    expect(pass(await run("/pos", cashier, mw))).toBe(true);
  });

  it("fails closed on an unknown role under RS256 too", async () => {
    const mw = await load({ publicKey: pem });
    expect(pass(await run("/pos", await tokenFor("CASHIER", rs), mw))).toBe(true);
    for (const role of ["OWNER", "admin", "", 7, undefined]) {
      expect(rejected(await run("/pos", await tokenFor(role, rs), mw)), String(role)).toBe(true);
    }
    expect((await run("/admin/accounting", await tokenFor("MANAGER", rs), mw)).to?.pathname).toBe("/login");
  });

  it("ignores claims it does not read, such as a token version from the backend", async () => {
    const mw = await load({ publicKey: pem });
    const versioned = await tokenFor("CASHIER", { ...rs, claims: { token_version: 3 } });
    expect(pass(await run("/pos", versioned, mw))).toBe(true);
    expect((await run("/admin/dashboard", versioned, mw)).to?.pathname).toBe("/pos");
  });

  it("rejects HS256 once only the public key is configured", async () => {
    const mw = await load({ publicKey: pem });
    expect(pass(await run("/admin/dashboard", await tokenFor("ADMIN", rs), mw))).toBe(true);
    expect(rejected(await run("/admin/dashboard", await tokenFor("ADMIN"), mw))).toBe(true);
  });

  it("accepts both kinds during the migration window, each only with its own key", async () => {
    const mw = await load({ publicKey: pem, secret: SECRET });
    expect(pass(await run("/admin/dashboard", await tokenFor("ADMIN", rs), mw))).toBe(true);
    expect(pass(await run("/admin/dashboard", await tokenFor("ADMIN"), mw))).toBe(true);

    const stranger = await generateKeyPair("RS256");
    expect(rejected(await run("/admin/dashboard", await tokenFor("ADMIN", { ...rs, key: stranger.privateKey }), mw))).toBe(true);
    expect(rejected(await run("/admin/dashboard", await tokenFor("ADMIN", { key: "some-other-secret-that-is-long-enough" }), mw))).toBe(true);
  });

  it("checks one signature per request, under the key the token's alg selects, and none without such a key", async () => {
    const mw = await load({ publicKey: pem, secret: SECRET });
    const genuine = await tokenFor("ADMIN", rs);
    for (const t of [genuine, await tokenFor("ADMIN")]) {
      verifications.count = 0;
      expect(pass(await run("/admin/dashboard", t, mw))).toBe(true);
      expect(verifications.count).toBe(1);
    }

    // No configured key answers to these, so they are turned away unverified.
    verifications.count = 0;
    const strays = [
      await tokenFor("ADMIN", { alg: "HS384" }),
      await tokenFor("ADMIN", { alg: "HS512" }),
      relabel(genuine, "RS512"),
      relabel(genuine, "PS256"),
      relabel(genuine, ["RS256"]),
      relabel(genuine, undefined),
      `${base64url.encode('"RS256"')}.${genuine.split(".")[1]}.${genuine.split(".")[2]}`,
      unsecured(),
      "a.b.c",
      "not-a-token",
    ];
    for (const t of strays) expect(rejected(await run("/admin/dashboard", t, mw)), t).toBe(true);
    expect(verifications.count).toBe(0);
    expect(logged).not.toHaveBeenCalled();
  });

  it("still takes the secret's HMAC from JWT_ALGORITHM, pinned to that one value", async () => {
    const mw = await load({ secret: SECRET, algorithm: "HS512" });
    expect(pass(await run("/admin/dashboard", await tokenFor("ADMIN", { alg: "HS512" }), mw))).toBe(true);
    for (const alg of ["HS256", "HS384"]) {
      expect(rejected(await run("/admin/dashboard", await tokenFor("ADMIN", { alg }), mw)), alg).toBe(true);
    }

    // The same during the window, next to the public key.
    const both = await load({ publicKey: pem, secret: SECRET, algorithm: "HS512" });
    expect(pass(await run("/admin/dashboard", await tokenFor("ADMIN", rs), both))).toBe(true);
    expect(pass(await run("/admin/dashboard", await tokenFor("ADMIN", { alg: "HS512" }), both))).toBe(true);
    expect(rejected(await run("/admin/dashboard", await tokenFor("ADMIN"), both))).toBe(true);

    // Unset, the secret is HS256 only.
    const unset = await load({ secret: SECRET });
    expect(pass(await run("/admin/dashboard", await tokenFor("ADMIN"), unset))).toBe(true);
    expect(rejected(await run("/admin/dashboard", await tokenFor("ADMIN", { alg: "HS512" }), unset))).toBe(true);
  });

  it("leaves the secret on HS256 when JWT_ALGORITHM is not an HMAC algorithm", async () => {
    const genuine = await tokenFor("ADMIN", rs);
    for (const algorithm of ["RS256", "PS256", "none", "hs512", ""]) {
      const mw = await load({ secret: SECRET, algorithm });
      expect(pass(await run("/admin/dashboard", await tokenFor("ADMIN"), mw)), algorithm).toBe(true);
      for (const t of [genuine, await tokenFor("ADMIN", { alg: "HS512" }), unsecured()]) {
        expect(rejected(await run("/admin/dashboard", t, mw)), algorithm).toBe(true);
      }
    }
  });

  it("never applies JWT_ALGORITHM to the public key: RS256 only", async () => {
    const genuine = await tokenFor("ADMIN", rs);
    for (const algorithm of ["HS256", "HS512", "RS512", "PS256", "none"]) {
      const mw = await load({ publicKey: pem, algorithm });
      expect(pass(await run("/admin/dashboard", genuine, mw)), algorithm).toBe(true);
      const others = [await tokenFor("ADMIN"), await tokenFor("ADMIN", { alg: "HS512" }), relabel(genuine, "RS512"), relabel(genuine, "PS256")];
      for (const t of others) expect(rejected(await run("/admin/dashboard", t, mw)), algorithm).toBe(true);
    }
  });

  it("rejects the algorithm-confusion token: an HMAC token keyed with the public key itself", async () => {
    // The public key is public. If the verifier let the header choose HS256
    // and used the key text as the HMAC secret, anyone could mint an ADMIN.
    const der = Buffer.from(pem.replace(/-----[^-]+-----|\s/g, ""), "base64");
    const guesses: Record<string, Uint8Array> = {
      "the PEM": new TextEncoder().encode(pem),
      "the PEM, trimmed": new TextEncoder().encode(pem.trim()),
      "the PEM with literal \\n": new TextEncoder().encode(pem.replace(/\n/g, "\\n")),
      "the DER bytes": new Uint8Array(der),
    };
    const configurations = [
      { publicKey: pem },
      { publicKey: pem.replace(/\n/g, "\\n") },
      { publicKey: pem, secret: SECRET },
      { publicKey: pem, algorithm: "HS512" },
      { publicKey: pem, secret: SECRET, algorithm: "HS512" },
    ];
    for (const env of configurations) {
      const mw = await load(env);
      expect(pass(await run("/admin/dashboard", await tokenFor("ADMIN", rs), mw))).toBe(true);
      for (const [name, key] of Object.entries(guesses)) {
        for (const alg of ["HS256", "HS384", "HS512"]) {
          const forged = await tokenFor("ADMIN", { alg, key });
          expect(rejected(await run("/admin/dashboard", forged, mw)), `${alg} keyed with ${name}`).toBe(true);
        }
      }
    }
    // A forged HMAC token never reaches the public key, so it is not a key problem to report.
    expect(logged).not.toHaveBeenCalled();
  });

  it("rejects alg none, with or without a signature attached", async () => {
    // A genuine token relabelled: same claims, header swapped to "none".
    const real = await tokenFor("ADMIN", rs);
    const relabelled = ["none", "None", "NONE"].flatMap((alg) => [relabel(real, alg, false), relabel(real, alg)]);
    for (const env of [{ publicKey: pem }, { secret: SECRET }, { publicKey: pem, secret: SECRET }]) {
      const mw = await load(env);
      const genuine = env.publicKey ? real : await tokenFor("ADMIN");
      expect(pass(await run("/admin/dashboard", genuine, mw))).toBe(true);
      verifications.count = 0;
      for (const t of [unsecured(), ...relabelled]) {
        expect(rejected(await run("/admin/dashboard", t, mw)), t).toBe(true);
      }
      expect(verifications.count).toBe(0);
    }
    expect(logged).not.toHaveBeenCalled();
  });

  it("rejects a tampered RS256 token", async () => {
    const mw = await load({ publicKey: pem });
    const cashier = await tokenFor("CASHIER", rs);
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

  it("rejects an expired token of either kind, without logging: sessions expire all day", async () => {
    const mw = await load({ publicKey: pem, secret: SECRET });
    const aMinuteAgo = Math.floor(Date.now() / 1000) - 60;
    expect(pass(await run("/admin/dashboard", await tokenFor("ADMIN", rs), mw))).toBe(true);
    expect(rejected(await run("/admin/dashboard", await tokenFor("ADMIN", { ...rs, exp: aMinuteAgo }), mw))).toBe(true);
    expect(rejected(await run("/admin/dashboard", await tokenFor("ADMIN", { exp: aMinuteAgo }), mw))).toBe(true);
    expect(logged).not.toHaveBeenCalled();
  });

  it("rejects a correctly signed token that carries no exp", async () => {
    const mw = await load({ publicKey: pem, secret: SECRET });
    expect(pass(await run("/admin/dashboard", await tokenFor("ADMIN", rs), mw))).toBe(true);
    expect(pass(await run("/admin/dashboard", await tokenFor("ADMIN"), mw))).toBe(true);
    expect(rejected(await run("/admin/dashboard", await tokenFor("ADMIN", { ...rs, exp: null }), mw))).toBe(true);
    expect(rejected(await run("/admin/dashboard", await tokenFor("ADMIN", { exp: null }), mw))).toBe(true);
    expect(logged).not.toHaveBeenCalled();
  });

  it("fails closed when neither key is configured", async () => {
    const mw = await load({});
    for (const t of [await tokenFor("ADMIN", rs), await tokenFor("ADMIN")]) {
      expect(rejected(await run("/admin/dashboard", t, mw))).toBe(true);
    }
  });

  it("warns once at start-up while both keys are configured, and not otherwise", async () => {
    const both = await load({ publicKey: pem, secret: SECRET });
    for (const t of [await tokenFor("ADMIN", rs), await tokenFor("ADMIN"), await tokenFor("ADMIN", rs)]) {
      expect(pass(await run("/admin/dashboard", t, both))).toBe(true);
    }
    expect(warned).toHaveBeenCalledTimes(1);
    const line = String(warned.mock.calls[0][0]);
    expect(line).toContain("HS256 session tokens are still accepted");
    expect(line).toMatch(/remove JWT_SECRET once the RS256 cutover is complete/);
    expect(line).not.toContain(SECRET);

    warned.mockClear();
    for (const env of [{ publicKey: pem }, { secret: SECRET }, {}]) {
      await run("/admin/dashboard", await tokenFor("ADMIN"), await load(env));
    }
    expect(warned).not.toHaveBeenCalled();
  });

  it("says so, once, when RS256 signatures fail: the public key may not be the backend's", async () => {
    const stranger = await generateKeyPair("RS256");
    const mw = await load({ publicKey: await exportSPKI(stranger.publicKey), secret: SECRET });

    // A bad HS256 signature says nothing about the public key.
    expect(rejected(await run("/pos", await tokenFor("ADMIN", { key: "some-other-secret-that-is-long-enough" }), mw))).toBe(true);
    expect(logged).not.toHaveBeenCalled();

    const tokens = [await tokenFor("ADMIN", rs), await tokenFor("CASHIER", rs)];
    for (const t of [...tokens, ...tokens]) expect(rejected(await run("/pos", t, mw))).toBe(true);
    expect(logged).toHaveBeenCalledTimes(1);
    const line = String(logged.mock.calls[0][0]);
    expect(line).toBe("[auth] RS256 verification failed (ERR_JWS_SIGNATURE_VERIFICATION_FAILED): JWT_PUBLIC_KEY may not match the backend's signing key");
  });

  it("says so, once, when the public key cannot verify at all, such as an RSA modulus under 2048 bits", async () => {
    const weak = generateKeyPairSync("rsa", { modulusLength: 1024 });
    const weakPem = weak.publicKey.export({ type: "spki", format: "pem" }).toString();
    // jose refuses to sign with a key this short, so this one is signed by hand.
    const claims = { role: "ADMIN", sub: "user-1", exp: Math.floor(Date.now() / 1000) + 3600 };
    const input = `${base64url.encode(JSON.stringify({ alg: "RS256" }))}.${base64url.encode(JSON.stringify(claims))}`;
    const token = `${input}.${base64url.encode(signWithNode("sha256", Buffer.from(input), weak.privateKey))}`;

    const mw = await load({ publicKey: weakPem });
    for (let i = 0; i < 3; i++) expect(rejected(await run("/admin/dashboard", token, mw))).toBe(true);

    expect(logged).toHaveBeenCalledTimes(1);
    const line = String(logged.mock.calls[0][0]);
    expect(line).toMatch(/^\[auth\] RS256 verification failed \(TypeError: .*2048.*\): JWT_PUBLIC_KEY may not match the backend's signing key$/);
    for (const secret of [token, token.split(".")[2], weakPem.split("\n")[1]]) expect(line).not.toContain(secret);
  });

  it("treats a public key that does not import as no public key, and logs why without the key", async () => {
    const broken = "-----BEGIN PUBLIC KEY-----\nbm90IGEga2V5\n-----END PUBLIC KEY-----";

    // Mid-migration the HS256 sessions keep working; RS256 has nothing to verify against.
    const midMigration = await load({ publicKey: broken, secret: SECRET });
    expect(pass(await run("/admin/dashboard", await tokenFor("ADMIN"), midMigration))).toBe(true);
    expect(rejected(await run("/admin/dashboard", await tokenFor("ADMIN", rs), midMigration))).toBe(true);

    // With the secret gone there is no key at all: everything fails closed.
    const afterCutover = await load({ publicKey: broken });
    expect(rejected(await run("/admin/dashboard", await tokenFor("ADMIN", rs), afterCutover))).toBe(true);
    expect(rejected(await run("/admin/dashboard", await tokenFor("ADMIN"), afterCutover))).toBe(true);

    expect(logged).toHaveBeenCalledTimes(2);
    for (const [line] of logged.mock.calls) {
      expect(String(line)).toMatch(/^\[auth\] JWT_PUBLIC_KEY could not be imported \(\w+: .+\); RS256 tokens will be rejected$/);
      expect(String(line)).not.toContain("bm90IGEga2V5");
    }
  });

  it("refuses a private key pasted into JWT_PUBLIC_KEY: this side must never hold a signing key", async () => {
    const privatePem = await exportPKCS8(rs.key);
    const mw = await load({ publicKey: privatePem });
    expect(rejected(await run("/admin/dashboard", await tokenFor("ADMIN", rs), mw))).toBe(true);

    expect(logged).toHaveBeenCalledTimes(1);
    const line = String(logged.mock.calls[0][0]);
    expect(line).toMatch(/^\[auth\] JWT_PUBLIC_KEY could not be imported \(TypeError: .+\); RS256 tokens will be rejected$/);
    expect(line).not.toContain(privatePem.split("\n")[1]);
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

import { NextRequest, NextResponse } from "next/server";
import { decodeProtectedHeader, errors, importSPKI, jwtVerify, type KeyLike } from "jose";
import { canAccess, homeFor, isRole, type Role } from "@/lib/access";
import { buildCsp, newNonce } from "@/lib/csp";

const HMAC_ALGORITHMS = ["HS256", "HS384", "HS512"] as const;

// Dashboards and .env files hand a PEM over with stray whitespace, wrapped in
// quotes, or with its newlines as the characters "\n" (or "\r\n").
const JWT_PUBLIC_KEY = process.env.JWT_PUBLIC_KEY?.trim()
  .replace(/^(["'])([\s\S]*)\1$/, "$2")
  .replace(/\\r\\n|\\n/g, "\n")
  .trim();
const JWT_SECRET = process.env.JWT_SECRET;
// Only ever the secret's algorithm, as before, and only an HMAC one: anything
// else (RS256 included) leaves the secret on HS256.
const JWT_ALGORITHM = HMAC_ALGORITHMS.find((alg) => alg === process.env.JWT_ALGORITHM) ?? "HS256";

if (JWT_PUBLIC_KEY && JWT_SECRET) {
  console.warn(`[auth] ${JWT_ALGORITHM} session tokens are still accepted alongside RS256: remove JWT_SECRET once the RS256 cutover is complete`);
}

/** A key and the one algorithm it is trusted to verify. */
type Verifier = { key: KeyLike; algorithm: "RS256" } | { key: Uint8Array; algorithm: (typeof HMAC_ALGORITHMS)[number] };

/** An error's name and message for the logs. Neither jose nor the runtime's crypto puts the key or the token in them. */
const reason = (e: unknown) => (e instanceof Error ? `${e.name}: ${e.message}` : String(e));

/**
 * The keys a session token may verify against, each pinned to its one
 * algorithm (NEX-54). JWT_PUBLIC_KEY is the backend's RS256 public key: with
 * only that set, this side can check a token but never mint one. JWT_SECRET is
 * the shared HMAC secret (HS256 unless JWT_ALGORITHM says HS384 or HS512),
 * kept while tokens of both kinds are live and deleted after cutover, which is
 * what stops HMAC tokens being accepted.
 *
 * Both paths are Edge-safe (jose). Resolved once per isolate; no key at all
 * means every token fails closed.
 */
const verifiers: Promise<Verifier[]> = (async () => {
  const configured: Verifier[] = [];
  if (JWT_PUBLIC_KEY) {
    try {
      configured.push({ key: await importSPKI(JWT_PUBLIC_KEY, "RS256"), algorithm: "RS256" });
    } catch (e) {
      // Why, never the value, so the logs show what bounces RS256 sessions to /login.
      console.error(`[auth] JWT_PUBLIC_KEY could not be imported (${reason(e)}); RS256 tokens will be rejected`);
    }
  }
  if (JWT_SECRET) configured.push({ key: new TextEncoder().encode(JWT_SECRET), algorithm: JWT_ALGORITHM });
  return configured;
})();

const reported = new Set<string>();

/**
 * A public key that imports but is not the backend's fails every RS256 token
 * exactly as a forged one does, and one this side cannot use at all (an RSA
 * modulus under 2048 bits) throws before the signature is looked at. One line
 * per cold start per kind of failure makes either visible. Expired and
 * malformed tokens are routine and stay quiet. Never the token or the key.
 */
function reportRs256Failure(e: unknown) {
  const tokenFault = e instanceof errors.JOSEError;
  if (tokenFault && e.code !== "ERR_JWS_SIGNATURE_VERIFICATION_FAILED") return;
  const code = tokenFault ? e.code : e instanceof Error ? e.name : "Error";
  if (reported.has(code)) return;
  reported.add(code);
  console.error(`[auth] RS256 verification failed (${tokenFault ? code : reason(e)}): JWT_PUBLIC_KEY may not match the backend's signing key`);
}

/**
 * The role claim from a verified token, or null. The claim is a snapshot: a
 * role changed server-side only shows up here on the next login. Anything that
 * is not exactly one of the backend's roles is treated as no role at all.
 */
async function verifiedRole(token: string): Promise<Role | null> {
  let alg: unknown;
  try {
    alg = decodeProtectedHeader(token).alg;
  } catch {
    return null;
  }
  // The header only picks which configured key gets the one verification. The
  // algorithm that key accepts is its own, so an HS256 token keyed with the
  // public key text (algorithm confusion) and `alg: none` have nothing to match.
  const verifier = (await verifiers).find((v) => v.algorithm === alg);
  if (!verifier) return null;
  try {
    const { payload } = await jwtVerify(token, verifier.key, { algorithms: [verifier.algorithm], requiredClaims: ["exp"] });
    return isRole(payload.role) ? payload.role : null;
  } catch (e) {
    if (verifier.algorithm === "RS256") reportRs256Failure(e);
    return null;
  }
}

function inSection(pathname: string, section: string): boolean {
  return pathname === section || pathname.startsWith(section + "/");
}

/** Only these sections need a session; everything else (login, root redirect, not-found) is public. */
function needsAuth(pathname: string): boolean {
  return inSection(pathname, "/admin") || inSection(pathname, "/pos");
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // One nonce per request. It goes on the REQUEST too: Next reads the nonce
  // from the incoming CSP header when it renders its inline/bootstrap scripts
  // (app-render), which is why every route is dynamic (root layout).
  const nonce = newNonce();
  const csp = buildCsp({
    nonce,
    mode: process.env.CSP_MODE === "enforce" ? "enforce" : "report-only",
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
  });
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set(csp.header, csp.value);

  const secured = (res: NextResponse) => {
    res.headers.set(csp.header, csp.value);
    return res;
  };
  const toLogin = (next?: string) => {
    const url = new URL("/login", req.url);
    if (next) url.searchParams.set("next", next);
    return secured(NextResponse.redirect(url));
  };
  const pass = () => secured(NextResponse.next({ request: { headers: requestHeaders } }));

  if (!needsAuth(pathname)) return pass();

  const token = req.cookies.get("mz_token")?.value;

  if (!token) {
    // Keep the deep link: the login page sends the user on to it (if their role may open it).
    return toLogin(pathname + search);
  }

  const role = await verifiedRole(token);

  if (!role) {
    // Bad signature, expired, or an unknown role: fail closed to /login and
    // drop the cookie so the login page starts clean instead of looping.
    const res = toLogin();
    res.cookies.delete("mz_token");
    return res;
  }

  if (!canAccess(role, pathname)) {
    const home = homeFor(role);
    // Every role with a home can open it (see access.ts), so this cannot loop.
    // A role without one (MANAGER) gets the login page, which explains why.
    return home ? secured(NextResponse.redirect(new URL(home, req.url))) : toLogin();
  }

  return pass();
}

export const config = {
  matcher: [
    // The gated sections, whatever the URL looks like. A dot does not make a
    // path a file: /admin/products/a.b is the product page for id "a.b", and
    // nothing static is served from under /admin or /pos. Matching these
    // outright means no spelling of a path can skip the session gate, the
    // role gate or the CSP (NEX-64).
    "/admin/:path*",
    "/pos/:path*",
    // Every other HTML route (for the CSP), but not the /api proxy, Next's
    // static assets, the image optimizer, or a real static file — one whose
    // path ENDS in a known static extension, not merely contains a dot.
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:ico|png|jpg|jpeg|gif|svg|webp|avif|css|js|map|txt|xml|webmanifest|woff|woff2|ttf|otf|eot)$).*)",
  ],
};

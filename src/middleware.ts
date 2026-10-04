import { NextRequest, NextResponse } from "next/server";
import { importSPKI, jwtVerify, type KeyLike } from "jose";
import { canAccess, homeFor, isRole, type Role } from "@/lib/access";
import { buildCsp, newNonce } from "@/lib/csp";

// Vercel-style env vars often carry PEM newlines as the two characters "\n".
const JWT_PUBLIC_KEY = process.env.JWT_PUBLIC_KEY?.replace(/\\n/g, "\n");
const JWT_SECRET = process.env.JWT_SECRET;

/** A key and the one algorithm it is trusted to verify. */
type Verifier = { key: KeyLike; algorithms: ["RS256"] } | { key: Uint8Array; algorithms: ["HS256"] };

/**
 * The keys a session token may verify against, each pinned to its one
 * algorithm (NEX-54). JWT_PUBLIC_KEY is the backend's RS256 public key: with
 * only that set, this side can check a token but never mint one. JWT_SECRET is
 * the shared HS256 secret, kept while tokens of both kinds are live and
 * deleted after cutover, which is what stops HS256 being accepted.
 *
 * The algorithm is never taken from the token header or from configuration:
 * a key only ever verifies its own algorithm, so an HS256 token keyed with the
 * public key text (algorithm confusion) and `alg: none` have nothing to match.
 * Both paths are Edge-safe (jose). Resolved once per isolate; no key at all
 * means every token fails closed.
 */
const verifiers: Promise<Verifier[]> = (async () => {
  const configured: Verifier[] = [];
  if (JWT_PUBLIC_KEY) {
    try {
      configured.push({ key: await importSPKI(JWT_PUBLIC_KEY, "RS256"), algorithms: ["RS256"] });
    } catch {
      // Never the value: only that it did not parse, so the logs show why
      // RS256 sessions bounce to /login.
      console.error("[auth] JWT_PUBLIC_KEY is not an SPKI PEM public key; RS256 tokens will be rejected");
    }
  }
  if (JWT_SECRET) configured.push({ key: new TextEncoder().encode(JWT_SECRET), algorithms: ["HS256"] });
  return configured;
})();

/**
 * The role claim from a verified token, or null. The claim is a snapshot: a
 * role changed server-side only shows up here on the next login. Anything that
 * is not exactly one of the backend's roles is treated as no role at all.
 */
async function verifiedRole(token: string): Promise<Role | null> {
  for (const { key, algorithms } of await verifiers) {
    try {
      const { payload } = await jwtVerify(token, key, { algorithms });
      return isRole(payload.role) ? payload.role : null;
    } catch {
      // Not this key's token, or not valid under it: the other key gets a turn.
    }
  }
  return null;
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
  // Every HTML route (for the CSP), but not the /api proxy, Next's static
  // assets, the image optimizer, or files with an extension.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};

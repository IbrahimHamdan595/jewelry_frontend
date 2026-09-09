import { NextRequest, NextResponse } from "next/server";
import { importSPKI, jwtVerify, type KeyLike } from "jose";
import { canAccess, homeFor, isRole, type Role } from "@/lib/access";

const PUBLIC_PATHS = ["/login"];

const JWT_ALGORITHM = process.env.JWT_ALGORITHM ?? "HS256";
// Vercel-style env vars often carry PEM newlines as the two characters "\n".
const JWT_PUBLIC_KEY = process.env.JWT_PUBLIC_KEY?.replace(/\\n/g, "\n");
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * The verification key. With JWT_PUBLIC_KEY set (the backend's RS256 move,
 * NEX-54) this side holds a public key only and can never mint a token.
 * Until then it is the shared HS256 secret. Both paths are Edge-safe (jose).
 * Resolved once per isolate; no key at all means every token fails closed.
 */
const verificationKey: Promise<KeyLike | Uint8Array | null> = JWT_PUBLIC_KEY
  ? importSPKI(JWT_PUBLIC_KEY, JWT_ALGORITHM).catch(() => null)
  : Promise.resolve(JWT_SECRET ? new TextEncoder().encode(JWT_SECRET) : null);

/**
 * The role claim from a verified token, or null. The claim is a snapshot: a
 * role changed server-side only shows up here on the next login. Anything that
 * is not exactly one of the backend's roles is treated as no role at all.
 */
async function verifiedRole(token: string): Promise<Role | null> {
  const key = await verificationKey;
  if (!key) return null;
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: [JWT_ALGORITHM] });
    return isRole(payload.role) ? payload.role : null;
  } catch {
    return null;
  }
}

function toLogin(req: NextRequest, next?: string) {
  const url = new URL("/login", req.url);
  if (next) url.searchParams.set("next", next);
  return NextResponse.redirect(url);
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const token = req.cookies.get("mz_token")?.value;

  if (!token) {
    // Keep the deep link: the login page sends the user on to it (if their role may open it).
    return toLogin(req, pathname + search);
  }

  const role = await verifiedRole(token);

  if (!role) {
    // Bad signature, expired, or an unknown role: fail closed to /login and
    // drop the cookie so the login page starts clean instead of looping.
    const res = toLogin(req);
    res.cookies.delete("mz_token");
    return res;
  }

  if (!canAccess(role, pathname)) {
    const home = homeFor(role);
    // Every role with a home can open it (see access.ts), so this cannot loop.
    // A role without one (MANAGER) gets the login page, which explains why.
    return home ? NextResponse.redirect(new URL(home, req.url)) : toLogin(req);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/pos/:path*"],
};

import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { canAccess, homeFor, isRole, type Role } from "@/lib/access";

const PUBLIC_PATHS = ["/login"];

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_ALGORITHM = process.env.JWT_ALGORITHM ?? "HS256";

const secretKey = JWT_SECRET ? new TextEncoder().encode(JWT_SECRET) : null;

/**
 * The role claim from a verified token, or null. The claim is a snapshot: a
 * role changed server-side only shows up here on the next login. Anything that
 * is not exactly one of the backend's roles is treated as no role at all.
 */
async function verifiedRole(token: string): Promise<Role | null> {
  if (!secretKey) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey, { algorithms: [JWT_ALGORITHM] });
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

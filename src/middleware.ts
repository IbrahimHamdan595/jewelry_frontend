import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_PATHS = ["/login"];

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_ALGORITHM = process.env.JWT_ALGORITHM ?? "HS256";

const secretKey = JWT_SECRET ? new TextEncoder().encode(JWT_SECRET) : null;

async function verifiedRole(token: string): Promise<string | null> {
  if (!secretKey) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey, { algorithms: [JWT_ALGORITHM] });
    const role = payload.role;
    return typeof role === "string" ? role : null;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const token = req.cookies.get("mz_token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const role = await verifiedRole(token);

  if (!role) {
    const res = NextResponse.redirect(new URL("/login", req.url));
    res.cookies.delete("mz_token");
    res.cookies.delete("mz_role");
    return res;
  }

  if (pathname.startsWith("/admin") && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/pos", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/pos/:path*"],
};

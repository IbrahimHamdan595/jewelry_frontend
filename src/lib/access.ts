/**
 * Who may open what. One place, no framework imports, so the middleware, the
 * admin sidebar and the login landing all agree.
 *
 * This is convenience routing, not security: the backend's require_admin /
 * require_accounting (app/core/permissions.py) remain the real control.
 *
 *   ADMIN       everything
 *   ACCOUNTANT  /admin/accounting and below (backend: require_accounting),
 *               plus the POS, which any authenticated user may already call
 *   CASHIER     /pos only
 *   MANAGER     nothing — the backend reserves the role and wires nothing to
 *               it, so the honest UI is a closed door with a message, not the
 *               till. Revisit when the backend gives it endpoints.
 *
 * /admin/ledger is the inventory audit ledger (backend: require_admin), not
 * the general ledger, so it stays ADMIN-only.
 */
import type { Role } from "@/types/api";

export type { Role };

export const ROLES: readonly Role[] = ["ADMIN", "CASHIER", "ACCOUNTANT", "MANAGER"];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

/** True for the section root and anything below it; false for lookalike prefixes. */
function inSection(pathname: string, section: string): boolean {
  return pathname === section || pathname.startsWith(section + "/");
}

export function canAccess(role: Role, pathname: string): boolean {
  if (inSection(pathname, "/admin/accounting")) return role === "ADMIN" || role === "ACCOUNTANT";
  if (inSection(pathname, "/admin")) return role === "ADMIN";
  if (inSection(pathname, "/pos")) return role === "ADMIN" || role === "CASHIER" || role === "ACCOUNTANT";
  return false;
}

/** Where a role lands after login, or when bounced from a page it may not open. */
export function homeFor(role: Role): string | null {
  switch (role) {
    case "ADMIN":
      return "/admin/dashboard";
    case "ACCOUNTANT":
      return "/admin/accounting";
    case "CASHIER":
      return "/pos";
    case "MANAGER":
      return null;
  }
}

/**
 * A `?next=` value that is safe to push after login: an in-app path with its
 * query string. Anything that could leave the site (`//host`, a scheme) or
 * loop back into /login is dropped. Whether the ROLE may open it is a separate
 * check (canAccess) — this only guards the redirect itself.
 */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return null;
  const pathname = raw.split("?")[0];
  if (pathname === "/" || inSection(pathname, "/login")) return null;
  return raw;
}

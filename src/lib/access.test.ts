import { describe, it, expect } from "vitest";
import { canAccess, homeFor, isRole, safeNextPath } from "@/lib/access";

describe("canAccess", () => {
  it("ADMIN reaches everything", () => {
    for (const p of ["/admin/dashboard", "/admin/products", "/admin/settings", "/admin/ledger", "/admin/accounting", "/admin/accounting/journal", "/pos", "/pos/buyback"]) {
      expect(canAccess("ADMIN", p), p).toBe(true);
    }
  });

  it("ACCOUNTANT reaches the accounting section only, under /admin", () => {
    expect(canAccess("ACCOUNTANT", "/admin/accounting")).toBe(true);
    expect(canAccess("ACCOUNTANT", "/admin/accounting/journal")).toBe(true);
    expect(canAccess("ACCOUNTANT", "/admin/accounting/periods")).toBe(true);
    for (const p of ["/admin/dashboard", "/admin/products", "/admin/suppliers", "/admin/settings", "/admin/ledger"]) {
      expect(canAccess("ACCOUNTANT", p), p).toBe(false);
    }
  });

  it("matches the accounting section as a path segment, not a string prefix", () => {
    expect(canAccess("ACCOUNTANT", "/admin/accountingx")).toBe(false);
    expect(canAccess("ACCOUNTANT", "/admin/accounting-reports")).toBe(false);
  });

  it("CASHIER reaches the POS and nothing under /admin", () => {
    expect(canAccess("CASHIER", "/pos")).toBe(true);
    expect(canAccess("CASHIER", "/pos/buyback")).toBe(true);
    expect(canAccess("CASHIER", "/admin/dashboard")).toBe(false);
    expect(canAccess("CASHIER", "/admin/accounting")).toBe(false);
  });

  it("MANAGER reaches nothing until the backend wires the role", () => {
    for (const p of ["/pos", "/admin/dashboard", "/admin/accounting"]) {
      expect(canAccess("MANAGER", p), p).toBe(false);
    }
  });
});

describe("homeFor", () => {
  it("sends each role to its own landing page", () => {
    expect(homeFor("ADMIN")).toBe("/admin/dashboard");
    expect(homeFor("ACCOUNTANT")).toBe("/admin/accounting");
    expect(homeFor("CASHIER")).toBe("/pos");
    expect(homeFor("MANAGER")).toBeNull();
  });
});

describe("isRole", () => {
  it("accepts exactly the backend enum values", () => {
    for (const r of ["ADMIN", "CASHIER", "ACCOUNTANT", "MANAGER"]) expect(isRole(r), r).toBe(true);
    for (const r of ["admin", "", "OWNER", undefined, null, 42, {}]) expect(isRole(r), String(r)).toBe(false);
  });
});

describe("safeNextPath", () => {
  it("keeps an internal path with its query string", () => {
    expect(safeNextPath("/admin/accounting/journal?period=2026-09")).toBe("/admin/accounting/journal?period=2026-09");
  });

  it("rejects anything that could leave the site or loop back to login", () => {
    for (const bad of ["//evil.com", "https://evil.com/x", "admin/products", "/login", "/login?next=/pos", "/", "", null]) {
      expect(safeNextPath(bad), String(bad)).toBeNull();
    }
  });
});

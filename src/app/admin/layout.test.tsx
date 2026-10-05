import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AdminLayout from "@/app/admin/layout";
import { LanguageProvider } from "@/context/LanguageContext";
import en from "@/i18n/en";
import ar from "@/i18n/ar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/accounting",
  useRouter: () => ({ push: vi.fn() }),
}));

function renderAs(role: string | null) {
  sessionStorage.clear();
  if (role) sessionStorage.setItem("mz_user", JSON.stringify({ id: "u1", email: "x@y.z", name: "X", role, is_active: true }));
  render(<AdminLayout><div>page</div></AdminLayout>);
}

const link = (name: RegExp) => screen.queryByRole("link", { name });

describe("admin navigation by role", () => {
  beforeEach(() => sessionStorage.clear());

  it("ADMIN sees every section", () => {
    renderAs("ADMIN");
    for (const n of [/dashboard/i, /products/i, /suppliers/i, /settings/i, /audit ledger/i, /accounting/i]) {
      expect(link(n), String(n)).toBeInTheDocument();
    }
  });

  it("ACCOUNTANT sees only what it can open", () => {
    renderAs("ACCOUNTANT");
    expect(link(/accounting/i)).toBeInTheDocument();
    for (const n of [/dashboard/i, /products/i, /suppliers/i, /settings/i, /audit ledger/i, /inventory/i]) {
      expect(link(n), String(n)).not.toBeInTheDocument();
    }
  });

  it("shows no links until the user is known", () => {
    renderAs(null);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });
});

function renderIn(lang: "en" | "ar", role = "ADMIN") {
  sessionStorage.clear();
  // AuthUser as POST /auth/login returns it (app/schemas/auth.py: UserOut).
  sessionStorage.setItem("mz_user", JSON.stringify({ id: "u1", email: "owner@fawazelnamel.com", name: "Fawaz", role, is_active: true }));
  return render(<LanguageProvider initialLang={lang}><AdminLayout><div>page</div></AdminLayout></LanguageProvider>);
}

describe("admin navigation in Arabic (NEX-64)", () => {
  beforeEach(() => sessionStorage.clear());

  it("every sidebar entry is Arabic — Accounting and Audit Ledger included", () => {
    renderIn("ar");
    const names = screen.getAllByRole("link").map((a) => a.textContent ?? "");
    expect(names).toHaveLength(14);
    expect(names).toContain(ar.nav.accounting);
    expect(names).toContain(ar.nav.auditLedger);
    // "QR" is a format name; everything else is Arabic.
    expect(names.filter((name) => /[A-Za-z]{2,}/.test(name.replace("QR", "")))).toEqual([]);
    for (const name of names) expect(name).toMatch(/[\u0600-\u06FF]/);
  });

  it("the page heading follows the section, in Arabic", () => {
    renderIn("ar"); // usePathname is /admin/accounting
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(ar.nav.accounting);
  });

  it("keeps the English wording it had", () => {
    renderIn("en");
    expect(screen.getByRole("link", { name: "Accounting" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Audit Ledger" })).toBeInTheDocument();
    expect(en.nav.accounting).toBe("Accounting");
  });
});

describe("admin mobile drawer (NEX-64)", () => {
  beforeEach(() => sessionStorage.clear());

  const backdrop = (root: HTMLElement) => root.querySelector(".bg-black\\/50");

  it.each([["en", en], ["ar", ar]] as const)("%s: the menu and close buttons are named, and say whether the drawer is open", (lang, dict) => {
    const { container } = renderIn(lang);
    const menu = screen.getByRole("button", { name: dict.nav.openMenu });
    expect(menu).toHaveAttribute("aria-expanded", "false");
    expect(backdrop(container)).toBeNull();

    fireEvent.click(menu);
    expect(menu).toHaveAttribute("aria-expanded", "true");
    expect(backdrop(container)).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: dict.nav.closeMenu }));
    expect(menu).toHaveAttribute("aria-expanded", "false");
    expect(backdrop(container)).toBeNull();
  });

  it("Escape closes the drawer; so does a click on the backdrop, which is not itself a control", () => {
    const { container } = renderIn("en");
    const menu = screen.getByRole("button", { name: en.nav.openMenu });

    fireEvent.click(menu);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(backdrop(container)).toBeNull();

    fireEvent.click(menu);
    expect(backdrop(container)).toHaveAttribute("role", "presentation");
    fireEvent.click(backdrop(container) as Element);
    expect(backdrop(container)).toBeNull();
  });

  it("every button in the shell has an accessible name", () => {
    renderIn("ar");
    for (const button of screen.getAllByRole("button")) expect(button).toHaveAccessibleName();
  });

  it("looks as it did: the same backdrop classes", () => {
    const { container } = renderIn("en");
    fireEvent.click(screen.getByRole("button", { name: en.nav.openMenu }));
    expect(backdrop(container)).toHaveClass("fixed", "inset-0", "bg-black/50", "z-20", "md:hidden");
  });
});

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SuppliersPage from "@/app/admin/suppliers/page";
import { LanguageProvider } from "@/context/LanguageContext";
import en from "@/i18n/en";
import ar from "@/i18n/ar";

const supplier = { id: "s1", name: "Abu Ali", contact_name: null, phone: "+961-00-555555", email: null, payment_terms: "net 30, gold-for-gold preferred", is_active: true };
vi.mock("swr", () => ({ default: (key: string) => ({ data: key?.startsWith("/suppliers") ? { items: [supplier], total: 1 } : undefined, error: undefined, isLoading: false, isValidating: false, mutate: vi.fn() }) }));
vi.mock("@/lib/api-client", () => ({ apiFetcher: vi.fn(), api: { post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));

describe("suppliers list in Arabic (NEX-63)", () => {
  it("keeps the phone number left-to-right and intact", () => {
    render(<LanguageProvider initialLang="ar"><SuppliersPage /></LanguageProvider>);
    const phone = screen.getByText("+961-00-555555");
    expect(phone.closest("bdi")).toHaveAttribute("dir", "ltr");
  });
});

/** Every string a user can see or hear: text nodes plus placeholder / title / aria-label. */
function uiStrings(root: HTMLElement): string[] {
  const out: string[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) out.push(walker.currentNode.textContent ?? "");
  root.querySelectorAll("[placeholder],[title],[aria-label]").forEach((el) => {
    for (const attr of ["placeholder", "title", "aria-label"]) out.push(el.getAttribute(attr) ?? "");
  });
  return out.map((s) => s.trim()).filter(Boolean);
}

/** The strings that still carry Latin words once the known data values are taken out. */
function englishLeft(root: HTMLElement, data: (string | RegExp)[]): string[] {
  return uiStrings(root).filter((s) => /[A-Za-z]{2,}/.test(data.reduce<string>((rest, d) => rest.split(d).join(""), s)));
}

/** Every leaf of a dictionary namespace, with function-valued keys called on sample arguments. */
function leaves(node: unknown, path: string): [string, string][] {
  if (typeof node === "string") return [[path, node]];
  if (typeof node === "function") return [[path, String((node as (...args: unknown[]) => unknown)(2, 3, 4))]];
  return Object.entries(node as Record<string, unknown>).flatMap(([key, value]) => leaves(value, `${path}.${key}`));
}

// Values that come from the database: they cannot be translated client-side.
const DATA = [supplier.name, supplier.payment_terms];

const FORM_FIELDS = ["name", "contactName", "phone", "email", "address", "paymentTerms", "notes"] as const;
const fieldLabel = (dict: typeof en, key: (typeof FORM_FIELDS)[number]) => (key === "name" ? dict.common.name : dict.suppliers[key]);

function renderPage(lang: "en" | "ar") {
  return render(<LanguageProvider initialLang={lang}><SuppliersPage /></LanguageProvider>);
}

describe("suppliers list labels and i18n (NEX-64)", () => {
  it("renders the list in Arabic with no English left behind", () => {
    const { container } = renderPage("ar");
    expect(screen.getByRole("heading", { name: ar.suppliers.title })).toBeInTheDocument();
    for (const header of [ar.common.name, ar.suppliers.contact, ar.suppliers.phone, ar.suppliers.terms, ar.common.status]) {
      expect(screen.getByRole("columnheader", { name: header }), header).toBeInTheDocument();
    }
    expect(screen.getByText(ar.suppliers.active)).toBeInTheDocument();
    for (const english of ["Suppliers", "New Supplier", "Include inactive", "Name", "Contact", "Phone", "Terms", "Status", "Active"]) {
      expect(screen.queryByText(english), english).toBeNull();
    }
    expect(screen.queryByPlaceholderText(en.suppliers.searchPlaceholder)).toBeNull();
    expect(englishLeft(container, DATA)).toEqual([]);
  });

  it("the no-English check is not vacuous: it flags the English render", () => {
    const { container } = renderPage("en");
    expect(englishLeft(container, DATA)).toEqual(expect.arrayContaining(["Suppliers", "New Supplier", "Search suppliers…", "Deactivate"]));
  });

  it("leaves database values untranslated: supplier name and payment terms", () => {
    renderPage("ar");
    expect(screen.getByText("Abu Ali")).toBeInTheDocument();
    expect(screen.getByText("net 30, gold-for-gold preferred")).toBeInTheDocument();
  });

  it("names the search box and the icon-only controls, in the current language", () => {
    renderPage("ar");
    expect(screen.getByLabelText(ar.suppliers.searchPlaceholder)).toHaveAttribute("placeholder", ar.suppliers.searchPlaceholder);
    expect(screen.getByRole("button", { name: ar.suppliers.deactivate })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: ar.suppliers.openSupplier("Abu Ali") })).toHaveAttribute("href", "/admin/suppliers/s1");
    expect(screen.getByRole("columnheader", { name: ar.common.actions })).toBeInTheDocument();
    expect(screen.getByLabelText(ar.suppliers.includeInactive)).toHaveAttribute("type", "checkbox");
  });

  it("every new-supplier field is reachable by its label, and the label's control is the input", () => {
    renderPage("en");
    fireEvent.click(screen.getByRole("button", { name: en.suppliers.newSupplier }));
    for (const key of FORM_FIELDS) {
      const text = fieldLabel(en, key);
      const input = screen.getByLabelText(text);
      expect(input.tagName, text).toBe("INPUT");
      const label = input.closest("label") as HTMLLabelElement;
      expect(label, text).not.toBeNull();
      expect(label.control, text).toBe(input);
    }
  });

  it("renders the new-supplier form in Arabic with no English left behind", () => {
    const { container } = renderPage("ar");
    fireEvent.click(screen.getByRole("button", { name: ar.suppliers.newSupplier }));
    for (const key of FORM_FIELDS) {
      expect(screen.getByLabelText(fieldLabel(ar, key)), key).toBeInTheDocument();
    }
    expect(screen.getByLabelText(ar.suppliers.paymentTerms)).toHaveAttribute("placeholder", ar.suppliers.paymentTermsPlaceholder);
    expect(screen.getByRole("button", { name: ar.suppliers.createSupplier })).toBeDisabled();
    expect(screen.getByRole("button", { name: ar.common.cancel })).toBeInTheDocument();
    for (const english of ["Contact name", "Email", "Address", "Payment terms", "Notes", "Create Supplier", "Cancel"]) {
      expect(screen.queryByText(english), english).toBeNull();
    }
    expect(englishLeft(container, DATA)).toEqual([]);
  });
});

describe("the suppliers namespace is translated, not English placeholders", () => {
  it("every ar.suppliers key differs from English and is written in Arabic", () => {
    const english = new Map(leaves(en.suppliers, "suppliers"));
    const untranslated = leaves(ar.suppliers, "suppliers")
      .filter(([path, value]) => value === english.get(path) || !/[؀-ۿ]/.test(value))
      .map(([path]) => path);
    expect(untranslated).toEqual([]);
    expect(english.size).toBeGreaterThan(70);
  });
});

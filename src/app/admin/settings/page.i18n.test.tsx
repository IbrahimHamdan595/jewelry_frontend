import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SettingsPage from "@/app/admin/settings/page";
import { LanguageProvider } from "@/context/LanguageContext";
import en from "@/i18n/en";
import ar from "@/i18n/ar";

type SwrState = { data?: unknown; error?: unknown };
const swr = vi.hoisted(() => ({ byKey: {} as Record<string, SwrState>, mutates: {} as Record<string, ReturnType<typeof vi.fn>> }));
vi.mock("swr", () => ({
  default: (key: string | null) => {
    const k = key ?? "";
    swr.mutates[k] ??= vi.fn(() => Promise.resolve());
    return { data: undefined, error: undefined, isLoading: false, isValidating: false, mutate: swr.mutates[k], ...(swr.byKey[k] ?? {}) };
  },
}));
const api = vi.hoisted(() => ({
  patch: vi.fn<(path: string, body?: unknown) => Promise<unknown>>(() => Promise.resolve({})),
  post: vi.fn<(path: string, body?: unknown) => Promise<unknown>>(() => Promise.resolve({})),
}));
vi.mock("@/lib/api-client", () => ({ api, apiFetcher: vi.fn() }));

const SETTINGS = {
  id: "singleton", store_name: "Fawaz", store_name_ar: "فواز", address: "Hamra", phone: "+961 1 555 555", vat_number: "601-1",
  default_margin_pct: 10, default_making_charge: 5, vat_percent: 11, lbp_exchange_rate: 89500, max_discount_percent: 10,
  default_buyback_margin_mode: "USD_PER_GRAM", default_buyback_margin_value: 2, buyback_rate_drift_pct_max: 1,
  markup_k18: 1, markup_k21: 2, markup_k24: 3, nisab_grams: 85, receipt_footer: "Thank you",
  accounting_auto_post_enabled: false,
};
const STAFF = [
  { id: "s1", name: "Maya", email: "maya@shop.test", role: "CASHIER", is_active: true, created_at: "" },
  { id: "s2", name: "Omar", email: "omar@shop.test", role: "CASHIER", is_active: false, created_at: "" },
];

function renderPage(lang: "en" | "ar") {
  return render(
    <LanguageProvider initialLang={lang}>
      <SettingsPage />
    </LanguageProvider>,
  );
}
const openTab = (name: string) => fireEvent.click(screen.getByRole("button", { name }));
/** The field a label names, checked against the label element's own control. */
function fieldOf(labelText: string | RegExp) {
  const field = screen.getByLabelText(labelText);
  const label = field.closest("label") as HTMLLabelElement;
  expect(label, String(labelText)).not.toBeNull();
  expect(label.control, String(labelText)).toBe(field);
  return field as HTMLInputElement;
}

// Everything a user can read or hear: text nodes plus placeholder / title / aria-label / alt.
function uiStrings(root: HTMLElement): string[] {
  const out: string[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) if (walker.currentNode.parentElement?.tagName !== "STYLE") out.push(walker.currentNode.textContent ?? "");
  root.querySelectorAll("*").forEach((el) => ["placeholder", "title", "aria-label", "alt"].forEach((a) => out.push(el.getAttribute(a) ?? "")));
  return out;
}
/** Latin words still on screen once data and the codes that stay Latin by design are set aside. */
const englishLeft = (root: HTMLElement, keep: RegExp) =>
  uiStrings(root).map((s) => s.replace(keep, "")).filter((s) => /[A-Za-z]{2,}/.test(s));
// Karat codes, the ticket id the existing auto-post copy cites, and what the fixtures supply
// as data: staff names and emails, and the stored receipt footer (a textarea's text).
const DATA = /\b(K?\d\dK?|NEX-\d+|Maya|Omar|[a-z]+@shop\.test|Thank you)\b/g;

describe("settings — every field is labelled (NEX-64)", () => {
  beforeEach(() => {
    swr.byKey = { "/settings": { data: SETTINGS }, "/staff": { data: STAFF } };
    swr.mutates = {};
    api.patch.mockClear();
    api.post.mockClear();
  });

  it("store tab", () => {
    renderPage("en");
    const s = en.settings;
    expect(fieldOf(s.storeName).value).toBe("Fawaz");
    expect(fieldOf(s.storeNameAr)).toHaveAttribute("dir", "rtl");
    expect(fieldOf(s.fields.address).value).toBe("Hamra");
    expect(fieldOf(s.fields.phone).value).toBe("+961 1 555 555");
    expect(fieldOf(s.fields.vat_number).value).toBe("601-1");
  });

  it("pricing tab, including the select and the $-prefixed markups", () => {
    renderPage("en");
    const s = en.settings;
    openTab(s.tabPricing);
    for (const f of ["default_margin_pct", "default_making_charge", "vat_percent", "lbp_exchange_rate", "max_discount_percent"] as const) {
      expect(fieldOf(s.fields[f]).value, f).toBe(String(SETTINGS[f]));
    }
    expect(fieldOf(s.marginMode).tagName).toBe("SELECT");
    expect(fieldOf(s.marginValue).value).toBe("2");
    expect(fieldOf(s.maxDriftPct).value).toBe("1");
    expect(fieldOf(new RegExp(s.markupLabel("18K"))).value).toBe("1");
    expect(fieldOf(new RegExp(s.markupLabel("21K"))).value).toBe("2");
    expect(fieldOf(new RegExp(s.markupLabel("24K"))).value).toBe("3");
    expect(fieldOf(s.nisabGrams).value).toBe("85");
  });

  it("receipt, security and staff tabs", () => {
    renderPage("en");
    const s = en.settings;
    openTab(s.tabReceipt);
    expect(fieldOf(s.footerMessage).tagName).toBe("TEXTAREA");

    openTab(s.tabSecurity);
    for (const text of [s.currentPassword, s.newPassword, s.confirmNewPassword]) expect(fieldOf(text)).toHaveAttribute("type", "password");

    openTab(s.tabStaff);
    openTab(s.addCashier);
    for (const text of [s.staffFields.name, s.staffFields.email, s.staffFields.password]) expect(screen.getByLabelText(text), text).toBeInTheDocument();
  });

  it("editing through a label still saves that field, and never the auto-post flag", async () => {
    renderPage("en");
    fireEvent.change(fieldOf(en.settings.storeName), { target: { value: "Fawaz El Namel" } });
    openTab(en.settings.saveChanges);
    await waitFor(() => expect(api.patch).toHaveBeenCalled());
    const body = api.patch.mock.calls[0][1] as Record<string, unknown>;
    expect(body.store_name).toBe("Fawaz El Namel");
    expect(body).not.toHaveProperty("accounting_auto_post_enabled");
  });
});

describe("settings — Arabic has no English left (NEX-64)", () => {
  beforeEach(() => {
    swr.byKey = { "/settings": { data: SETTINGS }, "/staff": { data: STAFF }, "/accounting/ledger/verify": { data: { status: "empty", head_matches: true, head_row_count: 0 } } };
    swr.mutates = {};
    api.patch.mockClear();
    api.post.mockClear();
  });

  it("every tab", () => {
    const { container } = renderPage("ar");
    const s = ar.settings;
    expect(screen.getByRole("heading", { name: ar.nav.settings })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: s.saveChanges })).toBeInTheDocument();

    // Store
    for (const text of [s.storeName, s.storeNameAr, s.fields.address, s.fields.phone, s.fields.vat_number]) fieldOf(text);
    expect(englishLeft(container, DATA)).toEqual([]);

    // Pricing
    openTab(s.tabPricing);
    for (const text of [s.fields.default_margin_pct, s.fields.max_discount_percent, s.marginMode, s.marginValue, s.maxDriftPct, s.nisabGrams]) fieldOf(text);
    fieldOf(new RegExp(s.markupLabel("21K")));
    expect(screen.getByRole("option", { name: s.marginModes.USD_PER_GRAM })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: s.marginModes.PERCENT })).toBeInTheDocument();
    expect(englishLeft(container, DATA)).toEqual([]);

    // Receipt — the footer text itself is the shop's data, printed as stored
    openTab(s.tabReceipt);
    expect(fieldOf(s.footerMessage).value).toBe("Thank you");
    expect(englishLeft(container, DATA)).toEqual([]);

    // Accounting (strings from the earlier ticket, checked here so the whole page is covered)
    openTab(s.accountingTab);
    expect(screen.getByRole("switch", { name: s.autoPostTitle })).toBeInTheDocument();
    expect(englishLeft(container, DATA)).toEqual([]);

    // Staff
    openTab(s.tabStaff);
    expect(screen.getByText(s.staffActive)).toBeInTheDocument();
    expect(screen.getByText(s.staffDisabled)).toBeInTheDocument();
    openTab(s.addCashier);
    for (const text of [s.staffFields.name, s.staffFields.email, s.staffFields.password]) {
      expect(screen.getByLabelText(text)).toHaveAttribute("placeholder", text);
    }
    expect(englishLeft(container, DATA)).toEqual([]);

    // Security
    openTab(s.tabSecurity);
    for (const text of [s.currentPassword, s.newPassword, s.confirmNewPassword]) fieldOf(text);
    expect(screen.getByRole("button", { name: s.updatePassword })).toBeDisabled();
    expect(englishLeft(container, DATA)).toEqual([]);
  });

  it("the same scan does find English on the English page", () => {
    const { container } = renderPage("en");
    expect(englishLeft(container, DATA)).not.toEqual([]);
  });

  it("a password mismatch is reported in Arabic and nothing is sent", () => {
    renderPage("ar");
    const s = ar.settings;
    openTab(s.tabSecurity);
    fireEvent.change(fieldOf(s.currentPassword), { target: { value: "old" } });
    fireEvent.change(fieldOf(s.newPassword), { target: { value: "new-1" } });
    fireEvent.change(fieldOf(s.confirmNewPassword), { target: { value: "new-2" } });
    openTab(s.updatePassword);
    expect(screen.getByText(s.passwordsMismatch)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it("a matching password change posts the same body as before and confirms in Arabic", async () => {
    renderPage("ar");
    const s = ar.settings;
    openTab(s.tabSecurity);
    fireEvent.change(fieldOf(s.currentPassword), { target: { value: "old" } });
    fireEvent.change(fieldOf(s.newPassword), { target: { value: "new-1" } });
    fireEvent.change(fieldOf(s.confirmNewPassword), { target: { value: "new-1" } });
    openTab(s.updatePassword);
    await waitFor(() => expect(api.post).toHaveBeenCalledWith("/auth/change-password", { current_password: "old", new_password: "new-1" }));
    expect(await screen.findByText(s.passwordChanged)).toBeInTheDocument();
  });

  it("the auto-post confirm flow is the same flow in Arabic", async () => {
    renderPage("ar");
    const s = ar.settings;
    openTab(s.accountingTab);
    fireEvent.click(screen.getByRole("switch"));
    expect(screen.getByRole("alertdialog")).toHaveTextContent(s.autoPostEnableWarning);
    expect(api.patch).not.toHaveBeenCalled();
    openTab(s.autoPostEnableConfirm);
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith("/settings", { accounting_auto_post_enabled: true }));
  });
});

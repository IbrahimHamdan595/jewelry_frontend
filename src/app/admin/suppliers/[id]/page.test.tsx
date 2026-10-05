import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import SupplierDetailPage from "@/app/admin/suppliers/[id]/page";
import { LanguageProvider } from "@/context/LanguageContext";
import en from "@/i18n/en";
import ar from "@/i18n/ar";

vi.mock("next/navigation", () => ({ useParams: () => ({ id: "s1" }) }));
const swr = vi.hoisted(() => ({ byKey: {} as Record<string, unknown> }));
vi.mock("swr", () => ({ default: (key: string) => ({ data: swr.byKey[key], error: undefined, isLoading: false, isValidating: false, mutate: vi.fn() }) }));
vi.mock("@/lib/api-client", () => ({ apiFetcher: vi.fn(), api: { post: vi.fn() } }));

const LOT_ID = "7b1e4c90-55aa-4d2f-9c11-0a1b2c3d4e5f";
const SECOND_LOT_ID = "91d2f0a7-3c44-4b6e-8f20-5e6f7a8b9c0d";
const SOURCE_LOT_ID = "c0ffee12-0000-4000-8000-000000000001";
const PURCHASE_NOTE = "Eid stock";
const PAYMENT_NOTE = "From the melt lot";
const detail = {
  supplier: {
    id: "s1", name: "Abu Ali Gold", contact_name: "Ali Haddad", phone: "+961-00-555555", email: "ali@example.com",
    address: "Souk El Dahab, Beirut", default_currency: "USD", payment_terms: "net 30, gold-for-gold preferred",
    notes: "Prefers morning deliveries", is_active: true, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
  },
  balances: [
    { unit: "CASH", karat: null, balance: 1250.5 },
    { unit: "GOLD", karat: "K21", balance: 12.5 },
  ],
  purchases: [
    {
      id: "p1", supplier_id: "s1", occurred_at: "2026-09-05T22:30:00Z", payment_mode: "MIXED", trade_markup_per_gram: null,
      total_cash_due: 1500, total_grams_due_by_karat: { K21: "20.000" }, cash_paid_at_creation: 249.5,
      grams_paid_at_creation_by_karat: { K21: "7.500" }, notes: PURCHASE_NOTE, created_by_user_id: "u1", created_at: "2026-09-05T10:00:00Z",
      items: [{ id: "i1" }, { id: "i2" }],
    },
  ],
  payments: [
    { id: "pay1", supplier_id: "s1", paid_at: "2026-09-06T09:30:00Z", unit: "CASH", karat: null, amount: 100, source_lot_ids: null, paid_by_user_id: "u1", notes: null },
    { id: "pay2", supplier_id: "s1", paid_at: "2026-09-07T22:45:00Z", unit: "GOLD", karat: "K21", amount: 2.5, source_lot_ids: [SOURCE_LOT_ID], paid_by_user_id: "u1", notes: PAYMENT_NOTE },
  ],
};
const lots = {
  items: [
    { id: LOT_ID, karat: "K21", weight_grams: 50, weight_remaining_grams: 30.25, source: "SUPPLIER", is_depleted: false },
    { id: SECOND_LOT_ID, karat: "K21", weight_grams: 20, weight_remaining_grams: 8, source: "MELT", is_depleted: false },
  ],
  total: 2, page: 1, page_size: 100,
};
/** A lot as the dialog shows it. */
const shown = (id: string) => `${id.slice(0, 12)}…`;

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

/** Elements whose classes pin a side (text-left, ml-2, pr-4 …) instead of following the reading direction. */
function physicalClasses(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll("[class]"))
    .map((el) => el.getAttribute("class") ?? "")
    .filter((classes) => /(^|\s)(text-(left|right)|-?m[lr]-\S+|p[lr]-\S+)(\s|$)/.test(classes));
}

// Left as-is on purpose: values that come from the database, and lot ids.
const DATA = [
  detail.supplier.name, detail.supplier.contact_name, detail.supplier.email, detail.supplier.address,
  detail.supplier.payment_terms, detail.supplier.notes,
  PURCHASE_NOTE, PAYMENT_NOTE,
  LOT_ID.slice(0, 12), SECOND_LOT_ID.slice(0, 12), SOURCE_LOT_ID.slice(0, 8),
];

function renderPage(lang: "en" | "ar") {
  return render(<LanguageProvider initialLang={lang}><SupplierDetailPage /></LanguageProvider>);
}

function expectLabelled(text: string, tagName: string) {
  const control = screen.getByLabelText(text);
  expect(control.tagName, text).toBe(tagName);
  const label = control.closest("label") as HTMLLabelElement;
  expect(label, text).not.toBeNull();
  expect(label.control, text).toBe(control);
  return control;
}

describe("supplier detail labels and i18n (NEX-64)", () => {
  beforeEach(() => {
    swr.byKey = { "/suppliers/s1": detail, "/lots?karat=K21&page_size=100": lots };
  });

  it("renders the supplier in Arabic with no English left behind", () => {
    const { container } = renderPage("ar");
    const s = ar.suppliers;
    for (const text of [s.backToList, s.cashOwed, s.goldOwedByKarat, s.newPurchase, s.purchaseHistory, s.paymentHistory, s.active, s.cannotDeactivate]) {
      expect(screen.getByText(text), text).toBeInTheDocument();
    }
    for (const header of [s.colMode, s.colCashDuePaid, s.colGoldDuePaid, s.colItems, s.colReceipt, s.colUnit, s.colAmount, s.colSourceLots]) {
      expect(screen.getByRole("columnheader", { name: header }), header).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: s.recordCashPaymentLink })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: s.recordGoldPaymentLink })).toBeEnabled();
    expect(screen.getByRole("link", { name: s.receiptLink })).toHaveAttribute("href", "/admin/suppliers/purchases/p1/receipt");
    for (const english of ["Back to suppliers", "Cash owed", "Actions", "New Purchase", "Purchase history", "Payment history", "Date", "Mode", "Items", "Notes", "Unit", "Amount", "Source lots", "Active", "Contact", "Terms"]) {
      expect(screen.queryByText(english), english).toBeNull();
    }
    expect(englishLeft(container, DATA)).toEqual([]);
  });

  it("the no-English check is not vacuous: it flags the English render", () => {
    const { container } = renderPage("en");
    expect(englishLeft(container, DATA)).toEqual(expect.arrayContaining(["Back to suppliers", "Purchase history", "Record cash payment →", "MIXED"]));
  });

  it("shows enum values and counts through the dictionary", () => {
    renderPage("ar");
    const s = ar.suppliers;
    expect(screen.getByText(s.mode.MIXED)).toBeInTheDocument(); // purchase payment mode
    expect(screen.getByText(s.unitCash)).toBeInTheDocument(); // payment unit
    expect(screen.getByText(s.itemCount(2))).toBeInTheDocument();
    for (const raw of ["MIXED", "CASH", "2 items"]) {
      expect(screen.queryByText(raw), raw).toBeNull();
    }
  });

  it("shows purchase and payment dates in the app language, at Beirut wall-clock time", () => {
    // 22:30 UTC on the 5th is 01:30 on the 6th in Beirut; 22:45 UTC on the 7th is 01:45 on the 8th.
    const { unmount } = renderPage("ar");
    const purchase = within(screen.getByRole("row", { name: new RegExp(PURCHASE_NOTE) })).getAllByRole("cell")[0];
    expect(purchase).toHaveTextContent(/^06 (أيلول|سبتمبر) 2026/);
    expect(purchase).toHaveTextContent(/01:30/);
    expect(purchase.textContent).not.toMatch(/[A-Za-z]/);
    const payment = within(screen.getByRole("row", { name: new RegExp(PAYMENT_NOTE) })).getAllByRole("cell")[0];
    expect(payment).toHaveTextContent(/^08 (أيلول|سبتمبر) 2026/);
    expect(payment).toHaveTextContent(/01:45/);
    unmount();

    renderPage("en");
    expect(within(screen.getByRole("row", { name: new RegExp(PURCHASE_NOTE) })).getAllByRole("cell")[0]).toHaveTextContent(/^06 Sept? 2026, 01:30$/);
    expect(within(screen.getByRole("row", { name: new RegExp(PAYMENT_NOTE) })).getAllByRole("cell")[0]).toHaveTextContent(/^08 Sept? 2026, 01:45$/);
  });

  it("keeps the phone number and the email left-to-right and intact", () => {
    renderPage("ar");
    expect(screen.getByText("+961-00-555555").closest("bdi")).toHaveAttribute("dir", "ltr");
    expect(screen.getByText("ali@example.com").closest("bdi")).toHaveAttribute("dir", "ltr");
  });

  it("follows the reading direction: logical utilities only, and the back arrow flips", () => {
    const { container } = renderPage("ar");
    fireEvent.click(screen.getByRole("button", { name: ar.suppliers.recordGoldPaymentLink }));
    expect(physicalClasses(container)).toEqual([]);
    expect(container.querySelector("svg.lucide-arrow-left")).toHaveClass("rtl:rotate-180");
    container.querySelectorAll("svg[class*='lucide-arrow-'], svg[class*='lucide-chevron-left'], svg[class*='lucide-chevron-right'], svg[class*='lucide-toggle-']").forEach((icon) => expect(icon).toHaveClass("rtl:rotate-180"));
    // The label and its value keep a gap on the label's reading-end side.
    expect(screen.getByText(ar.suppliers.phone)).toHaveClass("me-1");
    // Headers align with the start of the line; the receipt column with its end.
    expect(screen.getByRole("columnheader", { name: ar.suppliers.colMode })).toHaveClass("text-start");
    expect(screen.getByRole("columnheader", { name: ar.suppliers.colReceipt })).toHaveClass("text-end");
    // A weight and its unit are one left-to-right run, so the gap stays between them.
    expect(screen.getByText("g", { selector: "span" }).closest("bdi")).toHaveTextContent("12.500g");
  });

  it("leaves database values untranslated", () => {
    renderPage("ar");
    for (const value of [detail.supplier.name, detail.supplier.payment_terms, detail.supplier.notes, PURCHASE_NOTE, PAYMENT_NOTE]) {
      expect(screen.getByText(value), value).toBeInTheDocument();
    }
  });

  it("cash payment: both fields are reachable by label and the label's control is the input", () => {
    renderPage("en");
    fireEvent.click(screen.getByRole("button", { name: en.suppliers.recordCashPaymentLink }));
    expect(expectLabelled(en.suppliers.amountUsd, "INPUT")).toHaveAttribute("type", "number");
    expectLabelled(en.suppliers.notesOptional, "INPUT");
    expect(screen.getByRole("button", { name: en.suppliers.recordPayment })).toBeDisabled();
    fireEvent.change(screen.getByLabelText(en.suppliers.amountUsd), { target: { value: "50" } });
    expect(screen.getByRole("button", { name: en.suppliers.recordPayment })).toBeEnabled();
  });

  it("cash payment dialog in Arabic has no English left behind", () => {
    const { container } = renderPage("ar");
    const s = ar.suppliers;
    fireEvent.click(screen.getByRole("button", { name: s.recordCashPaymentLink }));
    expectLabelled(s.amountUsd, "INPUT");
    expectLabelled(s.notesOptional, "INPUT");
    expect(screen.getByText(s.outstanding, { exact: false })).toHaveTextContent("$1,250.50");
    expect(screen.getByRole("button", { name: s.recordPayment })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: ar.common.cancel })).toBeInTheDocument();
    for (const english of ["Record cash payment", "Amount (USD)", "Notes (optional)", "Cancel", "Record Payment"]) {
      expect(screen.queryByText(english), english).toBeNull();
    }
    expect(englishLeft(container, DATA)).toEqual([]);
  });

  it("gold payment: karat, lot checkbox and grams are all labelled", () => {
    renderPage("en");
    const s = en.suppliers;
    fireEvent.click(screen.getByRole("button", { name: s.recordGoldPaymentLink }));

    const karat = expectLabelled(s.karat, "SELECT");
    expect(within(karat).getByRole("option", { name: s.karatOwed("K21", "12.500") })).toBeEnabled();
    expect(within(karat).getByRole("option", { name: s.karatNoneOwed("K18") })).toBeDisabled();

    // The lot's id and remaining weight are the checkbox's label.
    const [checkbox, secondCheckbox] = screen.getAllByRole("checkbox");
    const lotLabel = checkbox.closest("label") as HTMLLabelElement;
    expect(lotLabel.control).toBe(checkbox);
    expect(lotLabel).toHaveTextContent(LOT_ID.slice(0, 12));
    expect(lotLabel).toHaveTextContent(`${s.lotRemaining("30.250")} · SUPPLIER`);

    fireEvent.click(lotLabel);
    expect(checkbox).toBeChecked();
    const grams = screen.getByLabelText(s.gramsFromLot(shown(LOT_ID)));
    expect(grams).toHaveAttribute("placeholder", s.gramsPlaceholder);
    fireEvent.change(grams, { target: { value: "5" } });
    expect(screen.getByRole("button", { name: s.payGold("5.000", "K21") })).toBeEnabled();
    expectLabelled(s.notesOptional, "INPUT");

    // With two lots picked, each grams input is named after its own lot.
    fireEvent.click(secondCheckbox);
    const secondGrams = screen.getByLabelText(s.gramsFromLot(shown(SECOND_LOT_ID)));
    expect(secondGrams).not.toBe(grams);
    expect(screen.getByLabelText(s.gramsFromLot(shown(LOT_ID)))).toBe(grams);
    fireEvent.change(secondGrams, { target: { value: "2.5" } });
    expect(screen.getByRole("button", { name: s.payGold("7.500", "K21") })).toBeEnabled();
  });

  it("gold payment dialog in Arabic has no English left behind", () => {
    const { container } = renderPage("ar");
    const s = ar.suppliers;
    fireEvent.click(screen.getByRole("button", { name: s.recordGoldPaymentLink }));
    const karat = expectLabelled(s.karat, "SELECT");
    expect(within(karat).getByRole("option", { name: s.karatOwed("K21", "12.500") })).toBeInTheDocument();
    expect(within(karat).getByRole("option", { name: s.karatNoneOwed("K24") })).toBeInTheDocument();
    expect(screen.getByText(s.goldPaymentHint)).toBeInTheDocument();
    expect(screen.getByText(s.outstandingKarat("K21"))).toBeInTheDocument();
    expect(screen.getByText(s.pickLots)).toBeInTheDocument();

    const [checkbox, secondCheckbox] = screen.getAllByRole("checkbox");
    // The lot's source is an enum from the API: shown through the dictionary.
    expect(checkbox.closest("label")).toHaveTextContent(`${s.lotRemaining("30.250")} · ${s.lotSource.SUPPLIER}`);
    expect(secondCheckbox.closest("label")).toHaveTextContent(`${s.lotRemaining("8.000")} · ${s.lotSource.MELT}`);
    fireEvent.click(checkbox);
    fireEvent.click(secondCheckbox);
    expect(screen.getByLabelText(s.gramsFromLot(shown(LOT_ID)))).toHaveAttribute("placeholder", s.gramsPlaceholder);
    expect(screen.getByLabelText(s.gramsFromLot(shown(SECOND_LOT_ID)))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: s.payGold("0.000", "K21") })).toBeDisabled();
    expect(englishLeft(container, DATA)).toEqual([]);
  });

  it("says so in Arabic when the chosen karat has no active lots", () => {
    swr.byKey = { "/suppliers/s1": detail };
    renderPage("ar");
    fireEvent.click(screen.getByRole("button", { name: ar.suppliers.recordGoldPaymentLink }));
    expect(screen.getByText(ar.suppliers.noActiveLots("K21"))).toBeInTheDocument();
  });
});

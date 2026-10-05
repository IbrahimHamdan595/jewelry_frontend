import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { Receipt, ReceiptScreen } from "@/components/shared/Receipt";
import { LanguageProvider } from "@/context/LanguageContext";
import type { Receipt as ReceiptData } from "@/types/api";
import en from "@/i18n/en";
import ar from "@/i18n/ar";

const sale: ReceiptData = {
  type: "SALE",
  reference: "ORD-2026-0042",
  issued_at: "2026-09-08T10:00:00Z",
  store: { name: "Fawaz El Namel", name_ar: "فواز النمل", logo_url: null, address: "Hamra Street, Beirut", phone: "+961 1 555 555", vat_number: "601-123456", footer: null },
  cashier_name: "Maya",
  party: { role: "customer", name: "Rima Haddad", phone: "+961 70 000 000" },
  lines: [
    { description: "Gold Ring", description_ar: "خاتم ذهب", code: "R-1", karat: "K21", weight_grams: "5.250", quantity: 2, unit_price: "700", line_total: "1400", stone_value: 120 },
  ],
  totals: { subtotal: "1400", discount_percent: "5", discount_amount: "70", vat_percent: "11", vat_amount: "154", total_usd: "1484", total_lbp: "132818000", lbp_exchange_rate: "89500" },
  payment_method: "CASH",
  notes: null,
};

const renderReceipt = (lang: "en" | "ar", data: ReceiptData = sale) =>
  render(<LanguageProvider initialLang={lang}><Receipt data={data} /></LanguageProvider>);

// Everything a user can read or hear: text nodes plus placeholder / title / aria-label / alt.
function uiStrings(root: HTMLElement): string[] {
  const out: string[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) if (walker.currentNode.parentElement?.tagName !== "STYLE") out.push(walker.currentNode.textContent ?? "");
  root.querySelectorAll("*").forEach((el) => ["placeholder", "title", "aria-label", "alt"].forEach((a) => out.push(el.getAttribute(a) ?? "")));
  return out;
}
/** Latin words still on paper once data and the codes that stay Latin by design are set aside. */
const englishLeft = (root: HTMLElement, keep: RegExp) =>
  uiStrings(root).map((s) => s.replace(keep, "")).filter((s) => /[A-Za-z]{2,}/.test(s));
// Data the server sends: the reference, the address, people's names, the product code, the karat.
const DATA = /ORD-2026-0042|Hamra Street, Beirut|Maya|Rima Haddad|\bR-1\b|\bK21\b/g;

/** The value printed opposite a label, on the same row. */
const valueOf = (label: string) => screen.getByText(label).nextElementSibling?.textContent;

describe("Receipt — printed in the active language (NEX-64)", () => {
  it("Arabic sale: every label is Arabic, the sheet is RTL, and no English is left", () => {
    const { container } = renderReceipt("ar");
    const r = ar.receipt;
    const sheet = container.querySelector("#receipt") as HTMLElement;
    expect(sheet).toHaveAttribute("dir", "rtl");

    expect(screen.getByText("فواز النمل")).toBeInTheDocument();
    expect(screen.getByText(r.titles.SALE)).toBeInTheDocument();
    expect(valueOf(r.ref)).toBe("ORD-2026-0042");
    expect(valueOf(r.cashier)).toBe("Maya");
    expect(valueOf(r.roles.customer)).toBe("Rima Haddad");
    expect(valueOf(r.phone)).toBe("+961 70 000 000");
    expect(screen.getByText(r.date)).toBeInTheDocument();

    expect(valueOf(ar.common.subtotal)).toBe("$1,400.00");
    expect(valueOf(ar.checkout.vatLine(11))).toBe("$154.00");
    expect(valueOf(ar.checkout.discountLine(5))).toBe("−$70.00");
    expect(valueOf(r.total)).toBe("$1,484.00");
    expect(screen.getByText(r.lbpEquiv)).toBeInTheDocument();
    expect(valueOf(ar.checkout.payment)).toBe(ar.checkout.paymentMethods.CASH);
    expect(screen.getByText(r.thankYou("فواز النمل"))).toBeInTheDocument();

    // Line: Arabic description; the code / karat / weight / price run is data and keeps its
    // unit symbols, and the stones note is the one translated token at its end.
    expect(sheet).toHaveTextContent("خاتم ذهب ×2");
    expect(sheet).toHaveTextContent(`R-1 · K21 · 5.250g · @ $700.00 · ${r.stonesLine("$120.00")}`);

    expect(englishLeft(sheet, DATA)).toEqual([]);
  });

  it("English sale: prints what it printed before", () => {
    const { container } = renderReceipt("en");
    const sheet = container.querySelector("#receipt") as HTMLElement;
    expect(sheet).toHaveAttribute("dir", "ltr");
    expect(screen.getByText("SALES RECEIPT")).toBeInTheDocument();
    expect(valueOf("REF")).toBe("ORD-2026-0042");
    expect(valueOf("CASHIER")).toBe("Maya");
    expect(valueOf("CUSTOMER")).toBe("Rima Haddad");
    expect(valueOf("PHONE")).toBe("+961 70 000 000");
    expect(valueOf("Subtotal")).toBe("$1,400.00");
    expect(valueOf("VAT 11%")).toBe("$154.00");
    expect(valueOf("Discount 5%")).toBe("−$70.00");
    expect(valueOf("TOTAL")).toBe("$1,484.00");
    expect(valueOf("LBP Equiv.")).toBe("ل.ل 132,818,000");
    expect(valueOf("Payment")).toBe("CASH");
    expect(screen.getByText("Thank you — Fawaz El Namel")).toBeInTheDocument();
    expect(sheet).toHaveTextContent("VAT: 601-123456");
    expect(sheet).toHaveTextContent("R-1 · K21 · 5.250g · @ $700.00 · Stones: $120.00");
    expect(englishLeft(sheet, DATA)).not.toEqual([]);
  });

  it.each([
    ["BUYBACK", "seller"],
    ["SUPPLIER_PURCHASE", "supplier"],
  ] as const)("Arabic %s receipt names the document and the %s", (type, role) => {
    renderReceipt("ar", { ...sale, type, party: { ...sale.party, role }, payment_method: null, totals: { ...sale.totals, vat_amount: null, discount_amount: null } });
    expect(screen.getByText(ar.receipt.titles[type])).toBeInTheDocument();
    expect(valueOf(ar.receipt.roles[role])).toBe("Rima Haddad");
    expect(screen.queryByText(ar.checkout.payment)).toBeNull();
    expect(screen.queryByText(ar.checkout.vatLine(11))).toBeNull();
  });

  it("a payment method or role the dictionary does not know prints as the server sent it", () => {
    renderReceipt("ar", { ...sale, payment_method: "GOLD_SWAP", party: { ...sale.party, role: "broker" as never } });
    expect(valueOf(ar.checkout.payment)).toBe("GOLD_SWAP");
    expect(valueOf("broker")).toBe("Rima Haddad");
  });

  it("the shop's own footer and notes are data: printed as stored", () => {
    renderReceipt("ar", { ...sale, notes: "Resize to 54", store: { ...sale.store, footer: "No refunds after 7 days" } });
    expect(screen.getByText("No refunds after 7 days")).toBeInTheDocument();
    expect(screen.getByText("Resize to 54")).toBeInTheDocument();
    expect(screen.queryByText(ar.receipt.thankYou("فواز النمل"))).toBeNull();
  });

  it("machine identifiers stay bidi-isolated inside the RTL sheet", () => {
    const { container } = renderReceipt("ar");
    const isolated = Array.from(container.querySelectorAll('bdi[dir="ltr"]')).map((el) => el.textContent);
    expect(isolated).toEqual(expect.arrayContaining(["+961 1 555 555", "601-123456", "+961 70 000 000"]));
  });

  it("amounts and percentages inside Arabic labels are isolated, so the digits and their sign stay together", () => {
    const LRI = "\u2066", PDI = "\u2069";
    expect(ar.checkout.vatLine(11)).toContain(`${LRI}11%${PDI}`);
    expect(ar.checkout.discountLine(5)).toContain(`${LRI}5%${PDI}`);
    expect(ar.receipt.stonesLine("$120.00")).toContain(`${LRI}$120.00${PDI}`);
    expect(ar.checkout.checkoutTotal("$1,484.00")).toContain(`${LRI}$1,484.00${PDI}`);
    // English needs none: it is left-to-right already.
    expect(en.checkout.vatLine(11)).toBe("VAT 11%");
  });

  it("falls back to the English store name when no Arabic one is set", () => {
    renderReceipt("ar", { ...sale, store: { ...sale.store, name_ar: null } });
    expect(screen.getByText(ar.receipt.thankYou("Fawaz El Namel"))).toBeInTheDocument();
  });
});

describe("ReceiptScreen — the frame around the receipt", () => {
  // <style jsx global> is compiled away by Next's SWC plugin; under vitest React sees
  // the raw `jsx` / `global` attributes and warns. Not what these tests are about.
  beforeEach(() => { vi.spyOn(console, "error").mockImplementation(() => {}); });
  afterEach(() => { vi.restoreAllMocks(); });

  it("Arabic: print and back are translated and stay out of the printout", () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    render(<LanguageProvider initialLang="ar"><ReceiptScreen data={sale} /></LanguageProvider>);
    const printButton = screen.getByRole("button", { name: ar.receipt.printReceipt });
    const actions = printButton.parentElement as HTMLElement;
    expect(within(actions).getByRole("button", { name: ar.common.back })).toBeInTheDocument();
    // The print stylesheet hides this bar by class; the receipt itself is found by id.
    expect(actions).toHaveClass("receipt-print-hidden");
    expect(document.querySelector("#receipt")).not.toBeNull();
    printButton.click();
    expect(print).toHaveBeenCalledTimes(1);
    print.mockRestore();
  });

  it("English: same buttons as before", () => {
    render(<ReceiptScreen data={sale} />);
    expect(screen.getByRole("button", { name: en.receipt.printReceipt })).toHaveTextContent("Print Receipt");
    expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
  });
});

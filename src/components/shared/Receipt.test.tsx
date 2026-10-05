import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { Receipt, ReceiptScreen } from "@/components/shared/Receipt";
import { LanguageProvider } from "@/context/LanguageContext";
import { formatDateTime } from "@/lib/utils";
import { localeFor } from "@/lib/lang-cookie";
import type { Receipt as ReceiptData } from "@/types/api";
import en from "@/i18n/en";
import ar from "@/i18n/ar";

// Fixtures are what the backend's three builders send (app/core/receipt.py, ReceiptOut):
//  - decimals as strings; quantity is a decimal too;
//  - karat is the LABEL ("21K"), not the enum value;
//  - description_ar is never set, so every line prints its stored (English) name;
//  - a SALE has no party phone, a product line is always quantity 1 (coins carry the count);
//  - a BUYBACK has one line, no code, the seller's phone, and no VAT / discount / LBP / payment;
//  - a SUPPLIER_PURCHASE references the purchase id and carries its payment mode (CASH / GOLD / MIXED).
const store = { name: "Fawaz El Namel", name_ar: "فواز النمل", logo_url: null, address: "Hamra Street, Beirut", phone: "+961 1 555 555", vat_number: "601-123456", footer: null };
const ISSUED = "2026-09-08T10:00:00Z";

const sale = {
  type: "SALE",
  reference: "ORD-20260908-001",
  issued_at: ISSUED,
  store,
  cashier_name: "Maya",
  party: { role: "customer", name: "Rima Haddad", phone: null },
  lines: [
    { description: "Gold Ring", description_ar: null, code: "FN-21K-0001", karat: "21K", weight_grams: "5.250", quantity: "1", unit_price: "700.00", stone_value: "120.00", line_total: "700.00" },
    { description: "Ottoman Lira", description_ar: null, code: "FN-COIN-22K-0001", karat: "22K", weight_grams: "7.200", quantity: "2", unit_price: "350.00", stone_value: null, line_total: "700.00" },
  ],
  totals: { subtotal: "1400.00", discount_percent: "5.00", discount_amount: "70.00", vat_percent: "11.00", vat_amount: "154.00", total_usd: "1484.00", total_lbp: "132818000.00", lbp_exchange_rate: "89500.00" },
  payment_method: "CASH",
  notes: null,
} as unknown as ReceiptData;

const NO_SALE_TOTALS = { discount_percent: null, discount_amount: null, vat_percent: null, vat_amount: null, total_lbp: null, lbp_exchange_rate: null };

const buyback = {
  type: "BUYBACK",
  reference: "7c1f4a52-9d1e-4b7e-8a0c-2f3b5d6e7a90",
  issued_at: ISSUED,
  store,
  cashier_name: "Maya",
  party: { role: "seller", name: "Rima Haddad", phone: "+961 70 000 000" },
  lines: [{ description: "Pure Gold", description_ar: null, code: null, karat: "21K", weight_grams: "5.000", quantity: "1", unit_price: "609.76", stone_value: null, line_total: "609.76" }],
  totals: { subtotal: "609.76", total_usd: "609.76", ...NO_SALE_TOTALS },
  payment_method: null,
  notes: "Old bracelet, tested on the stone",
} as unknown as ReceiptData;

const purchase = {
  type: "SUPPLIER_PURCHASE",
  reference: "2b9d1c3e-5f60-4a7b-9c8d-0e1f2a3b4c5d",
  issued_at: ISSUED,
  store,
  cashier_name: "Maya",
  party: { role: "supplier", name: "Beirut Bullion", phone: null },
  lines: [{ description: "Pure Gold", description_ar: null, code: null, karat: "24K", weight_grams: "100.000", quantity: "1", unit_price: "14166.00", stone_value: null, line_total: "14166.00" }],
  totals: { subtotal: "14166.00", total_usd: "14166.00", ...NO_SALE_TOTALS },
  payment_method: "GOLD",
  notes: null,
} as unknown as ReceiptData;

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
/** Latin words still on paper once the data the server sent is set aside. */
const englishLeft = (root: HTMLElement, keep: RegExp) =>
  uiStrings(root).map((s) => s.replace(keep, "")).filter((s) => /[A-Za-z]{2,}/.test(s));
// Data: references, the address, people and supplier names, stored item names and notes, codes, karat labels.
const DATA = /ORD-20260908-001|[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}|Hamra Street, Beirut|Maya|Rima Haddad|Beirut Bullion|Gold Ring|Ottoman Lira|Pure Gold|Old bracelet, tested on the stone|FN-(COIN-)?\d\dK-\d{4}|\b\d\dK\b/g;

/** The value printed opposite a label, on the same row. */
const valueOf = (label: string) => screen.getByText(label).nextElementSibling?.textContent;
const isolated = (root: HTMLElement) => Array.from(root.querySelectorAll('bdi[dir="ltr"]')).map((el) => el.textContent);
const arDate = formatDateTime(ISSUED, localeFor("ar"));

describe("Receipt — printed in the active language (NEX-64)", () => {
  it("Arabic sale: every label is Arabic and no English is left", () => {
    const { container } = renderReceipt("ar");
    const r = ar.receipt;
    const sheet = container.querySelector("#receipt") as HTMLElement;
    expect(sheet).toHaveAttribute("dir", "rtl");

    expect(screen.getByText("فواز النمل")).toBeInTheDocument();
    expect(screen.getByText(r.titles.SALE)).toBeInTheDocument();
    expect(valueOf(r.ref)).toBe("ORD-20260908-001");
    // The date is the shop's (Beirut) time in the UI language: 10:00Z is 1 pm in Beirut,
    // the month is spelled in Arabic and the digits stay Western. (Loose on ICU's
    // punctuation, like the formatter's own tests.)
    expect(valueOf(r.date)).toBe(arDate);
    expect(arDate).toMatch(/أيلول|سبتمبر/);
    expect(arDate).toMatch(/08.*2026.*0?1:00/);
    expect(arDate).not.toMatch(/[A-Za-z٠-٩]/);
    expect(valueOf(r.cashier)).toBe("Maya");
    expect(valueOf(r.roles.customer)).toBe("Rima Haddad");
    // A sale carries no customer phone.
    expect(screen.queryByText(r.phone)).toBeNull();

    expect(valueOf(ar.common.subtotal)).toBe("$1,400.00");
    expect(valueOf(ar.checkout.vatLine(11))).toBe("$154.00");
    expect(valueOf(ar.checkout.discountLine(5))).toBe("−$70.00");
    expect(valueOf(r.total)).toBe("$1,484.00");
    expect(valueOf(r.lbpEquiv)).toBe("ل.ل 132,818,000");
    expect(valueOf(ar.checkout.payment)).toBe(ar.checkout.paymentMethods.CASH);
    expect(screen.getByText(r.thankYou("فواز النمل"))).toBeInTheDocument();

    expect(englishLeft(sheet, DATA)).toEqual([]);
  });

  it("lines: the stored name, then the code / karat / weight / price run, then the translated stones note", () => {
    const { container } = renderReceipt("ar");
    const sheet = container.querySelector("#receipt") as HTMLElement;
    // Item names are data: the API sends no Arabic description, so they print as stored.
    expect(sheet).toHaveTextContent("Gold Ring 💎");
    expect(sheet).toHaveTextContent("Ottoman Lira ×2");
    // The backend sends the karat label ("21K") — printed as is, never re-prefixed.
    expect(sheet).toHaveTextContent(`FN-21K-0001 · 21K · 5.250g · ${ar.receipt.stonesLine("$120.00")}`);
    expect(sheet).toHaveTextContent("FN-COIN-22K-0001 · 22K · 7.200g · @ $350.00");
    expect(sheet).not.toHaveTextContent("K21K");
  });

  it("identifiers are isolated left-to-right: reference, phones, VAT number, each line's machine run", () => {
    const { container } = renderReceipt("ar");
    expect(isolated(container)).toEqual([
      "+961 1 555 555",
      "601-123456",
      "ORD-20260908-001",
      "FN-21K-0001 · 21K · 5.250g",
      "FN-COIN-22K-0001 · 22K · 7.200g · @ $350.00",
      "ORD-20260908-001",
    ]);
  });

  it("English sale: prints what it printed before", () => {
    const { container } = renderReceipt("en");
    const sheet = container.querySelector("#receipt") as HTMLElement;
    expect(sheet).toHaveAttribute("dir", "ltr");
    expect(screen.getByText("SALES RECEIPT")).toBeInTheDocument();
    expect(valueOf("REF")).toBe("ORD-20260908-001");
    expect(valueOf("DATE")).toBe(formatDateTime(ISSUED, localeFor("en")));
    expect(valueOf("CASHIER")).toBe("Maya");
    expect(valueOf("CUSTOMER")).toBe("Rima Haddad");
    expect(valueOf("Subtotal")).toBe("$1,400.00");
    expect(valueOf("VAT 11%")).toBe("$154.00");
    expect(valueOf("Discount 5%")).toBe("−$70.00");
    expect(valueOf("TOTAL")).toBe("$1,484.00");
    expect(valueOf("LBP Equiv.")).toBe("ل.ل 132,818,000");
    expect(valueOf("Payment")).toBe("CASH");
    expect(screen.getByText("Thank you — Fawaz El Namel")).toBeInTheDocument();
    expect(sheet).toHaveTextContent("VAT: 601-123456");
    expect(sheet).toHaveTextContent("FN-21K-0001 · 21K · 5.250g · Stones: $120.00");
    expect(sheet).toHaveTextContent("FN-COIN-22K-0001 · 22K · 7.200g · @ $350.00");
    expect(englishLeft(sheet, DATA)).not.toEqual([]);
  });

  it("Arabic buyback: seller, seller's phone and notes — and none of the sale-only rows", () => {
    const { container } = renderReceipt("ar", buyback);
    const r = ar.receipt;
    const sheet = container.querySelector("#receipt") as HTMLElement;
    expect(screen.getByText(r.titles.BUYBACK)).toBeInTheDocument();
    expect(valueOf(r.roles.seller)).toBe("Rima Haddad");
    expect(valueOf(r.phone)).toBe("+961 70 000 000");
    expect(isolated(container)).toContain("+961 70 000 000");
    expect(valueOf(r.cashier)).toBe("Maya");
    expect(valueOf(r.total)).toBe("$609.76");
    expect(sheet).toHaveTextContent("21K · 5.000g");
    expect(screen.getByText("Old bracelet, tested on the stone")).toBeInTheDocument();
    for (const absent of [ar.checkout.payment, ar.checkout.vatLine(11), r.lbpEquiv]) expect(screen.queryByText(absent), absent).toBeNull();
    expect(englishLeft(sheet, DATA)).toEqual([]);
  });

  it("Arabic supplier purchase: supplier, and the purchase's own payment mode", () => {
    const { container } = renderReceipt("ar", purchase);
    const r = ar.receipt;
    expect(screen.getByText(r.titles.SUPPLIER_PURCHASE)).toBeInTheDocument();
    expect(valueOf(r.roles.supplier)).toBe("Beirut Bullion");
    expect(valueOf(ar.checkout.payment)).toBe(ar.checkout.paymentMethods.GOLD);
    expect(valueOf(r.total)).toBe("$14,166.00");
    expect(englishLeft(container.querySelector("#receipt") as HTMLElement, DATA)).toEqual([]);
  });

  it.each(["CARD", "MIXED", "CREDIT"] as const)("a %s sale names its payment method in Arabic", (method) => {
    renderReceipt("ar", { ...sale, payment_method: method });
    expect(valueOf(ar.checkout.payment)).toBe(ar.checkout.paymentMethods[method]);
  });

  // The discount row follows the amount; the percentage is shown only when there is one.
  describe.each([
    ["en", en] as const,
    ["ar", ar] as const,
  ])("discount row (%s)", (lang, dict) => {
    const withPercent = (discount_percent: unknown) =>
      ({ ...sale, totals: { ...sale.totals, discount_percent } }) as unknown as ReceiptData;
    const rowLabels = (container: HTMLElement) =>
      Array.from(container.querySelectorAll("#receipt .text-status-refunded > span:first-child")).map((el) => el.textContent);

    it.each([null, 0, "0", "0.00"])("an amount with a percentage of %s prints the bare label, never 0%%", (pct) => {
      const { container } = renderReceipt(lang, withPercent(pct));
      expect(rowLabels(container)).toEqual([dict.checkout.discount]);
      expect(valueOf(dict.checkout.discount)).toBe("−$70.00");
      expect(container.querySelector("#receipt")).not.toHaveTextContent("0%");
    });

    it.each([[5, 5], ["5.00", 5], ["7.5", 7.5]] as const)("a percentage of %s is printed with the label", (pct, shown) => {
      const { container } = renderReceipt(lang, withPercent(pct));
      expect(rowLabels(container)).toEqual([dict.checkout.discountLine(shown)]);
      expect(valueOf(dict.checkout.discountLine(shown))).toBe("−$70.00");
    });

    it("no discount amount, no row", () => {
      const { container } = renderReceipt(lang, { ...sale, totals: { ...sale.totals, discount_percent: null, discount_amount: null } } as unknown as ReceiptData);
      expect(rowLabels(container)).toEqual([]);
    });
  });

  it("the bare discount label is translated", () => {
    expect(en.checkout.discount).toBe("Discount");
    expect(ar.checkout.discount).toBe("خصم");
  });

  it("the shop's own footer replaces the thank-you line and prints as stored", () => {
    renderReceipt("ar", { ...sale, store: { ...sale.store, footer: "No refunds after 7 days" } });
    expect(screen.getByText("No refunds after 7 days")).toBeInTheDocument();
    expect(screen.queryByText(ar.receipt.thankYou("فواز النمل"))).toBeNull();
  });

  it("falls back to the English store name when no Arabic one is set", () => {
    renderReceipt("ar", { ...sale, store: { ...sale.store, name_ar: null } });
    expect(screen.getByText(ar.receipt.thankYou("Fawaz El Namel"))).toBeInTheDocument();
  });

  it("amounts and percentages inside Arabic labels are isolated, so the digits and their sign stay together", () => {
    const LRI = "⁦", PDI = "⁩";
    expect(ar.checkout.vatLine(11)).toContain(`${LRI}11%${PDI}`);
    expect(ar.checkout.discountLine(5)).toContain(`${LRI}5%${PDI}`);
    expect(ar.receipt.stonesLine("$120.00")).toContain(`${LRI}$120.00${PDI}`);
    expect(ar.checkout.checkoutTotal("$1,484.00")).toContain(`${LRI}$1,484.00${PDI}`);
    // English needs none: it is left-to-right already.
    expect(en.checkout.vatLine(11)).toBe("VAT 11%");
  });

  it("uses logical padding only, and keeps the 80mm sheet the print stylesheet expects", () => {
    const { container } = renderReceipt("ar");
    const sheet = container.querySelector("#receipt") as HTMLElement;
    expect(sheet.style.width).toBe("80mm");
    const physical = Array.from(sheet.querySelectorAll("[class]")).flatMap((el) => Array.from(el.classList)).filter((c) => /^(text-(left|right)|-?m[lr]-|p[lr]-|(left|right)-)/.test(c));
    expect(physical).toEqual([]);
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

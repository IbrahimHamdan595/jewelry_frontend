import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import BuybackReceiptPage from "@/app/pos/buyback-receipt/[id]/page";
import SaleReceiptPage from "@/app/pos/receipt/[orderId]/page";
import { LanguageProvider } from "@/context/LanguageContext";
import { formatDateTime } from "@/lib/utils";
import { localeFor } from "@/lib/lang-cookie";
import type { Receipt } from "@/types/api";
import ar from "@/i18n/ar";

const nav = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useParams: () => ({ id: "7c1f4a52-9d1e-4b7e-8a0c-2f3b5d6e7a90", orderId: "o1" }), useRouter: () => ({ push: nav.push }) }));
const swr = vi.hoisted(() => ({ data: undefined as unknown }));
vi.mock("swr", () => ({ default: () => ({ data: swr.data, error: undefined, isLoading: false, isValidating: false, mutate: vi.fn() }) }));
vi.mock("@/lib/api-client", async (orig) => ({ ...(await orig<typeof import("@/lib/api-client")>()), apiFetcher: vi.fn() }));

// What GET /buybacks/{id}/receipt sends (build_buyback_receipt): one line with no code,
// the karat LABEL ("21K"), decimals as strings, the seller's name and phone (both required
// when the buyback is recorded), the cashier's name, and no VAT / discount / LBP / payment.
const receipt = {
  type: "BUYBACK",
  reference: "7c1f4a52-9d1e-4b7e-8a0c-2f3b5d6e7a90",
  issued_at: "2026-09-08T10:00:00Z",
  store: { name: "Fawaz El Namel", name_ar: "فواز النمل", logo_url: null, address: "", phone: "", vat_number: null, footer: null },
  cashier_name: "Maya",
  party: { role: "seller", name: "Rima", phone: "+961 70 000 000" },
  lines: [{ description: "Pure Gold", description_ar: null, code: null, karat: "21K", weight_grams: "5.000", quantity: "1", unit_price: "609.76", stone_value: null, line_total: "609.76" }],
  totals: { subtotal: "609.76", discount_percent: null, discount_amount: null, vat_percent: null, vat_amount: null, total_usd: "609.76", total_lbp: null, lbp_exchange_rate: null },
  payment_method: null,
  notes: null,
} as unknown as Receipt;

// Everything a user can read or hear: text nodes plus placeholder / title / aria-label / alt.
function uiStrings(root: HTMLElement): string[] {
  const out: string[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) if (walker.currentNode.parentElement?.tagName !== "STYLE") out.push(walker.currentNode.textContent ?? "");
  root.querySelectorAll("*").forEach((el) => ["placeholder", "title", "aria-label", "alt"].forEach((a) => out.push(el.getAttribute(a) ?? "")));
  return out;
}
/** Latin words still on screen once the data the server sent is set aside. */
const englishLeft = (root: HTMLElement, keep: RegExp) =>
  uiStrings(root).map((s) => s.replace(keep, "")).filter((s) => /[A-Za-z]{2,}/.test(s));
// Data: the buyback id, the people's names, the stored item name, the karat label.
const DATA = /[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}|Rima|Maya|Pure Gold|\b21K\b/g;

describe("buyback receipt screen (NEX-64)", () => {
  beforeEach(() => {
    nav.push.mockClear();
    // <style jsx global> is compiled away by Next's SWC plugin; under vitest React warns about it.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it("Arabic: loading state", () => {
    swr.data = undefined;
    const { container } = render(<LanguageProvider initialLang="ar"><BuybackReceiptPage /></LanguageProvider>);
    expect(screen.getByText(ar.common.loading)).toBeInTheDocument();
    expect(englishLeft(container, DATA)).toEqual([]);
  });

  it("Arabic: success header, receipt and actions — no English left", () => {
    swr.data = receipt;
    const { container } = render(<LanguageProvider initialLang="ar"><BuybackReceiptPage /></LanguageProvider>);
    expect(screen.getByText(ar.posBuyback.recorded)).toBeInTheDocument();
    expect(screen.getByText(ar.posBuyback.paidTo("$609.76", "Rima"))).toBeInTheDocument();
    expect(screen.getByText(ar.receipt.titles.BUYBACK)).toBeInTheDocument();
    // The receipt's date is rendered, in Beirut time and in Arabic — asserted, not skipped as data.
    expect(screen.getByText(ar.receipt.date).nextElementSibling).toHaveTextContent(formatDateTime(receipt.issued_at, localeFor("ar")));
    expect(screen.getByText(ar.receipt.phone).nextElementSibling?.querySelector('bdi[dir="ltr"]')).toHaveTextContent("+961 70 000 000");
    expect(screen.getByRole("button", { name: ar.receipt.print })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: ar.posBuyback.newBuyback }));
    expect(nav.push).toHaveBeenCalledWith("/pos/buyback");
    expect(englishLeft(container, DATA)).toEqual([]);
  });

  it("the amount and the seller's name keep their own direction inside the Arabic sentence", () => {
    expect(ar.posBuyback.paidTo("$609.76", "Rima")).toContain("⁦$609.76⁩");
    expect(ar.posBuyback.paidTo("$609.76", "Rima")).toContain("⁨Rima⁩");
  });
});

describe("sale receipt screen (NEX-64)", () => {
  it("Arabic: loading state", () => {
    swr.data = undefined;
    const { container } = render(<LanguageProvider initialLang="ar"><SaleReceiptPage /></LanguageProvider>);
    expect(screen.getByText(ar.receipt.loading)).toBeInTheDocument();
    expect(englishLeft(container, DATA)).toEqual([]);
  });
});

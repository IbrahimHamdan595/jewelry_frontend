import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import BuybackReceiptPage from "@/app/pos/buyback-receipt/[id]/page";
import SaleReceiptPage from "@/app/pos/receipt/[orderId]/page";
import { LanguageProvider } from "@/context/LanguageContext";
import type { Receipt } from "@/types/api";
import ar from "@/i18n/ar";

const nav = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useParams: () => ({ id: "b1", orderId: "o1" }), useRouter: () => ({ push: nav.push }) }));
const swr = vi.hoisted(() => ({ data: undefined as unknown }));
vi.mock("swr", () => ({ default: () => ({ data: swr.data, error: undefined, isLoading: false, isValidating: false, mutate: vi.fn() }) }));
vi.mock("@/lib/api-client", async (orig) => ({ ...(await orig<typeof import("@/lib/api-client")>()), apiFetcher: vi.fn() }));

const receipt: Receipt = {
  type: "BUYBACK",
  reference: "BB-2026-0007",
  issued_at: "2026-09-08T10:00:00Z",
  store: { name: "Fawaz El Namel", name_ar: "فواز النمل", logo_url: null, address: "", phone: "", vat_number: null, footer: null },
  cashier_name: null,
  party: { role: "seller", name: "Rima", phone: null },
  lines: [{ description: "Pure gold", description_ar: "ذهب خالص", code: null, karat: "K21", weight_grams: "5", quantity: 1, unit_price: null, line_total: "609.75" }],
  totals: { subtotal: "609.75", discount_percent: null, discount_amount: null, vat_percent: null, vat_amount: null, total_usd: "609.75", total_lbp: null, lbp_exchange_rate: null },
  payment_method: null,
  notes: null,
};

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
// The reference, the seller's name and the karat code are data.
const DATA = /BB-2026-0007|Rima|\bK21\b/g;

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
    expect(screen.getByText(ar.posBuyback.paidTo("$609.75", "Rima"))).toBeInTheDocument();
    expect(screen.getByText(ar.receipt.titles.BUYBACK)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: ar.receipt.print })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: ar.posBuyback.newBuyback }));
    expect(nav.push).toHaveBeenCalledWith("/pos/buyback");
    expect(englishLeft(container, DATA)).toEqual([]);
  });

  it("a receipt with no seller name does not print the word null", () => {
    swr.data = { ...receipt, party: { ...receipt.party, name: null } };
    const { container } = render(<LanguageProvider initialLang="en"><BuybackReceiptPage /></LanguageProvider>);
    expect(container).not.toHaveTextContent("null");
    expect(screen.getByText(/Paid \$609\.75 to/)).toBeInTheDocument();
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

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AddUnitDialog } from "@/components/pos/AddUnitDialog";
import { ScanPanel } from "@/components/pos/ScanPanel";
import { CartProvider } from "@/hooks/useCart";
import { CART_STORAGE_KEY } from "@/lib/cart-storage";
import { LanguageProvider } from "@/context/LanguageContext";
import en from "@/i18n/en";
import ar from "@/i18n/ar";

const swr = vi.hoisted(() => ({ byKey: {} as Record<string, unknown> }));
vi.mock("swr", () => ({
  default: (key: string | null) => ({ data: key ? swr.byKey[key] : undefined, error: undefined, isLoading: false, isValidating: false, mutate: vi.fn() }),
}));
vi.mock("@/lib/api-client", async (orig) => ({ ...(await orig<typeof import("@/lib/api-client")>()), apiFetcher: vi.fn() }));

const TYPES = "/coins?is_active=true&page_size=200";
// UnitTypeOut and UnitPriceOut as GET /coins and GET /coins/{id}/price send them
// (app/schemas/unit_stock.py): decimals as strings, karat as the enum value.
const lira = {
  id: "c1", code: "FN-COIN-22K-0001", name_en: "Ottoman Lira", name_ar: "ليرة عثمانية", karat: "K22", weight_grams: "7.200",
  markup_per_gram: "0.0000", margin_mode: "USD", margin_value: "64.70", on_hand_qty: 4, min_stock_qty: 5, photo_url: null,
  is_active: true, created_at: "2026-08-01T09:00:00Z", updated_at: "2026-08-01T09:00:00Z",
};
// 141.66 × 0.917 = 129.90/g; × 7.2 g = 935.30 metal; + 64.70 margin = 1000.00
const price = {
  type_id: "c1", code: "FN-COIN-22K-0001", gold_rate_24k: 141.66, effective_rate: "129.90", metal_value: "935.30",
  margin_amount: "64.70", final_price: "1000.00", on_hand_qty: 4, rate_source: "live", rate_is_stale: false,
};

function renderDialog(lang: "en" | "ar") {
  const onAdded = vi.fn();
  const onClose = vi.fn();
  const view = render(
    <LanguageProvider initialLang={lang}>
      <CartProvider>
        <AddUnitDialog kind="COIN" onClose={onClose} onAdded={onAdded} />
      </CartProvider>
    </LanguageProvider>,
  );
  return { ...view, onAdded, onClose };
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
// Karat codes, plus the coin's code and English name, which the fixture supplies as data.
const DATA = /\b(FN-COIN-22K-0001|FN-21K-\d{4}|K?\d\dK?|Ottoman Lira)\b/g;
/** Physical-direction utilities that would not flip in RTL. */
const physicalClasses = (root: HTMLElement) =>
  Array.from(root.querySelectorAll("[class]")).flatMap((el) => Array.from(el.classList)).filter((c) => /^(text-(left|right)|-?m[lr]-|p[lr]-|(left|right)-)/.test(c));

describe("AddUnitDialog — labels and i18n (NEX-64)", () => {
  beforeEach(() => {
    sessionStorage.clear();
    swr.byKey = { [TYPES]: { items: [lira], total: 1, page: 1, page_size: 200 }, "/coins/c1/price": price };
  });

  it("opens with the search box focused and named", () => {
    renderDialog("en");
    const search = screen.getByLabelText(en.pos.searchCoinTypes);
    expect(search).toHaveFocus();
    expect(search).toHaveAttribute("placeholder", en.pos.searchCoinTypes);
  });

  it("the quantity label wraps its input", () => {
    renderDialog("en");
    fireEvent.click(screen.getByRole("button", { name: /Ottoman Lira/ }));
    const qty = screen.getByLabelText(en.pos.qty);
    expect(qty).toHaveAttribute("type", "number");
    expect((screen.getByText(en.pos.qty).closest("label") as HTMLLabelElement).control).toBe(qty);
  });

  it("Arabic: list, selection, quantity and buttons — no English left", () => {
    const { container } = renderDialog("ar");
    expect(screen.getByText(ar.pos.addCoinToCart)).toBeInTheDocument();
    expect(screen.getByLabelText(ar.pos.searchCoinTypes)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Ottoman Lira/ }));
    expect(screen.getByText(ar.pos.unitPrice)).toBeInTheDocument();
    expect(screen.getByLabelText(ar.pos.qty)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: ar.common.cancel })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: ar.pos.addToCart })).toBeEnabled();
    // The row reads: karat, English name (data), code · weight, then the Arabic stock note.
    expect(screen.getByRole("button", { name: /Ottoman Lira/ })).toHaveTextContent(`K22Ottoman LiraFN-COIN-22K-0001 · 7.200g${ar.pos.onHand} 4`);
    expect(englishLeft(container, DATA)).toEqual([]);
    expect(physicalClasses(container)).toEqual([]);

    fireEvent.change(screen.getByLabelText(ar.pos.searchCoinTypes), { target: { value: "zzz" } });
    expect(screen.getByText(ar.pos.noCoinTypes)).toBeInTheDocument();
    expect(englishLeft(container, DATA)).toEqual([]);
  });

  it("the ounce variant has its own Arabic wording", () => {
    swr.byKey = { "/ounces?is_active=true&page_size=200": { items: [], total: 0, page: 1, page_size: 200 } };
    render(
      <LanguageProvider initialLang="ar">
        <CartProvider><AddUnitDialog kind="OUNCE" onClose={vi.fn()} onAdded={vi.fn()} /></CartProvider>
      </LanguageProvider>,
    );
    expect(screen.getByText(ar.pos.addOunceToCart)).toBeInTheDocument();
    expect(screen.getByLabelText(ar.pos.searchOunceTypes)).toBeInTheDocument();
    expect(screen.getByText(ar.pos.noOunceTypes)).toBeInTheDocument();
  });

  it("still adds the same line to the cart", () => {
    const { onAdded } = renderDialog("ar");
    fireEvent.click(screen.getByRole("button", { name: /Ottoman Lira/ }));
    fireEvent.change(screen.getByLabelText(ar.pos.qty), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: ar.pos.addToCart }));
    expect(onAdded).toHaveBeenCalledTimes(1);
    const [line] = JSON.parse(sessionStorage.getItem(CART_STORAGE_KEY) ?? "{}").items;
    expect(line).toMatchObject({ kind: "COIN", coinTypeId: "c1", code: "FN-COIN-22K-0001", karat: "K22", weightGrams: 7.2, quantity: 3, unitPrice: 1000, finalPrice: 3000, goldRate24k: 141.66 });
  });

  it("refuses more than is on hand — the button stays disabled", () => {
    const { onAdded } = renderDialog("ar");
    fireEvent.click(screen.getByRole("button", { name: /Ottoman Lira/ }));
    fireEvent.change(screen.getByLabelText(ar.pos.qty), { target: { value: "9" } });
    expect(screen.getByRole("button", { name: ar.pos.addToCart })).toBeDisabled();
    expect(onAdded).not.toHaveBeenCalled();
  });
});

// NEX-54: GET /coins/{id}/price is moving gold_rate_24k from a JSON number to
// an exact decimal string. What lands in the cart must not change.
describe("AddUnitDialog — the unit price's rate as a decimal string or a number (NEX-54)", () => {
  beforeEach(() => {
    sessionStorage.clear();
    swr.byKey = { [TYPES]: { items: [lira], total: 1, page: 1, page_size: 200 }, "/coins/c1/price": price };
  });

  function addThree(payload: unknown) {
    sessionStorage.clear();
    swr.byKey["/coins/c1/price"] = payload;
    const view = renderDialog("en");
    fireEvent.click(screen.getByRole("button", { name: /Ottoman Lira/ }));
    fireEvent.change(screen.getByLabelText(en.pos.qty), { target: { value: "3" } });
    const html = view.container.innerHTML;
    fireEvent.click(screen.getByRole("button", { name: en.pos.addToCart }));
    const [line] = JSON.parse(sessionStorage.getItem(CART_STORAGE_KEY) ?? '{"items":[]}').items;
    view.unmount();
    return { html, line: line ? { ...line, cartId: "" } : undefined, added: view.onAdded.mock.calls.length };
  }

  it("adds the same line, priced the same, for both shapes", () => {
    const numeric = addThree(price);
    const exact = addThree({ ...price, gold_rate_24k: "141.66" });
    expect(exact.html).toBe(numeric.html);
    expect(exact.line).toEqual(numeric.line);
    expect(exact.added).toBe(1);
    // Numbers in the cart whatever the API sent: 3 × 1000.00
    expect(exact.line).toMatchObject({ kind: "COIN", coinTypeId: "c1", quantity: 3, goldRate24k: 141.66, unitPrice: 1000, finalPrice: 3000 });
  });

  it.each([
    ["no price", { ...price, final_price: null }],
    ["an unreadable price", { ...price, final_price: "n/a" }],
    ["no rate", { ...price, gold_rate_24k: null }],
    ["an unreadable rate", { ...price, gold_rate_24k: "" }],
  ])("a quote with %s cannot be added: the button stays disabled and nothing is priced at zero", (_name, payload) => {
    swr.byKey["/coins/c1/price"] = payload;
    const { container, onAdded } = renderDialog("en");
    fireEvent.click(screen.getByRole("button", { name: /Ottoman Lira/ }));
    const add = screen.getByRole("button", { name: en.pos.addToCart });
    expect(add).toBeDisabled();
    fireEvent.click(add);
    expect(onAdded).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(CART_STORAGE_KEY)).toBeNull();
    expect(container).not.toHaveTextContent("NaN");
    expect(container).not.toHaveTextContent("$0.00");
  });
});

describe("ScanPanel — i18n (NEX-64)", () => {
  it("Arabic: ready state, manual entry and its button — no English left", () => {
    const onScan = vi.fn(() => Promise.resolve());
    const { container } = render(<LanguageProvider initialLang="ar"><ScanPanel onScan={onScan} scanError={null} /></LanguageProvider>);
    for (const text of [ar.pos.capture, ar.pos.step01, ar.pos.readyToScan, ar.pos.scanHint, ar.pos.manualEntry]) {
      expect(screen.getByText(text), text).toBeInTheDocument();
    }
    const code = screen.getByLabelText(ar.pos.manualEntry);
    expect(code).toHaveAttribute("placeholder", ar.pos.productCodePlaceholder);
    expect(englishLeft(container, DATA)).toEqual([]);
    expect(physicalClasses(container)).toEqual([]);

    fireEvent.change(code, { target: { value: " FN-21K-0001 " } });
    fireEvent.click(screen.getByRole("button", { name: ar.pos.find }));
    expect(onScan).toHaveBeenCalledWith("FN-21K-0001");
  });

  it("Arabic: a failed scan says so and shows the scanned code as data", () => {
    const { container } = render(<LanguageProvider initialLang="ar"><ScanPanel onScan={vi.fn()} scanError="FN-21K-9999" /></LanguageProvider>);
    expect(screen.getByText(ar.pos.itemNotFound)).toBeInTheDocument();
    // The code is set in font-mono, which the RTL stylesheet isolates left-to-right.
    expect(screen.getByText("FN-21K-9999")).toHaveClass("font-mono");
    expect(englishLeft(container, DATA)).toEqual([]);
  });

  it("keeps the English wording it had", () => {
    render(<ScanPanel onScan={vi.fn()} scanError={null} />);
    for (const text of ["Capture", "Step 01", "Ready to scan", "Manual entry", "Find"]) expect(screen.getByText(text), text).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Product code…")).toBeInTheDocument();
  });
});

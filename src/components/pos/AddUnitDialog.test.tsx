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
const lira = { id: "c1", code: "LIRA-8", name_en: "Ottoman Lira", karat: "K22", weight_grams: "7.2", on_hand_qty: 4, min_stock_qty: 5, photo_url: null };
const price = { gold_rate_24k: 141.66, final_price: "1000" };

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
// Karat codes, plus the coin's code and name, which the fixture supplies as data.
const DATA = /\b(K?\d\dK?|LIRA-8|Ottoman Lira)\b/g;

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
    expect(englishLeft(container, DATA)).toEqual([]);

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
    expect(line).toMatchObject({ kind: "COIN", coinTypeId: "c1", code: "LIRA-8", karat: "K22", weightGrams: 7.2, quantity: 3, unitPrice: 1000, finalPrice: 3000, goldRate24k: 141.66 });
  });

  it("refuses more than is on hand — the button stays disabled", () => {
    const { onAdded } = renderDialog("ar");
    fireEvent.click(screen.getByRole("button", { name: /Ottoman Lira/ }));
    fireEvent.change(screen.getByLabelText(ar.pos.qty), { target: { value: "9" } });
    expect(screen.getByRole("button", { name: ar.pos.addToCart })).toBeDisabled();
    expect(onAdded).not.toHaveBeenCalled();
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

    fireEvent.change(code, { target: { value: " R-1 " } });
    fireEvent.click(screen.getByRole("button", { name: ar.pos.find }));
    expect(onScan).toHaveBeenCalledWith("R-1");
  });

  it("Arabic: a failed scan says so and shows the scanned code as data", () => {
    const { container } = render(<LanguageProvider initialLang="ar"><ScanPanel onScan={vi.fn()} scanError="ZZ-404" /></LanguageProvider>);
    expect(screen.getByText(ar.pos.itemNotFound)).toBeInTheDocument();
    expect(screen.getByText("ZZ-404")).toBeInTheDocument();
    expect(englishLeft(container, /ZZ-404/g)).toEqual([]);
  });

  it("keeps the English wording it had", () => {
    render(<ScanPanel onScan={vi.fn()} scanError={null} />);
    for (const text of ["Capture", "Step 01", "Ready to scan", "Manual entry", "Find"]) expect(screen.getByText(text), text).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Product code…")).toBeInTheDocument();
  });
});

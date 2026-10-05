import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import BuybackPage from "@/app/pos/buyback/page";
import { ApiError } from "@/lib/api-client";
import { LanguageProvider } from "@/context/LanguageContext";
import en from "@/i18n/en";
import ar from "@/i18n/ar";

const nav = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: nav.push }), usePathname: () => "/pos/buyback" }));
// The Sell / Buy Back tabs are not part of this slice and are still hardcoded English.
vi.mock("@/components/pos/PosModeTabs", () => ({ PosModeTabs: () => null }));
vi.mock("@/lib/auth", () => ({ logout: vi.fn(), getStoredUser: () => null }));

const swr = vi.hoisted(() => ({ byKey: {} as Record<string, unknown> }));
vi.mock("swr", () => ({
  default: (key: string | null) => ({ data: key ? swr.byKey[key] : undefined, error: undefined, isLoading: false, isValidating: false, mutate: vi.fn() }),
}));
const api = vi.hoisted(() => ({ post: vi.fn<(path: string, body?: unknown) => Promise<unknown>>() }));
vi.mock("@/lib/api-client", async (orig) => ({ ...(await orig<typeof import("@/lib/api-client")>()), api, apiFetcher: vi.fn() }));

const RATE = { rate_24k: 141.66, rate_22k: 130.1, rate_21k: 123.95, rate_18k: 106.25, source: "goldapi", fetched_at: "2026-09-08T10:00:00Z", is_stale: false, market_closed: false };
const QUOTE_KEY = "/buybacks/quote?karat=K21&weight_grams=5";
const QUOTE = { rate_24k: "141.66", rate_source: "goldapi", rate_is_stale: true, karat: "K21", purity_rate: "123.95", weight_grams: "5", margin_mode: "USD_PER_GRAM", margin_value: "2", effective_rate_per_gram: "121.95", buy_price: "609.75" };
const COINS = { items: [{ id: "c1", code: "LIRA-8", name_en: "Ottoman Lira", karat: "K22", weight_grams: "7.2", on_hand_qty: 4, min_stock_qty: null, photo_url: null }], total: 1, page: 1, page_size: 200 };

function renderPage(lang: "en" | "ar") {
  return render(
    <LanguageProvider initialLang={lang}>
      <BuybackPage />
    </LanguageProvider>,
  );
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
// Karat codes, plus what the fixtures above supply as data (a coin's code and name, the rate source).
const DATA = /\b(K?\d\dK?|LIRA-8|Ottoman Lira|goldapi)\b/g;

const controlOf = (labelText: string) => (screen.getByText(labelText).closest("label") as HTMLLabelElement).control;

describe("POS buyback — labels and i18n (NEX-64)", () => {
  beforeEach(() => {
    nav.push.mockClear();
    api.post.mockReset();
    swr.byKey = { "/gold-price": RATE, "/coins?is_active=true&page_size=200": COINS, "/ounces?is_active=true&page_size=200": { ...COINS, items: [] } };
  });

  it("pure gold: every field is reachable by its label, and the label's control is the field", () => {
    renderPage("en");
    const b = en.posBuyback;
    for (const text of [b.sellerName, b.phone, en.products.karat, en.products.weightGrams, b.notesOptional]) {
      const field = screen.getByLabelText(text);
      expect(controlOf(text), text).toBe(field);
    }
    expect(screen.getByLabelText(en.products.karat).tagName).toBe("SELECT");

    fireEvent.click(screen.getByRole("button", { name: b.priceModeManual }));
    expect(controlOf(b.manualPriceUsd)).toBe(screen.getByLabelText(b.manualPriceUsd));
  });

  it("coin and used-piece forms: fields by label", () => {
    renderPage("en");
    const b = en.posBuyback;
    fireEvent.click(screen.getByRole("button", { name: b.kinds.COIN }));
    for (const text of [b.sellerName, b.phone, b.coinType, en.common.quantity, b.notesOptional]) {
      expect(controlOf(text), text).toBe(screen.getByLabelText(text));
    }
    fireEvent.click(screen.getByRole("button", { name: b.priceModeManual }));
    expect(screen.getByLabelText(b.manualPriceUsdTotal)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: b.kinds.OUNCE }));
    expect(screen.getByLabelText(b.ounceType)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: b.kinds.USED_PRODUCT }));
    for (const text of [en.products.karat, en.products.weightGrams, b.pricePaidUsd, b.notes]) {
      expect(controlOf(text), text).toBe(screen.getByLabelText(text));
    }
  });

  it("renders every form in Arabic with no English left behind", () => {
    swr.byKey[QUOTE_KEY] = QUOTE;
    const { container } = renderPage("ar");
    const b = ar.posBuyback;
    expect(screen.getByText(ar.appName)).toBeInTheDocument();
    expect(screen.getByText(b.title)).toBeInTheDocument();

    // Pure gold, with a live quote on screen
    fireEvent.change(screen.getByLabelText(ar.products.weightGrams), { target: { value: "5" } });
    for (const text of [b.sellerName, b.phone, ar.products.karat, b.notesOptional]) expect(screen.getByLabelText(text), text).toBeInTheDocument();
    for (const text of [b.spot24k, b.buybackMargin, b.paySeller, b.staleQuote]) expect(screen.getByText(text), text).toBeInTheDocument();
    expect(screen.getByRole("button", { name: b.record })).toBeInTheDocument();
    expect(englishLeft(container, DATA)).toEqual([]);

    // Coin, formula then manual
    fireEvent.click(screen.getByRole("button", { name: b.kinds.COIN }));
    expect(screen.getByLabelText(b.coinType)).toBeInTheDocument();
    expect(screen.getByRole("option", { name: b.selectPlaceholder })).toBeInTheDocument();
    expect(englishLeft(container, DATA)).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: b.priceModeManual }));
    expect(screen.getByLabelText(b.manualPriceUsdTotal)).toBeInTheDocument();
    expect(englishLeft(container, DATA)).toEqual([]);

    // Ounce bar
    fireEvent.click(screen.getByRole("button", { name: b.kinds.OUNCE }));
    expect(screen.getByLabelText(b.ounceType)).toBeInTheDocument();
    expect(englishLeft(container, DATA)).toEqual([]);

    // Used piece, including the hint with its two highlighted verbs
    fireEvent.click(screen.getByRole("button", { name: b.kinds.USED_PRODUCT }));
    expect(screen.getByLabelText(b.pricePaidUsd)).toBeInTheDocument();
    expect(screen.getByText("تلميعها")).toHaveClass("text-gold");
    expect(screen.getByText("صهرها")).toHaveClass("text-gold");
    expect(englishLeft(container, DATA)).toEqual([]);
  });

  it("the same scan does find English on the English page", () => {
    const { container } = renderPage("en");
    expect(englishLeft(container, DATA)).not.toEqual([]);
    expect(screen.getByText("Customer is selling gold")).toBeInTheDocument();
  });

  it("validation speaks the current language", () => {
    renderPage("ar");
    fireEvent.change(screen.getByLabelText(ar.products.weightGrams), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: ar.posBuyback.record }));
    expect(screen.getByText(ar.posBuyback.sellerRequired)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });
});

describe("POS buyback — what is sent is unchanged", () => {
  beforeEach(() => {
    nav.push.mockClear();
    api.post.mockReset();
    api.post.mockResolvedValue({ id: "bb-1" });
    swr.byKey = { "/gold-price": RATE, [QUOTE_KEY]: QUOTE, "/coins?is_active=true&page_size=200": COINS };
  });

  it("pure gold on the formula posts the quoted rate, in either language", async () => {
    renderPage("ar");
    const b = ar.posBuyback;
    fireEvent.change(screen.getByLabelText(b.sellerName), { target: { value: "Rima" } });
    fireEvent.change(screen.getByLabelText(b.phone), { target: { value: "+96170000000" } });
    fireEvent.change(screen.getByLabelText(ar.products.weightGrams), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: b.record }));

    await waitFor(() => expect(nav.push).toHaveBeenCalledWith("/pos/buyback-receipt/bb-1"));
    expect(api.post).toHaveBeenCalledWith("/buybacks", {
      seller_name: "Rima", seller_phone: "+96170000000", kind: "PURE_GOLD", karat: "K21", weight_grams: "5", notes: null, expected_rate: "141.66",
    });
  });

  it("a coin at a manual price posts the type, quantity and price", async () => {
    renderPage("en");
    const b = en.posBuyback;
    fireEvent.click(screen.getByRole("button", { name: b.kinds.COIN }));
    fireEvent.change(screen.getByLabelText(b.sellerName), { target: { value: "Rima" } });
    fireEvent.change(screen.getByLabelText(b.phone), { target: { value: "+96170000000" } });
    fireEvent.change(screen.getByLabelText(b.coinType), { target: { value: "c1" } });
    fireEvent.change(screen.getByLabelText(en.common.quantity), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: b.priceModeManual }));
    fireEvent.change(screen.getByLabelText(b.manualPriceUsdTotal), { target: { value: "1500" } });
    fireEvent.click(screen.getByRole("button", { name: b.record }));

    await waitFor(() => expect(api.post).toHaveBeenCalled());
    expect(api.post).toHaveBeenCalledWith("/buybacks", {
      seller_name: "Rima", seller_phone: "+96170000000", kind: "COIN", quantity: 3, notes: null, coin_type_id: "c1", manual_price: "1500",
    });
  });

  it("a server refusal is shown as the server worded it", async () => {
    // What a rate-drift rejection looks like: a 409 whose `detail` is a plain string.
    const detail = "Gold rate drifted 2.50% since quote (quoted 141.66, current 145.20, max 2.00%). Re-quote and confirm with seller.";
    api.post.mockRejectedValueOnce(new ApiError(409, detail));
    renderPage("ar");
    const b = ar.posBuyback;
    fireEvent.change(screen.getByLabelText(b.sellerName), { target: { value: "Rima" } });
    fireEvent.change(screen.getByLabelText(b.phone), { target: { value: "+96170000000" } });
    fireEvent.change(screen.getByLabelText(ar.products.weightGrams), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: b.record }));
    expect(await screen.findByText(detail)).toBeInTheDocument();
  });
});

// Dictionary-level check for everything this slice added: a key that exists in
// both files but still reads as English in ar.ts would pass tsc and fail here.
describe("slice 5 namespaces are translated, not English placeholders", () => {
  const NAMESPACES = ["pos", "posBuyback", "checkout", "receipt", "goldRate", "goldPrice", "qrLabels", "settings"] as const;
  const ARABIC = /[؀-ۿ]/;

  // One sample argument that suits every function-valued key: it prints as a
  // number where a count or amount is interpolated, and can be called where a
  // key takes a wrapper for its highlighted words (usedPieceHint).
  const sample = Object.assign((word: string) => word, { toString: () => "3" });
  /** Render any leaf to text: strings as they are, function-valued keys with sample arguments. */
  function text(value: unknown): string {
    if (typeof value !== "function") return String(value);
    const out: unknown = value(sample, "x", true);
    return Array.isArray(out) ? out.join("") : String(out);
  }
  function leaves(node: unknown, path: string): [string, unknown][] {
    if (node && typeof node === "object") return Object.entries(node).flatMap(([k, v]) => leaves(v, `${path}.${k}`));
    return [[path, node]];
  }

  it.each(NAMESPACES)("every key under ar.%s is Arabic and differs from English", (ns) => {
    const english = new Map(leaves(en[ns], ns).map(([path, v]) => [path, text(v)]));
    const arabic = leaves(ar[ns], ns);
    expect(arabic.map(([path]) => path).sort()).toEqual(Array.from(english.keys()).sort());
    for (const [path, value] of arabic) {
      expect(text(value), path).toMatch(ARABIC);
      expect(text(value), path).not.toBe(english.get(path));
    }
  });
});

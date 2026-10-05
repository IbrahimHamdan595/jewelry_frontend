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

// Fixtures mirror the backend schemas (app/schemas): GoldRateOut, BuybackQuoteOut,
// UnitTypeListOut. Decimals arrive as strings; `source` is "live" or "override";
// karat is the enum value ("K21"), already prefixed.
const RATE = { rate_24k: 141.66, rate_22k: 129.9, rate_21k: 123.95, rate_18k: 106.25, source: "live", fetched_at: "2026-09-08T10:00:00Z", is_stale: false, market_closed: false };
const QUOTE_KEY = "/buybacks/quote?karat=K21&weight_grams=5";
// 141.66 × 0.875 = 123.95; − 2.0000/g = 121.95; × 5 g = 609.76
const QUOTE = { rate_24k: "141.66", rate_source: "live", rate_is_stale: true, karat: "K21", purity_rate: "123.95", weight_grams: "5", margin_mode: "USD_PER_GRAM", margin_value: "2.0000", effective_rate_per_gram: "121.95", buy_price: "609.76" };
const LIRA = {
  id: "c1", code: "FN-COIN-22K-0001", name_en: "Ottoman Lira", name_ar: "ليرة عثمانية", karat: "K22", weight_grams: "7.200",
  markup_per_gram: "0.0000", margin_mode: "USD", margin_value: "0.00", on_hand_qty: 4, min_stock_qty: null, photo_url: null,
  is_active: true, created_at: "2026-08-01T09:00:00Z", updated_at: "2026-08-01T09:00:00Z",
};
const COINS = { items: [LIRA], total: 1, page: 1, page_size: 200 };
const COIN_QUOTE_KEY = "/buybacks/quote?karat=K22&weight_grams=7.200";
// 141.66 × 0.917 = 129.90; − 2 = 127.90; × 7.2 g = 920.90
const COIN_QUOTE = { ...QUOTE, rate_is_stale: false, karat: "K22", purity_rate: "129.90", weight_grams: "7.200", effective_rate_per_gram: "127.90", buy_price: "920.90" };

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
// Karat codes, plus what the fixtures above supply as data: the coin's code and its English name.
const DATA = /\b(K?\d\dK?|FN-COIN-22K-0001|Ottoman Lira)\b/g;
/** Physical-direction utilities that would not flip in RTL. */
const physicalClasses = (root: HTMLElement) =>
  Array.from(root.querySelectorAll("[class]")).flatMap((el) => Array.from(el.classList)).filter((c) => /^(text-(left|right)|-?m[lr]-|p[lr]-|(left|right)-)/.test(c));

const controlOf = (labelText: string) => (screen.getByText(labelText).closest("label") as HTMLLabelElement).control;

describe("POS buyback — labels and i18n (NEX-64)", () => {
  beforeEach(() => {
    nav.push.mockClear();
    api.post.mockReset();
    swr.byKey = { "/gold-price": RATE, "/coins?is_active=true&page_size=200": COINS, [COIN_QUOTE_KEY]: COIN_QUOTE, "/ounces?is_active=true&page_size=200": { items: [], total: 0, page: 1, page_size: 200 } };
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

    // Coin, formula then manual. The option line is data: code · karat · weight · English name.
    fireEvent.click(screen.getByRole("button", { name: b.kinds.COIN }));
    expect(screen.getByRole("option", { name: b.selectPlaceholder })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "FN-COIN-22K-0001 · K22 · 7.200g · Ottoman Lira" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(b.coinType), { target: { value: "c1" } });
    fireEvent.change(screen.getByLabelText(ar.common.quantity), { target: { value: "2" } });
    expect(screen.getByText(b.totalBuyPrice).nextElementSibling).toHaveTextContent("$1,841.80");
    // The rate source ("live") is an API enum, translated; the amount keeps its order.
    expect(screen.getByText(b.rate).nextElementSibling).toHaveTextContent(b.rateLine("141.66", ar.goldRate.sources.live, false));
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
    expect(physicalClasses(container)).toEqual([]);
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

  it("the quote card shows the server's figures untouched", () => {
    renderPage("en");
    fireEvent.change(screen.getByLabelText(en.products.weightGrams), { target: { value: "5" } });
    const row = (label: string) => screen.getByText(label).nextElementSibling?.textContent;
    expect(row("Spot 24K")).toBe("$141.66/g");
    expect(row("Purity rate")).toBe("$123.95/g (K21)");
    expect(row("Buyback margin")).toBe("−$2.00/g");
    expect(row("Effective")).toBe("$121.95/g");
    expect(row("Pay seller")).toBe("$609.76");
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

// NEX-54. The backend is moving the rates on GET /gold-price, and rate_24k in a
// stale-rate 409, from JSON numbers to exact decimal strings. A buyback is money
// leaving the till on that rate, so the acknowledgement must go through with
// either backend.
describe("POS buyback — the stale-rate acknowledgement with rates as strings or numbers (NEX-54)", () => {
  const FETCHED_AT = "2026-09-08T10:00:00.123456Z";
  const CLOSED = {
    numbers: { ...RATE, fetched_at: FETCHED_AT, is_stale: true, market_closed: true },
    strings: { ...RATE, rate_24k: "141.66", rate_22k: "129.90", rate_21k: "123.95", rate_18k: "106.25", fetched_at: FETCHED_AT, is_stale: true, market_closed: true },
  };
  const SHAPES = [["numbers", 141.66], ["strings", "141.66"]] as const;

  beforeEach(() => {
    nav.push.mockClear();
    api.post.mockReset();
    swr.byKey = { [QUOTE_KEY]: QUOTE, "/coins?is_active=true&page_size=200": COINS };
  });

  function fillPureGold() {
    const b = en.posBuyback;
    fireEvent.change(screen.getByLabelText(b.sellerName), { target: { value: "Rima" } });
    fireEvent.change(screen.getByLabelText(b.phone), { target: { value: "+96170000000" } });
    fireEvent.change(screen.getByLabelText(en.products.weightGrams), { target: { value: "5" } });
  }

  it.each(SHAPES)("market closed, rates as %s: blocked until ticked, then posts the rate's own timestamp", async (shape) => {
    swr.byKey["/gold-price"] = CLOSED[shape];
    api.post.mockResolvedValue({ id: "bb-1" });
    renderPage("en");
    fillPureGold();
    const record = screen.getByRole("button", { name: en.posBuyback.record });
    expect(record).toBeDisabled();

    fireEvent.click(screen.getByRole("checkbox"));
    expect(record).toBeEnabled();
    fireEvent.click(record);
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith("/pos/buyback-receipt/bb-1"));
    expect(api.post).toHaveBeenCalledWith("/buybacks", {
      seller_name: "Rima", seller_phone: "+96170000000", kind: "PURE_GOLD", karat: "K21", weight_grams: "5", notes: null,
      // The quote's rate goes back exactly as quoted, and the acknowledgement
      // names GET /gold-price's fetched_at exactly as received.
      expected_rate: "141.66",
      stale_rate_ack: { rate_fetched_at: FETCHED_AT },
    });
  });

  it.each(SHAPES)("a 409 whose rate_24k is one of the %s: the server's message is shown and nothing is recorded", async (shape, rate) => {
    swr.byKey["/gold-price"] = { ...CLOSED[shape], is_stale: false, market_closed: false }; // a tab that has not caught up
    const message = "Gold rate has not refreshed since 2026-09-08T10:00:00.123456+00:00 (95 minutes ago).";
    api.post.mockRejectedValueOnce(new ApiError(409, { code: "STALE_RATE_ACK_REQUIRED", message, rate_24k: rate, rate_fetched_at: "2026-09-08T10:00:00.123456+00:00", age_minutes: 95 }));
    renderPage("en");
    fillPureGold();
    fireEvent.click(screen.getByRole("button", { name: en.posBuyback.record }));
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(api.post.mock.calls[0][1]).not.toHaveProperty("stale_rate_ack");
    expect(nav.push).not.toHaveBeenCalled();
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

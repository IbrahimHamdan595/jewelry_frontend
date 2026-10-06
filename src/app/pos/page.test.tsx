import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import POSPage from "@/app/pos/page";
import { ApiError } from "@/lib/api-client";
import { CartProvider } from "@/hooks/useCart";
import { CART_STORAGE_KEY } from "@/lib/cart-storage";
import { LanguageProvider } from "@/context/LanguageContext";
import { formatDateTime } from "@/lib/utils";
import en from "@/i18n/en";
import ar from "@/i18n/ar";

const nav = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: nav.push }), usePathname: () => "/pos" }));
vi.mock("@/lib/auth", () => ({ logout: vi.fn(), getStoredUser: () => null }));
const gold = vi.hoisted(() => ({ rate: undefined as unknown, refresh: vi.fn() }));
vi.mock("@/hooks/useGoldRate", () => ({
  useGoldRate: () => ({ rate: gold.rate, refresh: gold.refresh, error: undefined, isLoading: false, isValidating: false }),
}));
const api = vi.hoisted(() => ({
  get: vi.fn<(path: string) => Promise<unknown>>(),
  post: vi.fn<(path: string, body?: unknown) => Promise<unknown>>(),
}));
vi.mock("@/lib/api-client", async (orig) => ({ ...(await orig<typeof import("@/lib/api-client")>()), api, apiFetcher: vi.fn() }));

// NEX-54. The backend is moving money from JSON numbers to exact decimal
// strings and the frontend ships first, so every payload here comes in both
// shapes: `asNumber` is what the API sends today, `asString` what it will send.
//
// GoldRateOut (GET /gold-price). `fetched_at` is a timestamptz with Postgres'
// microseconds, which is exactly what the acknowledgement has to send back.
const FETCHED_AT = "2026-09-08T10:00:00.123456Z";
const RATE = {
  asNumber: { rate_24k: 141.66, rate_22k: 129.9, rate_21k: 123.95, rate_18k: 106.25, source: "live", fetched_at: FETCHED_AT, is_stale: false, market_closed: false },
  asString: { rate_24k: "141.66", rate_22k: "129.90", rate_21k: "123.95", rate_18k: "106.25", source: "live", fetched_at: FETCHED_AT, is_stale: false, market_closed: false },
};
// ProductLookupOut (GET /products/lookup/{code}): Decimal columns are strings
// already; only gold_rate_24k changes. 141.66 × 0.875 × 5 g = 619.7625, +10%
// = 681.73875, + $15 making = 696.74 (app/core/pricing.py, half-up).
const LOOKUP = {
  id: "p1", code: "FN-21K-0001", name_en: "Twisted Ring", name_ar: "خاتم مجدول", karat: "K21", weight_grams: "5.000",
  margin_percent: "10.00", making_charge: "15.00", purity_rate: "123.95", final_price: "696.74", on_hand_qty: 3, photo_url: null,
};
const SHAPES = [
  ["a number", "asNumber", 141.66],
  ["a decimal string", "asString", "141.66"],
] as const;

function renderPage() {
  return render(
    <LanguageProvider initialLang="en">
      <CartProvider vatPercent={11}>
        <POSPage />
      </CartProvider>
    </LanguageProvider>,
  );
}
async function scan(code: string) {
  fireEvent.change(screen.getByLabelText(en.pos.manualEntry), { target: { value: code } });
  fireEvent.click(screen.getByRole("button", { name: en.pos.find }));
  await waitFor(() => expect(api.get).toHaveBeenCalledWith(`/products/lookup/${code}`));
}
const storedLines = () => JSON.parse(sessionStorage.getItem(CART_STORAGE_KEY) ?? '{"items":[]}').items as Record<string, unknown>[];
/** The amount printed next to a label in the totals block. */
const amount = (label: string) => screen.getByText(label).nextElementSibling?.textContent;
const sale = () => screen.getByRole("main");

beforeEach(() => {
  sessionStorage.clear();
  nav.push.mockClear();
  api.get.mockReset();
  api.post.mockReset();
  gold.refresh.mockReset();
  gold.rate = RATE.asNumber;
});

describe("POS sell — a lookup's rate as a decimal string or a number (NEX-54)", () => {
  it.each(SHAPES)("gold_rate_24k as %s: the same line, the same price, the same totals", async (_name, shape, rate) => {
    gold.rate = RATE[shape];
    api.get.mockResolvedValue({ ...LOOKUP, gold_rate_24k: rate });
    renderPage();
    await scan("FN-21K-0001");
    expect(await screen.findByText("Twisted Ring")).toBeInTheDocument();

    // The line as the cashier reads it…
    expect(within(sale()).getByText("FN-21K-0001 · 5g @ $141.66/g")).toBeInTheDocument();
    expect(amount(en.common.subtotal)).toBe("$696.74");
    expect(amount(en.checkout.vatLine(11))).toBe("$76.64");
    expect(amount(en.common.total)).toBe("$773.38");
    // …and as the cart holds it: numbers, whatever the API sent.
    expect(storedLines()).toHaveLength(1);
    expect(storedLines()[0]).toMatchObject({
      kind: "PRODUCT", productId: "p1", code: "FN-21K-0001", karat: "K21", weightGrams: 5, quantity: 1,
      goldRate24k: 141.66, unitPrice: 696.74, finalPrice: 696.74, available: 3,
    });
  });

  it("two scans and a quantity change price identically for both shapes", async () => {
    const run = async (shape: "asNumber" | "asString", rate: number | string) => {
      sessionStorage.clear();
      api.get.mockReset();
      gold.rate = RATE[shape];
      api.get.mockResolvedValue({ ...LOOKUP, gold_rate_24k: rate });
      const view = renderPage();
      await scan("FN-21K-0001");
      await screen.findByText("Twisted Ring");
      await scan("FN-21K-0001"); // a second scan of the same piece bumps the quantity
      await waitFor(() => expect(storedLines()[0]).toMatchObject({ quantity: 2 }));
      fireEvent.click(screen.getByRole("button", { name: en.checkout.increaseQty("Twisted Ring") }));
      await waitFor(() => expect(storedLines()[0]).toMatchObject({ quantity: 3 }));
      const result = { html: sale().innerHTML, line: { ...storedLines()[0], cartId: "" }, total: amount(en.common.total) };
      view.unmount();
      return result;
    };
    const numeric = await run("asNumber", 141.66);
    const exact = await run("asString", "141.66");
    expect(exact.line).toEqual(numeric.line);
    expect(exact.html).toBe(numeric.html);
    // 3 × 696.74 = 2090.22; + 11% VAT (229.92) = 2320.14
    expect(numeric.line).toMatchObject({ quantity: 3, unitPrice: 696.74, finalPrice: 2090.22, goldRate24k: 141.66 });
    expect(numeric.total).toBe("$2,320.14");
  });

  // The item exists; what came back for it cannot be priced. That is a data
  // fault for an admin, not a mistyped barcode, and it must not read as one.
  it.each([
    ["no price", { ...LOOKUP, gold_rate_24k: "141.66", final_price: null }],
    ["an unreadable price", { ...LOOKUP, gold_rate_24k: "141.66", final_price: "n/a" }],
    ["no rate", { ...LOOKUP, gold_rate_24k: null }],
    ["an unreadable rate", { ...LOOKUP, gold_rate_24k: "" }],
  ])("a lookup with %s is refused as unpriceable: nothing is added, nothing is priced at zero", async (_name, payload) => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    api.get.mockResolvedValue(payload);
    renderPage();
    await scan("FN-21K-0001");

    expect(await screen.findByText(en.pos.cannotPrice)).toBeInTheDocument();
    expect(screen.getByText(en.pos.cannotPriceHint)).toBeInTheDocument();
    expect(screen.getByText("FN-21K-0001")).toHaveClass("font-mono"); // which item, so the admin can find it
    expect(screen.queryByText(en.pos.itemNotFound)).toBeNull();
    // …and a line in the console that names the code, for whoever is asked to look.
    expect(logged).toHaveBeenCalledTimes(1);
    expect(String(logged.mock.calls[0][0])).toContain("FN-21K-0001");

    expect(screen.queryByText("Twisted Ring")).toBeNull();
    expect(within(sale()).getByText(en.checkout.noItems)).toBeInTheDocument();
    expect(amount(en.common.total)).toBe("$0.00");
    expect(storedLines()).toEqual([]);
    expect(sale()).not.toHaveTextContent("NaN");
    logged.mockRestore();
  });

  it("a code the server does not know is still 'item not found', and is not logged as a fault", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    api.get.mockRejectedValue(new ApiError(404, "Product not found"));
    renderPage();
    await scan("FN-21K-9999");
    expect(await screen.findByText(en.pos.itemNotFound)).toBeInTheDocument();
    expect(screen.getByText("FN-21K-9999")).toBeInTheDocument();
    expect(screen.queryByText(en.pos.cannotPrice)).toBeNull();
    expect(screen.queryByText(en.pos.cannotPriceHint)).toBeNull();
    expect(logged).not.toHaveBeenCalled();
    logged.mockRestore();
  });

  it("Arabic: the unpriceable message is translated, and the next good scan clears it", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    api.get.mockResolvedValueOnce({ ...LOOKUP, final_price: "n/a", gold_rate_24k: "141.66" });
    render(
      <LanguageProvider initialLang="ar">
        <CartProvider vatPercent={11}><POSPage /></CartProvider>
      </LanguageProvider>,
    );
    const scanIn = async (code: string) => {
      fireEvent.change(screen.getByLabelText(ar.pos.manualEntry), { target: { value: code } });
      fireEvent.click(screen.getByRole("button", { name: ar.pos.find }));
    };
    await scanIn("FN-21K-0001");
    expect(await screen.findByText(ar.pos.cannotPrice)).toBeInTheDocument();
    expect(screen.getByText(ar.pos.cannotPriceHint)).toBeInTheDocument();
    expect(ar.pos.cannotPrice).not.toBe(ar.pos.itemNotFound);

    api.get.mockResolvedValueOnce({ ...LOOKUP, gold_rate_24k: "141.66" });
    await scanIn("FN-21K-0001");
    expect(await screen.findByText("Twisted Ring")).toBeInTheDocument();
    expect(screen.queryByText(ar.pos.cannotPrice)).toBeNull();
    logged.mockRestore();
  });
});

describe("POS sell — the stale-rate acknowledgement with rate_24k as a string or a number (NEX-54)", () => {
  // What app/core/gold_guard.py answers (409) when the rate is market_closed and
  // the sale carries no acknowledgement. rate_24k is the field that changes shape.
  const refusal = (rate_24k: number | string) =>
    new ApiError(409, {
      code: "STALE_RATE_ACK_REQUIRED",
      message: "Gold rate has not refreshed since 2026-09-08T10:00:00.123456+00:00 (95 minutes ago).",
      rate_24k,
      rate_fetched_at: "2026-09-08T10:00:00.123456+00:00",
      age_minutes: 95,
    });

  it.each(SHAPES)("rate_24k as %s: the sale is held, then goes through naming the rate's own timestamp", async (_name, shape, rate) => {
    // The tab still believes the rate is fresh; the server knows better.
    gold.rate = RATE[shape];
    gold.refresh.mockImplementation(() => { gold.rate = { ...RATE[shape], is_stale: true, market_closed: true }; });
    api.get.mockResolvedValue({ ...LOOKUP, gold_rate_24k: rate });
    api.post.mockRejectedValueOnce(refusal(rate)).mockResolvedValueOnce({ id: "o-1" });

    renderPage();
    await scan("FN-21K-0001");
    await screen.findByText("Twisted Ring");
    fireEvent.click(screen.getByRole("button", { name: en.checkout.checkoutTotal("$773.38") }));
    fireEvent.click(screen.getByRole("button", { name: en.checkout.confirmComplete }));

    // First attempt: no acknowledgement was owed as far as the client knew.
    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    expect(api.post.mock.calls[0][1]).toMatchObject({ stale_rate_ack: null });
    // The server's message is shown, the rate is re-fetched at once, and the sale is now blocked.
    expect(await screen.findByText(/Gold rate has not refreshed since/)).toBeInTheDocument();
    expect(gold.refresh).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: en.checkout.confirmRateAbove })).toBeDisabled();
    expect(nav.push).not.toHaveBeenCalled();

    // The cashier accepts that one rate; the retry names exactly the timestamp
    // GET /gold-price gave — microseconds and all, never re-serialised.
    fireEvent.click(screen.getByLabelText(en.goldRate.confirmSelling(formatDateTime(FETCHED_AT))));
    fireEvent.click(screen.getByRole("button", { name: en.checkout.confirmComplete }));
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith("/pos/confirmation/o-1"));
    expect(api.post).toHaveBeenCalledTimes(2);
    expect(api.post.mock.calls[1]).toEqual(["/orders", {
      items: [{ item_kind: "PRODUCT", product_id: "p1", quantity: 1 }],
      payment_method: "CASH",
      customer_name: null,
      discount_percent: 0,
      stale_rate_ack: { rate_fetched_at: FETCHED_AT },
    }]);
  });
});

// NEX-64: a checkout that fails with no reason from the server used to print the
// client's English ("Failed to fetch", "API error 500") in the confirm dialog.
describe("POS sell — a failed checkout speaks the UI language", () => {
  async function checkoutIn(lang: "en" | "ar", dict: typeof en) {
    api.get.mockResolvedValue({ ...LOOKUP, gold_rate_24k: "141.66" });
    render(
      <LanguageProvider initialLang={lang}>
        <CartProvider vatPercent={11}><POSPage /></CartProvider>
      </LanguageProvider>,
    );
    fireEvent.change(screen.getByLabelText(dict.pos.manualEntry), { target: { value: "FN-21K-0001" } });
    fireEvent.click(screen.getByRole("button", { name: dict.pos.find }));
    await screen.findByText("Twisted Ring");
    fireEvent.click(screen.getByRole("button", { name: dict.checkout.checkoutTotal("$773.38") }));
    fireEvent.click(screen.getByRole("button", { name: dict.checkout.confirmComplete }));
  }

  it.each([
    ["the connection drops", new TypeError("Failed to fetch")],
    ["the server answers 500 with no detail", new ApiError(500, undefined)],
  ])("Arabic, when %s: the translated fallback, the cart intact", async (_name, failure) => {
    api.post.mockRejectedValue(failure);
    await checkoutIn("ar", ar);
    expect(await screen.findByText(ar.checkout.failed)).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/Failed to fetch|API error/);
    expect(storedLines()).toHaveLength(1);
    expect(nav.push).not.toHaveBeenCalled();
  });

  it("English keeps its wording", async () => {
    api.post.mockRejectedValue(new TypeError("Failed to fetch"));
    await checkoutIn("en", en);
    expect(await screen.findByText("Checkout failed")).toBeInTheDocument();
  });

  it("a reason from the server is shown as it was sent", async () => {
    const detail = "Insufficient stock for FN-21K-0001: requested 1, on hand 0";
    api.post.mockRejectedValue(new ApiError(409, detail));
    await checkoutIn("ar", ar);
    expect(await screen.findByText(detail)).toBeInTheDocument();
  });
});

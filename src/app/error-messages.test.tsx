import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoginPage from "@/app/(auth)/login/page";
import SuppliersPage from "@/app/admin/suppliers/page";
import GoldPricePage from "@/app/admin/gold-price/page";
import BuybackPage from "@/app/pos/buyback/page";
import { LanguageProvider } from "@/context/LanguageContext";
import en from "@/i18n/en";
import ar from "@/i18n/ar";

// What an Arabic user reads when a request fails, on four representative
// screens (NEX-64). Nothing here mocks the API client: `fetch` is the only
// stand-in, so each failure travels the real path — request() → ApiError or a
// transport TypeError → errorMessage(err, translated fallback) → the screen.
const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>();
vi.stubGlobal("fetch", fetchMock);

const nav = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: nav.push }), usePathname: () => "/" }));
vi.mock("@/components/admin/TradingViewChart", () => ({ TradingViewChart: () => null }));
// Reads are not what is under test; SWR answers them from this table.
const RATE = { rate_24k: "141.66", rate_22k: "129.90", rate_21k: "123.95", rate_18k: "106.25", source: "live", fetched_at: "2026-09-08T10:00:00Z", is_stale: false, market_closed: false };
const QUOTE = { rate_24k: "141.66", rate_source: "live", rate_is_stale: false, karat: "K21", purity_rate: "123.95", weight_grams: "5", margin_mode: "USD_PER_GRAM", margin_value: "2.0000", effective_rate_per_gram: "121.95", buy_price: "609.76" };
const reads = (key: string): unknown =>
  key === "/gold-price" ? RATE
    : key.startsWith("/gold-price/history") ? []
      : key.startsWith("/buybacks/quote") ? QUOTE
        : key.startsWith("/suppliers") ? { items: [], total: 0, page: 1, page_size: 50 }
          : undefined;
vi.mock("swr", () => ({
  default: (key: string | null) => ({ data: key ? reads(key) : undefined, error: undefined, isLoading: false, isValidating: false, mutate: vi.fn() }),
}));

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
/** The ways a request can fail without the server saying why. */
const SILENT: [string, () => Promise<Response>][] = [
  ["the connection drops", () => Promise.reject(new TypeError("Failed to fetch"))],
  ["a bare 500", () => Promise.resolve(json({}, 500))],
  ["a gateway's HTML 502", () => Promise.resolve(new Response("<html>Bad Gateway</html>", { status: 502, headers: { "content-type": "text/html" } }))],
];
const inArabic = (ui: React.ReactNode) => render(<LanguageProvider initialLang="ar">{ui}</LanguageProvider>);
/** Nothing technical or English from the client reached the screen. */
function expectNoClientEnglish() {
  for (const leak of [/API error/i, /Failed to fetch/i, /Unauthorized/i, /\[object Object\]/, /Bad Gateway/i]) {
    expect(document.body.textContent ?? "").not.toMatch(leak);
  }
}

beforeEach(() => {
  fetchMock.mockReset();
  nav.push.mockClear();
  sessionStorage.clear();
  window.history.replaceState({}, "", "/login");
});

describe("sign-in errors in Arabic", () => {
  async function submit() {
    inArabic(<LoginPage />);
    fireEvent.change(screen.getByLabelText(ar.login.email), { target: { value: "owner@fawazelnamel.com" } });
    fireEvent.change(screen.getByLabelText(ar.login.password), { target: { value: "wrong-password" } });
    fireEvent.click(screen.getByRole("button", { name: ar.login.signIn }));
    return screen.findByRole("alert");
  }

  it.each([
    // Today's backend: slowapi's limiter answers before the route runs, with no `detail`.
    ["the rate limiter (5/minute per IP)", { error: "Rate limit exceeded: 5 per 1 minute" }],
    // The next backend also locks the account, with a `detail` in English.
    ["a locked account", { detail: "Too many failed login attempts. Try again later." }],
  ])("429 from %s shows the translated too-many-attempts message", async (_name, body) => {
    fetchMock.mockResolvedValue(json(body, 429));
    expect(await submit()).toHaveTextContent(ar.login.tooManyAttempts);
    expect(screen.getByRole("alert").textContent).not.toMatch(/[A-Za-z]{3,}/);
    expect(nav.push).not.toHaveBeenCalled();
    expectNoClientEnglish();
  });

  it("the same two 429s read in English on the English page", async () => {
    fetchMock.mockResolvedValue(json({ error: "Rate limit exceeded: 5 per 1 minute" }, 429));
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText(en.login.email), { target: { value: "owner@fawazelnamel.com" } });
    fireEvent.change(screen.getByLabelText(en.login.password), { target: { value: "wrong-password" } });
    fireEvent.click(screen.getByRole("button", { name: en.login.signIn }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Too many attempts. Try again later.");
  });

  it.each(SILENT)("when %s, the translated sign-in failure is shown", async (_name, respond) => {
    fetchMock.mockImplementation(respond);
    expect(await submit()).toHaveTextContent(ar.login.failed);
    expectNoClientEnglish();
  });

  // The two fixed answers POST /auth/login gives on purpose (app/api/auth.py).
  // They are the same sentence every time, so they are translated by status
  // instead of shown in the server's English.
  it("a wrong email or password (401) is said in Arabic, and the form stays on screen", async () => {
    fetchMock.mockResolvedValue(json({ detail: "Invalid credentials" }, 401));
    const alert = await submit();
    expect(alert).toHaveTextContent(ar.login.invalidCredentials);
    expect(alert.textContent).not.toMatch(/[A-Za-z]{3,}/);
    expect(screen.getByLabelText(ar.login.email)).toHaveValue("owner@fawazelnamel.com");
    expectNoClientEnglish();
  });

  it("a disabled account (403) is said in Arabic", async () => {
    fetchMock.mockResolvedValue(json({ detail: "Account disabled" }, 403));
    const alert = await submit();
    expect(alert).toHaveTextContent(ar.login.accountDisabled);
    expect(alert.textContent).not.toMatch(/[A-Za-z]{3,}/);
  });

  it("the three sign-in refusals are three different sentences", () => {
    for (const dict of [en, ar]) {
      expect(new Set([dict.login.invalidCredentials, dict.login.accountDisabled, dict.login.tooManyAttempts, dict.login.failed]).size).toBe(4);
    }
    // English keeps the server's own wording.
    expect(en.login.invalidCredentials).toBe("Invalid credentials");
    expect(en.login.accountDisabled).toBe("Account disabled");
  });

  it("a malformed email the server rejects (422) says which field, after the translated failure", async () => {
    fetchMock.mockResolvedValue(json({ detail: [{ type: "value_error", loc: ["body", "email"], msg: "value is not a valid email address: The part after the @-sign is not valid. It should have a period.", input: "owner@fawaz" }] }, 422));
    const alert = await submit();
    expect(alert.textContent).toBe(`${ar.login.failed} — \u2066email: value is not a valid email address: The part after the @-sign is not valid. It should have a period.\u2069`);
  });
});

describe("a failed save in Arabic — new supplier", () => {
  async function save() {
    inArabic(<SuppliersPage />);
    fireEvent.click(screen.getByRole("button", { name: ar.suppliers.newSupplier }));
    fireEvent.change(screen.getByLabelText(ar.common.name), { target: { value: "Beirut Bullion" } });
    fireEvent.click(screen.getByRole("button", { name: ar.suppliers.createSupplier }));
    return screen.findByRole("alert");
  }

  it.each(SILENT)("when %s, the translated fallback is shown", async (_name, respond) => {
    fetchMock.mockImplementation(respond);
    expect(await save()).toHaveTextContent(ar.suppliers.saveFailed);
    expectNoClientEnglish();
  });

  it("the server's own reason is shown as it was sent", async () => {
    fetchMock.mockResolvedValue(json({ detail: "Supplier name already exists" }, 409));
    expect(await save()).toHaveTextContent("Supplier name already exists");
  });
});

describe("a failed action in Arabic — gold-rate override", () => {
  it.each(SILENT)("when %s, the translated fallback is shown", async (_name, respond) => {
    fetchMock.mockImplementation(respond);
    inArabic(<GoldPricePage />);
    const g = ar.goldPrice;
    fireEvent.change(screen.getByLabelText(g.rateInputLabel), { target: { value: "150.5" } });
    fireEvent.change(screen.getByLabelText(g.reasonInputLabel), { target: { value: "feed is down" } });
    fireEvent.click(screen.getByRole("button", { name: g.setOverride }));
    expect(await screen.findByText(g.setOverrideFailed)).toBeInTheDocument();
    expectNoClientEnglish();
  });
});

describe("a failed buyback in Arabic", () => {
  async function record() {
    inArabic(<BuybackPage />);
    const b = ar.posBuyback;
    fireEvent.change(screen.getByLabelText(b.sellerName), { target: { value: "Rima" } });
    fireEvent.change(screen.getByLabelText(b.phone), { target: { value: "+96170000000" } });
    fireEvent.change(screen.getByLabelText(ar.products.weightGrams), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: b.record }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  }

  it.each(SILENT)("when %s, the translated fallback is shown and nothing is recorded", async (_name, respond) => {
    fetchMock.mockImplementation(respond);
    await record();
    expect(await screen.findByText(ar.posBuyback.failed)).toBeInTheDocument();
    expect(nav.push).not.toHaveBeenCalled();
    expectNoClientEnglish();
  });

  it("a stale-rate refusal is shown in the server's words, whichever shape its rate has", async () => {
    for (const rate_24k of [141.66, "141.66"]) {
      const message = "Gold rate has not refreshed since 2026-09-08T10:00:00+00:00 (95 minutes ago).";
      fetchMock.mockResolvedValue(json({ detail: { code: "STALE_RATE_ACK_REQUIRED", message, rate_24k, rate_fetched_at: "2026-09-08T10:00:00+00:00", age_minutes: 95 } }, 409));
      const view = inArabic(<BuybackPage />);
      const b = ar.posBuyback;
      fireEvent.change(screen.getByLabelText(b.sellerName), { target: { value: "Rima" } });
      fireEvent.change(screen.getByLabelText(b.phone), { target: { value: "+96170000000" } });
      fireEvent.change(screen.getByLabelText(ar.products.weightGrams), { target: { value: "5" } });
      fireEvent.click(screen.getByRole("button", { name: b.record }));
      expect(await screen.findByText(message)).toBeInTheDocument();
      view.unmount();
    }
  });
});

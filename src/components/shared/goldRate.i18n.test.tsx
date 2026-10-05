import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GoldRateCard } from "@/components/shared/GoldRateCard";
import { StaleRateAckNotice } from "@/components/shared/StaleRateAckNotice";
import { MarketClosedBanner } from "@/components/shared/MarketClosedBanner";
import { LanguageProvider } from "@/context/LanguageContext";
import { formatDateTime } from "@/lib/utils";
import { localeFor } from "@/lib/lang-cookie";
import en from "@/i18n/en";
import ar from "@/i18n/ar";
import type { GoldRate } from "@/types/api";

type HookValue = { rate?: GoldRate; error?: Error; isLoading: boolean; isValidating: boolean; refresh: () => Promise<unknown> };
const hook = vi.hoisted(() => ({ value: {} as HookValue }));
vi.mock("@/hooks/useGoldRate", () => ({ useGoldRate: () => hook.value }));
vi.mock("@/lib/api-client", async (orig) => ({ ...(await orig<typeof import("@/lib/api-client")>()), api: { post: vi.fn(() => Promise.resolve()) } }));

// GoldRateOut as GET /gold-price sends it; `source` is "live" or "override".
const rate: GoldRate = {
  rate_24k: 141.66, rate_22k: 129.9, rate_21k: 123.95, rate_18k: 106.25,
  source: "live", fetched_at: "2026-09-08T10:00:00Z", is_stale: false, market_closed: false,
};
const setRate = (partial: Partial<GoldRate>, error?: Error) => {
  hook.value = { rate: { ...rate, ...partial }, error, isLoading: false, isValidating: false, refresh: vi.fn(() => Promise.resolve()) };
};
const inArabic = (ui: React.ReactNode) => render(<LanguageProvider initialLang="ar">{ui}</LanguageProvider>);
const arTime = formatDateTime(rate.fetched_at, localeFor("ar"));

// Everything a user can read or hear: text nodes plus placeholder / title / aria-label / alt.
function uiStrings(root: HTMLElement): string[] {
  const out: string[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) if (walker.currentNode.parentElement?.tagName !== "STYLE") out.push(walker.currentNode.textContent ?? "");
  root.querySelectorAll("*").forEach((el) => ["placeholder", "title", "aria-label", "alt"].forEach((a) => out.push(el.getAttribute(a) ?? "")));
  return out;
}
/** Latin words still on screen once the codes that stay Latin by design are set aside. */
const englishLeft = (root: HTMLElement, keep: RegExp) =>
  uiStrings(root).map((s) => s.replace(keep, "")).filter((s) => /[A-Za-z]{2,}/.test(s));
const KARAT_CODES = /\b(K?\d\dK?)\b/g;

describe("GoldRateCard in Arabic (NEX-64)", () => {
  it("full card: status, unit captions and the stale strip are translated", () => {
    setRate({ is_stale: true });
    const { container } = inArabic(<GoldRateCard />);
    expect(screen.getByText(ar.goldRate.stale)).toBeInTheDocument();
    expect(screen.getByText(ar.goldRate.olderThan15)).toBeInTheDocument();
    expect(screen.getByText(ar.goldRate.karatUsdPerGram("24K"))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: ar.goldRate.refresh })).toBeInTheDocument();
    expect(englishLeft(container, KARAT_CODES)).toEqual([]);
  });

  it("compact card: live marker is translated, karat codes stay as codes", () => {
    setRate({});
    const { container } = inArabic(<GoldRateCard compact />);
    expect(screen.getByText(ar.goldRate.live)).toBeInTheDocument();
    expect(screen.getByText("24K")).toBeInTheDocument();
    expect(englishLeft(container, KARAT_CODES)).toEqual([]);
  });

  it("feed-down state has no English either", () => {
    setRate({}, new Error("ECONNREFUSED"));
    const { container } = inArabic(<GoldRateCard />);
    expect(screen.getByText(ar.errors.rateFeedDown)).toBeInTheDocument();
    expect(englishLeft(container, KARAT_CODES)).toEqual([]);
  });

  it("keeps the English wording it had", () => {
    setRate({ is_stale: true });
    const { container } = render(<GoldRateCard />);
    expect(screen.getByText("STALE")).toBeInTheDocument();
    expect(screen.getByText("Gold rate is older than 15 minutes")).toBeInTheDocument();
    expect(screen.getByText("24K · USD/g")).toBeInTheDocument();
    // …and the Arabic assertions above are not vacuous: the same scan sees English here.
    expect(englishLeft(container, KARAT_CODES)).not.toEqual([]);
  });
});

describe("StaleRateAckNotice (NEX-64)", () => {
  const props = { required: true, accepted: false, fetchedAt: rate.fetched_at };

  it("renders nothing unless an acknowledgement is required", () => {
    const { container } = inArabic(<StaleRateAckNotice {...props} required={false} onChange={vi.fn()} action="selling" />);
    expect(container).toBeEmptyDOMElement();
  });

  it.each([
    ["selling", ar.goldRate.charging, ar.goldRate.confirmSelling(arTime)],
    ["buying", ar.goldRate.payingOut, ar.goldRate.confirmBuying(arTime)],
  ] as const)("%s: warning and checkbox label are Arabic, and the label drives the checkbox", (action, risk, confirm) => {
    const onChange = vi.fn();
    const { container } = inArabic(<StaleRateAckNotice {...props} onChange={onChange} action={action} />);
    expect(screen.getByText(ar.goldRate.outOfDate)).toBeInTheDocument();
    expect(container).toHaveTextContent(risk);

    const box = screen.getByLabelText(confirm);
    expect(box).toHaveAttribute("type", "checkbox");
    expect((screen.getByText(confirm).closest("label") as HTMLLabelElement).control).toBe(box);
    fireEvent.click(screen.getByText(confirm));
    expect(onChange).toHaveBeenCalledWith(true);
    expect(englishLeft(container, KARAT_CODES)).toEqual([]);
  });

  it("names the action in English too", () => {
    render(<StaleRateAckNotice {...props} onChange={vi.fn()} action="buying" />);
    expect(screen.getByLabelText(en.goldRate.confirmBuying(formatDateTime(rate.fetched_at)))).toBeInTheDocument();
    expect(screen.getByText(/You are paying out on this price\./)).toBeInTheDocument();
  });
});

describe("MarketClosedBanner in Arabic (NEX-64)", () => {
  beforeEach(() => setRate({}));

  it("stays silent while the rate is fresh", () => {
    const { container } = inArabic(<MarketClosedBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("ageing: amber status in Arabic", () => {
    setRate({ is_stale: true });
    const { container } = inArabic(<MarketClosedBanner />);
    expect(screen.getByRole("status")).toHaveTextContent(ar.goldRate.ageingTitle);
    expect(screen.getByRole("status")).toHaveTextContent(ar.goldRate.ageingBody(arTime));
    expect(englishLeft(container, KARAT_CODES)).toEqual([]);
  });

  it("market closed: the till is told to ask a manager, the admin to set an override", () => {
    setRate({ is_stale: true, market_closed: true });
    const till = inArabic(<MarketClosedBanner variant="dark" />);
    expect(screen.getByRole("alert")).toHaveTextContent(ar.goldRate.marketClosedTitle);
    expect(screen.getByRole("alert")).toHaveTextContent(ar.goldRate.askManager);
    expect(englishLeft(till.container, KARAT_CODES)).toEqual([]);
    till.unmount();

    const admin = inArabic(<MarketClosedBanner />);
    expect(screen.getByRole("alert")).toHaveTextContent(ar.goldRate.setOverrideHint);
    expect(englishLeft(admin.container, KARAT_CODES)).toEqual([]);
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CheckoutConfirmDialog } from "@/components/pos/CheckoutConfirmDialog";
import { LanguageProvider } from "@/context/LanguageContext";
import { formatDateTime } from "@/lib/utils";
import { localeFor } from "@/lib/lang-cookie";
import type { CartItem } from "@/hooks/useCart";
import type { GoldRate } from "@/types/api";
import en from "@/i18n/en";
import ar from "@/i18n/ar";

const hook = vi.hoisted(() => ({ rate: undefined as unknown }));
vi.mock("@/hooks/useGoldRate", () => ({
  useGoldRate: () => ({ rate: hook.rate, refresh: vi.fn(), error: undefined, isLoading: false, isValidating: false }),
}));

// GoldRateOut as GET /gold-price sends it; `source` is "live" or "override".
const RATE: GoldRate = {
  rate_24k: 141.66, rate_22k: 129.9, rate_21k: 123.95, rate_18k: 106.25,
  source: "live", fetched_at: "2026-09-08T10:00:00Z", is_stale: false, market_closed: false,
};
const items: CartItem[] = [
  { cartId: "r1", kind: "PRODUCT", productId: "p1", code: "FN-21K-0001", nameEn: "Ring", karat: "K21", weightGrams: 5, quantity: 2, goldRate24k: 141.66, unitPrice: 700, finalPrice: 1400 },
];

function renderDialog(lang: "en" | "ar", props: Partial<React.ComponentProps<typeof CheckoutConfirmDialog>> = {}) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  const view = render(
    <LanguageProvider initialLang={lang}>
      <CheckoutConfirmDialog
        open items={items} subtotal={1400} vat={154} vatPercent={11} discountPercent={5} discountAmount={77.7}
        total={1476.3} paymentMethod="MIXED" customerName="" submitting={false}
        onConfirm={onConfirm} onCancel={onCancel} {...props}
      />
    </LanguageProvider>,
  );
  return { ...view, onConfirm, onCancel };
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
// Karat codes, plus the product name and code the fixture supplies as data.
const DATA = /\b(FN-21K-0001|K?\d\dK?|Ring)\b/g;

describe("CheckoutConfirmDialog — i18n (NEX-64)", () => {
  beforeEach(() => { hook.rate = RATE; });

  it("renders nothing while closed", () => {
    const { container } = renderDialog("ar", { open: false });
    expect(container).toBeEmptyDOMElement();
  });

  it("Arabic: title, lines, summary and buttons — no English left", () => {
    const { container } = renderDialog("ar");
    const c = ar.checkout;
    for (const text of [c.confirmTitle, c.confirmHint, c.qty, ar.common.subtotal, c.vatLine(11), c.discountLine(5), ar.common.customer, c.walkIn, c.payment, c.paymentMethods.MIXED, ar.common.total]) {
      expect(screen.getByText(text), text).toBeInTheDocument();
    }
    expect(screen.getByText(c.eachAndTotal("$700.00", "$1,400.00"))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: c.backToEdit })).toBeEnabled();
    expect(screen.getByRole("button", { name: c.confirmComplete })).toBeEnabled();
    expect(englishLeft(container, DATA)).toEqual([]);
  });

  it("a named customer is shown as typed — data, not translated", () => {
    renderDialog("ar", { customerName: "Rima Haddad" });
    expect(screen.getByText("Rima Haddad")).toBeInTheDocument();
    expect(screen.queryByText(ar.checkout.walkIn)).toBeNull();
  });

  it("keeps the English wording it had", () => {
    const { container } = renderDialog("en");
    for (const text of ["Confirm this order?", "Subtotal", "VAT 11%", "Discount 5%", "Customer", "Walk-in", "Payment", "MIXED", "Total", "$700.00 ea · $1,400.00", "Back to edit", "CONFIRM & COMPLETE"]) {
      expect(screen.getByText(text), text).toBeInTheDocument();
    }
    expect(englishLeft(container, DATA)).not.toEqual([]);
  });

  it("a server refusal is shown as the server worded it", () => {
    // POST /orders, 409: the stock check's own message.
    const detail = "Insufficient stock for FN-21K-0001: requested 2, on hand 1";
    renderDialog("ar", { error: detail });
    expect(screen.getByText(detail)).toBeInTheDocument();
  });
});

describe("CheckoutConfirmDialog — the stale-rate gate still gates", () => {
  const arTime = formatDateTime(RATE.fetched_at, localeFor("ar"));

  it("fresh rate: confirm goes straight through, with no acknowledgement attached", () => {
    hook.rate = RATE;
    const { onConfirm, onCancel } = renderDialog("ar");
    fireEvent.click(screen.getByRole("button", { name: ar.checkout.confirmComplete }));
    expect(onConfirm).toHaveBeenCalledWith(undefined);
    fireEvent.click(screen.getByRole("button", { name: ar.checkout.backToEdit }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("market closed: the button is blocked until the Arabic checkbox is ticked, then sends that rate's timestamp", () => {
    hook.rate = { ...RATE, is_stale: true, market_closed: true };
    const { container, onConfirm } = renderDialog("ar");

    const blocked = screen.getByRole("button", { name: ar.checkout.confirmRateAbove });
    expect(blocked).toBeDisabled();
    fireEvent.click(blocked);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(englishLeft(container, DATA)).toEqual([]);

    fireEvent.click(screen.getByLabelText(ar.goldRate.confirmSelling(arTime)));
    fireEvent.click(screen.getByRole("button", { name: ar.checkout.confirmComplete }));
    expect(onConfirm).toHaveBeenCalledWith({ rate_fetched_at: RATE.fetched_at });
  });

  it("while submitting both buttons are disabled and the label says so", () => {
    hook.rate = RATE;
    renderDialog("en", { submitting: true });
    expect(screen.getByRole("button", { name: en.checkout.processing })).toBeDisabled();
    expect(screen.getByRole("button", { name: en.checkout.backToEdit })).toBeDisabled();
  });
});

// The dialog declares aria-modal="true": the till behind it is inert to a
// screen reader, so Tab must not walk out to it either.
describe("CheckoutConfirmDialog — Tab stays inside the dialog", () => {
  const press = (shiftKey = false) => !fireEvent.keyDown(document.activeElement ?? document.body, { key: "Tab", shiftKey });

  it("cycles between Back to edit and Confirm, and pulls focus in from the till behind", () => {
    hook.rate = RATE;
    render(
      <LanguageProvider initialLang="en">
        <button>scan field behind</button>
        <CheckoutConfirmDialog open items={items} subtotal={1400} vat={154} vatPercent={11} discountPercent={0} discountAmount={0}
          total={1554} paymentMethod="CASH" customerName="" submitting={false} onConfirm={vi.fn()} onCancel={vi.fn()} />
      </LanguageProvider>,
    );
    const back = screen.getByRole("button", { name: en.checkout.backToEdit });
    const confirm = screen.getByRole("button", { name: en.checkout.confirmComplete });

    confirm.focus();
    expect(press()).toBe(true);
    expect(back).toHaveFocus();
    expect(press(true)).toBe(true);
    expect(confirm).toHaveFocus();

    screen.getByRole("button", { name: "scan field behind" }).focus();
    expect(press()).toBe(true);
    expect(back).toHaveFocus();
  });

  it("market closed: the acknowledgement checkbox is the first stop, and a blocked Confirm is not one", () => {
    hook.rate = { ...RATE, is_stale: true, market_closed: true };
    renderDialog("en");
    const box = screen.getByRole("checkbox");
    const back = screen.getByRole("button", { name: en.checkout.backToEdit });
    back.focus(); // Confirm is disabled until the box is ticked, so this is the last stop
    expect(press()).toBe(true);
    expect(box).toHaveFocus();
    expect(press(true)).toBe(true);
    expect(back).toHaveFocus();
  });

  it("does not hold Tab while closed", () => {
    hook.rate = RATE;
    renderDialog("en", { open: false });
    expect(fireEvent.keyDown(document.body, { key: "Tab" })).toBe(true);
  });
});

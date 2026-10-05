import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within, act } from "@testing-library/react";
import StockTakeDetailPage from "@/app/admin/stock-take/[id]/page";
import { LanguageProvider } from "@/context/LanguageContext";
import ar from "@/i18n/ar";

const swr = vi.hoisted(() => ({ byKey: {} as Record<string, unknown> }));
vi.mock("swr", () => ({ default: (key: string) => ({ data: swr.byKey[key], error: undefined, isLoading: false, isValidating: false, mutate: vi.fn() }) }));
const api = vi.hoisted(() => ({ post: vi.fn<(path: string, body?: unknown) => Promise<unknown>>(() => Promise.resolve({})), patch: vi.fn(() => Promise.resolve({})), delete: vi.fn(() => Promise.resolve({})) }));
vi.mock("@/lib/api-client", async (orig) => ({ ...(await orig<typeof import("@/lib/api-client")>()), apiFetcher: vi.fn(), api }));

const TAKE_ID = "3f2a9c1b-0000-4000-8000-000000000001";
const COIN_ID = "c01dbeef-0000-4000-8000-000000000002";
const OUNCE_ID = "0a11ce00-0000-4000-8000-000000000003";
const STARTED = "2026-09-05T10:00:00Z";
const CLOSED = "2026-09-06T08:30:00Z";

const unit = (over: Record<string, unknown>) => ({
  id: COIN_ID, code: "LIRA-8G", name_en: "Gold Lira", name_ar: "ليرة ذهب", karat: "K21", weight_grams: 8, markup_per_gram: 0,
  margin_mode: "USD", margin_value: 0, on_hand_qty: 10, min_stock_qty: null, photo_url: null, is_active: true,
  created_at: STARTED, updated_at: STARTED, ...over,
});
const line = (over: Record<string, unknown>) => ({
  id: "l1", stock_take_id: TAKE_ID, ref_type: "COIN_STOCK", ref_id: COIN_ID, counted_qty: 8, expected_qty_at_submit: 10,
  variance: -2, resolution: "PENDING", rejection_reason: null, adjustment_id: null, resolved_at: null,
  resolved_by_user_id: null, created_at: STARTED, ...over,
});
const take = (over: Record<string, unknown>) => ({
  id: TAKE_ID, started_at: STARTED, started_by_user_id: "u1", submitted_at: null, closed_at: null, status: "DRAFT",
  notes: null, lines: [], ...over,
});

// What the database supplies (names, codes, ids, staff-typed text): not
// interface copy, so not expected to be Arabic.
const DATA = [
  "Gold Lira", "1oz Bar", "LIRA-8G", "OZ-1", "counted twice, still short",
  TAKE_ID.slice(0, 8), COIN_ID.slice(0, 8), OUNCE_ID.slice(0, 8),
];

/** Text a user reads or a screen reader announces, minus the given data values. */
function englishLeft(root: HTMLElement, data: string[] = DATA): string[] {
  const found: string[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) found.push(walker.currentNode.textContent ?? "");
  root.querySelectorAll("[placeholder],[title],[aria-label],[alt]").forEach((el) => {
    for (const attr of ["placeholder", "title", "aria-label", "alt"]) found.push(el.getAttribute(attr) ?? "");
  });
  return found
    .map((text) => data.reduce((rest, value) => rest.split(value).join(""), text).trim())
    .filter((text) => /[A-Za-z]{2,}/.test(text));
}

/** globals.css lays .font-mono out left-to-right in RTL: fine for codes, wrong for Arabic words. */
function arabicInMono(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll(".font-mono")).map((el) => el.textContent ?? "").filter((text) => /[\u0600-\u06FF]/.test(text));
}

/** Every <label> on screen must reach a control: a click focuses it and it names the field. */
function labelsWithoutControl(): string[] {
  return Array.from(document.querySelectorAll("label")).filter((label) => label.control === null).map((label) => label.textContent ?? "");
}

function renderPage(lang: "en" | "ar", data: unknown) {
  swr.byKey = {
    [`/stock-takes/${TAKE_ID}`]: data,
    "/coins?page_size=200&is_active=true": { items: [unit({})], total: 1 },
    "/ounces?page_size=200&is_active=true": { items: [unit({ id: OUNCE_ID, code: "OZ-1", name_en: "1oz Bar", on_hand_qty: 3 })], total: 1 },
  };
  return render(<LanguageProvider initialLang={lang}><StockTakeDetailPage params={{ id: TAKE_ID }} /></LanguageProvider>);
}

const submitted = take({
  status: "SUBMITTED",
  submitted_at: STARTED,
  lines: [
    line({ id: "l1" }),
    line({ id: "l2", ref_type: "OUNCE_STOCK", ref_id: OUNCE_ID, counted_qty: 4, expected_qty_at_submit: 3, variance: 1 }),
    line({ id: "l3", counted_qty: 10, variance: 0, resolution: "NO_VARIANCE" }),
  ],
});

describe("stock-take detail: counting screen in Arabic (NEX-64)", () => {
  beforeEach(() => api.post.mockClear());

  it("leaves no English behind", () => {
    const { container } = renderPage("ar", take({ lines: [line({ expected_qty_at_submit: null, variance: null })] }));
    for (const english of ["Back to history", "Two distinct steps", "Save count", "Submit for review", "Approve each variance", "Coins", "Ounce bars", "Code", "Name", "System says", "Counted", "Status", "Not yet counted", "Remove", "Submit count for review", "Draft"]) {
      expect(screen.queryByText(english), english).toBeNull();
    }
    expect(screen.getByText(ar.stockTake.stepsTitle)).toBeInTheDocument();
    expect(screen.getByText(ar.stockTake.savedCount(8))).toBeInTheDocument();
    expect(screen.getByText(ar.stockTake.linesCounted(1))).toBeInTheDocument();
    expect(englishLeft(container)).toEqual([]);
  });

  it("names every count field, so a screen reader does not announce a bare number box", () => {
    renderPage("ar", take({}));
    const lira = screen.getByLabelText(ar.stockTake.countFor("Gold Lira"));
    const bar = screen.getByLabelText(ar.stockTake.countFor("1oz Bar"));
    expect(lira).toHaveAttribute("type", "number");
    expect(bar).not.toBe(lira);
  });

  it("validates in the interface language", () => {
    renderPage("ar", take({}));
    fireEvent.change(screen.getByLabelText(ar.stockTake.countFor("Gold Lira")), { target: { value: "2.5" } });
    fireEvent.click(screen.getByRole("button", { name: ar.stockTake.saveCount }));
    expect(screen.getByText(ar.stockTake.countInvalid)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });
});

describe("stock-take detail: review screen in Arabic (NEX-64)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("leaves no English behind, and words each variance in Arabic", () => {
    const { container } = renderPage("ar", submitted);
    for (const english of ["Awaiting review", "Variances awaiting decision", "Item", "System said", "Variance (plain)", "Action", "Approve", "Reject", "Pending", "No variance", "Already resolved", "Coin", "Ounce", "short by 2", "over by 1", "matches"]) {
      expect(screen.queryByText(english), english).toBeNull();
    }
    expect(screen.getByText(ar.stockTake.varianceShort(2))).toBeInTheDocument();
    expect(screen.getByText(ar.stockTake.varianceOver(1))).toBeInTheDocument();
    expect(screen.getByText(ar.stockTake.varianceMatch)).toBeInTheDocument();
    expect(screen.getByText(ar.stockTake.pendingTitle(2))).toBeInTheDocument();
    expect(englishLeft(container)).toEqual([]);
    expect(arabicInMono(container)).toEqual([]);
  });

  it("asks for approval in Arabic, and still approves only on confirm", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderPage("ar", submitted);
    fireEvent.click(screen.getAllByRole("button", { name: ar.stockTake.approve })[0]);
    const message = confirm.mock.calls[0][0] as string;
    expect(message).toContain(ar.stockTake.effectDecrease(10, 8, 2));
    expect(message).toContain(`${ar.stockTake.kindCoin} ${COIN_ID.slice(0, 8)}…`);
    expect(message.replace(COIN_ID.slice(0, 8), "")).not.toMatch(/[A-Za-z]{2,}/);
    expect(api.post).not.toHaveBeenCalled();
  });

  it("the reject dialog's reason field is reachable by its label, and the label's control is the field", () => {
    const { container } = renderPage("ar", submitted);
    fireEvent.click(screen.getAllByRole("button", { name: ar.stockTake.reject })[0]);
    const field = screen.getByLabelText(ar.stockTake.reasonLabel);
    expect(field.tagName).toBe("TEXTAREA");
    const label = screen.getByText(ar.stockTake.reasonLabel).closest("label") as HTMLLabelElement;
    expect(label.control).toBe(field);
    expect(field).toHaveAttribute("placeholder", ar.stockTake.reasonPlaceholder);
    expect(screen.getByText(ar.stockTake.rejectEffect(10, 8))).toBeInTheDocument();
    expect(document.querySelectorAll("label")).toHaveLength(1);
    expect(labelsWithoutControl()).toEqual([]);
    expect(englishLeft(container)).toEqual([]);
  });

  it("keeps the dialog's behaviour: confirm stays disabled until a reason is typed, the backdrop closes it", () => {
    renderPage("ar", submitted);
    fireEvent.click(screen.getAllByRole("button", { name: ar.stockTake.reject })[0]);
    const field = screen.getByLabelText(ar.stockTake.reasonLabel);
    const dialog = screen.getByRole("dialog");
    const confirm = within(dialog).getByRole("button", { name: ar.stockTake.rejectVariance });
    expect(confirm).toBeDisabled();
    fireEvent.change(field, { target: { value: "counted twice, still short" } });
    expect(confirm).toBeEnabled();
    fireEvent.click(dialog); // inside the panel: stays open
    fireEvent.click(field);
    expect(screen.getByLabelText(ar.stockTake.reasonLabel)).toBeInTheDocument();
    fireEvent.click(dialog.parentElement as HTMLElement); // backdrop: closes
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("the reject dialog is a real modal dialog: named, focus moves in, Escape closes, focus goes back", () => {
    renderPage("ar", submitted);
    const opener = screen.getAllByRole("button", { name: ar.stockTake.reject })[0];
    opener.focus();
    fireEvent.click(opener);
    const dialog = screen.getByRole("dialog", { name: ar.stockTake.rejectVariance });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByLabelText(ar.stockTake.reasonLabel)).toHaveFocus();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(opener).toHaveFocus();
  });

  it("the reject dialog keeps Tab inside it: the page behind is not reachable while it is open", () => {
    renderPage("ar", submitted);
    fireEvent.click(screen.getAllByRole("button", { name: ar.stockTake.reject })[0]);
    const dialog = screen.getByRole("dialog");
    const reason = screen.getByLabelText(ar.stockTake.reasonLabel);
    const cancel = within(dialog).getByRole("button", { name: ar.common.cancel });
    const confirm = within(dialog).getByRole("button", { name: ar.stockTake.rejectVariance });
    const press = (shiftKey = false) => !fireEvent.keyDown(document.activeElement ?? document.body, { key: "Tab", shiftKey });

    // No reason yet, so Reject is disabled and Cancel is the last stop.
    cancel.focus();
    expect(press()).toBe(true);
    expect(reason).toHaveFocus();
    expect(press(true)).toBe(true);
    expect(cancel).toHaveFocus();

    // With a reason typed, Reject is the last stop.
    fireEvent.change(reason, { target: { value: "counted twice, still short" } });
    confirm.focus();
    expect(press()).toBe(true);
    expect(reason).toHaveFocus();
    expect(press(true)).toBe(true);
    expect(confirm).toHaveFocus();
    cancel.focus(); // in the middle: the browser's own order
    expect(press()).toBe(false);
  });

  it("the reject dialog cannot be dismissed while the rejection is being submitted", async () => {
    let finish: (value: unknown) => void = () => {};
    api.post.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    renderPage("ar", submitted);
    fireEvent.click(screen.getAllByRole("button", { name: ar.stockTake.reject })[0]);
    const dialog = screen.getByRole("dialog");
    fireEvent.change(screen.getByLabelText(ar.stockTake.reasonLabel), { target: { value: "counted twice, still short" } });
    fireEvent.click(within(dialog).getByRole("button", { name: ar.stockTake.rejectVariance }));
    expect(within(dialog).getByRole("button", { name: ar.stockTake.rejecting })).toBeDisabled();
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(dialog.parentElement as HTMLElement);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith(`/stock-takes/${TAKE_ID}/lines/l1/reject`, { reason: "counted twice, still short" });
    await act(async () => finish({}));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("stock-take detail: closed screen in Arabic (NEX-64)", () => {
  const closed = take({
    status: "CLOSED",
    closed_at: CLOSED,
    lines: [
      line({ id: "l1", resolution: "REJECTED", rejection_reason: "counted twice, still short" }),
      line({ id: "l2", ref_type: "OUNCE_STOCK", ref_id: OUNCE_ID, counted_qty: 4, expected_qty_at_submit: 3, variance: 1, resolution: "APPROVED" }),
      line({ id: "l3", counted_qty: 10, variance: 0, resolution: "NO_VARIANCE" }),
    ],
  });

  it("leaves no English behind, and keeps the staff-typed reason as typed", () => {
    const { container } = renderPage("ar", closed);
    for (const english of ["Closed with rejection", "Closed", "Reason for rejecting", "Variance", "Approved", "Rejected"]) {
      expect(screen.queryByText(english), english).toBeNull();
    }
    expect(screen.getByText(ar.stockTake.statusClosedRejected)).toBeInTheDocument();
    // 10:00Z and 08:30Z on the Beirut wall clock, Arabic month, Western digits.
    expect(screen.getByText(/^بدأ 05 (أيلول|سبتمبر) 2026\D{1,3}0?1:00\D{0,2}م · أُغلق 06 (أيلول|سبتمبر) 2026\D{1,3}11:30\D{0,2}ص$/)).toBeInTheDocument();
    expect(screen.getByText(ar.stockTake.rejectedTitle(1))).toBeInTheDocument();
    expect(screen.getByText(ar.stockTake.approvedTitle(1))).toBeInTheDocument();
    expect(screen.getByText(ar.stockTake.matchedTitle(1))).toBeInTheDocument();
    expect(screen.getByText(/counted twice, still short/)).toBeInTheDocument();
    expect(englishLeft(container)).toEqual([]);
  });
});

describe("stock-take detail in English is unchanged", () => {
  afterEach(() => vi.restoreAllMocks());

  it("keeps the original wording for states, variances and the approval prompt", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderPage("en", submitted);
    expect(screen.getByText("Awaiting review")).toBeInTheDocument();
    expect(screen.getByText(/^Started 05 Sept? 2026, 13:00$/)).toBeInTheDocument();
    expect(screen.getByText("2 pending variances")).toBeInTheDocument();
    expect(screen.getByText("short by 2")).toBeInTheDocument();
    expect(screen.getByText("over by 1")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Approve" })[0]);
    expect(confirm).toHaveBeenCalledWith(
      `Approve this variance?\n\nCoin ${COIN_ID.slice(0, 8)}…: system says 10, you counted 8 — short by 2.\n\nApproving will decrease on-hand quantity from 10 to 8 (−2). A "lost / shrinkage" adjustment will be recorded.\n\nThis writes a permanent adjustment to the audit ledger.`,
    );
  });
});

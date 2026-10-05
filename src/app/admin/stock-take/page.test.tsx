import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import StockTakeIndexPage from "@/app/admin/stock-take/page";
import { LanguageProvider } from "@/context/LanguageContext";
import en from "@/i18n/en";
import ar from "@/i18n/ar";

const swr = vi.hoisted(() => ({ data: undefined as unknown }));
vi.mock("swr", () => ({ default: () => ({ data: swr.data, error: undefined, isLoading: false, isValidating: false, mutate: vi.fn() }) }));
const nav = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: nav.push }) }));
const api = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock("@/lib/api-client", () => ({ apiFetcher: vi.fn(), api }));

const STARTED = "2026-09-05T10:00:00Z";
const CLOSED = "2026-09-06T08:30:00Z";
const row = (over: Record<string, unknown>) => ({
  id: "t1", started_at: STARTED, started_by_user_id: "u1", submitted_at: null, closed_at: null, status: "DRAFT", notes: null,
  line_count: 4, variance_line_count: 0, approved_count: 0, rejected_count: 0, ...over,
});
const takes = [
  row({ id: "t1", status: "DRAFT" }),
  row({ id: "t2", status: "SUBMITTED", variance_line_count: 2 }),
  row({ id: "t3", status: "CLOSED", closed_at: CLOSED, approved_count: 2 }),
  row({ id: "t4", status: "CLOSED", closed_at: CLOSED, rejected_count: 1 }),
];
// 10:00Z and 08:30Z on the Beirut wall clock (UTC+3 in September). Month
// spelling and separators are ICU's; the day, year and time are what matter.
const STARTED_AR = /^05 (أيلول|سبتمبر) 2026\D{1,3}0?1:00\D{0,2}م$/;
const CLOSED_AR = /^06 (أيلول|سبتمبر) 2026\D{1,3}11:30\D{0,2}ص$/;
const STARTED_EN = /^05 Sept? 2026, 13:00$/;
const CLOSED_EN = /^06 Sept? 2026, 11:30$/;

/** Text a user reads or a screen reader announces, minus the given data values. */
function englishLeft(root: HTMLElement, data: string[] = []): string[] {
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

function renderPage(lang: "en" | "ar") {
  return render(<LanguageProvider initialLang={lang}><StockTakeIndexPage /></LanguageProvider>);
}

describe("stock-take list in Arabic (NEX-64)", () => {
  beforeEach(() => {
    swr.data = { items: takes, total: 4, page: 1, page_size: 50 };
    api.post.mockReset();
    nav.push.mockClear();
  });

  it("leaves no English behind: title, intro, button, headers", () => {
    const { container } = renderPage("ar");
    for (const english of ["Stock-take", "Start new count", "Status", "Started", "Closed", "Lines", "Variances", "Approved", "Rejected", "Draft", "Awaiting review", "Closed with rejection"]) {
      expect(screen.queryByText(english), english).toBeNull();
    }
    expect(screen.queryByText(/Nothing touches inventory/)).toBeNull();
    expect(englishLeft(container)).toEqual([]);
  });

  it("prints dates on the Beirut clock with Arabic month names and Western digits", () => {
    const { container } = renderPage("ar");
    expect(screen.getAllByText(STARTED_AR)).toHaveLength(4);
    expect(screen.getAllByText(CLOSED_AR)).toHaveLength(2);
    expect(container.textContent).not.toMatch(/[٠-٩]/);
  });

  it("translates every status pill, and keeps 'closed with rejection' apart from plain 'closed'", () => {
    renderPage("ar");
    expect(screen.getByText(ar.stockTake.statusDraft)).toBeInTheDocument();
    expect(screen.getByText(ar.stockTake.statusSubmitted)).toBeInTheDocument();
    expect(screen.getByText(ar.stockTake.statusClosed)).toBeInTheDocument();
    expect(screen.getByText(ar.stockTake.statusClosedRejected)).toBeInTheDocument();
    expect(ar.stockTake.statusClosedRejected).not.toBe(ar.stockTake.statusClosed);
  });

  it("translates the empty state", () => {
    swr.data = { items: [], total: 0, page: 1, page_size: 50 };
    const { container } = renderPage("ar");
    expect(screen.getByText(ar.stockTake.emptyTitle)).toBeInTheDocument();
    expect(screen.getByText(ar.stockTake.emptyHint)).toBeInTheDocument();
    expect(englishLeft(container)).toEqual([]);
  });

  it("shows a translated message when starting a count fails without a server message", async () => {
    api.post.mockRejectedValue({});
    renderPage("ar");
    fireEvent.click(screen.getByRole("button", { name: ar.stockTake.startNew }));
    expect(await screen.findByText(ar.stockTake.startFailed)).toBeInTheDocument();
    expect(nav.push).not.toHaveBeenCalled();
  });

  it("still opens the new count after starting one", async () => {
    api.post.mockResolvedValue({ id: "t9" });
    renderPage("ar");
    fireEvent.click(screen.getByRole("button", { name: ar.stockTake.startNew }));
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith("/admin/stock-take/t9"));
  });
});

describe("stock-take list in English is unchanged", () => {
  it("keeps the original wording", () => {
    swr.data = { items: takes, total: 4, page: 1, page_size: 50 };
    renderPage("en");
    expect(screen.getByRole("heading", { name: "Stock-take" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start new count" })).toBeInTheDocument();
    expect(screen.getByText("Closed with rejection")).toBeInTheDocument();
    expect(screen.getByText(en.stockTake.introStrong)).toHaveTextContent("Nothing touches inventory until you click Approve on a specific line.");
    expect(screen.getAllByText(STARTED_EN)).toHaveLength(4);
    expect(screen.getAllByText(CLOSED_EN)).toHaveLength(2);
    for (const header of ["Status", "Started", "Lines", "Variances", "Approved", "Rejected"]) {
      expect(screen.getByRole("columnheader", { name: header })).toBeInTheDocument();
    }
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SettingsPage from "@/app/admin/settings/page";

type SwrState = { data?: unknown; error?: unknown; isLoading?: boolean };
const swr = vi.hoisted(() => ({ byKey: {} as Record<string, SwrState>, mutates: {} as Record<string, ReturnType<typeof vi.fn>> }));
vi.mock("swr", () => ({
  default: (key: string) => {
    swr.mutates[key] ??= vi.fn(() => Promise.resolve());
    return { data: undefined, error: undefined, isLoading: false, isValidating: false, mutate: swr.mutates[key], ...(swr.byKey[key] ?? {}) };
  },
}));
const api = vi.hoisted(() => ({
  patch: vi.fn<(path: string, body?: unknown) => Promise<unknown>>(() => Promise.resolve({})),
  post: vi.fn<(path: string, body?: unknown) => Promise<unknown>>(() => Promise.resolve({})),
  get: vi.fn(),
  delete: vi.fn(),
}));
vi.mock("@/lib/api-client", () => ({ api, apiFetcher: vi.fn() }));

const SETTINGS = "/settings";
const VERIFY = "/accounting/ledger/verify";
const base = { id: "singleton", store_name: "Fawaz", vat_percent: 11 };
const empty = { status: "empty", head_matches: true, head_row_count: 0 };
const intact = { status: "intact", head_matches: true, head_row_count: 3 };

function openAccountingTab(settings: Record<string, unknown>, verify?: SwrState) {
  swr.byKey = { [SETTINGS]: { data: settings }, "/staff": { data: [] }, ...(verify ? { [VERIFY]: verify } : {}) };
  render(<SettingsPage />);
  fireEvent.click(screen.getByRole("button", { name: "Accounting" }));
}

const toggle = () => screen.getByRole("switch");

describe("settings › auto-post toggle", () => {
  beforeEach(() => {
    swr.byKey = {};
    swr.mutates = {};
    api.patch.mockClear();
  });

  it("is disabled with an explanation while the server does not report the flag", () => {
    openAccountingTab(base, { data: empty });
    expect(toggle()).toBeDisabled();
    expect(screen.getByText(/not available yet/i)).toBeInTheDocument();
  });

  it("reflects the server state on load: off", () => {
    openAccountingTab({ ...base, accounting_auto_post_enabled: false }, { data: empty });
    expect(toggle()).toHaveAttribute("aria-checked", "false");
    expect(toggle()).toBeEnabled();
  });

  it("reflects the server state on load: on", () => {
    openAccountingTab({ ...base, accounting_auto_post_enabled: true }, { data: intact });
    expect(toggle()).toHaveAttribute("aria-checked", "true");
  });

  it("warns before enabling, in the owner's terms, and patches only on confirm", async () => {
    openAccountingTab({ ...base, accounting_auto_post_enabled: false }, { data: empty });
    fireEvent.click(toggle());
    expect(screen.getByRole("alertdialog")).toHaveTextContent(/every sale/i);
    expect(api.patch).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /turn on/i }));
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith("/settings", { accounting_auto_post_enabled: true }));
    await waitFor(() => expect(swr.mutates[SETTINGS]).toHaveBeenCalled());
  });

  it("cancelling the warning changes nothing", () => {
    openAccountingTab({ ...base, accounting_auto_post_enabled: false }, { data: empty });
    fireEvent.click(toggle());
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(api.patch).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("refuses to turn off once the ledger has entries", () => {
    openAccountingTab({ ...base, accounting_auto_post_enabled: true }, { data: intact });
    fireEvent.click(toggle());
    expect(screen.getByRole("alertdialog")).toHaveTextContent(/gap in the books/i);
    expect(screen.queryByRole("button", { name: /turn off/i })).toBeNull();
    expect(api.patch).not.toHaveBeenCalled();
  });

  it("refuses to turn off while the ledger state is unknown", () => {
    openAccountingTab({ ...base, accounting_auto_post_enabled: true }, { error: new Error("503") });
    fireEvent.click(toggle());
    expect(screen.queryByRole("button", { name: /turn off/i })).toBeNull();
    expect(api.patch).not.toHaveBeenCalled();
  });

  it("turning off with an empty ledger warns, then patches false on confirm", async () => {
    openAccountingTab({ ...base, accounting_auto_post_enabled: true }, { data: empty });
    fireEvent.click(toggle());
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /turn off/i }));
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith("/settings", { accounting_auto_post_enabled: false }));
  });

  it("the general Save button never sends the flag", async () => {
    openAccountingTab({ ...base, accounting_auto_post_enabled: true }, { data: intact });
    fireEvent.click(screen.getByRole("button", { name: "Store Info" }));
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    await waitFor(() => expect(api.patch).toHaveBeenCalled());
    const body = api.patch.mock.calls[0][1] as Record<string, unknown>;
    expect(body).not.toHaveProperty("accounting_auto_post_enabled");
  });
});

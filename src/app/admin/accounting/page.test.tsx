import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import AccountingHome from "@/app/admin/accounting/page";

type SwrState = { data?: unknown; error?: unknown; isLoading?: boolean };
const swr = vi.hoisted(() => ({ byKey: {} as Record<string, SwrState> }));
vi.mock("swr", () => ({
  default: (key: string) => ({ data: undefined, error: undefined, isLoading: false, isValidating: false, mutate: vi.fn(), ...(swr.byKey[key] ?? {}) }),
}));
vi.mock("@/lib/api-client", () => ({ apiFetcher: vi.fn(), api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));

const SETTINGS = "/settings";
const VERIFY = "/accounting/ledger/verify";
const empty = { status: "empty", head_matches: true, head_row_count: 0 };
const intact = { status: "intact", head_matches: true, head_row_count: 12 };

function setUser(role: string | null) {
  sessionStorage.clear();
  if (role) sessionStorage.setItem("mz_user", JSON.stringify({ id: "u1", email: "x@y.z", name: "X", role, is_active: true }));
}

describe("accounting hub ledger state", () => {
  beforeEach(() => {
    swr.byKey = {};
    setUser("ADMIN");
  });

  it("with auto-post off and an empty ledger, says so plainly", () => {
    swr.byKey = { [SETTINGS]: { data: { accounting_auto_post_enabled: false } }, [VERIFY]: { data: empty } };
    render(<AccountingHome />);
    expect(screen.getByText(/auto-posting is off/i)).toBeInTheDocument();
    expect(screen.queryByText(/every sale, purchase, and payment is recorded here/i)).toBeNull();
    expect(screen.getByTestId("chain-badge")).toHaveTextContent(/no entries yet/i);
  });

  it("with auto-post on and an intact chain, shows the verified status", () => {
    swr.byKey = { [SETTINGS]: { data: { accounting_auto_post_enabled: true } }, [VERIFY]: { data: intact } };
    render(<AccountingHome />);
    expect(screen.getByText(/is recorded here/i)).toBeInTheDocument();
    expect(screen.getByTestId("chain-badge")).toHaveTextContent(/intact/i);
    expect(screen.getByTestId("ledger-entries")).toHaveTextContent("12");
  });

  it("reads a broken chain as broken, not intact", () => {
    swr.byKey = { [SETTINGS]: { data: { accounting_auto_post_enabled: true } }, [VERIFY]: { data: { ...intact, head_matches: false } } };
    render(<AccountingHome />);
    expect(screen.getByTestId("chain-badge")).toHaveTextContent(/broken/i);
  });

  it("does not claim the ledger is empty when the verify call failed", () => {
    swr.byKey = { [SETTINGS]: { data: { accounting_auto_post_enabled: false } }, [VERIFY]: { error: new Error("503") } };
    render(<AccountingHome />);
    expect(screen.getByTestId("chain-badge")).toHaveTextContent(/couldn't verify/i);
    expect(screen.queryByText(/no entries yet/i)).toBeNull();
  });

  it("does not claim auto-post is off when the server does not report the flag", () => {
    swr.byKey = { [SETTINGS]: { data: { store_name: "Fawaz" } }, [VERIFY]: { data: empty } };
    render(<AccountingHome />);
    expect(screen.getByTestId("ledger-autopost")).toHaveTextContent(/not reported/i);
    expect(screen.queryByText(/auto-posting is off/i)).toBeNull();
  });

  it("offers the settings link to admins only", () => {
    swr.byKey = { [SETTINGS]: { data: { accounting_auto_post_enabled: false } }, [VERIFY]: { data: empty } };
    render(<AccountingHome />);
    expect(screen.getByRole("link", { name: /open settings/i })).toHaveAttribute("href", "/admin/settings");
  });

  it("hides the settings link from an accountant, who cannot open it", () => {
    setUser("ACCOUNTANT");
    swr.byKey = { [SETTINGS]: { data: { accounting_auto_post_enabled: false } }, [VERIFY]: { data: empty } };
    render(<AccountingHome />);
    expect(screen.queryByRole("link", { name: /open settings/i })).toBeNull();
  });
});

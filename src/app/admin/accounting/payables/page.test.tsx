import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import Payables from "@/app/admin/accounting/payables/page";
import { ApiError } from "@/lib/api-client";
import { renderWithSwitch } from "@/test/language-shell";
import en from "@/i18n/en";
import ar from "@/i18n/ar";

const lib = vi.hoisted(() => ({ verify: vi.fn(), aging: vi.fn(), balances: vi.fn() }));
vi.mock("@/lib/accounting", () => ({ ap: lib }));

beforeEach(() => {
  for (const fn of Object.values(lib)) fn.mockReset();
  document.cookie = "mz_lang=; path=/; max-age=0";
  localStorage.clear();
});

describe("payables — a failed load follows the UI language (NEX-64)", () => {
  it("is translated, and retranslates when the language changes", async () => {
    lib.verify.mockRejectedValue(new TypeError("Failed to fetch"));
    renderWithSwitch(<Payables />, "ar");
    expect(await screen.findByRole("alert")).toHaveTextContent(ar.errors.loadFailed);
    fireEvent.click(screen.getByRole("button", { name: "switch language" }));
    expect(screen.getByRole("alert")).toHaveTextContent(en.errors.loadFailed);
    expect(document.body).not.toHaveTextContent("Failed to fetch");
  });

  it("the server's own reason is shown as sent, in either language", async () => {
    lib.verify.mockRejectedValue(new ApiError(403, "Accounting access required"));
    renderWithSwitch(<Payables />, "ar");
    expect(await screen.findByRole("alert")).toHaveTextContent("Accounting access required");
    fireEvent.click(screen.getByRole("button", { name: "switch language" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Accounting access required");
  });
});

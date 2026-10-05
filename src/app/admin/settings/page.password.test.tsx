import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SettingsPage from "@/app/admin/settings/page";
import { LanguageProvider } from "@/context/LanguageContext";
import en from "@/i18n/en";
import ar from "@/i18n/ar";

// POST /auth/change-password, against both backends. The frontend ships first:
//   today      204, no body
//   NEX-54     200, the login shape ({access_token, token_type, user}) plus a
//              fresh session cookie — the change revokes every token issued so
//              far, the caller's included, so a new one comes back with it
// Nothing here mocks the API client; `fetch` is the only stand-in.
const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>();
vi.stubGlobal("fetch", fetchMock);
// One object per key for the whole run, as SWR's cache gives: the page copies
// `settings` into its form from an effect keyed on that identity.
const reads = vi.hoisted(() => ({
  "/settings": { id: "singleton", store_name: "Fawaz El Namel", vat_percent: "11.00" },
  "/staff": [],
} as Record<string, unknown>));
vi.mock("swr", () => ({
  default: (key: string | null) => ({
    data: key ? reads[key] : undefined,
    error: undefined, isLoading: false, isValidating: false, mutate: vi.fn(() => Promise.resolve()),
  }),
}));

// UserOut (app/schemas/auth.py), as the login page stored it for display.
const USER = { id: "u1", email: "owner@fawazelnamel.com", name: "Fawaz", role: "ADMIN", is_active: true };
const TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1MSIsInZlciI6Mn0.fresh-signature";
const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function change(lang: "en" | "ar", next = "new-passw0rd", confirm = next) {
  const s = (lang === "ar" ? ar : en).settings;
  render(<LanguageProvider initialLang={lang}><SettingsPage /></LanguageProvider>);
  fireEvent.click(screen.getByRole("button", { name: s.tabSecurity }));
  fireEvent.change(screen.getByLabelText(s.currentPassword), { target: { value: "old-passw0rd" } });
  fireEvent.change(screen.getByLabelText(s.newPassword), { target: { value: next } });
  fireEvent.change(screen.getByLabelText(s.confirmNewPassword), { target: { value: confirm } });
  fireEvent.click(screen.getByRole("button", { name: s.updatePassword }));
  return s;
}
const fields = (s: typeof en.settings) => [s.currentPassword, s.newPassword, s.confirmNewPassword].map((label) => screen.getByLabelText(label));

beforeEach(() => {
  fetchMock.mockReset();
  sessionStorage.clear();
  localStorage.clear();
  sessionStorage.setItem("mz_user", JSON.stringify(USER));
  window.history.replaceState({}, "", "/admin/settings");
});

describe("settings › change password, on either backend", () => {
  it.each([
    ["today's backend: 204 with no body", () => new Response(null, { status: 204 })],
    ["the next backend: 200 with the login shape", () => json({ access_token: TOKEN, token_type: "bearer", user: USER }, 200)],
  ])("%s — confirmed, form cleared, still signed in", async (_name, respond) => {
    fetchMock.mockResolvedValue(respond());
    const s = change("en");

    expect(await screen.findByRole("status")).toHaveTextContent(s.passwordChanged);
    expect(screen.queryByRole("alert")).toBeNull();
    for (const field of fields(s)) expect(field).toHaveValue("");

    // One request, through the same-origin proxy so the browser keeps the cookie it sets.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/auth/change-password");
    expect(init).toMatchObject({ method: "POST", credentials: "include" });
    expect(JSON.parse(String(init?.body))).toEqual({ current_password: "old-passw0rd", new_password: "new-passw0rd" });

    // The session is the HttpOnly cookie. The token in the body is not kept
    // anywhere a script can read, and the display user is who it was.
    expect(JSON.parse(sessionStorage.getItem("mz_user") ?? "null")).toEqual(USER);
    const readable = [document.cookie, JSON.stringify(Object.entries(sessionStorage)), JSON.stringify(Object.entries(localStorage)), document.body.innerHTML].join("|");
    expect(readable).not.toContain(TOKEN);
    expect(readable).not.toContain("fresh-signature");
    expect(window.location.pathname).toBe("/admin/settings");
  });

  it("a wrong current password shows the server's reason and keeps what was typed", async () => {
    fetchMock.mockResolvedValue(json({ detail: "Current password is incorrect" }, 400));
    const s = change("ar");
    expect(await screen.findByRole("alert")).toHaveTextContent("Current password is incorrect");
    expect(screen.queryByRole("status")).toBeNull();
    expect(fields(s).map((f) => (f as HTMLInputElement).value)).toEqual(["old-passw0rd", "new-passw0rd", "new-passw0rd"]);
  });

  it.each([
    ["a new password the server rejects with a validation list (422)", () => Promise.resolve(json({ detail: [{ type: "string_too_short", loc: ["body", "new_password"], msg: "String should have at least 8 characters", input: "short" }] }, 422))],
    ["a dropped connection", () => Promise.reject(new TypeError("Failed to fetch"))],
    ["a bare 500", () => Promise.resolve(json({}, 500))],
  ])("Arabic: %s shows the translated failure, not the client's English", async (_name, respond) => {
    fetchMock.mockImplementation(respond);
    change("ar", "short");
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(ar.settings.changePasswordFailed);
    expect(alert.textContent).not.toMatch(/[A-Za-z]{3,}/);
  });

  it("a mismatch is caught before anything is sent", () => {
    change("ar", "new-passw0rd", "new-passw0rd-typo");
    expect(screen.getByRole("alert")).toHaveTextContent(ar.settings.passwordsMismatch);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("the button is back once the request settles, whichever way it went", async () => {
    fetchMock.mockResolvedValue(json({ detail: "Current password is incorrect" }, 400));
    const s = change("en");
    await screen.findByRole("alert");
    await waitFor(() => expect(screen.getByRole("button", { name: s.updatePassword })).toBeEnabled());
  });
});

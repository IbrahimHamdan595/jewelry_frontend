import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SettingsPage from "@/app/admin/settings/page";
import { LanguageProvider } from "@/context/LanguageContext";
import en from "@/i18n/en";
import ar from "@/i18n/ar";

// Saving the settings and adding a cashier awaited their request with no catch:
// a refusal was an unhandled rejection and nothing on screen. `fetch` is the
// only stand-in here, so each failure travels the real client.
const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>();
vi.stubGlobal("fetch", fetchMock);
// One object per key for the whole run, as SWR's cache gives: the page copies
// `settings` into its form from an effect keyed on that identity.
const reads = vi.hoisted(() => ({
  // SettingsOut (GET /settings): decimals as strings at their column scale.
  "/settings": { id: "singleton", store_name: "Fawaz El Namel", address: "Hamra Street, Beirut", phone: "+961 1 555 555", vat_percent: "11.00", max_discount_percent: "10.00" },
  "/staff": [],
} as Record<string, unknown>));
const mutate = vi.hoisted(() => vi.fn(() => Promise.resolve()));
vi.mock("swr", () => ({
  default: (key: string | null) => ({ data: key ? reads[key] : undefined, error: undefined, isLoading: false, isValidating: false, mutate }),
}));

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const renderPage = (lang: "en" | "ar") => render(<LanguageProvider initialLang={lang}><SettingsPage /></LanguageProvider>);
const LRI = "⁦", PDI = "⁩";

beforeEach(() => {
  fetchMock.mockReset();
  mutate.mockClear();
  sessionStorage.clear();
  window.history.replaceState({}, "", "/admin/settings");
});

describe("settings › Save Changes says when it fails (NEX-64)", () => {
  const save = (dict: typeof en) => fireEvent.click(screen.getByRole("button", { name: dict.settings.saveChanges }));

  it.each([
    ["the connection drops", () => Promise.reject(new TypeError("Failed to fetch"))],
    ["a bare 500", () => Promise.resolve(json({}, 500))],
  ])("Arabic, when %s: the translated failure, the form kept, the button back", async (_name, respond) => {
    fetchMock.mockImplementation(respond);
    renderPage("ar");
    fireEvent.change(screen.getByLabelText(ar.settings.storeName), { target: { value: "Fawaz & Sons" } });
    save(ar);
    expect(await screen.findByRole("alert")).toHaveTextContent(ar.settings.saveFailed);
    expect(screen.getByRole("alert").textContent).not.toMatch(/[A-Za-z]{3,}/);
    expect(screen.getByLabelText(ar.settings.storeName)).toHaveValue("Fawaz & Sons");
    await waitFor(() => expect(screen.getByRole("button", { name: ar.settings.saveChanges })).toBeEnabled());
    expect(mutate).not.toHaveBeenCalled();
  });

  it("a rejected field (422) is named after the translated failure", async () => {
    fetchMock.mockResolvedValue(json({ detail: [{ type: "less_than_equal", loc: ["body", "max_discount_percent"], msg: "Input should be less than or equal to 100", input: "250" }] }, 422));
    renderPage("ar");
    save(ar);
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe(`${ar.settings.saveFailed} — ${LRI}max_discount_percent: Input should be less than or equal to 100${PDI}`);
  });

  it("the server's own reason is shown as sent", async () => {
    fetchMock.mockResolvedValue(json({ detail: "Admin access required" }, 403));
    renderPage("ar");
    save(ar);
    expect(await screen.findByRole("alert")).toHaveTextContent("Admin access required");
  });

  it("a save that then succeeds clears the error and refreshes the settings", async () => {
    fetchMock.mockResolvedValueOnce(json({}, 500)).mockResolvedValueOnce(json(reads["/settings"], 200));
    renderPage("en");
    save(en);
    expect(await screen.findByRole("alert")).toHaveTextContent("Failed to save settings");
    save(en);
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    expect(mutate).toHaveBeenCalledTimes(1);
    // The request itself is what it always was: a PATCH of the form, without the auto-post flag.
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe("/api/settings");
    expect(init?.method).toBe("PATCH");
    expect(JSON.parse(String(init?.body))).toEqual(reads["/settings"]);
  });
});

describe("settings › Add Cashier says when it fails (NEX-64)", () => {
  function fillCashier(dict: typeof en, password = "s3cret-pass") {
    const s = dict.settings;
    fireEvent.click(screen.getByRole("button", { name: s.tabStaff }));
    fireEvent.click(screen.getByRole("button", { name: s.addCashier }));
    fireEvent.change(screen.getByLabelText(s.staffFields.name), { target: { value: "Lina" } });
    fireEvent.change(screen.getByLabelText(s.staffFields.email), { target: { value: "lina@fawazelnamel.com" } });
    fireEvent.change(screen.getByLabelText(s.staffFields.password), { target: { value: password } });
    fireEvent.click(screen.getByRole("button", { name: dict.common.save }));
  }
  const typed = (dict: typeof en) => (["name", "email", "password"] as const).map((f) => (screen.getByLabelText(dict.settings.staffFields[f]) as HTMLInputElement).value);

  it("an email already in use: the server's reason, and the form stays open with what was typed", async () => {
    // POST /staff → 400 (app/api/staff.py)
    fetchMock.mockResolvedValue(json({ detail: "Email already in use" }, 400));
    renderPage("ar");
    fillCashier(ar);
    expect(await screen.findByRole("alert")).toHaveTextContent("Email already in use");
    expect(typed(ar)).toEqual(["Lina", "lina@fawazelnamel.com", "s3cret-pass"]);
    expect(mutate).not.toHaveBeenCalled();
  });

  it.each([
    ["the connection drops", () => Promise.reject(new TypeError("Failed to fetch"))],
    ["a bare 500", () => Promise.resolve(json({}, 500))],
  ])("Arabic, when %s: the translated failure", async (_name, respond) => {
    fetchMock.mockImplementation(respond);
    renderPage("ar");
    fillCashier(ar);
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(ar.settings.addCashierFailed);
    expect(alert.textContent).not.toMatch(/[A-Za-z]{3,}/);
    expect(typed(ar)).toEqual(["Lina", "lina@fawazelnamel.com", "s3cret-pass"]);
  });

  it("a password the server finds too long names the field", async () => {
    fetchMock.mockResolvedValue(json({ detail: [{ type: "value_error", loc: ["body", "password"], msg: "Value error, password is longer than 72 bytes", input: "…" }] }, 422));
    renderPage("en");
    fillCashier(en);
    expect((await screen.findByRole("alert")).textContent).toBe(`Failed to add cashier — ${LRI}password: Value error, password is longer than 72 bytes${PDI}`);
  });

  it("success closes the form and refreshes the list; an old error does not come back when the form is reopened", async () => {
    fetchMock.mockResolvedValueOnce(json({ detail: "Email already in use" }, 400)).mockResolvedValueOnce(json({ id: "s9" }, 201));
    renderPage("en");
    fillCashier(en);
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: en.common.save }));
    await waitFor(() => expect(screen.queryByLabelText(en.settings.staffFields.email)).toBeNull());
    expect(mutate).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: en.settings.addCashier }));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(typed(en)).toEqual(["", "", ""]);
  });

  it("cancelling after a failure discards the error with the form", async () => {
    fetchMock.mockResolvedValue(json({ detail: "Email already in use" }, 400));
    renderPage("en");
    fillCashier(en);
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: en.settings.cancel }));
    fireEvent.click(screen.getByRole("button", { name: en.settings.addCashier }));
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

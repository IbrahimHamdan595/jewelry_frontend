import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import LedgerPage from "@/app/admin/ledger/page";
import { LanguageProvider } from "@/context/LanguageContext";
import en from "@/i18n/en";
import ar from "@/i18n/ar";

const swr = vi.hoisted(() => ({ data: undefined as unknown, keys: [] as string[] }));
vi.mock("swr", () => ({
  default: (key: string) => {
    swr.keys.push(key);
    return { data: swr.data, error: undefined, isLoading: false, isValidating: false, mutate: vi.fn() };
  },
}));
const api = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/lib/api-client", () => ({ apiFetcher: vi.fn(), api }));

const REF_ID = "7b1e4c90-55aa-4d2f-9c11-0a1b2c3d4e5f";
const ACTOR_ID = "c0ffee12-0000-4000-8000-000000000001";
const entry = {
  id: "e1", event_type: "SUPPLIER_PAYMENT_CASH", actor_user_id: ACTOR_ID, occurred_at: "2026-09-05T10:00:00Z",
  ref_type: "supplier_payment", ref_id: REF_ID, payload: { amount: "100.00", unit: "CASH" }, created_at: "2026-09-05T10:00:00Z",
};
const ledger = { items: [entry], total: 120, page: 1, page_size: 50 };
const drifted = {
  drift_count: 2,
  discord_alerted: true,
  supplier_balance_drifts: [
    { supplier_id: "s1", supplier_name: "Abu Ali Gold", unit: "CASH", karat: null, stored: "100.00", computed: "90.00", drift: "10.00" },
    { supplier_id: "s1", supplier_name: "Abu Ali Gold", unit: "GOLD", karat: "21", stored: "5.000", computed: "4.000", drift: "1.000" },
  ],
};

/** Every string a user can see or hear: text nodes plus placeholder / title / aria-label. */
function uiStrings(root: HTMLElement): string[] {
  const out: string[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) out.push(walker.currentNode.textContent ?? "");
  root.querySelectorAll("[placeholder],[title],[aria-label]").forEach((el) => {
    for (const attr of ["placeholder", "title", "aria-label"]) out.push(el.getAttribute(attr) ?? "");
  });
  return out.map((s) => s.trim()).filter(Boolean);
}

/** The strings that still carry Latin words once the known data values are taken out. */
function englishLeft(root: HTMLElement, data: (string | RegExp)[]): string[] {
  return uiStrings(root).filter((s) => /[A-Za-z]{2,}/.test(data.reduce<string>((rest, d) => rest.split(d).join(""), s)));
}

/** Every leaf of a dictionary namespace, with function-valued keys called on sample arguments. */
function leaves(node: unknown, path: string): [string, string][] {
  if (typeof node === "string") return [[path, node]];
  if (typeof node === "function") return [[path, String((node as (...args: unknown[]) => unknown)(2, 3, 4))]];
  return Object.entries(node as Record<string, unknown>).flatMap(([key, value]) => leaves(value, `${path}.${key}`));
}

// Left as-is on purpose. The audit ledger shows what the backend recorded:
// event codes, reference types, ids and the raw JSON payload are machine
// identifiers (the event code is also what the filter matches on), supplier
// names are data, and Discord is a product name inside an Arabic sentence.
const DATA: (string | RegExp)[] = [
  /\b[A-Z]+(?:_[A-Z]+)*\b/g, // event codes: LOT_CREATED, SALE_ON_STALE_RATE_ACK, MELT …
  /\b[a-z]+(?:_[a-z]+)+\b/g, // reference types and the table name: gold_lot, supplier_balances …
  /^(?:order|category|product|supplier)$/, // the single-word reference types, as options and in rows
  REF_ID.slice(0, 12), ACTOR_ID.slice(0, 8),
  "Abu Ali Gold", "Discord",
];

function renderPage(lang: "en" | "ar") {
  return render(<LanguageProvider initialLang={lang}><LedgerPage /></LanguageProvider>);
}

/** A field with a visible label: found by that text, and the label's control is the field. */
function expectLabelled(text: string, tagName: string) {
  const control = screen.getByLabelText(text);
  expect(control.tagName, text).toBe(tagName);
  const label = control.closest("label") as HTMLLabelElement;
  expect(label, text).not.toBeNull();
  expect(label.control, text).toBe(control);
  return control;
}

describe("inventory ledger labels and i18n (NEX-64)", () => {
  beforeEach(() => {
    swr.data = ledger;
    swr.keys = [];
    api.get.mockReset();
  });

  it("every filter is reachable by its label, and the label's control is the field", () => {
    renderPage("en");
    const l = en.inventoryLedger;
    const eventType = expectLabelled(l.eventType, "INPUT");
    expect(eventType).toHaveAttribute("list", "event-presets");
    expectLabelled(l.refType, "SELECT");
    expect(expectLabelled(l.refId, "INPUT")).toHaveAttribute("placeholder", l.refIdPlaceholder);
  });

  it("keeps the presets out of the event-type field's name, and still offers them", () => {
    const { container } = renderPage("en");
    const label = screen.getByLabelText(en.inventoryLedger.eventType).closest("label") as HTMLLabelElement;
    expect(label.textContent).toBe(en.inventoryLedger.eventType);
    const presets = Array.from(container.querySelectorAll("#event-presets option")).map((o) => o.getAttribute("value"));
    expect(presets).toContain("SUPPLIER_PAYMENT_CASH");
    expect(presets).toHaveLength(28);
  });

  it("still filters by the raw event code typed into the labelled field", () => {
    renderPage("ar");
    fireEvent.change(screen.getByLabelText(ar.inventoryLedger.eventType), { target: { value: "MELT" } });
    expect(swr.keys.at(-1)).toContain("event_type=MELT");
    expect(screen.getByRole("button", { name: ar.inventoryLedger.resetFilters })).toBeInTheDocument();
  });

  it("renders the browser in Arabic with no English left behind", () => {
    const { container } = renderPage("ar");
    const l = ar.inventoryLedger;
    expect(screen.getByRole("heading", { name: l.title })).toBeInTheDocument();
    expect(screen.getByText(l.reconcileTitle)).toBeInTheDocument();
    for (const header of [l.colDetails, l.colEvent, l.colRef, l.colActor, l.colOccurred]) {
      expect(screen.getByRole("columnheader", { name: header }), header).toBeInTheDocument();
    }
    for (const text of [l.eventType, l.refType, l.refId]) expectLabelled(text, text === l.refType ? "SELECT" : "INPUT");
    expect(screen.getByLabelText(l.eventType)).toHaveAttribute("placeholder", l.any);
    expect(screen.getByRole("option", { name: l.any })).toBeInTheDocument();
    expect(screen.getByText(l.pageSummary(1, 3, 120))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: l.prev })).toBeDisabled();
    expect(screen.getByRole("button", { name: l.next })).toBeEnabled();
    expect(screen.getByRole("button", { name: new RegExp(l.alertOff) })).toHaveAttribute("title", l.alertToggleTitle);
    // The date follows the app language (Arabic month name, Western digits).
    expect(screen.getByText(/أيلول|سبتمبر/)).toBeInTheDocument();

    for (const english of ["Audit ledger", "Supplier balance reconciliation", "Event type", "Ref type", "Ref id", "Event", "Ref", "Actor", "Occurred", "any", "Silent", "Run reconcile", "← Prev", "Next →"]) {
      expect(screen.queryByText(english), english).toBeNull();
    }
    expect(englishLeft(container, DATA)).toEqual([]);
  });

  it("the no-English check is not vacuous: it flags the English render", () => {
    const { container } = renderPage("en");
    expect(englishLeft(container, DATA)).toEqual(expect.arrayContaining(["Audit ledger", "Event type", "exact UUID", "Run reconcile", "Next →"]));
  });

  it("places the table name inside the Arabic sentence, in monospace", () => {
    renderPage("ar");
    const table = screen.getByText("supplier_balances");
    expect(table).toHaveClass("font-mono");
    const [before, after] = ar.inventoryLedger.reconcileHelp.split("{table}");
    expect(table.parentElement).toHaveTextContent(`${before}supplier_balances${after}`.replace(/\s+/g, " "));
    expect(table.parentElement?.textContent).not.toContain("{table}");
  });

  it("keeps event codes, reference types and the payload exactly as recorded", () => {
    renderPage("ar");
    expect(screen.getByText("SUPPLIER_PAYMENT_CASH")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "gold_lot" })).toBeInTheDocument();
    fireEvent.click(screen.getByText("SUPPLIER_PAYMENT_CASH"));
    expect(screen.getByText(/"amount": "100.00"/)).toBeInTheDocument();
  });

  it("reports drifts in Arabic, with the unit labels translated", async () => {
    api.get.mockResolvedValue(drifted);
    const { container } = renderPage("ar");
    const l = ar.inventoryLedger;
    fireEvent.click(screen.getByRole("button", { name: l.runReconcile }));
    expect(await screen.findByText(l.driftsDetected(2))).toBeInTheDocument();
    expect(screen.getByText(l.discordAlerted)).toBeInTheDocument();
    const drifts = screen.getAllByRole("table")[0];
    for (const header of [l.colSupplier, l.colUnit, l.colStored, l.colComputed, l.colDrift]) {
      expect(within(drifts).getByRole("columnheader", { name: header }), header).toBeInTheDocument();
    }
    expect(within(drifts).getByText(l.unitCash)).toBeInTheDocument();
    expect(within(drifts).getByText(l.unitGold("21"))).toBeInTheDocument();
    expect(within(drifts).queryByText("CASH")).toBeNull();
    expect(englishLeft(container, DATA)).toEqual([]);
  });

  it("reports a clean reconcile and a failed one in Arabic", async () => {
    api.get.mockResolvedValueOnce({ drift_count: 0, discord_alerted: true, supplier_balance_drifts: [] });
    renderPage("ar");
    const l = ar.inventoryLedger;
    fireEvent.click(screen.getByRole("button", { name: l.runReconcile }));
    expect(await screen.findByText(l.allReconciled)).toBeInTheDocument();
    expect(screen.getByText(l.noAlertNeeded)).toBeInTheDocument();

    api.get.mockRejectedValueOnce("offline");
    fireEvent.click(screen.getByRole("button", { name: l.runReconcile }));
    expect(await screen.findByRole("alert")).toHaveTextContent(l.reconcileFailed);
  });

  it("translates the empty state", () => {
    swr.data = { items: [], total: 0, page: 1, page_size: 50 };
    renderPage("ar");
    expect(screen.getByText(ar.inventoryLedger.noEvents)).toBeInTheDocument();
  });
});

describe("the inventoryLedger namespace is translated, not English placeholders", () => {
  it("every ar.inventoryLedger key differs from English and is written in Arabic", () => {
    const english = new Map(leaves(en.inventoryLedger, "inventoryLedger"));
    const untranslated = leaves(ar.inventoryLedger, "inventoryLedger")
      .filter(([path, value]) => value === english.get(path) || !/[؀-ۿ]/.test(value))
      .map(([path]) => path);
    expect(untranslated).toEqual([]);
  });

  it("both languages keep the {table} token the page splits on", () => {
    expect(en.inventoryLedger.reconcileHelp.split("{table}")).toHaveLength(2);
    expect(ar.inventoryLedger.reconcileHelp.split("{table}")).toHaveLength(2);
  });
});

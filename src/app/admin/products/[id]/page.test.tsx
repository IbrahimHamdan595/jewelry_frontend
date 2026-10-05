import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import EditProductPage from "@/app/admin/products/[id]/page";
import { LanguageProvider } from "@/context/LanguageContext";
import ar from "@/i18n/ar";

const swr = vi.hoisted(() => ({ data: undefined as unknown }));
vi.mock("swr", () => ({ default: () => ({ data: swr.data, error: undefined, isLoading: false, isValidating: false, mutate: vi.fn(() => Promise.resolve()) }) }));
vi.mock("next/navigation", () => ({ useParams: () => ({ id: "p1" }), useRouter: () => ({ push: vi.fn() }) }));
const api = vi.hoisted(() => ({ post: vi.fn(() => Promise.resolve({})), patch: vi.fn(() => Promise.resolve({})) }));
vi.mock("@/lib/api-client", () => ({ apiFetcher: vi.fn(), api }));
// The form has its own tests (ProductForm.test.tsx); this file is about the page around it.
vi.mock("@/components/admin/ProductForm", () => ({ ProductForm: () => null }));

const product = (over: Record<string, unknown>) => ({
  id: "p1", code: "RNG-0042", name_en: "Twisted Ring", name_ar: "خاتم مجدول", category: "Rings", category_id: "c1",
  karat: "K21", weight_grams: 4.25, margin_percent: 10, making_charge: 15, photos: [], is_active: true,
  on_hand_qty: 1, min_stock_qty: null, is_used: true, cost_basis_usd: 250, status: "AVAILABLE",
  source_ref_type: "BUYBACK", source_ref_id: "3f2a9c1b-0000-4000-8000-000000000001",
  stone_value_usd: 120, stone_cost_usd: 80, stone_carats: 0.5, stone_count: 3, stone_cert: "GIA-123456", stone_note: "VS1 clarity",
  created_at: "2026-09-05T10:00:00Z", updated_at: "2026-09-05T10:00:00Z", ...over,
});

// Database values: the product code, the backend's source reference, the
// certificate number and the note a member of staff typed.
const DATA = ["RNG-0042", "BUYBACK", "3f2a9c1b", "GIA-123456", "VS1 clarity"];

/** Text a user reads or a screen reader announces, minus the given data values. */
function englishLeft(root: HTMLElement): string[] {
  const found: string[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) found.push(walker.currentNode.textContent ?? "");
  root.querySelectorAll("[placeholder],[title],[aria-label],[alt]").forEach((el) => {
    for (const attr of ["placeholder", "title", "aria-label", "alt"]) found.push(el.getAttribute(attr) ?? "");
  });
  return found
    .map((text) => DATA.reduce((rest, value) => rest.split(value).join(""), text).trim())
    .filter((text) => /[A-Za-z]{2,}/.test(text));
}

/** globals.css lays .font-mono out left-to-right in RTL: fine for codes, wrong for Arabic words. */
function arabicInMono(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll(".font-mono")).map((el) => el.textContent ?? "").filter((text) => /[\u0600-\u06FF]/.test(text));
}

function renderPage(lang: "en" | "ar", data: unknown = product({})) {
  swr.data = data;
  return render(<LanguageProvider initialLang={lang}><EditProductPage /></LanguageProvider>);
}

describe("product detail in Arabic (NEX-64)", () => {
  beforeEach(() => api.post.mockClear());

  it("leaves no English behind: heading, status, stone details, melt card", () => {
    const { container } = renderPage("ar");
    for (const english of ["AVAILABLE", "Used", "Stone / Diamond Details", "Carats:", "Stone count:", "Certificate:", "Stone value:", "Note:", "Melt this piece into a pure-gold lot", "Melt"]) {
      expect(screen.queryByText(english), english).toBeNull();
    }
    expect(screen.getByRole("heading", { name: `${ar.products.usedProduct} — RNG-0042` })).toBeInTheDocument();
    expect(screen.getByText(ar.products.status.AVAILABLE)).toBeInTheDocument();
    expect(screen.getByText(ar.products.meltHint("K21", "4.250"))).toBeInTheDocument();
    expect(englishLeft(container)).toEqual([]);
  });

  it("keeps Arabic out of left-to-right monospace runs: only the source reference is isolated", () => {
    const { container } = renderPage("ar");
    const reference = screen.getByText("BUYBACK:3f2a9c1b…");
    expect(reference).toHaveClass("font-mono");
    const sentence = reference.parentElement as HTMLElement;
    expect(sentence).not.toHaveClass("font-mono");
    expect(sentence).toHaveTextContent(ar.products.sourceFrom("BUYBACK:3f2a9c1b…"));
    fireEvent.click(screen.getByRole("button", { name: ar.products.melt }));
    expect(arabicInMono(container)).toEqual([]);
  });

  it("explains in Arabic why a sold piece cannot be melted, with the status translated", () => {
    const { container } = renderPage("ar", product({ status: "SOLD" }));
    expect(screen.getByText(ar.products.meltOnlyWhen(ar.products.status.SOLD))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: ar.products.melt })).toBeDisabled();
    expect(englishLeft(container)).toEqual([]);
  });

  it("melt dialog: every field is reachable by its label, and each label's control is its field", () => {
    const { container } = renderPage("ar");
    fireEvent.click(screen.getByRole("button", { name: ar.products.melt }));
    const fields: [string, string][] = [[ar.products.overrideWeight, "INPUT"], [ar.products.overrideKarat, "SELECT"], [ar.zakat.notesOptional, "INPUT"]];
    for (const [text, tag] of fields) {
      const field = screen.getByLabelText(text);
      expect(field.tagName, text).toBe(tag);
      const label = screen.getByText(text).closest("label") as HTMLLabelElement;
      expect(label.control, text).toBe(field);
    }
    expect(screen.getByLabelText(ar.products.overrideWeight)).toHaveAttribute("placeholder", ar.products.keep("4.250"));
    expect(screen.getByRole("option", { name: ar.products.keep("K21") })).toBeInTheDocument();
    expect(englishLeft(container)).toEqual([]);
  });

  it("melt dialog: the new status stays a styled word inside the Arabic sentence (monospace in LTR only)", () => {
    renderPage("ar");
    fireEvent.click(screen.getByRole("button", { name: ar.products.melt }));
    const status = screen.getByText(ar.products.status.MELTED);
    expect(status).toHaveClass("ltr:font-mono");
    expect(status.parentElement).toHaveTextContent(ar.products.meltStatusNote(ar.products.status.MELTED));
  });

  it("melt dialog still posts what was entered", async () => {
    renderPage("ar");
    fireEvent.click(screen.getByRole("button", { name: ar.products.melt }));
    fireEvent.change(screen.getByLabelText(ar.products.overrideWeight), { target: { value: "4.1" } });
    fireEvent.change(screen.getByLabelText(ar.products.overrideKarat), { target: { value: "K18" } });
    fireEvent.change(screen.getByLabelText(ar.zakat.notesOptional), { target: { value: "VS1 clarity" } });
    fireEvent.click(screen.getByRole("button", { name: ar.products.confirmMelt }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith("/melts", { product_id: "p1", override_weight_grams: "4.1", override_karat: "K18", notes: "VS1 clarity" }));
  });
});

describe("product detail in English is unchanged", () => {
  it("keeps the original wording, including the composed melt sentences", () => {
    renderPage("en", product({ status: "SOLD" }));
    expect(screen.getByRole("heading", { name: "Used Product — RNG-0042" })).toBeInTheDocument();
    expect(screen.getByText("SOLD")).toBeInTheDocument();
    expect(screen.getByText("Cost basis:")).toHaveTextContent("Cost basis: $250.00");
    expect(screen.getByText("BUYBACK:3f2a9c1b…").parentElement).toHaveTextContent("from BUYBACK:3f2a9c1b…");
    expect(screen.getByText("BUYBACK:3f2a9c1b…").parentElement).toHaveClass("ltr:font-mono");
    expect(screen.getByText("Carats:").parentElement).toHaveTextContent("Carats: 0.5 ct");
    expect(screen.getByText("Reduces the piece to K21 weight 4.250g and creates a new lot.", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("Only AVAILABLE or INACTIVE products can be melted (status: SOLD).")).toBeInTheDocument();
  });

  it("keeps the melt dialog's wording", () => {
    renderPage("en");
    fireEvent.click(screen.getByRole("button", { name: "Melt" }));
    expect(screen.getByText("Melt RNG-0042")).toBeInTheDocument();
    expect(screen.getByText("MELTED").parentElement).toHaveTextContent(
      "Current: K21 · 4.250g. Product status will flip to MELTED; a new lot is created.",
    );
    expect(screen.getByLabelText("Override weight (g)")).toHaveAttribute("placeholder", "(keep 4.250)");
    expect(screen.getByRole("option", { name: "(keep K21)" })).toBeInTheDocument();
    expect(screen.getByLabelText("Notes (optional)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm melt" })).toBeInTheDocument();
  });
});

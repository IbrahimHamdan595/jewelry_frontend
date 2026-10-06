import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import CategoriesPage from "@/app/admin/categories/page";
import { ApiError } from "@/lib/api-client";
import { LanguageProvider } from "@/context/LanguageContext";
import en from "@/i18n/en";
import ar from "@/i18n/ar";

const swr = vi.hoisted(() => ({ categories: undefined as unknown }));
const api = vi.hoisted(() => ({ post: vi.fn(), patch: vi.fn(), delete: vi.fn() }));
vi.mock("swr", () => ({
  default: () => ({ data: swr.categories, error: undefined, isLoading: false, isValidating: false, mutate: vi.fn() }),
}));
vi.mock("@/lib/api-client", async (orig) => ({ ...(await orig<typeof import("@/lib/api-client")>()), apiFetcher: vi.fn(), api }));
// The confirm dialog is a shared component with its own copy (not part of this
// slice). Stand in for it so these tests only speak for the categories screen.
vi.mock("@/components/admin/ConfirmDeleteDialog", () => ({
  ConfirmDeleteDialog: ({ open, error, onConfirm }: { open: boolean; error: string | null; onConfirm: () => void }) =>
    open ? (
      <div role="dialog">
        <button onClick={onConfirm}>confirm-delete</button>
        {error && <p role="alert">{error}</p>}
      </div>
    ) : null,
}));

// GET /categories?include_inactive=true as the backend sends it
// (jewelry_backend/app/api/categories.py): ordered by name_en, uuid4 hex ids,
// name_ar "" when none was given.
const BRACELETS = { id: "ca000000000040008000000000000002", name_en: "Bracelets", name_ar: "", slug: "bracelets", is_active: false, created_at: "2026-09-05T10:00:00Z" };
const RINGS = { id: "ca000000000040008000000000000001", name_en: "Rings", name_ar: "خواتم", slug: "rings", is_active: true, created_at: "2026-09-05T10:00:00Z" };
const CATEGORIES = [BRACELETS, RINGS];
// The messages the backend really answers with (409s from create and hard delete).
const SLUG_TAKEN = "Category slug already exists";
const IN_USE = "Cannot permanently delete: this category is used by products. Reassign or deactivate instead.";
// Category names and slugs come from the database, and so do server messages: data, left as received.
const DATA = ["Rings", "Bracelets", "rings", "bracelets", "Necklaces", "necklaces", SLUG_TAKEN, IN_USE];

type Dict = typeof en;
function renderPage(lang: "en" | "ar") {
  return render(<LanguageProvider initialLang={lang}><CategoriesPage /></LanguageProvider>);
}
/** One of the three per-row buttons, found by the name it has for that row. */
const rowButton = (dict: Dict, action: string, name: string) => screen.getByRole("button", { name: dict.categories.rowAction(action, name) });

/** The field a label names, checked both ways: by its text and through label.control. */
function expectLabelled(text: string) {
  const control = screen.getByLabelText(text);
  const label = control.closest("label") as HTMLLabelElement;
  expect(label, text).not.toBeNull();
  expect(label.control, text).toBe(control);
  return control;
}

/** Everything a user reads or hears: text nodes plus placeholder, title, aria-label and alt. */
function uiStrings(): string[] {
  const out: string[] = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) out.push(walker.currentNode.textContent ?? "");
  document.body.querySelectorAll("*").forEach((el) => {
    for (const attr of ["placeholder", "title", "aria-label", "alt"]) {
      const value = el.getAttribute(attr);
      if (value) out.push(value);
    }
  });
  return out.map((s) => s.trim()).filter(Boolean);
}
/** A run of two or more Latin letters is a word. Data is set aside first. */
const hasEnglishWord = (s: string) => /[A-Za-z]{2,}/.test(DATA.reduce((rest, datum) => rest.split(datum).join(""), s));

/** Elements whose classes pin a side (text-left, ml-2, pr-4, right-0 …) instead of following the reading direction. */
function physicalClasses(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll("[class]"))
    .map((el) => el.getAttribute("class") ?? "")
    .filter((classes) => /(^|\s)(text-(left|right)|-?m[lr]-\S+|p[lr]-\S+|-?(left|right)-\S+)(\s|$)/.test(classes));
}

beforeEach(() => {
  swr.categories = CATEGORIES;
  api.post.mockReset();
  api.patch.mockReset();
  api.delete.mockReset();
});

describe("categories labels (NEX-64)", () => {
  it("every field in the category form is reachable by its label", () => {
    renderPage("en");
    fireEvent.click(screen.getByRole("button", { name: en.categories.addCategory }));
    for (const text of [en.common.nameEn, en.common.nameAr, en.categories.slug]) expectLabelled(text);
    const controls = Array.from(document.querySelectorAll<HTMLInputElement>("input, select, textarea"));
    expect(controls).toHaveLength(3);
    for (const control of controls) expect(control.labels?.length, control.outerHTML).toBe(1);
  });

  it("still derives the slug from the English name", () => {
    renderPage("en");
    fireEvent.click(screen.getByRole("button", { name: en.categories.addCategory }));
    fireEvent.change(screen.getByLabelText(en.common.nameEn), { target: { value: "Gold Chains" } });
    expect(screen.getByLabelText(en.categories.slug)).toHaveValue("gold-chains");
  });

  it("names each row's three buttons after the row's category", () => {
    renderPage("ar");
    const c = ar.categories;
    expect(rowButton(ar, ar.common.edit, "Rings")).toBeInTheDocument();
    expect(rowButton(ar, ar.common.edit, "Bracelets")).toBeInTheDocument();
    expect(rowButton(ar, c.deactivate, "Rings")).toBeInTheDocument();
    expect(rowButton(ar, c.activate, "Bracelets")).toBeInTheDocument();
    // The tooltip stays the short action name.
    expect(rowButton(ar, c.deletePermanently, "Rings")).toHaveAttribute("title", c.deletePermanently);
    expect(rowButton(ar, c.deletePermanently, "Bracelets")).toHaveAttribute("title", c.deletePermanently);
    const names = within(screen.getByRole("table")).getAllByRole("button").map((button) => button.getAttribute("aria-label"));
    expect(names).toHaveLength(6);
    expect(new Set(names).size).toBe(6);
    expect(screen.getByRole("columnheader", { name: ar.common.actions })).toBeInTheDocument();
  });
});

describe("categories in Arabic (NEX-64)", () => {
  it("leaves no English behind — list and new-category form", () => {
    renderPage("ar");
    fireEvent.click(screen.getByRole("button", { name: ar.categories.addCategory }));
    for (const english of ["Categories", "Add Category", "New Category", "Name (English)", "Name (Arabic)", "Slug", "Save", "Cancel", "Name", "Status", "Active", "Inactive"]) {
      expect(screen.queryByText(english), english).toBeNull();
    }
    expect(screen.queryByPlaceholderText("auto-generated from name")).toBeNull();
    expect(screen.getByRole("heading", { name: ar.categories.title })).toBeInTheDocument();
    expect(screen.getByText(ar.categories.newCategory)).toBeInTheDocument();
    expect(screen.getByLabelText(ar.categories.slug)).toHaveAttribute("placeholder", ar.categories.slugPlaceholder);
    expect(screen.getByText(ar.categories.active)).toBeInTheDocument();
    expect(screen.getByText(ar.categories.inactive)).toBeInTheDocument();
    expect(uiStrings().filter(hasEnglishWord)).toEqual([]);
  });

  it("titles the form for an edit", () => {
    renderPage("ar");
    fireEvent.click(rowButton(ar, ar.common.edit, "Rings"));
    expect(screen.getByText(ar.categories.editCategory)).toBeInTheDocument();
    expect(screen.getByLabelText(ar.categories.slug)).toHaveValue("rings");
    expect(uiStrings().filter(hasEnglishWord)).toEqual([]);
  });

  it("keeps slugs left-to-right, and the translated placeholder out of monospace", () => {
    renderPage("ar");
    const slug = screen.getByText("rings");
    expect(slug.closest("bdi")).toHaveAttribute("dir", "ltr");
    expect(slug.closest("td")).toHaveClass("font-mono");
    // .font-mono is laid out left-to-right in RTL; the field's placeholder is an Arabic phrase.
    fireEvent.click(screen.getByRole("button", { name: ar.categories.addCategory }));
    const field = screen.getByLabelText(ar.categories.slug);
    expect(field).toHaveClass("ltr:font-mono");
    expect(field).not.toHaveClass("font-mono");
  });

  it("follows the reading direction: logical utilities only, switches mirrored", () => {
    const { container } = renderPage("ar");
    fireEvent.click(screen.getByRole("button", { name: ar.categories.addCategory }));
    expect(physicalClasses(container)).toEqual([]);
    // The on/off switches are the only directional icons here.
    const toggles = container.querySelectorAll("svg[class*='lucide-toggle-']");
    expect(toggles).toHaveLength(2);
    toggles.forEach((icon) => expect(icon).toHaveClass("rtl:rotate-180"));
    expect(container.querySelector("svg[class*='lucide-arrow-'], svg[class*='lucide-chevron-left'], svg[class*='lucide-chevron-right']")).toBeNull();
    expect(screen.getByRole("columnheader", { name: ar.categories.slug })).toHaveClass("text-start");
    // The Arabic-name field is right-to-left by itself; its text starts at its own start.
    expect(screen.getByLabelText(ar.common.nameAr)).toHaveAttribute("dir", "rtl");
    expect(screen.getByLabelText(ar.common.nameAr)).toHaveClass("text-start");
  });

  it("translates the empty and the loading states", () => {
    swr.categories = [];
    const { unmount } = renderPage("ar");
    expect(screen.getByText(ar.categories.empty)).toBeInTheDocument();
    expect(uiStrings().filter(hasEnglishWord)).toEqual([]);
    unmount();

    swr.categories = undefined;
    const { container } = renderPage("ar");
    for (const header of [ar.common.name, ar.categories.slug, ar.common.status, ar.common.actions]) {
      expect(screen.getByRole("columnheader", { name: header }), header).toBeInTheDocument();
    }
    expect(uiStrings().filter(hasEnglishWord)).toEqual([]);
    expect(physicalClasses(container)).toEqual([]);
  });
});

describe("categories — a failed save is no longer silent (NEX-64)", () => {
  it("announces the failure, keeps the form and what was typed, and lets the user try again", async () => {
    api.post.mockRejectedValueOnce(new ApiError(409, SLUG_TAKEN));
    renderPage("ar");
    fireEvent.click(screen.getByRole("button", { name: ar.categories.addCategory }));
    fireEvent.change(screen.getByLabelText(ar.common.nameEn), { target: { value: "Rings" } });
    fireEvent.click(screen.getByRole("button", { name: ar.common.save }));

    // The server's own message, as received, in an alert.
    expect(await screen.findByRole("alert")).toHaveTextContent(SLUG_TAKEN);
    expect(api.post).toHaveBeenCalledWith("/categories", { name_en: "Rings", name_ar: "", slug: "rings" });
    expect(screen.getByLabelText(ar.common.nameEn)).toHaveValue("Rings");
    expect(screen.getByRole("button", { name: ar.common.save })).toBeEnabled();
    expect(uiStrings().filter(hasEnglishWord)).toEqual([]);

    // Fix the name and save again: the alert clears and the form closes.
    api.post.mockResolvedValueOnce({ ...RINGS, id: "ca000000000040008000000000000003", name_en: "Necklaces", slug: "necklaces" });
    fireEvent.change(screen.getByLabelText(ar.common.nameEn), { target: { value: "Necklaces" } });
    fireEvent.click(screen.getByRole("button", { name: ar.common.save }));
    await waitFor(() => expect(screen.queryByLabelText(ar.common.nameEn)).toBeNull());
    expect(screen.queryByRole("alert")).toBeNull();
    expect(api.post).toHaveBeenLastCalledWith("/categories", { name_en: "Necklaces", name_ar: "", slug: "necklaces" });
  });

  it("does not carry an old failure into the next time the form opens", async () => {
    api.patch.mockRejectedValueOnce(new ApiError(409, SLUG_TAKEN));
    renderPage("en");
    fireEvent.click(rowButton(en, en.common.edit, "Rings"));
    fireEvent.click(screen.getByRole("button", { name: en.common.save }));
    expect(await screen.findByRole("alert")).toHaveTextContent(SLUG_TAKEN);
    expect(api.patch).toHaveBeenCalledWith(`/categories/${RINGS.id}`, { name_en: "Rings", name_ar: "خواتم", slug: "rings" });
    fireEvent.click(rowButton(en, en.common.edit, "Bracelets"));
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("categories — a refused delete", () => {
  it("shows the server's reason in the confirm dialog", async () => {
    api.delete.mockRejectedValueOnce(new ApiError(409, IN_USE));
    renderPage("ar");
    fireEvent.click(rowButton(ar, ar.categories.deletePermanently, "Rings"));
    fireEvent.click(screen.getByRole("button", { name: "confirm-delete" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(IN_USE);
    expect(api.delete).toHaveBeenCalledWith(`/categories/${RINGS.id}?hard=true`);
  });
});

describe("categories in English is unchanged", () => {
  it("keeps the copy the screen had before the strings moved", () => {
    renderPage("en");
    expect(screen.getByRole("heading", { name: "Categories" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add Category" }));
    expect(screen.getByText("New Category")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("auto-generated from name")).toHaveClass("ltr:font-mono");
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();
    fireEvent.click(rowButton(en, "Edit", "Rings"));
    expect(screen.getByText("Edit Category")).toBeInTheDocument();
    // The sweep the Arabic tests rely on does see this screen's copy.
    expect(uiStrings().filter(hasEnglishWord).length).toBeGreaterThan(15);
  });
});

describe("categories dictionary is translated, not English placeholders", () => {
  const strings = (dict: typeof en.categories) => ({ ...dict, rowAction: dict.rowAction(dict.deletePermanently, "Rings") });
  const english = strings(en.categories) as Record<string, string>;
  const arabic = strings(ar.categories) as Record<string, string>;

  it("every ar.categories string contains Arabic and differs from English", () => {
    const keys = Object.keys(english);
    expect(keys.length).toBe(16);
    for (const key of keys) {
      expect(arabic[key], key).toMatch(/[\u0600-\u06FF]/);
      expect(arabic[key], key).not.toBe(english[key]);
    }
  });
});

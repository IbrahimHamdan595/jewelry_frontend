import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CategoriesPage from "@/app/admin/categories/page";
import { LanguageProvider } from "@/context/LanguageContext";
import en from "@/i18n/en";
import ar from "@/i18n/ar";

const swr = vi.hoisted(() => ({ categories: undefined as unknown }));
const api = vi.hoisted(() => ({ post: vi.fn(), patch: vi.fn(), delete: vi.fn() }));
vi.mock("swr", () => ({
  default: () => ({ data: swr.categories, error: undefined, isLoading: false, isValidating: false, mutate: vi.fn() }),
}));
vi.mock("@/lib/api-client", () => ({ apiFetcher: vi.fn(), api }));
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

const CATEGORIES = [
  { id: "k1", name_en: "Rings", name_ar: "خواتم", slug: "rings", is_active: true, created_at: "2026-09-05T10:00:00Z" },
  { id: "k2", name_en: "Bracelets", name_ar: "", slug: "bracelets", is_active: false, created_at: "2026-09-05T10:00:00Z" },
];
// Category names and slugs come from the database: data, left as stored in either language.
const DATA = ["Rings", "Bracelets", "rings", "bracelets"];

function renderPage(lang: "en" | "ar") {
  return render(<LanguageProvider initialLang={lang}><CategoriesPage /></LanguageProvider>);
}

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

beforeEach(() => {
  swr.categories = CATEGORIES;
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

  it("names every icon-only row button and the empty header cell", () => {
    renderPage("ar");
    expect(screen.getAllByRole("button", { name: ar.common.edit })).toHaveLength(2);
    expect(screen.getByRole("button", { name: ar.categories.deactivate })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: ar.categories.activate })).toBeInTheDocument();
    const del = screen.getAllByRole("button", { name: ar.categories.deletePermanently });
    expect(del).toHaveLength(2);
    expect(del[0]).toHaveAttribute("title", ar.categories.deletePermanently);
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

  it("titles the form for an edit and keeps the slug left-to-right", () => {
    renderPage("ar");
    fireEvent.click(screen.getAllByRole("button", { name: ar.common.edit })[0]);
    expect(screen.getByText(ar.categories.editCategory)).toBeInTheDocument();
    expect(screen.getByLabelText(ar.categories.slug)).toHaveValue("rings");
    expect(screen.getByText("rings")).toHaveClass("font-mono");
    expect(uiStrings().filter(hasEnglishWord)).toEqual([]);
  });

  it("translates the empty and the loading states", () => {
    swr.categories = [];
    const { unmount } = renderPage("ar");
    expect(screen.getByText(ar.categories.empty)).toBeInTheDocument();
    expect(uiStrings().filter(hasEnglishWord)).toEqual([]);
    unmount();

    swr.categories = undefined;
    renderPage("ar");
    for (const header of [ar.common.name, ar.categories.slug, ar.common.status, ar.common.actions]) {
      expect(screen.getByRole("columnheader", { name: header }), header).toBeInTheDocument();
    }
    expect(uiStrings().filter(hasEnglishWord)).toEqual([]);
  });

  it("translates the fallback delete error; a server message is shown as received", async () => {
    api.delete.mockRejectedValueOnce("boom");
    renderPage("ar");
    fireEvent.click(screen.getAllByRole("button", { name: ar.categories.deletePermanently })[0]);
    fireEvent.click(screen.getByRole("button", { name: "confirm-delete" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(ar.categories.deleteFailed);
    expect(api.delete).toHaveBeenCalledWith("/categories/k1?hard=true");

    api.delete.mockRejectedValueOnce(new Error("Category has products"));
    fireEvent.click(screen.getByRole("button", { name: "confirm-delete" }));
    expect(await screen.findByText("Category has products")).toBeInTheDocument();
  });
});

describe("categories in English is unchanged", () => {
  it("keeps the copy the screen had before the strings moved", () => {
    renderPage("en");
    expect(screen.getByRole("heading", { name: "Categories" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add Category" }));
    expect(screen.getByText("New Category")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("auto-generated from name")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    expect(screen.getByText("Edit Category")).toBeInTheDocument();
    // The sweep the Arabic tests rely on does see this screen's copy.
    expect(uiStrings().filter(hasEnglishWord).length).toBeGreaterThan(15);
  });
});

describe("categories dictionary is translated, not English placeholders", () => {
  it("every ar.categories string contains Arabic and differs from English", () => {
    const keys = Object.keys(en.categories) as (keyof typeof en.categories)[];
    expect(keys.length).toBe(14);
    for (const key of keys) {
      expect(ar.categories[key], key).toMatch(/[\u0600-\u06FF]/);
      expect(ar.categories[key], key).not.toBe(en.categories[key]);
    }
  });
});

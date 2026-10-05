import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import SupplierPurchaseReceiptPage from "@/app/admin/suppliers/purchases/[id]/receipt/page";
import { LanguageProvider } from "@/context/LanguageContext";
import en from "@/i18n/en";
import ar from "@/i18n/ar";

vi.mock("next/navigation", () => ({ useParams: () => ({ id: "p1" }) }));
const swr = vi.hoisted(() => ({ error: undefined as unknown }));
vi.mock("swr", () => ({ default: () => ({ data: undefined, error: swr.error, isLoading: !swr.error, isValidating: false, mutate: vi.fn() }) }));
vi.mock("@/lib/api-client", async (orig) => ({ ...(await orig<typeof import("@/lib/api-client")>()), apiFetcher: vi.fn() }));
// The receipt itself is a shared component with its own bilingual table.
vi.mock("@/components/shared/Receipt", () => ({ ReceiptScreen: () => null }));

/** Elements whose classes pin a side (text-left, ml-2, pr-4 …) instead of following the reading direction. */
function physicalClasses(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll("[class]"))
    .map((el) => el.getAttribute("class") ?? "")
    .filter((classes) => /(^|\s)(text-(left|right)|-?m[lr]-\S+|p[lr]-\S+)(\s|$)/.test(classes));
}

function renderPage(lang: "en" | "ar") {
  return render(<LanguageProvider initialLang={lang}><SupplierPurchaseReceiptPage /></LanguageProvider>);
}

describe("supplier purchase receipt i18n (NEX-64)", () => {
  beforeEach(() => {
    swr.error = undefined;
  });

  it("says it is loading in Arabic, not English", () => {
    const { container } = renderPage("ar");
    expect(screen.getByText(ar.supplierPurchase.loadingReceipt)).toBeInTheDocument();
    expect(screen.queryByText(en.supplierPurchase.loadingReceipt)).toBeNull();
    expect(container.textContent).not.toMatch(/[A-Za-z]/);
  });

  it("keeps the English wording in English", () => {
    renderPage("en");
    expect(screen.getByText("Loading receipt…")).toBeInTheDocument();
  });

  it("shows a failed load in Arabic too", () => {
    swr.error = new Error("500");
    const { container } = renderPage("ar");
    expect(screen.getByRole("alert")).toHaveTextContent(ar.errors.loadFailed);
    expect(screen.getByRole("button", { name: ar.errors.tryAgain })).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/[A-Za-z]/);
  });

  it("has nothing that pins a side: no physical direction utility, no directional icon", () => {
    for (const error of [undefined, new Error("500")]) {
      swr.error = error;
      const { container, unmount } = renderPage("ar");
      expect(physicalClasses(container)).toEqual([]);
      expect(container.querySelector("svg[class*='lucide-chevron-'], svg[class*='lucide-arrow-']")).toBeNull();
      unmount();
    }
  });
});

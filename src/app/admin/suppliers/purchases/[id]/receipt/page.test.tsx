import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import SupplierPurchaseReceiptPage from "@/app/admin/suppliers/purchases/[id]/receipt/page";
import { LanguageProvider } from "@/context/LanguageContext";
import en from "@/i18n/en";
import ar from "@/i18n/ar";

vi.mock("next/navigation", () => ({ useParams: () => ({ id: "p1" }) }));
vi.mock("swr", () => ({ default: () => ({ data: undefined, error: undefined, isLoading: true, isValidating: true, mutate: vi.fn() }) }));
vi.mock("@/lib/api-client", () => ({ apiFetcher: vi.fn() }));
// The receipt itself is a shared component with its own bilingual table.
vi.mock("@/components/shared/Receipt", () => ({ ReceiptScreen: () => null }));

describe("supplier purchase receipt i18n (NEX-64)", () => {
  it("says it is loading in Arabic, not English", () => {
    render(<LanguageProvider initialLang="ar"><SupplierPurchaseReceiptPage /></LanguageProvider>);
    expect(screen.getByText(ar.supplierPurchase.loadingReceipt)).toBeInTheDocument();
    expect(screen.queryByText(en.supplierPurchase.loadingReceipt)).toBeNull();
  });

  it("keeps the English wording in English", () => {
    render(<LanguageProvider initialLang="en"><SupplierPurchaseReceiptPage /></LanguageProvider>);
    expect(screen.getByText("Loading receipt…")).toBeInTheDocument();
  });
});

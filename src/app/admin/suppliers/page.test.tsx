import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import SuppliersPage from "@/app/admin/suppliers/page";
import { LanguageProvider } from "@/context/LanguageContext";

const supplier = { id: "s1", name: "Abu Ali", contact_name: null, phone: "+961-00-555555", email: null, payment_terms: "net 30, gold-for-gold preferred", is_active: true };
vi.mock("swr", () => ({ default: (key: string) => ({ data: key?.startsWith("/suppliers") ? { items: [supplier], total: 1 } : undefined, error: undefined, isLoading: false, isValidating: false, mutate: vi.fn() }) }));
vi.mock("@/lib/api-client", () => ({ apiFetcher: vi.fn(), api: { post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));

describe("suppliers list in Arabic (NEX-63)", () => {
  it("keeps the phone number left-to-right and intact", () => {
    render(<LanguageProvider initialLang="ar"><SuppliersPage /></LanguageProvider>);
    const phone = screen.getByText("+961-00-555555");
    expect(phone.closest("bdi")).toHaveAttribute("dir", "ltr");
  });
});

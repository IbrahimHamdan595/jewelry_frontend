import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { LanguageProvider } from "@/context/LanguageContext";
import ar from "@/i18n/ar";
import type { OrderStatus } from "@/types/api";

// The OrderStatus enum as the API sends it (app/models: OrderStatus).
const STATUSES: OrderStatus[] = ["COMPLETED", "PARTIALLY_REFUNDED", "REFUNDED", "VOIDED"];

describe("StatusBadge (NEX-64)", () => {
  it.each(STATUSES)("%s is named in Arabic, with no English left", (status) => {
    const { container } = render(<LanguageProvider initialLang="ar"><StatusBadge status={status} /></LanguageProvider>);
    expect(screen.getByText(ar.orders.status[status])).toBeInTheDocument();
    expect(container.textContent).toMatch(/[؀-ۿ]/);
    expect(container.textContent).not.toMatch(/[A-Za-z]/);
  });

  it.each([
    ["COMPLETED", "completed"],
    ["PARTIALLY_REFUNDED", "partially refunded"],
    ["REFUNDED", "refunded"],
    ["VOIDED", "voided"],
  ] as const)("%s keeps its English wording and its colour", (status, wording) => {
    render(<StatusBadge status={status} />);
    const badge = screen.getByText(wording);
    expect(badge).toHaveClass("uppercase");
    expect(badge.className).toMatch(/text-status-(completed|refunded|voided)/);
  });

  it("a status this build has no name for is shown readably rather than dropped", () => {
    render(<LanguageProvider initialLang="ar"><StatusBadge status={"ON_HOLD" as OrderStatus} /></LanguageProvider>);
    expect(screen.getByText("on hold")).toBeInTheDocument();
  });
});

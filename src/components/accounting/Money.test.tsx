import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Money } from "@/components/accounting/Money";

describe("Money cell", () => {
  it("formats numeric strings from the accounting API to two decimals", () => {
    render(<Money value="12.3456" />);
    expect(screen.getByText("$12.35")).toBeInTheDocument();
  });

  it("treats null and empty as zero", () => {
    render(<Money value={null} />);
    expect(screen.getByText("$0.00")).toBeInTheDocument();
  });

  it("shows a dash for zero when asked", () => {
    render(<Money value={0} dash />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  // Alone in a table cell on an Arabic page, "-$70.00" has nothing strong to
  // lean on: the sign is a neutral character and drifts to the far side of the
  // digits. Every amount is isolated left-to-right, so its sign stays in front.
  it.each([
    ["-70", "-$70.00"],
    [-1234.5, "-$1,234.50"],
    ["412.10", "$412.10"],
  ])("isolates %j left-to-right as %s", (value, shown) => {
    render(<div dir="rtl"><Money value={value} /></div>);
    const amount = screen.getByText(shown);
    expect(amount.tagName).toBe("BDI");
    expect(amount).toHaveAttribute("dir", "ltr");
    expect(amount).toHaveClass("tabular-nums");
  });

  it("keeps a caller's classes on the amount", () => {
    render(<Money value="5" className="text-red-600" />);
    expect(screen.getByText("$5.00")).toHaveClass("tabular-nums", "text-red-600");
  });

  it("does not disguise a non-numeric value as $0.00", () => {
    render(<Money value="not-a-number" />);
    expect(screen.queryByText("$0.00")).toBeNull();
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});

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

  it("does not disguise a non-numeric value as $0.00", () => {
    render(<Money value="not-a-number" />);
    expect(screen.queryByText("$0.00")).toBeNull();
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Ltr } from "@/components/shared/Ltr";

describe("Ltr", () => {
  it("isolates a Latin identifier left-to-right inside RTL text, inline", () => {
    render(<p dir="rtl">هاتف: <Ltr>+961-00-555555</Ltr></p>);
    const el = screen.getByText("+961-00-555555");
    expect(el.tagName).toBe("BDI");
    expect(el).toHaveAttribute("dir", "ltr");
  });

  it("passes classes through", () => {
    render(<Ltr className="font-mono">ORD-20260905-002</Ltr>);
    expect(screen.getByText("ORD-20260905-002")).toHaveClass("font-mono");
  });
});

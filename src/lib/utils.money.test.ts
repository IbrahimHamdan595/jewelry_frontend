import { describe, it, expect } from "vitest";
import { formatUSD, formatLBP } from "@/lib/utils";

describe("formatUSD", () => {
  it("clamps to two decimals — the orders screen showed $20,572.483", () => {
    expect(formatUSD(20572.4833)).toBe("$20,572.48");
  });

  it("parses the strings the backend serialises money as", () => {
    expect(formatUSD("20572.4833")).toBe("$20,572.48");
    expect(formatUSD("1234.5")).toBe("$1,234.50");
  });

  it("always shows two decimals, even for whole amounts", () => {
    expect(formatUSD(0)).toBe("$0.00");
    expect(formatUSD(1234)).toBe("$1,234.00");
  });

  it("rounds half away from zero, not half-to-even (1.125 → 1.13; 0.125 → 0.13)", () => {
    // Both halves are exact in binary, so this tests the rounding mode, not float noise.
    expect(formatUSD(1.125)).toBe("$1.13");
    expect(formatUSD(0.125)).toBe("$0.13");
  });

  it("never renders NaN: a bad input shows a dash instead of a fake amount", () => {
    for (const bad of ["abc", "", "1,234.50", undefined, null, NaN, Infinity]) {
      expect(formatUSD(bad as never), String(bad)).toBe("—");
    }
  });
});

describe("formatLBP", () => {
  it("keeps lira at zero decimals", () => {
    expect(formatLBP(1234567.89)).toBe("ل.ل 1,234,568");
    expect(formatLBP("1500000")).toBe("ل.ل 1,500,000");
  });

  it("guards the conversion the same way", () => {
    expect(formatLBP("abc")).toBe("—");
    expect(formatLBP(undefined as never)).toBe("—");
  });
});

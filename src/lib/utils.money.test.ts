import { describe, it, expect } from "vitest";
import { formatUSD, formatLBP, formatRate, formatDecimal, toFiniteNumber, MISSING_AMOUNT } from "@/lib/utils";

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

// NEX-54: the backend is moving money from JSON numbers to exact decimal
// strings. Everything that reads an amount goes through these, so the screen
// is the same whichever shape arrives.
describe("toFiniteNumber — the one conversion at the API boundary", () => {
  it("reads a number and the decimal string for it as the same value", () => {
    expect(toFiniteNumber(141.66)).toBe(141.66);
    expect(toFiniteNumber("141.66")).toBe(141.66);
    expect(toFiniteNumber("0.00")).toBe(0);
    expect(toFiniteNumber("-12.50")).toBe(-12.5);
  });

  it("answers null — never NaN, never 0 — for anything that is not an amount", () => {
    for (const bad of ["abc", "", "  ", "1,234.50", undefined, null, NaN, Infinity, {}, [], true]) {
      expect(toFiniteNumber(bad), String(bad)).toBeNull();
    }
  });
});

describe("formatRate / formatDecimal — per-gram rates", () => {
  it("prints a number and its string form identically, two decimals, no grouping", () => {
    expect(formatRate(141.66)).toBe("$141.66");
    expect(formatRate("141.66")).toBe("$141.66");
    expect(formatRate(141.6)).toBe("$141.60");
    expect(formatRate("141.60")).toBe("$141.60");
    expect(formatRate(1234.5)).toBe("$1234.50");
    expect(formatDecimal(123.95)).toBe("123.95");
    expect(formatDecimal("123.95")).toBe("123.95");
    expect(formatDecimal("7.2", 3)).toBe("7.200");
  });

  it("shows the missing-amount dash instead of NaN", () => {
    for (const bad of ["abc", "", undefined, null, NaN]) {
      expect(formatRate(bad as never), String(bad)).toBe(MISSING_AMOUNT);
      expect(formatDecimal(bad as never), String(bad)).toBe(MISSING_AMOUNT);
    }
  });
});

describe("formatUSD with nothing to show", () => {
  it("takes null and undefined without a cast", () => {
    expect(formatUSD(null)).toBe(MISSING_AMOUNT);
    expect(formatUSD(undefined)).toBe(MISSING_AMOUNT);
  });
});

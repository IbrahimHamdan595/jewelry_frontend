import { describe, it, expect } from "vitest";
import { describeVariance } from "@/lib/variance";

describe("describeVariance", () => {
  it("a count below the system quantity is a shortage", () => {
    expect(describeVariance(8, 10)).toEqual({ magnitude: 2, direction: "short", tone: "shortage" });
  });

  it("a count above the system quantity is a surplus", () => {
    expect(describeVariance(11, 10)).toEqual({ magnitude: 1, direction: "over", tone: "surplus" });
  });

  it("an equal count is a match", () => {
    expect(describeVariance(10, 10)).toEqual({ magnitude: 0, direction: "match", tone: "neutral" });
    expect(describeVariance(0, 0)).toEqual({ magnitude: 0, direction: "match", tone: "neutral" });
  });

  it("magnitude is never negative, whichever way the count is off", () => {
    expect(describeVariance(0, 7).magnitude).toBe(7);
    expect(describeVariance(7, 0).magnitude).toBe(7);
  });

  // The wording is the dictionary's job (t.stockTake.*), so that it follows
  // the interface language; this module must not grow English copy again.
  it("carries no wording", () => {
    for (const v of [describeVariance(8, 10), describeVariance(11, 10), describeVariance(10, 10)]) {
      expect(Object.keys(v).sort()).toEqual(["direction", "magnitude", "tone"]);
    }
  });
});

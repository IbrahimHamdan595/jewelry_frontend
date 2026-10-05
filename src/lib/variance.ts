/**
 * Variance classification — used by the stock-take screens so the operator
 * always sees direction-in-words, not a bare signed number.
 *
 * Rationale: "system says 10, counted 8, short by 2" is unmissable.
 * A bare "−2" at 9 PM after counting gold for an hour gets read as
 * "minus two of something, probably fine" — and gets approved when it
 * shouldn't be.
 *
 * This file is the single source of truth for what a variance IS: its
 * direction, its magnitude and the tone the UI should give it. How it is
 * phrased to a human about to mutate inventory lives in the dictionaries
 * (t.stockTake.variance*, sentence*, effect*), so the wording follows the
 * interface language.
 */

export interface VarianceDescription {
  /** Magnitude (always >= 0). */
  magnitude: number;
  /** "short" (count < system) | "over" (count > system) | "match". */
  direction: "short" | "over" | "match";
  /** Tone color hint for UI (red/amber/green). */
  tone: "shortage" | "surplus" | "neutral";
}

export function describeVariance(
  counted: number,
  expected: number,
): VarianceDescription {
  const variance = counted - expected;
  const magnitude = Math.abs(variance);

  if (variance === 0) return { magnitude: 0, direction: "match", tone: "neutral" };
  if (variance < 0) return { magnitude, direction: "short", tone: "shortage" };
  return { magnitude, direction: "over", tone: "surplus" };
}

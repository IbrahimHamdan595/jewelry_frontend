/**
 * Variance display helpers — used by stock-take screens so the operator
 * always sees direction-in-words, not a bare signed number.
 *
 * Rationale: "system says 10, counted 8, short by 2" is unmissable.
 * A bare "−2" at 9 PM after counting gold for an hour gets read as
 * "minus two of something, probably fine" — and gets approved when it
 * shouldn't be. This file is the single source of truth for how we
 * phrase a variance to a human about to mutate inventory.
 */

export interface VarianceDescription {
  /** Magnitude (always >= 0). */
  magnitude: number;
  /** "short" (count < system) | "over" (count > system) | "match". */
  direction: "short" | "over" | "match";
  /** Tone color hint for UI (red/amber/green). */
  tone: "shortage" | "surplus" | "neutral";
  /** Short label e.g. "short by 2" / "over by 2" / "matches". */
  label: string;
  /** Full sentence for the approval prompt. */
  sentence: (refName: string) => string;
}

export function describeVariance(
  counted: number,
  expected: number,
): VarianceDescription {
  const variance = counted - expected;
  const magnitude = Math.abs(variance);

  if (variance === 0) {
    return {
      magnitude: 0,
      direction: "match",
      tone: "neutral",
      label: "matches",
      sentence: (n) => `${n}: physical count matches system (${expected}).`,
    };
  }
  if (variance < 0) {
    return {
      magnitude,
      direction: "short",
      tone: "shortage",
      label: `short by ${magnitude}`,
      sentence: (n) =>
        `${n}: system says ${expected}, you counted ${counted} — short by ${magnitude}.`,
    };
  }
  return {
    magnitude,
    direction: "over",
    tone: "surplus",
    label: `over by ${magnitude}`,
    sentence: (n) =>
      `${n}: system says ${expected}, you counted ${counted} — over by ${magnitude}.`,
  };
}

/**
 * What happens to on_hand_qty if this line is approved.
 * Used in the approval confirmation prompt — the operator must understand
 * the inventory effect BEFORE clicking approve.
 */
export function describeApprovalEffect(
  counted: number,
  expected: number,
): string {
  const v = counted - expected;
  if (v === 0) return "No change (already matches).";
  if (v < 0) {
    return `Approving will decrease on-hand quantity from ${expected} to ${counted} (−${Math.abs(v)}). A "lost / shrinkage" adjustment will be recorded.`;
  }
  return `Approving will increase on-hand quantity from ${expected} to ${counted} (+${v}). A "found / correction" adjustment will be recorded.`;
}

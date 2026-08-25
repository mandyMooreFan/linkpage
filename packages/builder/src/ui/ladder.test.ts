import { describe, expect, it } from "vitest";
import { LADDER } from "./ladder.js";

/**
 * The ladder is monotonic, and the rungs are far enough apart to be read as grouping.
 *
 * These are the design audit's own numbers turned into assertions. The defect they guard against
 * is not "a gap looks wrong" — it is a gap that is *smaller than the one inside the thing it
 * separates*, which reverses what the space is saying: on the contact step every label sat nearer
 * the field above it than the field it named (finding B-65). A ratio either clears the line or it
 * does not, so it belongs here rather than in a review comment.
 *
 * What a test cannot see is the empty control's own height, which is the dominant gap inside a
 * field and the reason the between-field rung sits at the top of its band rather than the bottom.
 * That was measured on the rendered page — see `ladder.ts` and the resolution of #187.
 */
describe("the spacing ladder", () => {
  const rungs = [LADDER.withinField, LADDER.betweenFields, LADDER.betweenSections];

  it("climbs: intra-group < inter-field < inter-section", () => {
    const px = rungs.map((rung) => rung.px);
    expect(px).toEqual([...px].sort((a, b) => a - b));
    expect(new Set(px).size).toBe(px.length);
  });

  it("never lets a label and its control sit at zero", () => {
    // §1's floor, and independently the focus ring's: `outline-offset: 2px` plus a 2px outline
    // means anything under 4px is drawn *through* the neighbouring text (finding B-57).
    expect(LADDER.withinField.px).toBeGreaterThanOrEqual(8);
  });

  it("keeps field-to-field inside the 24–32px band, at 3–4× the within-field gap", () => {
    expect(LADDER.betweenFields.px).toBeGreaterThanOrEqual(24);
    expect(LADDER.betweenFields.px).toBeLessThanOrEqual(32);
    const ratio = LADDER.betweenFields.px / LADDER.withinField.px;
    expect(ratio).toBeGreaterThanOrEqual(3);
    expect(ratio).toBeLessThanOrEqual(4);
  });

  it("buys the same rung out of the heading block, for less margin", () => {
    // The question shell's `<form>` is a `gap-4` column, so a margin here is added to 16px that
    // has already been spent. Same distance on screen; half the number in the class list.
    expect(LADDER.outOfHeading.px).toBe(LADDER.betweenSections.px);
  });
});

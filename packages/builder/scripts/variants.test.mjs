import { describe, expect, it } from "vitest";
import {
  AUDIT_VARIANTS,
  DEFAULT_VARIANTS,
  MODES,
  parseVariant,
  SHAPES,
  TYPES,
  uncoveredPairs,
} from "./variants.mjs";

/**
 * What the appearance ritual's default set is required to cover.
 *
 * **This is the one thing about the ritual worth asserting**, and it is not about what a picture
 * looks like — §7.4's terms are untouched. It is about whether the set has a hole in it. The set
 * this replaced had exactly one, `floatingCard` + `dark`, and it was invisible: nothing failed,
 * a run simply came out without the screen a reviewer needed, and the gap was found only when
 * somebody went looking for a picture that was never taken.
 */

describe("the default variant set", () => {
  it("reaches every shape in both modes", () => {
    expect(uncoveredPairs(DEFAULT_VARIANTS)).toEqual([]);
  });

  it("would have caught the hole that shipped", () => {
    // The old default set, as it stood. It is here because the assertion above only means
    // something if it can fail on the thing it was written for.
    const old = [
      "centred-classic-light",
      "colourBlock-modern-dark",
      "floatingCard-friendly-light",
      "ruledLeft-classic-dark",
    ];
    expect(uncoveredPairs(old)).toContain("floatingCard-dark");
  });

  it("shows every type pairing at least once", () => {
    // Crossed with nothing: §6.1 makes a pairing token-valued, so it changes the letters and
    // not the contrast. Once each is a look at it, and twenty-four pages is a lookup table.
    const seen = new Set(DEFAULT_VARIANTS.map((combo) => parseVariant(combo)?.type));
    expect([...seen].sort()).toEqual([...TYPES].sort());
  });

  it("keeps the design audit's four verbatim, so old sets stay comparable", () => {
    for (const combo of AUDIT_VARIANTS) expect(DEFAULT_VARIANTS).toContain(combo);
  });

  it("is all real combinations, and no duplicates", () => {
    for (const combo of DEFAULT_VARIANTS) expect(parseVariant(combo), combo).not.toBeNull();
    expect(new Set(DEFAULT_VARIANTS).size).toBe(DEFAULT_VARIANTS.length);
  });

  it("stays small enough to look through", () => {
    // The cost is the point: every combination is a picture somebody has to open. Eight is
    // shape × mode and nothing more; a set that grew past that grew a cross it did not need.
    expect(DEFAULT_VARIANTS.length).toBe(SHAPES.length * MODES.length);
  });

  it("refuses something that is not a combination", () => {
    for (const bad of ["", "centred", "centred-classic", "centred-classic-sideways", "a-b-c-d"]) {
      expect(parseVariant(bad), bad).toBeNull();
    }
  });
});

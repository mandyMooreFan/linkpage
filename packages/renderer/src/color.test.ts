import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  oklchToRgb,
  parseHex,
  pickInk,
  relativeLuminance,
  rgbToOklch,
  stepToward,
  toContrast,
  toHex,
  withLightness,
  type Rgb,
} from "./color.js";

const BLACK: Rgb = { r: 0, g: 0, b: 0 };
const WHITE: Rgb = { r: 255, g: 255, b: 255 };

describe("parseHex", () => {
  it("accepts both lengths, with or without the hash, in any case", () => {
    const expected = { r: 0xc2, g: 0x18, b: 0x5b };
    expect(parseHex("#c2185b")).toEqual(expected);
    expect(parseHex("c2185b")).toEqual(expected);
    expect(parseHex("#C2185B")).toEqual(expected);
    expect(parseHex("  #c2185b  ")).toEqual(expected);
    expect(parseHex("#abc")).toEqual({ r: 0xaa, g: 0xbb, b: 0xcc });
  });

  it("returns null rather than throwing on anything else", () => {
    // The renderer is total (SPEC.md §4.7) and a hand-edited file can put any string here.
    for (const bad of ["", "#", "#12", "#12345", "rebeccapurple", "#gggggg", null, 42, {}, []]) {
      expect(parseHex(bad), String(bad)).toBeNull();
    }
  });

  it("round-trips through toHex", () => {
    for (const hex of ["#000000", "#ffffff", "#c2185b", "#00695c"]) {
      expect(toHex(parseHex(hex) as Rgb)).toBe(hex);
    }
  });
});

describe("contrastRatio", () => {
  it("matches the WCAG reference points", () => {
    expect(contrastRatio(BLACK, WHITE)).toBeCloseTo(21, 5);
    expect(contrastRatio(WHITE, WHITE)).toBeCloseTo(1, 5);
    // #767676 on white is the canonical "exactly AA" grey.
    expect(contrastRatio(parseHex("#767676") as Rgb, WHITE)).toBeCloseTo(4.54, 1);
  });

  it("is order-independent", () => {
    const a = parseHex("#c2185b") as Rgb;
    expect(contrastRatio(a, WHITE)).toBeCloseTo(contrastRatio(WHITE, a), 10);
  });

  it("puts pure green above pure blue, as luminance weighting requires", () => {
    expect(relativeLuminance(parseHex("#00ff00") as Rgb)).toBeGreaterThan(
      relativeLuminance(parseHex("#0000ff") as Rgb),
    );
  });
});

describe("OKLCh", () => {
  it("round-trips every corner of the cube within a rounding step", () => {
    const corners = ["#000000", "#ffffff", "#ff0000", "#00ff00", "#0000ff", "#c2185b", "#5d4037"];
    for (const hex of corners) {
      const rgb = parseHex(hex) as Rgb;
      const back = oklchToRgb(rgbToOklch(rgb));
      expect(Math.abs(back.r - rgb.r), hex).toBeLessThanOrEqual(1);
      expect(Math.abs(back.g - rgb.g), hex).toBeLessThanOrEqual(1);
      expect(Math.abs(back.b - rgb.b), hex).toBeLessThanOrEqual(1);
    }
  });

  it("preserves hue when lightness changes — the reason this is not HSL", () => {
    const yellow = parseHex("#ffff00") as Rgb;
    const darker = withLightness(yellow, 0.5);
    expect(rgbToOklch(darker).h).toBeCloseTo(rgbToOklch(yellow).h, 0);
    // Still recognisably yellow: red and green high, blue low.
    expect(darker.r).toBeGreaterThan(darker.b);
    expect(darker.g).toBeGreaterThan(darker.b);
  });

  it("reports a perceptual lightness that tracks luminance ordering", () => {
    const order = ["#000000", "#5d4037", "#808080", "#e1bee7", "#ffffff"];
    const lightness = order.map((hex) => rgbToOklch(parseHex(hex) as Rgb).l);
    for (let i = 1; i < lightness.length; i++) {
      expect(lightness[i] as number).toBeGreaterThan(lightness[i - 1] as number);
    }
  });
});

describe("toContrast", () => {
  it("returns the colour untouched when it already clears the target", () => {
    const pink = parseHex("#c2185b") as Rgb;
    expect(toContrast(pink, [WHITE], 3, "darker")).toEqual(pink);
  });

  it("moves only as far as needed, and lands at or above the target", () => {
    const pale = parseHex("#fff59d") as Rgb;
    const fixed = toContrast(pale, [WHITE], 3, "darker");
    expect(contrastRatio(fixed, WHITE)).toBeGreaterThanOrEqual(3);
    // "Only as far as needed": one step lighter would fall short.
    const lighter = withLightness(fixed, rgbToOklch(fixed).l + 0.02);
    expect(contrastRatio(lighter, WHITE)).toBeLessThan(3);
  });

  it("respects the direction it was given rather than flipping to the easy side", () => {
    // Black asked to go darker against black cannot succeed. Returning the endpoint keeps
    // the caller in charge; silently going lighter would change the design.
    const result = toContrast(BLACK, [BLACK], 4.5, "darker");
    expect(contrastRatio(result, BLACK)).toBeLessThan(4.5);
  });

  it("works in both directions", () => {
    const navy = parseHex("#0d1b3e") as Rgb;
    expect(contrastRatio(toContrast(navy, [BLACK], 3, "lighter"), BLACK)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(toContrast(navy, [WHITE], 3, "darker"), WHITE)).toBeGreaterThanOrEqual(3);
  });

  it("clears every backdrop it is given, not just the first", () => {
    // The whole reason `against` is a list. `#1a1a1a` and `#2b2b2b` are a ground and the
    // panel that sits on it; a colour pushed only far enough for the darker one still fails
    // on the lighter one, which is precisely how the page's fill shipped below 3:1.
    const ground = parseHex("#1a1a1a") as Rgb;
    const panel = parseHex("#2b2b2b") as Rgb;
    const brand = parseHex("#00695c") as Rgb;

    const groundOnly = toContrast(brand, [ground], 3, "lighter");
    expect(contrastRatio(groundOnly, panel)).toBeLessThan(3); // the bug, reproduced

    const both = toContrast(brand, [ground, panel], 3, "lighter");
    expect(contrastRatio(both, ground)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(both, panel)).toBeGreaterThanOrEqual(3);
  });

  it("constrains nothing when given no backdrops", () => {
    const pale = parseHex("#fff59d") as Rgb;
    expect(toContrast(pale, [], 3, "darker")).toEqual(pale);
  });
});

describe("stepToward", () => {
  const always = (): boolean => true;
  const teal = parseHex("#00695c") as Rgb;

  it("takes the whole step when nothing is in the way", () => {
    const stepped = stepToward(teal, BLACK, 0.07, always);
    expect(rgbToOklch(stepped).l).toBeCloseTo(rgbToOklch(teal).l - 0.07, 2);
  });

  it("reads the second colour as a direction, not a destination", () => {
    // A step can land past it, which is the point: a fill sitting almost on the ink would
    // otherwise get a step of nearly nothing exactly where one is hardest to see.
    const justDarker = withLightness(teal, rgbToOklch(teal).l - 0.02);
    const stepped = stepToward(teal, justDarker, 0.07, always);
    expect(rgbToOklch(stepped).l).toBeLessThan(rgbToOklch(justDarker).l);
  });

  it("shortens the step to the last point that holds", () => {
    // Darken a teal, but never past 8:1 against white. The answer is the boundary rather
    // than the wish, and it is on the legal side of it.
    const holds = (candidate: Rgb): boolean => contrastRatio(candidate, WHITE) <= 8;
    const stepped = stepToward(teal, BLACK, 0.2, holds);
    expect(contrastRatio(stepped, WHITE)).toBeLessThanOrEqual(8);
    const further = withLightness(stepped, rgbToOklch(stepped).l - 0.01);
    expect(contrastRatio(further, WHITE)).toBeGreaterThan(8);
  });

  it("goes the other way when the direction is the other way", () => {
    expect(rgbToOklch(stepToward(teal, WHITE, 0.07, always)).l).toBeCloseTo(
      rgbToOklch(teal).l + 0.07,
      2,
    );
  });

  it("stays put when the colour it was given does not hold", () => {
    // The caller's promise is that `color` holds. When it does not, nothing further along
    // can rescue it, so the honest answer is the colour it came in with.
    const stepped = stepToward(teal, BLACK, 0.07, () => false);
    expect(toHex(stepped)).toBe(toHex(teal));
  });

  it("keeps hue and chroma, so a step is a shade rather than a colour", () => {
    const before = rgbToOklch(teal);
    const after = rgbToOklch(stepToward(teal, BLACK, 0.07, always));
    // Within a degree or so: the step is exact in OKLCh and then quantised to 8-bit channels.
    expect(Math.abs(after.h - before.h)).toBeLessThan(2);
    expect(after.c).toBeCloseTo(before.c, 1);
  });
});

describe("pickInk", () => {
  it("prefers an earlier candidate that clears the minimum", () => {
    expect(pickInk(BLACK, [WHITE, { r: 1, g: 1, b: 1 }], 4.5)).toEqual(WHITE);
  });

  it("falls back to black or white when no candidate clears it", () => {
    const mid = parseHex("#767676") as Rgb;
    const ink = pickInk(mid, [{ r: 0x80, g: 0x80, b: 0x80 }], 4.5);
    expect([toHex(BLACK), toHex(WHITE)]).toContain(toHex(ink));
    expect(contrastRatio(ink, mid)).toBeGreaterThanOrEqual(4.5);
  });

  it("always reaches AA — the fact the readability guarantee rests on", () => {
    // For any colour, the better of black and white is at least 4.58:1. The worst case is
    // the mid-tone where the two are equal, so there is no fill an owner can pick that
    // cannot carry legible text.
    for (let r = 0; r <= 255; r += 15) {
      for (let g = 0; g <= 255; g += 15) {
        for (let b = 0; b <= 255; b += 15) {
          const fill = { r, g, b };
          expect(contrastRatio(pickInk(fill, [], 4.5), fill)).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });
});

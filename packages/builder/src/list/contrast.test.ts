import { contrastRatio, parseHex } from "@linkpage/renderer";
import { describe, expect, it } from "vitest";
import { POPULATED } from "../fixtures.js";
import type { DraftStyle } from "../project/index.js";
import { formatRatio, readout, ROLE_LABELS } from "./contrast.js";

/**
 * The advanced tier's readout. `SPEC.md` §3.4, §3.3.
 *
 * > **It reports contrast and nothing else — no refusal, no auto-correction, no export gate.**
 *
 * Most of what that sentence asks for cannot be asserted by looking at a number, so the tests
 * below hold the two things that can be: the numbers describe **the page the owner is actually
 * looking at**, overrides included — a readout of the derivation while the page shows something
 * else would be worse than none — and nothing in the result is a verdict. There is no
 * threshold, no pass, no fail, and the one boolean is a fact about the derivation rather than a
 * judgement about a choice.
 */

const style = (patch: Partial<DraftStyle>): DraftStyle => ({ ...POPULATED.style, ...patch });

describe("what the numbers are", () => {
  it("measures the pairs the page puts next to each other", () => {
    const { readings } = readout(POPULATED.style);

    expect(readings.map((reading) => reading.label)).toEqual([
      "Body text on the page",
      "Quieter text on the page",
      "Button text on the button",
      "The button against the page",
      "Second colour as text",
    ]);
  });

  it("states the ratio between the two colours it names, and nothing else", () => {
    for (const reading of readout(POPULATED.style).readings) {
      const [foreground, background] = reading.pair;
      const measured = contrastRatio(parseHex(foreground)!, parseHex(background)!);

      expect(reading.ratio).toBeCloseTo(measured, 10);
      expect(reading.ratio).toBeGreaterThanOrEqual(1);
      expect(reading.ratio).toBeLessThanOrEqual(21);
    }
  });

  it("reports the page as it renders, hand-set colours included (§3.4)", () => {
    const brand = POPULATED.style.brand;
    // The same two colours in both roles: a ratio of 1, reported without comment.
    const painted = style({
      advanced: { enabled: true, colors: { ink: "#ffffff", ground: "#ffffff" } },
    });

    expect(readout(painted).readings[0]?.ratio).toBeCloseTo(1, 10);
    // And the derivation shows through again the moment the switch goes off, because the
    // object is read only when it is enabled.
    const off = style({ advanced: { enabled: false, colors: { ink: "#ffffff" } } });
    expect(readout(off).readings[0]?.ratio).toBeCloseTo(
      readout(style({ brand })).readings[0]?.ratio ?? 0,
      10,
    );
  });

  it("offers exactly the roles the derivation accepts overrides for", () => {
    const { palette } = readout(POPULATED.style);
    const roles = ROLE_LABELS.map(([role]) => role);

    expect(roles).toHaveLength(11);
    expect([...roles].sort()).toEqual(
      Object.keys(palette)
        .filter((key) => key !== "brandSteppedBack")
        .sort(),
    );
  });
});

describe("what it does not do", () => {
  it("states the step-back as a fact about the derivation, not a warning about a choice", () => {
    // A pale yellow cannot carry a filled button against a near-white ground (§3.3). It is
    // honoured exactly all the same, and the panel says what happened rather than refusing.
    const pale = readout(style({ brand: "#fffbe6", mode: "light" }));

    expect(pale.brandSteppedBack).toBe(true);
    expect(pale.palette.brand).toBe("#fffbe6");
    expect(readout(POPULATED.style).brandSteppedBack).toBe(false);
  });

  it("carries no threshold, no verdict and nothing to build one out of", () => {
    const reading = readout(POPULATED.style).readings[0];

    // Deliberately exhaustive: a `passes`, a `level` or a `target` appearing here is how a
    // readout becomes a warning, and §3.3's promise is that the owner is never told off.
    expect(Object.keys(reading ?? {}).sort()).toEqual(["label", "pair", "ratio"]);
  });

  it("answers for a colour it cannot parse instead of failing (§4.7)", () => {
    const nonsense = readout(style({ brand: "rhubarb" }));
    expect(nonsense.readings).toHaveLength(5);
    for (const reading of nonsense.readings) expect(Number.isFinite(reading.ratio)).toBe(true);
  });
});

describe("how a ratio reads", () => {
  it("is one decimal place and the :1 that says what kind of number it is", () => {
    expect(formatRatio(4.5)).toBe("4.5:1");
    expect(formatRatio(21)).toBe("21.0:1");
    expect(formatRatio(1.0049)).toBe("1.0:1");
  });
});

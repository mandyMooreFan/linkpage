import { describe, expect, it } from "vitest";
import { contrastRatio, parseHex, type Rgb } from "./color.js";
import { derivePalette, type Palette } from "./palette.js";
import type { Mode, Style } from "./project.js";

const styleWith = (brand: string, mode: Mode, extra: Partial<Style> = {}): Style => ({
  brand,
  shape: "centred",
  type: "classic",
  corners: 0.6,
  mode,
  advanced: { enabled: false, colors: {} },
  ...extra,
});

const rgb = (hex: string): Rgb => parseHex(hex) as Rgb;
const ratio = (a: string, b: string): number => contrastRatio(rgb(a), rgb(b));

/**
 * The corpus the readability guarantee has to survive. Every entry is a colour a real owner
 * could plausibly type, and the awkward ones are the point: the guarantee is worth nothing
 * if it only holds for well-behaved mid-tone blues.
 */
const BRANDS: [name: string, hex: string][] = [
  ["a strong pink", "#c2185b"],
  ["a mid teal", "#00695c"],
  ["near-black", "#0a0a0a"],
  ["pure black", "#000000"],
  ["pure white", "#ffffff"],
  ["near-white cream", "#fffdf0"],
  ["pale yellow", "#fff59d"],
  ["neon yellow", "#ffff00"],
  ["neon green", "#00ff00"],
  ["neon cyan", "#00ffff"],
  ["neon magenta", "#ff00ff"],
  ["pure red", "#ff0000"],
  ["pure blue", "#0000ff"],
  ["mid grey", "#808080"],
  ["the equal-contrast mid-tone", "#767676"],
  ["a muddy brown", "#5d4037"],
  ["a pale lilac", "#e1bee7"],
  ["a deep navy", "#0d1b3e"],
];

const MODES: Mode[] = ["light", "dark"];

describe("the readability guarantee holds for every brand colour, in both modes", () => {
  for (const mode of MODES) {
    for (const [name, hex] of BRANDS) {
      describe(`${name} (${hex}), ${mode}`, () => {
        const p: Palette = derivePalette(styleWith(hex, mode));

        it("body text clears AAA on the ground", () => {
          expect(ratio(p.ink, p.ground)).toBeGreaterThanOrEqual(7);
        });

        it("body text clears AA on a panel", () => {
          expect(ratio(p.ink, p.surface)).toBeGreaterThanOrEqual(4.5);
        });

        it("muted text is quieter than body text but still clears AA", () => {
          expect(ratio(p.inkMuted, p.ground)).toBeGreaterThanOrEqual(4.5);
          expect(ratio(p.inkMuted, p.ground)).toBeLessThanOrEqual(ratio(p.ink, p.ground));
        });

        it("button text clears AA on the button", () => {
          expect(ratio(p.buttonInk, p.buttonFill)).toBeGreaterThanOrEqual(4.5);
        });

        it("the button is identifiable against the page (SC 1.4.11)", () => {
          expect(ratio(p.buttonFill, p.ground)).toBeGreaterThanOrEqual(3);
        });

        it("accent text clears AA on the ground", () => {
          expect(ratio(p.accentInk, p.ground)).toBeGreaterThanOrEqual(4.5);
        });

        it("every role is a valid hex", () => {
          for (const [role, value] of Object.entries(p)) {
            if (typeof value !== "string") continue;
            expect(parseHex(value), `${role} = ${value}`).not.toBeNull();
          }
        });
      });
    }
  }
});

describe("the step-back rule", () => {
  it("honours a brand that can carry the button, using it as the fill unchanged", () => {
    const p = derivePalette(styleWith("#c2185b", "light"));
    expect(p.brandSteppedBack).toBe(false);
    expect(p.buttonFill).toBe("#c2185b");
    expect(p.brand).toBe("#c2185b");
  });

  it("steps a too-light brand back on a light ground, keeping its exact value", () => {
    // A pale yellow is legible enough as text but cannot be told apart from a near-white
    // page as a filled shape — the case SPEC.md §3.3 describes as "too light for a button".
    const p = derivePalette(styleWith("#fff59d", "light"));
    expect(p.brandSteppedBack).toBe(true);
    expect(p.brand).toBe("#fff59d"); // honoured exactly
    expect(p.buttonFill).not.toBe("#fff59d"); // but not asked to carry the button
    expect(ratio(p.buttonFill, p.ground)).toBeGreaterThanOrEqual(3);
  });

  it("steps a too-dark brand back on a dark ground", () => {
    const p = derivePalette(styleWith("#0d1b3e", "dark"));
    expect(p.brandSteppedBack).toBe(true);
    expect(p.brand).toBe("#0d1b3e");
    expect(ratio(p.buttonFill, p.ground)).toBeGreaterThanOrEqual(3);
  });

  it("keeps the stepped-back brand's hue rather than replacing the colour", () => {
    const p = derivePalette(styleWith("#fff59d", "light"));
    const fill = rgb(p.buttonFill);
    // Yellow: red and green high, blue low. A hue-preserving darkening keeps that shape;
    // an HSL-style or neutral fallback would not.
    expect(fill.r).toBeGreaterThan(fill.b);
    expect(fill.g).toBeGreaterThan(fill.b);
  });

  it("steps back exactly when the brand cannot carry the button, and never otherwise", () => {
    // The invariant, rather than a hardcoded colour: `brandSteppedBack` is true if and only
    // if the fill had to move, and a fill that moved always arrives somewhere usable.
    for (const mode of MODES) {
      for (const [name, hex] of BRANDS) {
        const p = derivePalette(styleWith(hex, mode));
        const label = `${name} (${hex}), ${mode}`;
        if (p.brandSteppedBack) {
          expect(p.buttonFill, label).not.toBe(p.brand);
          expect(ratio(p.buttonFill, p.ground), label).toBeGreaterThanOrEqual(3);
        } else {
          expect(p.buttonFill, label).toBe(p.brand);
        }
        expect(p.brand, label).toBe(hex);
      }
    }
  });

  it("can step back in one mode and not the other", () => {
    // A mid teal reads clearly against a near-white page and disappears into a near-black
    // one, so the same colour carries the button in light mode and steps back in dark. The
    // owner is told nothing either way; the page simply works in both.
    expect(derivePalette(styleWith("#00695c", "light")).brandSteppedBack).toBe(false);
    expect(derivePalette(styleWith("#00695c", "dark")).brandSteppedBack).toBe(true);
  });
});

describe("the accent", () => {
  it("falls back to the brand when absent", () => {
    const p = derivePalette(styleWith("#c2185b", "light"));
    expect(p.accent).toBe("#c2185b");
  });

  it("is honoured exactly when given", () => {
    const p = derivePalette(styleWith("#c2185b", "light", { accent: "#00695c" }));
    expect(p.accent).toBe("#00695c");
  });

  it("ignores an unparseable accent rather than failing", () => {
    const p = derivePalette(styleWith("#c2185b", "light", { accent: "not a colour" }));
    expect(p.accent).toBe("#c2185b");
  });
});

describe("the advanced tier sits on top and never replaces the derivation", () => {
  const overrides = { ink: "#123456", buttonFill: "#654321" };

  it("is ignored while disabled, even though the colours are persisted", () => {
    const off = derivePalette(
      styleWith("#c2185b", "light", { advanced: { enabled: false, colors: overrides } }),
    );
    const plain = derivePalette(styleWith("#c2185b", "light"));
    expect(off).toEqual(plain);
  });

  it("applies while enabled", () => {
    const on = derivePalette(
      styleWith("#c2185b", "light", { advanced: { enabled: true, colors: overrides } }),
    );
    expect(on.ink).toBe("#123456");
    expect(on.buttonFill).toBe("#654321");
  });

  it("is losslessly reversible: switching off restores the derived page exactly", () => {
    const colors = overrides;
    const on = derivePalette(
      styleWith("#c2185b", "light", { advanced: { enabled: true, colors } }),
    );
    const off = derivePalette(
      styleWith("#c2185b", "light", { advanced: { enabled: false, colors } }),
    );
    expect(off).toEqual(derivePalette(styleWith("#c2185b", "light")));
    expect(on).not.toEqual(off);
  });

  it("ignores roles it does not know and values it cannot parse", () => {
    const p = derivePalette(
      styleWith("#c2185b", "light", {
        advanced: { enabled: true, colors: { ink: "nonsense", notARole: "#000000" } },
      }),
    );
    const plain = derivePalette(styleWith("#c2185b", "light"));
    expect(p.ink).toBe(plain.ink);
    expect(p).not.toHaveProperty("notARole");
  });

  it("does not let an override rewrite what the derivation reports it did", () => {
    const p = derivePalette(
      styleWith("#fff59d", "light", {
        advanced: {
          enabled: true,
          colors: { brandSteppedBack: "#000000" } as unknown as Record<string, string>,
        },
      }),
    );
    expect(p.brandSteppedBack).toBe(true);
  });
});

describe("the derivation is total and deterministic", () => {
  it("survives a missing, null or unparseable style", () => {
    for (const style of [undefined, null, {} as Style, styleWith("nonsense", "light")]) {
      expect(() => derivePalette(style)).not.toThrow();
      const p = derivePalette(style);
      expect(parseHex(p.ground)).not.toBeNull();
      expect(ratio(p.ink, p.ground)).toBeGreaterThanOrEqual(7);
      expect(ratio(p.buttonInk, p.buttonFill)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("returns identical output for identical input", () => {
    // SPEC.md §6.7 — the palette is recomputed on every render, so it must not drift.
    for (const [, hex] of BRANDS) {
      for (const mode of MODES) {
        expect(derivePalette(styleWith(hex, mode))).toEqual(derivePalette(styleWith(hex, mode)));
      }
    }
  });

  it("never stores derived colours back onto the style it was given", () => {
    const style = styleWith("#c2185b", "light");
    const before = JSON.stringify(style);
    derivePalette(style);
    expect(JSON.stringify(style)).toBe(before);
  });
});

import { describe, expect, it } from "vitest";
import { contrastRatio, parseHex, type Rgb } from "./color.js";
import { derivePalette, type Palette } from "./palette.js";
import { stylesheet } from "./stylesheet.js";
import { resolveChrome } from "./chrome.js";
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

/**
 * The backdrops a role is actually drawn on.
 *
 * Three of the four shapes draw the page on `ground` and lift sections onto `surface`
 * panels. `floatingCard` inverts that: the whole column moves onto `surface` and its panels
 * go transparent, so on that shape `surface` *is* the page and nothing is drawn on `ground`
 * at all.
 *
 * **A guarantee that names one backdrop is not a guarantee.** These tests used to assert
 * against `p.ground` alone, which mirrored the derivation's own gap exactly — which is how a
 * live SC 1.4.11 failure shipped and stayed shipped. Every role is checked against both.
 */
const backdrops = (p: Palette): [where: string, colour: string][] => [
  ["on the ground", p.ground],
  ["on a floating card", p.surface],
];

describe("the readability guarantee holds for every brand colour, in both modes", () => {
  for (const mode of MODES) {
    for (const [name, hex] of BRANDS) {
      describe(`${name} (${hex}), ${mode}`, () => {
        const p: Palette = derivePalette(styleWith(hex, mode));

        it("body text clears AAA on every backdrop", () => {
          for (const [where, backdrop] of backdrops(p)) {
            expect(ratio(p.ink, backdrop), where).toBeGreaterThanOrEqual(7);
          }
        });

        it("muted text is quieter than body text but still clears AA everywhere", () => {
          for (const [where, backdrop] of backdrops(p)) {
            expect(ratio(p.inkMuted, backdrop), where).toBeGreaterThanOrEqual(4.5);
            expect(ratio(p.inkMuted, backdrop), where).toBeLessThanOrEqual(ratio(p.ink, backdrop));
          }
        });

        it("button text clears AA on the button", () => {
          // The one role whose backdrop is neither of the two: text on a fill sits on the
          // fill.
          expect(ratio(p.buttonInk, p.buttonFill)).toBeGreaterThanOrEqual(4.5);
        });

        it("the button is identifiable against every backdrop (SC 1.4.11)", () => {
          for (const [where, backdrop] of backdrops(p)) {
            expect(ratio(p.buttonFill, backdrop), where).toBeGreaterThanOrEqual(3);
          }
        });

        it("accent text clears AA on every backdrop", () => {
          for (const [where, backdrop] of backdrops(p)) {
            expect(ratio(p.accentInk, backdrop), where).toBeGreaterThanOrEqual(4.5);
          }
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
    expect(ratio(p.buttonFill, p.surface)).toBeGreaterThanOrEqual(3);
  });

  it("steps a too-dark brand back on a dark ground", () => {
    const p = derivePalette(styleWith("#0d1b3e", "dark"));
    expect(p.brandSteppedBack).toBe(true);
    expect(p.brand).toBe("#0d1b3e");
    expect(ratio(p.buttonFill, p.ground)).toBeGreaterThanOrEqual(3);
    expect(ratio(p.buttonFill, p.surface)).toBeGreaterThanOrEqual(3);
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
          for (const [where, backdrop] of backdrops(p)) {
            expect(ratio(p.buttonFill, backdrop), `${label} ${where}`).toBeGreaterThanOrEqual(3);
          }
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

describe("the backdrop a colour is drawn on is not always the ground", () => {
  // The failure this suite was rewritten for. `floatingCard` sets
  // `.lp-page{background:var(--lp-surface)}` and makes its panels transparent, so on that
  // shape every brand-carried role is drawn on `surface`. In dark mode `surface` is
  // *lighter* than `ground`, and `toContrast` stops the instant it clears its target — so a
  // fill that landed exactly on 3:1 against the ground had nothing left, and shipped at
  // 2.87:1 on the card. Both roles below were live WCAG failures in released code.

  it("keeps a mid teal's button identifiable on a dark floating card", () => {
    const p = derivePalette(styleWith("#00695c", "dark"));
    expect(ratio(p.buttonFill, p.surface)).toBeGreaterThanOrEqual(3); // shipped at 2.67
  });

  it("keeps a strong pink's accent text readable on a dark floating card", () => {
    const p = derivePalette(styleWith("#c2185b", "dark"));
    expect(ratio(p.accentInk, p.surface)).toBeGreaterThanOrEqual(4.5); // shipped at 4.02
  });

  it("changes nothing in light mode, where the ground is already the worse backdrop", () => {
    // `surface` is a touch *lighter* than `ground` in light mode, so a darkening move that
    // clears the ground clears the card too. Widening the derivation must not cost the
    // light-mode pages anything, and this is what says so.
    for (const [, hex] of BRANDS) {
      const p = derivePalette(styleWith(hex, "light"));
      expect(ratio(p.buttonFill, p.ground), hex).toBeLessThanOrEqual(
        ratio(p.buttonFill, p.surface),
      );
    }
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

describe("the accentInk / --lp-accent-text asymmetry (SPEC.md §3.2)", () => {
  it("emits the property under its new name and keeps the role under its old one", () => {
    // The two names differ on purpose. `-ink` was carrying two meanings — `--lp-fill-ink` is
    // text *on* the fill, this is the accent adjusted to work *as* text on the ground — so the
    // property was renamed and the role was not.
    const css = stylesheet(derivePalette(styleWith("#c2185b", "light")), resolveChrome(null));
    expect(css).toContain("--lp-accent-text:");
    expect(css).not.toContain("--lp-accent-ink");
  });

  it("keeps the role because it is a stored schema key, not a stylesheet detail", () => {
    // Proved through the behaviour that makes it one: §3.4 reads `advanced.colors[role]`
    // straight off `project.json`, so a file naming `accentInk` still overrides. Renaming the
    // role would break every such file, or cost a §4.2 version bump for a cosmetic gain.
    const overridden = derivePalette(
      styleWith("#c2185b", "light", {
        advanced: { enabled: true, colors: { accentInk: "#123456" } },
      }),
    );
    expect(overridden.accentInk).toBe("#123456");
    expect(stylesheet(overridden, resolveChrome(null))).toContain("--lp-accent-text:#123456");
  });

  it("changes no colour, because nothing was failing", () => {
    // `#c2185b` on `#fdf7f8` is 5.55:1. The adjustment is a no-op whenever the accent already
    // clears 4.5:1, which is most of the time — a naming trap got a naming fix, not a
    // re-derivation.
    const p = derivePalette(styleWith("#c2185b", "light", { accent: "#2e7d32" }));
    expect(p.accentInk).toBe("#2e7d32");
  });
});

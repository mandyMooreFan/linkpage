import type { Mode, Style } from "./project.js";
import {
  contrastRatio,
  oklchToRgb,
  parseHex,
  pickInk,
  rgbToOklch,
  toContrast,
  toHex,
  withChroma,
  withLightness,
  type Rgb,
} from "./color.js";

/**
 * The palette derivation. `SPEC.md` §3.2 and §3.3.
 *
 * **You bring the colours, we bring the shape.** The owner gives a required brand colour and
 * an optional accent; every other colour on the page is computed here, at render time, and
 * never stored — so a file cannot disagree with itself, and improving this function reaches
 * every existing project for free.
 *
 * The contrast targets below are the readability guarantee made concrete. They hold for any
 * brand colour the owner can enter, in both modes, and are asserted in `palette.test.ts`
 * against a corpus that includes the awkward cases.
 */

/** Body text. AA needs 4.5; 7 is AAA and costs nothing to hit against a near-white ground. */
const INK_ON_GROUND = 7;
/** Taglines and notes. Still body text, so still AA. */
const MUTED_ON_GROUND = 4.5;
/** Text on a filled button. */
const INK_ON_FILL = 4.5;
/**
 * A filled button against the page. WCAG 2.2 SC 1.4.11 (non-text contrast) asks 3:1 for the
 * parts of a control that identify it — this is the target the step-back rule enforces.
 */
const FILL_ON_GROUND = 3;

/** Used only when `style.brand` is missing or unparseable. See `derivePalette`. */
const FALLBACK_BRAND: Rgb = { r: 0x39, g: 0x3b, b: 0x3f };

export interface Palette {
  /** Page background. */
  ground: string;
  /** Body text. */
  ink: string;
  /** Taglines, notes, secondary text. */
  inkMuted: string;
  /** Section panels sitting on the ground. */
  surface: string;
  /** Hairlines and section borders. Decorative — see the note in `derivePalette`. */
  rule: string;
  /** The owner's brand colour, **exactly as given**. Honoured even when it steps back. */
  brand: string;
  /** The filled-button colour: `brand`, or a stepped-back variant of it. */
  buttonFill: string;
  /** Text on `buttonFill`. */
  buttonInk: string;
  /** The secondary colour, exactly as given; falls back to `brand` when absent. */
  accent: string;
  /**
   * A version of the accent that carries text against the ground.
   *
   * **The CSS custom property this feeds is `--lp-accent-text`, and the difference in names is
   * deliberate — do not "tidy" it** (`SPEC.md` §3.2). The property was renamed because `-ink`
   * was carrying two meanings: `--lp-fill-ink` is text *on* the fill, while this one is the
   * accent adjusted to work *as* text on the ground.
   *
   * **The role name cannot follow it.** §3.4's advanced tier reads `advanced.colors[role]`
   * straight off `project.json`, so this is a stored schema key: renaming it would either
   * break every advanced-tier file or spend a §4.2 version bump on a cosmetic gain, and §4.5's
   * unknown-key round-trip makes that a needless risk.
   */
  accentInk: string;
  /**
   * Whether the brand had to step back from carrying the button.
   *
   * Not a warning and not surfaced to the owner — the whole point of §3.3 is that they are
   * never told off for their colour. It exists so the advanced panel's readout (§3.4) and
   * these tests can see what happened.
   */
  brandSteppedBack: boolean;
}

interface Ground {
  ground: Rgb;
  surface: Rgb;
  /** The direction a colour must move to gain contrast against this ground. */
  away: "darker" | "lighter";
}

/**
 * The ground and its panels, tinted very slightly toward the brand hue.
 *
 * The tint is deliberately almost invisible: it is what stops a page from looking like the
 * brand colour was dropped onto a stock template, without spending any of the contrast
 * budget. Themes carry structure, never a palette (§3.2) — this is the one place a hue
 * reaches the neutrals, and it reaches them barely.
 */
function groundFor(brand: Rgb, mode: Mode): Ground {
  const { h } = rgbToOklch(brand);
  const tint = (l: number, c: number): Rgb => oklchToRgb({ l, c, h });

  return mode === "dark"
    ? { ground: tint(0.178, 0.012), surface: tint(0.232, 0.014), away: "lighter" }
    : { ground: tint(0.982, 0.006), surface: tint(1, 0.003), away: "darker" };
}

/**
 * Derive the full palette from the two colours the owner gave.
 *
 * Total, like everything else the renderer calls (§4.7): a missing or unparseable brand
 * yields a neutral slate rather than a throw. That case is not expected — the builder makes
 * the colour required and collects it through the flow (§4.6) — but a hand-edited file can
 * produce it, and a blank page is a worse answer than a plain one.
 *
 * When the advanced tier is enabled its hand-set colours are laid **on top** of the result
 * (§3.4). They never replace the derivation, which is what makes switching the panel off
 * losslessly reversible.
 */
export function derivePalette(style: Style | null | undefined): Palette {
  const mode: Mode = style?.mode === "dark" ? "dark" : "light";
  const brand = parseHex(style?.brand) ?? FALLBACK_BRAND;
  const accent = parseHex(style?.accent) ?? brand;

  const { ground, surface, away } = groundFor(brand, mode);

  // Text. Start from a strongly-contrasting neutral carrying a trace of the brand hue, then
  // push it until it clears the target — starting close means the push is usually a no-op.
  const inkSeed = withChroma(withLightness(brand, mode === "dark" ? 0.96 : 0.24), 0.02);
  const ink = toContrast(inkSeed, ground, INK_ON_GROUND, away);

  // Muted text moves back *toward* the ground, so it reads as quieter — but only as far as
  // AA allows. It is still body text; "muted" is never a licence to fail.
  const mutedSeed = withLightness(ink, rgbToOklch(ink).l + (mode === "dark" ? -0.16 : 0.16));
  const inkMuted =
    contrastRatio(mutedSeed, ground) >= MUTED_ON_GROUND
      ? mutedSeed
      : toContrast(mutedSeed, ground, MUTED_ON_GROUND, away);

  // Hairlines are decorative and deliberately not held to 3:1. What makes a section
  // identifiable is `surface` differing from `ground`, not the line around it; a border at
  // 3:1 would read as a heavy box on a screen this design keeps calm.
  const rule = withLightness(ink, rgbToOklch(ground).l + (mode === "dark" ? 0.1 : -0.1));

  // The step-back rule (§3.3). The brand is honoured exactly; the question is only whether
  // it can also carry a filled button, which needs it to be *identifiable* against the page.
  // A pale yellow on a near-white ground cannot, so the fill moves until it can — and the
  // brand keeps its exact value, still used for accent text.
  const brandCarriesFill = contrastRatio(brand, ground) >= FILL_ON_GROUND;
  const buttonFill = brandCarriesFill ? brand : toContrast(brand, ground, FILL_ON_GROUND, away);

  // Prefer the page's own extremes so the button belongs to the page; fall back to black or
  // white, which always clears AA on any fill.
  const buttonInk = pickInk(buttonFill, [ground, ink], INK_ON_FILL);

  // The accent as *text* on the ground — the quieter role a stepped-back brand takes up.
  const accentInk = toContrast(accent, ground, MUTED_ON_GROUND, away);

  const derived: Palette = {
    ground: toHex(ground),
    ink: toHex(ink),
    inkMuted: toHex(inkMuted),
    surface: toHex(surface),
    rule: toHex(rule),
    brand: toHex(brand),
    buttonFill: toHex(buttonFill),
    buttonInk: toHex(buttonInk),
    accent: toHex(accent),
    accentInk: toHex(accentInk),
    brandSteppedBack: !brandCarriesFill,
  };

  return applyOverrides(derived, style);
}

/**
 * Lay the advanced tier's hand-set colours over the derived palette (§3.4).
 *
 * Only known roles are read, and only when the panel is enabled — the object is persisted
 * even when it is off, precisely so switching it back on returns the owner's work intact.
 * `brandSteppedBack` is not overridable: it describes what the derivation did, not what the
 * page looks like.
 */
function applyOverrides(derived: Palette, style: Style | null | undefined): Palette {
  const advanced = style?.advanced;
  if (!advanced?.enabled) return derived;

  const overrides = advanced.colors;
  if (typeof overrides !== "object" || overrides === null) return derived;

  const result = { ...derived };
  for (const role of OVERRIDABLE) {
    const value = (overrides as Record<string, unknown>)[role];
    const parsed = parseHex(value);
    if (parsed) result[role] = toHex(parsed);
  }
  return result;
}

type OverridableRole = Exclude<keyof Palette, "brandSteppedBack">;

const OVERRIDABLE: OverridableRole[] = [
  "ground",
  "ink",
  "inkMuted",
  "surface",
  "rule",
  "brand",
  "buttonFill",
  "buttonInk",
  "accent",
  "accentInk",
];

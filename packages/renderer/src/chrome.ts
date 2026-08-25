/**
 * The three style controls that decide *structure* rather than colour: the shape, the type
 * pairing and the corner-softness slider (`SPEC.md` §3.1).
 *
 * **Shapes and type pairings carry structure only, never a palette** (§3.2). Nothing in this
 * file names a colour. A shape selects among the eleven roles `derivePalette` already produced
 * — ink on a filled block, a rule drawn in the button fill — and a pairing selects a font stack
 * and a weight. Neither may re-derive a colour, and neither may invent one, because a shape
 * that shipped its own palette would put the owner's brand colour in second place on their own
 * page.
 *
 * **Four shapes × three pairings × a slider is not twelve stylesheets.** The three axes are
 * carried differently, and that is the whole design:
 *
 * - The **type pairing** is entirely token-valued — three font stacks, a weight, a tracking, a
 *   line height. It adds no rule at all, so it costs the same handful of bytes whichever one
 *   is chosen.
 * - **Corner softness** is one token, `--lp-radius`, computed from the slider. Also no rules.
 * - Only the **shape** adds rules, and only the three non-default ones do: `centred` *is* the
 *   base layout, so it adds nothing, and each of the other three is a short override block.
 *
 * So the emitted chrome is always `base + tokens + at most one delta`, and §6.5's 30 KB budget
 * sees the same page whichever of the twelve the owner picked. Growing this file by adding a
 * fifth shape costs one delta; growing it by giving each combination its own sheet would cost
 * twelve, which is the mistake this shape of the module exists to make hard.
 *
 * **Unknown values fall back for rendering** (§4.4). `shape` and `type` hold a preference with
 * no authored content behind them, so `"brutalist"` renders as the default while the original
 * survives in `project.json` through the builder's raw-object merge (§4.5). The renderer's job
 * is only the fallback.
 */

import type { Mode, Shape, TypePairing } from "./project.js";
import { asEnum, asRecord } from "./values.js";

/** The default shape. §4.4's fallback for an unrecognised `style.shape`. */
export const DEFAULT_SHAPE: Shape = "centred";
/** The default type pairing. §4.4's fallback for an unrecognised `style.type`. */
export const DEFAULT_TYPE: TypePairing = "classic";
/**
 * Where the corner slider sits when the file does not say (§3.1).
 *
 * Softened rather than sharp: 0 is a deliberate look and a page that got there by accident
 * would read as unfinished, whereas a gently rounded button reads as the tool's own default —
 * which is what a missing value means.
 */
export const DEFAULT_CORNERS = 0.6;

export const SHAPES: readonly Shape[] = ["centred", "colourBlock", "floatingCard", "ruledLeft"];
export const TYPE_PAIRINGS: readonly TypePairing[] = ["classic", "modern", "friendly"];
export const MODES: readonly Mode[] = ["light", "dark"];

/**
 * The structural half of `style`, resolved: every value here is one the stylesheet can use
 * without checking it again.
 */
export interface Chrome {
  mode: Mode;
  shape: Shape;
  type: TypePairing;
  /** Already clamped to 0…1. */
  corners: number;
}

/**
 * Read the four structural controls out of whatever `style` turned out to be.
 *
 * Total, like everything the renderer calls (§4.7): the argument is `unknown` because a
 * hand-edited `project.json` can put anything here, and every path returns a usable `Chrome`.
 */
export function resolveChrome(style: unknown): Chrome {
  const record = asRecord(style);

  return {
    mode: asEnum(record?.mode, MODES, "light"),
    shape: asEnum(record?.shape, SHAPES, DEFAULT_SHAPE),
    type: asEnum(record?.type, TYPE_PAIRINGS, DEFAULT_TYPE),
    corners: corners(record?.corners),
  };
}

/**
 * The slider's position, clamped to 0…1.
 *
 * **Out of range is clamped, not rejected.** The slider cannot produce `1.4`, so a file that
 * holds one was hand-edited, and the owner who typed it meant "as round as it goes" — which is
 * exactly what clamping gives them. A non-number is a different thing: there is no intent to
 * read out of `"quite round"`, so it falls back to the default like any other preference.
 */
function corners(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return DEFAULT_CORNERS;
  return Math.min(1, Math.max(0, value));
}

// ---------------------------------------------------------------------------
// Corner softness
// ---------------------------------------------------------------------------

/**
 * The radius the slider's top end reaches, in `rem`.
 *
 * `rem` for the same reason §6.2 puts the column in it: a reader who has raised their default
 * text size gets buttons whose corners stay in proportion to the type inside them, instead of
 * a fixed curve that flattens as the type grows.
 *
 * 1.25rem — 20 px at the default text size — is as far as this goes on purpose. The link
 * buttons are 3rem tall, so a radius much past this turns them into pills, and a pill is a
 * different button rather than a rounder one; the slider is a softness control, not a shape
 * control, and shape is the axis next to it.
 */
const MAX_RADIUS_REM = 1.25;

/**
 * The slider's position as a CSS length.
 *
 * Rounded to three decimals before it reaches the string, which is what keeps the export
 * deterministic (§6.7): `0.7 * 1.25` is not exactly `0.875` in binary floating point, and the
 * full expansion of that would otherwise be a hundred bytes of noise in the stylesheet and a
 * diff nobody can read.
 */
export function radius(corners: number): string {
  const rem = Math.round(corners * MAX_RADIUS_REM * 1000) / 1000;
  return `${rem}rem`;
}

// ---------------------------------------------------------------------------
// Type pairings
// ---------------------------------------------------------------------------

/**
 * One pairing, as the four token values it resolves to.
 *
 * **System stacks only** (§6.3). No webfont, so no bytes on the wire, no embedding licence to
 * read and nothing for the page to fetch — invariant 2 would forbid the fetch anyway. The
 * accepted cost is that the glyphs differ across platforms: a page set in `friendly` is
 * rounded on a Mac, Trebuchet on Windows and whatever the system sans is on Linux. That is not
 * worked around, because the alternative is 30–80 KB of font against a 150 KB page whose whole
 * point is that it is one small file.
 *
 * Every name below is a face that ships with an operating system. Naming a face that is *not*
 * installed costs nothing and fetches nothing — the browser simply moves down the list — which
 * is why each stack ends in a generic family and why none of them names a Google font.
 */
interface Pairing {
  /** Body text: everything that is not the business name. */
  body: string;
  /** The display face. `null` means "the body face" — a one-face system, set differently. */
  head: string | null;
  /** The business name's weight. */
  weight: string;
  /** The business name's tracking. */
  tracking: string;
  /** The page's line height. */
  line: string;
}

/** The neutral system sans every platform has. The text face for `classic`. */
const SYSTEM_SANS = `system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;

const PAIRINGS: Record<TypePairing, Pairing> = {
  /**
   * A serif display face over a system sans. The only pairing here that is literally two
   * faces, and the one that reads as a business that existed before the web did.
   */
  classic: {
    body: SYSTEM_SANS,
    head: `"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, "Times New Roman", serif`,
    weight: "600",
    tracking: "0",
    line: "1.5",
  },

  /**
   * One grotesque, set tight and heavy. The pairing is between the display *setting* and the
   * text setting rather than between two families — which is how a modern identity is
   * normally built, and it costs no second stack.
   */
  modern: {
    body: `"Helvetica Neue", Helvetica, "Segoe UI", Roboto, system-ui, -apple-system, Arial, sans-serif`,
    head: null,
    weight: "700",
    tracking: "-0.02em",
    line: "1.45",
  },

  /**
   * A rounded sans, set open. `ui-rounded` and `SF Pro Rounded` are Apple's; `Trebuchet MS` is
   * the friendliest face that is on essentially every Windows machine; the Japanese rounded
   * gothic is there so the pairing still means something on a page whose `lang` is not Latin.
   */
  friendly: {
    body: `ui-rounded, "SF Pro Rounded", "Hiragino Maru Gothic ProN", "Trebuchet MS", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`,
    head: null,
    weight: "700",
    tracking: "0",
    line: "1.55",
  },
};

/**
 * The type tokens for one pairing, ready to join into the `:root` block.
 *
 * A one-face pairing points `--lp-font-head` at `--lp-font` rather than repeating the stack —
 * fewer bytes, and it says in the stylesheet what the pairing is.
 */
export function typeTokens(pairing: TypePairing): string[] {
  const { body, head, weight, tracking, line } = PAIRINGS[pairing];
  return [
    `--lp-font:${body}`,
    `--lp-font-head:${head ?? "var(--lp-font)"}`,
    `--lp-head-weight:${weight}`,
    `--lp-head-track:${tracking}`,
    `--lp-line:${line}`,
  ];
}

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

/**
 * What each shape adds to the base stylesheet, and nothing more.
 *
 * Read these as a list of the things a shape is allowed to decide: where the content sits on
 * its axis, which of the four blocks carries the page's one piece of emphasis, and whether a
 * section is a box, a card or a rule. What no entry does is name a colour — `var(--lp-fill)`,
 * `var(--lp-ink)` and `var(--lp-rule)` are roles the palette already filled in, and `none`,
 * `0` and `inherit` are the rest of the vocabulary.
 *
 * **None of them touches the column.** §6.2's `min(100%, 25rem)` is load-bearing for §5.2 and
 * §7.6 — a wider column would reflow the buttons and change the size the logo renders at, so a
 * desktop visitor would see a page the owner never previewed. A shape lays out *within* the
 * column. `floatingCard` is the one that comes closest, and it pads inwards: `box-sizing:
 * border-box` in the base keeps the outer width at exactly the cap.
 */
const SHAPE_RULES: Record<Shape, string> = {
  /** The base layout. A centred page is what the stylesheet already describes. */
  centred: "",

  /**
   * The header becomes the page's one filled block, and the buttons step back to outlines so
   * the emphasis lands once rather than five times.
   *
   * The tagline has to leave `--lp-ink-muted` behind inside the block: muted ink is derived
   * against the *ground*, and on the fill it would be a contrast failure. Inheriting the
   * fill's own ink keeps §3.3's guarantee true inside a shape that moved the text.
   */
  colourBlock: `
.lp-header{padding:1.75rem 1.25rem;border-radius:var(--lp-radius);background:var(--lp-fill);color:var(--lp-fill-ink)}
.lp-header .lp-tagline{color:inherit}
.lp-link{background:none;border-color:var(--lp-fill);color:var(--lp-ink)}`,

  /**
   * The whole column lifts onto one surface, and the sections inside stop being boxes — a card
   * of cards is a page with a border drawn round every paragraph. They are divided by the
   * hairline instead, which is the same rule doing less work.
   */
  floatingCard: `
.lp-page{gap:1.25rem;padding:1.75rem 1.25rem;border:1px solid var(--lp-rule);border-radius:calc(var(--lp-radius) + 0.5rem);background:var(--lp-surface)}
.lp-panel{padding:1.25rem 0 0;border:0;border-top:1px solid var(--lp-rule);border-radius:0;background:none}`,

  /**
   * Everything hangs off one axis on the left, marked by a rule in the button fill.
   *
   * `--lp-fill` rather than `--lp-rule` because this rule is doing the work a border does in
   * the other shapes: it is what identifies a section, and §3.3's step-back guarantees the
   * fill clears 3:1 against the ground where the hairline deliberately does not.
   *
   * Logical properties throughout, so the axis follows the page's writing direction rather
   * than pinning itself to the left of a page whose `lang` reads right to left.
   */
  ruledLeft: `
.lp-header{align-items:flex-start;padding-inline-start:0.875rem;border-inline-start:3px solid var(--lp-fill);text-align:start}
.lp-link{justify-content:flex-start}
.lp-panel{padding:0.125rem 0 0.125rem 0.875rem;border:0;border-inline-start:3px solid var(--lp-fill);border-radius:0;background:none}
.lp-social{justify-content:flex-start}`,
};

/**
 * The rules this shape adds, or `""` for the default — which is the point of the split.
 *
 * Emitting only the chosen delta is what keeps twelve combinations inside one budget: the
 * three non-default blocks are a few hundred bytes each and at most one of them ever ships.
 */
export function shapeRules(shape: Shape): string {
  return SHAPE_RULES[shape].trim();
}

import {
  contrastRatio,
  derivePalette,
  parseHex,
  type Palette,
  type Project,
} from "@linkpage/renderer";
import type { DraftStyle } from "../project/index.js";

/**
 * The advanced tier's readout. `SPEC.md` §3.4, §3.3, §7.4.
 *
 * > **It reports contrast and nothing else — no refusal, no auto-correction, no export gate.**
 *
 * That sentence is the whole specification of this module, and the discipline it asks for is
 * mostly about what is *not* here. There is no threshold per reading, no pass, no fail, no
 * colour-coded badge and no boolean anywhere in the return type that a caller could turn into
 * one. A reading is a pair of colours and the number between them.
 *
 * The reason is §3.3. Readability is guaranteed **by a constrained colour field rather than by
 * warnings**, so an owner is never told off for a colour — and opening the advanced panel is
 * the acknowledgement that the guarantee no longer applies (§3.4), not permission to start
 * telling them off. Somebody who has gone past the constrained field and is setting eleven
 * colours by hand is asking a factual question, and the honest answer is a number.
 *
 * `brandSteppedBack` comes out alongside for the same reason: it is a fact about what the
 * derivation did with a colour that could not carry a filled button (§3.3), stated once, in
 * plain words. It is not a warning; the page it describes is the one the owner is looking at.
 */

/**
 * `Style` as the renderer declares it, reached through `Project` because the barrel does not
 * export it — the same projection `project/schema.ts` makes, and for the same reason.
 */
type Style = Project["style"];

/** One pair of colours, and the ratio between them. */
export interface Reading {
  /** What the pair is, in the owner's words. */
  readonly label: string;
  /** The two colours measured, as hex, in the order foreground then background. */
  readonly pair: readonly [string, string];
  /** WCAG 2.2's contrast ratio, between 1 and 21. */
  readonly ratio: number;
}

export interface Readout {
  readonly readings: readonly Reading[];
  /**
   * Whether the brand colour had to step back from carrying the filled button (§3.3).
   *
   * Reported, not repaired: the brand keeps its exact value either way, and the page is already
   * showing the result beside the panel.
   */
  readonly brandSteppedBack: boolean;
  /** The palette the readings were taken from, overrides included. */
  readonly palette: Palette;
}

/**
 * A colour with a job on the page. Every member of `Palette` except the one that is a fact
 * about the derivation rather than a colour — which is also exactly the set `derivePalette`
 * accepts overrides for.
 */
export type Role = Exclude<keyof Palette, "brandSteppedBack">;

/**
 * The eleven roles the advanced tier can override (§3.4), in the words an owner would use.
 *
 * The same eleven `derivePalette` lays overrides over — anything else typed into the object is
 * preserved in the file (§4.5) but has no role to play, so the panel offers exactly these.
 */
export const ROLE_LABELS: readonly (readonly [role: Role, label: string])[] = [
  ["ground", "Page background"],
  ["ink", "Body text"],
  ["inkMuted", "Quieter text"],
  ["surface", "Section panels"],
  ["rule", "Hairlines"],
  ["brand", "Your colour"],
  ["buttonFill", "Button background"],
  ["buttonFillHover", "Button background when pointed at"],
  ["buttonInk", "Button text"],
  ["accent", "Second colour"],
  ["accentInk", "Second colour as text"],
];

/** Black, for the impossible case: every palette value came out of `toHex` and parses. */
const BLACK = { r: 0, g: 0, b: 0 };

function reading(label: string, foreground: string, background: string): Reading {
  return {
    label,
    pair: [foreground, background],
    ratio: contrastRatio(parseHex(foreground) ?? BLACK, parseHex(background) ?? BLACK),
  };
}

/**
 * The numbers, for the style as it stands.
 *
 * Taken from `derivePalette` rather than from the owner's overrides directly, so what is
 * measured is what the page actually renders: a role the owner did not override reads the
 * derived value, and one they did reads theirs. Anything else would report a page nobody is
 * looking at.
 *
 * The five pairs are the ones the page puts next to each other. There is no reading for the
 * hairlines, because §3.2 is explicit that they are decorative and deliberately not held to a
 * ratio — a number beside them would imply a target that does not exist.
 */
export function readout(style: DraftStyle): Readout {
  // The one cast, and it is the same one `page.ts` documents: a draft on the review list has
  // its required fields, and `derivePalette` reads every field defensively in any case (§4.7).
  const palette = derivePalette(style as Style);

  const readings: Reading[] = [
    reading("Body text on the page", palette.ink, palette.ground),
    reading("Quieter text on the page", palette.inkMuted, palette.ground),
    reading("Button text on the button", palette.buttonInk, palette.buttonFill),
    reading("The button against the page", palette.buttonFill, palette.ground),
    reading("Second colour as text", palette.accentInk, palette.ground),
  ];

  return { readings, brandSteppedBack: palette.brandSteppedBack, palette };
}

/** One decimal place and the `:1` that says what kind of number it is. */
export function formatRatio(value: number): string {
  return `${value.toFixed(1)}:1`;
}

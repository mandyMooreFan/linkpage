/**
 * The exported page's entire stylesheet, emitted into one `<style>` block (`SPEC.md` §6.1).
 *
 * **The column is `min(100%, 25rem)`** (§6.2) — 400 CSS px at the browser's default text size,
 * fluid below the cap, with the gutter *outside* it. `rem` rather than `px` is deliberate and
 * load-bearing: the cap tracks the reader's default text size, so someone who has raised it
 * gets a proportionally wider column and keeps the same number of characters per line. Page
 * zoom scales both units alike, so the two choices differ only under the default-font-size
 * setting — which is precisely the setting a reader with low vision uses.
 *
 * **Do not widen it to make a layout work.** §7.6 drops the "see it on a laptop" preview
 * control on the grounds that a wide screen shows the identical page with more whitespace, and
 * §5.2 makes the preview *be* the export. Both are true only while the column is about a
 * phone's width: a wider one reflows the buttons and changes the size the logo renders at, so a
 * desktop visitor would see a page the owner never previewed. The number is also an input to
 * the size budget — §6.6 rasterises the logo at 3× the column, so pixel count grows with its
 * square. **This applies to the shapes too**: a shape lays out *within* the column, and
 * `box-sizing: border-box` below is what lets `floatingCard` pad inwards without moving it.
 *
 * **Every colour comes from the palette** (§3.2). Nothing here picks one, and the eleven roles
 * are emitted as custom properties on `:root` so the rules below name a role rather than a value.
 * The shapes and pairings in `chrome.ts` do the same — they select among these roles and never
 * re-derive or invent one.
 *
 * **Every length comes from a ladder, for the same reason.** `SPACE` below is the page's rhythm
 * and `TEXT` is its type scale, and both are emitted as `:root` custom properties beside the
 * colours. No rule in this file or in `chrome.ts` writes a `rem` of its own — the handful of
 * lengths that are deliberately *not* rungs are listed on `SPACE`, and `stylesheet.test.ts`
 * holds that list, so a number appearing anywhere else fails a test rather than passing review.
 *
 * **What is emitted is base + tokens + at most one shape delta.** Twelve shape/type
 * combinations are not twelve stylesheets: a type pairing and the corner slider are entirely
 * token-valued, and only three of the four shapes add rules at all. See `chrome.ts` for why
 * that split is the design rather than an optimisation.
 *
 * **Nothing here names a physical side**, so the page follows `<html dir>` on its own (§4.1,
 * #48). The grid and the flex rows already lay out along the inline axis; `text-align:end` on
 * the times column is the one declaration that had to be written logically rather than as
 * `right`, and `chrome.ts`'s `ruledLeft` shape was written that way from the start. A new rule
 * reaching for `left`, `right`, `margin-left` or `padding-right` is how a page with `lang="ar"`
 * quietly goes back to being laid out the wrong way round.
 */

import { shapeRules, radius, typeTokens, type Chrome } from "./chrome.js";
import type { Palette } from "./palette.js";

/** The cap from §6.2, in the unit §6.2 requires. Not a number to be tuned locally. */
const COLUMN = "min(100%, 25rem)";

/**
 * The page's spacing ladder: **every rung is a whole number of 0.25rem**, and the rung's own
 * number is that multiple, so `--lp-space-7` reads as "seven units, 1.75rem, 28px at the
 * default text size" without anyone opening this file.
 *
 * The set is the eight the page actually uses and no more. A gap in the sequence — there is no
 * 6, 8, 9, 11, 12 or 13 — is not an oversight to be filled in; it means no rule has needed that
 * step yet, and adding one is a decision that shows up in this array rather than inside a rule.
 *
 * **Why this is a token block rather than eight constants inlined at build time.** The values
 * do not vary by project, so the custom properties buy the *visitor* nothing and cost real
 * bytes against §6.5 — the measured price is on the ticket. What they buy is the thing this
 * ticket exists to fix: `floatingCard` used to retune the page's rhythm by restating
 * `.lp-page{gap:1.25rem}` inside its delta, where a literal is invisible, and it tightened the
 * gap from 1.75rem to 1.25rem without anyone deciding to. With a named ladder a shape either
 * uses a rung or is visibly overriding the rhythm, which is the same argument §3.2 makes for
 * not letting a shape re-derive a colour.
 *
 * **What is deliberately not on the ladder**, and stays a literal in the rules below:
 *
 * - `min(100%, 25rem)` — the column (§6.2), which is a cap and not a rhythm.
 * - `3rem` on `.lp-link` and `2.75rem` on `.lp-social-link` — **tap targets**, floors that come
 *   from the pointer-size guideline rather than from this scale. Both happen to be whole units
 *   (12 and 11); naming them as rungs would invite someone to "tidy" a 44px target to 40.
 * - `9rem` — the logo's height cap (§6.6), a bound on the owner's artwork.
 * - `1px`, `2px`, `3px` — hairlines, the focus ring and `ruledLeft`'s axis. Line weights are
 *   not spacing, and §1 wants borders rare rather than gridded.
 * - the unitless `1.2` line height on the business name, `0.18em` underline offsets and
 *   `calc(var(--lp-radius) + 0.5rem)` — type- and radius-relative, each on its own axis.
 */
const SPACE: readonly number[] = [1, 2, 3, 4, 5, 7, 10, 14];

/** One unit, in `rem`. `0.25` is exact in binary, so §6.7's determinism survives the division. */
const UNIT_REM = 0.25;

/**
 * The page's type scale — four sizes, each of which more than one rule can now reach for.
 *
 * The *system* was already tokenised (`chrome.ts` emits the stacks, the weight, the tracking
 * and the line height per pairing); the scale was five loose numbers, three of them used once.
 * It lives here rather than in `typeTokens` because it does not vary by pairing: a pairing that
 * wanted its own scale would override these on `:root`, which is again the shape/rhythm
 * argument above.
 *
 * **1.125rem is gone from the page rather than named.** It was the hours mark's size, and the
 * mark now takes the same size as every other icon (see `.lp-hours-mark`); its only other
 * appearance was `.lp-panel`'s off-grid horizontal padding, which is now a rung. A step no rule
 * uses is bytes on every exported page for nothing.
 */
const TEXT: Readonly<Record<string, string>> = {
  /** The quiet line: the hours note, and a named social link's caption. */
  sm: "0.875rem",
  /** Body. The size everything inherits, and the size the icons are drawn at. */
  base: "1rem",
  /** The social row's glyph — half of its 2.75rem target, so the mark sits in a round button. */
  lg: "1.375rem",
  /** The business name, the page's one piece of display type. */
  xl: "1.625rem",
};

/**
 * The colour roles, as CSS custom properties, plus the structural tokens the shapes and
 * pairings resolve to.
 *
 * All eleven colour roles are emitted, including the two the default layout does not currently
 * name, because this block is the page's colour contract: a shape selects among these roles
 * (§3.2) and must never have to re-derive one. Eleven declarations of a seven-character hex is a
 * rounding error against §6.5's 30 KB chrome budget.
 *
 * The structural tokens after them are where three of the six controls (§3.1) land in full:
 * the type pairing is five values here and no rules anywhere, and corner softness is one.
 *
 * The ladders close the block. `--lp-gutter` is written as a rung rather than as `1.25rem` so
 * that the page's one named margin is visibly part of the same scale as everything inside it.
 */
function tokens(palette: Palette, chrome: Chrome): string {
  return [
    `color-scheme:${chrome.mode}`,
    `--lp-ground:${palette.ground}`,
    `--lp-ink:${palette.ink}`,
    `--lp-ink-muted:${palette.inkMuted}`,
    `--lp-surface:${palette.surface}`,
    `--lp-rule:${palette.rule}`,
    `--lp-brand:${palette.brand}`,
    `--lp-fill:${palette.buttonFill}`,
    `--lp-fill-hover:${palette.buttonFillHover}`,
    `--lp-fill-ink:${palette.buttonInk}`,
    `--lp-accent:${palette.accent}`,
    `--lp-accent-text:${palette.accentInk}`,
    `--lp-gutter:var(--lp-space-5)`,
    `--lp-radius:${radius(chrome.corners)}`,
    ...typeTokens(chrome.type),
    ...SPACE.map((rung) => `--lp-space-${rung}:${rung * UNIT_REM}rem`),
    ...Object.entries(TEXT).map(([step, size]) => `--lp-text-${step}:${size}`),
  ].join(";");
}

/**
 * The layout every shape starts from, and the only block that is always emitted.
 *
 * `centred` is this and nothing else, which is why the default combination is the cheapest one
 * and why a shape delta can stay short: it overrides three or four declarations rather than
 * restating a page.
 *
 * Two declarations exist purely so a delta can be short and stay honest. `.lp-link` carries a
 * transparent border so `colourBlock` can turn a filled button into an outlined one without
 * the button changing height, and `*{box-sizing:border-box}` is what keeps `floatingCard`'s
 * padding inside the column instead of adding to it.
 *
 * **The hover rule is one rule and it is here rather than in a shape**, for the same reason
 * the focus rule is: a state that four shapes each had to remember is a state one of them
 * forgets. It sets the fill *and* the ink together because `colourBlock` draws the buttons as
 * outlines with page ink on them — a hover that set only the background would put `--lp-ink`
 * on a filled button, which is the one pairing §3.3 does not cover. `:active` shares it so a
 * touch is answered as well as a pointer, and the label underlines because the fill's step is
 * bounded by the guarantee (see `palette.ts`) and on some brands there is barely any of it
 * left: the underline costs no contrast, is the same instrument the address line already
 * uses, and it is what makes the state visible on those pages.
 *
 * **Two gaps repeat and are meant to.** An icon stands `--lp-space-2` from the words beside it
 * everywhere it appears — in a link button, in a contact row, beside the address, inside a
 * named social link — and a stacked list puts `--lp-space-3` between its items. Those were four
 * gaps and two gaps before the ladder (8, 10, 10 and 6px against 10px), which is what "roughly
 * twenty literals" buys you: not a wrong number anywhere, just no number meaning anything.
 *
 * **The hours mark is an icon, not a heading.** §6.9 gives the hours panel a clock because a
 * glyph can name a panel where §2.5 forbids the ninth string a heading would need — but it was
 * set *larger* than body text and *quieter* than body text at once, which is a heading and a
 * caption cancelling out. It takes one instrument, and the instrument is colour: `--lp-ink-muted`
 * at the inherited body size, which is exactly what every other icon on this page is. §2 ranks
 * weight and colour above size and §6 keeps icons near their drawn size, so both point the same
 * way; and the mark cannot win the argument as a *heading* anyway, because §2.5 will not give it
 * a word to head. Sitting alone on its own line is the one thing left that no other icon does,
 * and it is now the panel's first row rather than a band above it — `--lp-space-2` below it is
 * the hours grid's own row gap, so the clock sits in the same rhythm as the days it names.
 */
const BASE = `
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;padding:var(--lp-space-10) var(--lp-gutter) var(--lp-space-14);background:var(--lp-ground);color:var(--lp-ink);font-family:var(--lp-font);font-size:var(--lp-text-base);line-height:var(--lp-line);min-height:100svh;display:flex}
.lp-page{width:${COLUMN};margin-inline:auto;margin-block:auto;display:flex;flex-direction:column;gap:var(--lp-space-7)}
.lp-icon{flex:none}
.lp-sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0}
a{color:var(--lp-accent-text)}
a:focus-visible{outline:2px solid var(--lp-accent-text);outline-offset:3px}
.lp-header{display:flex;flex-direction:column;align-items:center;gap:var(--lp-space-3);text-align:center}
.lp-logo{display:block;width:auto;max-width:100%;height:auto;max-height:9rem}
.lp-name{margin:0;font-family:var(--lp-font-head);font-size:var(--lp-text-xl);font-weight:var(--lp-head-weight);line-height:1.2;letter-spacing:var(--lp-head-track)}
.lp-tagline{margin:0;color:var(--lp-ink-muted)}
.lp-links{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:var(--lp-space-3)}
.lp-link{display:flex;align-items:center;justify-content:center;gap:var(--lp-space-2);min-height:3rem;padding:var(--lp-space-3) var(--lp-space-4);border:1px solid transparent;border-radius:var(--lp-radius);background:var(--lp-fill);color:var(--lp-fill-ink);font-weight:600;text-decoration:none;overflow-wrap:anywhere;transition:background-color 0.12s,border-color 0.12s}
.lp-link:hover,.lp-link:active{background:var(--lp-fill-hover);border-color:var(--lp-fill-hover);color:var(--lp-fill-ink);text-decoration:underline;text-underline-offset:0.18em;text-decoration-thickness:1px}
.lp-panel{margin:0;padding:var(--lp-space-4) var(--lp-space-5);border:1px solid var(--lp-rule);border-radius:var(--lp-radius);background:var(--lp-surface)}
.lp-hours{display:grid;grid-template-columns:auto 1fr;gap:var(--lp-space-2) var(--lp-space-4);margin:0;font-variant-numeric:tabular-nums}
.lp-day{margin:0;color:var(--lp-ink-muted)}
.lp-times{margin:0;display:flex;flex-direction:column;align-items:flex-end;text-align:end}
.lp-hours-mark{display:block;margin:0 0 var(--lp-space-2);color:var(--lp-ink-muted)}
.lp-note{margin:var(--lp-space-4) 0 0;color:var(--lp-ink-muted);font-size:var(--lp-text-sm)}
.lp-note:first-child{margin-top:0}
.lp-rows{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:var(--lp-space-3)}
.lp-row{display:flex;align-items:center;gap:var(--lp-space-2);color:var(--lp-ink);overflow-wrap:anywhere}
.lp-row .lp-icon{color:var(--lp-ink-muted)}
.lp-address{display:flex;align-items:flex-start;gap:var(--lp-space-2);margin:0;color:var(--lp-ink);text-decoration:none}
a.lp-address .lp-line:first-child{text-decoration:underline;text-underline-offset:0.18em;text-decoration-thickness:1px}
.lp-address .lp-icon{margin-top:var(--lp-space-1);color:var(--lp-ink-muted)}
.lp-social{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;justify-content:center;gap:var(--lp-space-1)}
.lp-social-link{display:flex;align-items:center;justify-content:center;width:2.75rem;height:2.75rem;border-radius:var(--lp-radius);color:var(--lp-accent-text);font-size:var(--lp-text-lg);text-decoration:none}
.lp-social-link--named{width:auto;gap:var(--lp-space-2);padding:0 var(--lp-space-3);font-size:var(--lp-text-base)}
.lp-social-name{font-size:var(--lp-text-sm)}`.trim();

/**
 * Build the stylesheet for one project's palette and resolved chrome.
 *
 * Deterministic by construction (§6.7): the only inputs are the palette's hex strings and the
 * four already-resolved values in `chrome`, and nothing here reads a clock or a random source.
 * The corner slider is rounded to three decimals on its way into `--lp-radius` for the same
 * reason — see `chrome.ts`.
 */
export function stylesheet(palette: Palette, chrome: Chrome): string {
  return [`:root{${tokens(palette, chrome)}}`, BASE, shapeRules(chrome.shape)]
    .filter((block) => block !== "")
    .join("\n");
}

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
 * **Every colour comes from the palette** (§3.2). Nothing here picks one, and the ten roles are
 * emitted as custom properties on `:root` so the rules below name a role rather than a value.
 * The shapes and pairings in `chrome.ts` do the same — they select among these roles and never
 * re-derive or invent one.
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
 * The colour roles, as CSS custom properties, plus the structural tokens the shapes and
 * pairings resolve to.
 *
 * All ten colour roles are emitted, including the two the default layout does not currently
 * name, because this block is the page's colour contract: a shape selects among these roles
 * (§3.2) and must never have to re-derive one. Ten declarations of a seven-character hex is a
 * rounding error against §6.5's 30 KB chrome budget.
 *
 * The structural tokens after them are where three of the six controls (§3.1) land in full:
 * the type pairing is five values here and no rules anywhere, and corner softness is one.
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
    `--lp-fill-ink:${palette.buttonInk}`,
    `--lp-accent:${palette.accent}`,
    `--lp-accent-ink:${palette.accentInk}`,
    `--lp-gutter:1.25rem`,
    `--lp-radius:${radius(chrome.corners)}`,
    ...typeTokens(chrome.type),
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
 */
const BASE = `
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;padding:2.5rem var(--lp-gutter) 3.5rem;background:var(--lp-ground);color:var(--lp-ink);font-family:var(--lp-font);font-size:1rem;line-height:var(--lp-line)}
.lp-page{width:${COLUMN};margin-inline:auto;display:flex;flex-direction:column;gap:1.75rem}
.lp-icon{flex:none}
.lp-sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0}
a{color:var(--lp-accent-ink)}
a:focus-visible{outline:2px solid var(--lp-accent-ink);outline-offset:3px}
.lp-header{display:flex;flex-direction:column;align-items:center;gap:0.75rem;text-align:center}
.lp-logo{display:block;width:auto;max-width:100%;height:auto;max-height:9rem}
.lp-name{margin:0;font-family:var(--lp-font-head);font-size:1.625rem;font-weight:var(--lp-head-weight);line-height:1.2;letter-spacing:var(--lp-head-track)}
.lp-tagline{margin:0;color:var(--lp-ink-muted)}
.lp-links{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:0.625rem}
.lp-link{display:flex;align-items:center;justify-content:center;gap:0.5rem;min-height:3rem;padding:0.75rem 1rem;border:1px solid transparent;border-radius:var(--lp-radius);background:var(--lp-fill);color:var(--lp-fill-ink);font-weight:600;text-decoration:none;overflow-wrap:anywhere}
.lp-panel{margin:0;padding:1rem 1.125rem;border:1px solid var(--lp-rule);border-radius:var(--lp-radius);background:var(--lp-surface)}
.lp-hours{display:grid;grid-template-columns:auto 1fr;gap:0.375rem 1rem;margin:0;font-variant-numeric:tabular-nums}
.lp-day{margin:0;color:var(--lp-ink-muted)}
.lp-times{margin:0;display:flex;flex-direction:column;align-items:flex-end;text-align:end}
.lp-note{margin:1rem 0 0;color:var(--lp-ink-muted);font-size:0.875rem}
.lp-note:first-child{margin-top:0}
.lp-rows{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:0.625rem}
.lp-row{display:flex;align-items:center;gap:0.625rem;color:var(--lp-ink);overflow-wrap:anywhere}
.lp-row .lp-icon{color:var(--lp-ink-muted)}
.lp-address{display:flex;align-items:flex-start;gap:0.625rem;margin:0;color:var(--lp-ink)}
.lp-address .lp-icon{margin-top:0.25rem;color:var(--lp-ink-muted)}
.lp-social{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;justify-content:center;gap:0.25rem}
.lp-social-link{display:flex;align-items:center;justify-content:center;width:2.75rem;height:2.75rem;border-radius:var(--lp-radius);color:var(--lp-accent-ink);font-size:1.375rem;text-decoration:none}`.trim();

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

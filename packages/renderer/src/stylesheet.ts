/**
 * The exported page's entire stylesheet, emitted into one `<style>` block (`SPEC.md` §6.1).
 *
 * **The column is `min(100%, 25rem)`** (§6.8) — 400 CSS px at the browser's default text size,
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
 * the size budget — §6.5 rasterises the logo at 3× the column, so pixel count grows with its
 * square.
 *
 * **Every colour comes from the palette** (§3.2). Nothing here picks one, and the ten roles are
 * emitted as custom properties on `:root` so the rules below name a role rather than a value.
 *
 * **This is the default layout only.** The four shapes, the three type pairings and the
 * corner-softness slider are #27's; `--lp-radius` and `--lp-font` are the seams they replace.
 */

import type { Palette } from "./palette.js";
import type { Mode } from "./project.js";

/** The cap from §6.8, in the unit §6.8 requires. Not a number to be tuned locally. */
const COLUMN = "min(100%, 25rem)";

/**
 * A system font stack (§6.2). No webfonts: no bytes, no embedding licence, and the accepted
 * cost is that glyphs differ across platforms. #27 replaces this with the three pairings.
 */
const FONT_STACK = `system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;

/**
 * The colour roles, as CSS custom properties.
 *
 * All ten are emitted, including the two the default layout does not currently name, because
 * this block is the page's colour contract: a shape selects among these roles (§3.2) and must
 * never have to re-derive one. Ten declarations of a seven-character hex is a rounding error
 * against §6.4's 30 KB chrome budget.
 */
function tokens(palette: Palette, mode: Mode): string {
  return [
    `color-scheme:${mode}`,
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
    `--lp-radius:0.75rem`,
    `--lp-font:${FONT_STACK}`,
  ].join(";");
}

/**
 * Build the stylesheet for one project's palette and mode.
 *
 * Deterministic by construction (§6.6): the only inputs are the palette's hex strings and the
 * mode, and nothing here reads a clock or a random source.
 */
export function stylesheet(palette: Palette, mode: Mode): string {
  return `
:root{${tokens(palette, mode)}}
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;padding:2.5rem var(--lp-gutter) 3.5rem;background:var(--lp-ground);color:var(--lp-ink);font:1rem/1.5 var(--lp-font)}
.lp-page{width:${COLUMN};margin-inline:auto;display:flex;flex-direction:column;gap:1.75rem}
.lp-icon{flex:none}
.lp-sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0}
a{color:var(--lp-accent-ink)}
a:focus-visible{outline:2px solid var(--lp-accent-ink);outline-offset:3px}
.lp-header{display:flex;flex-direction:column;align-items:center;gap:0.75rem;text-align:center}
.lp-logo{display:block;width:auto;max-width:100%;height:auto;max-height:9rem}
.lp-name{margin:0;font-size:1.625rem;line-height:1.2;letter-spacing:-0.01em}
.lp-tagline{margin:0;color:var(--lp-ink-muted)}
.lp-links{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:0.625rem}
.lp-link{display:flex;align-items:center;justify-content:center;gap:0.5rem;min-height:3rem;padding:0.75rem 1rem;border-radius:var(--lp-radius);background:var(--lp-fill);color:var(--lp-fill-ink);font-weight:600;text-decoration:none;overflow-wrap:anywhere}
.lp-panel{margin:0;padding:1rem 1.125rem;border:1px solid var(--lp-rule);border-radius:var(--lp-radius);background:var(--lp-surface)}
.lp-hours{display:grid;grid-template-columns:auto 1fr;gap:0.375rem 1rem;margin:0;font-variant-numeric:tabular-nums}
.lp-day{margin:0;color:var(--lp-ink-muted)}
.lp-times{margin:0;display:flex;flex-direction:column;align-items:flex-end;text-align:right}
.lp-note{margin:1rem 0 0;color:var(--lp-ink-muted);font-size:0.875rem}
.lp-note:first-child{margin-top:0}
.lp-rows{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:0.625rem}
.lp-row{display:flex;align-items:center;gap:0.625rem;color:var(--lp-ink);overflow-wrap:anywhere}
.lp-row .lp-icon{color:var(--lp-ink-muted)}
.lp-address{display:flex;align-items:flex-start;gap:0.625rem;margin:0;color:var(--lp-ink)}
.lp-address .lp-icon{margin-top:0.25rem;color:var(--lp-ink-muted)}
.lp-social{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;justify-content:center;gap:0.25rem}
.lp-social-link{display:flex;align-items:center;justify-content:center;width:2.75rem;height:2.75rem;border-radius:var(--lp-radius);color:var(--lp-accent-ink);font-size:1.375rem;text-decoration:none}
`.trim();
}

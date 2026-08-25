/**
 * Which combinations of the page's styling the appearance ritual photographs by default.
 * `SPEC.md` §7.4, §3.1.
 *
 * **The rule: every shape, in both modes.** The set this replaced sampled four combinations and
 * happened to contain no `floatingCard` + `dark` — which is exactly the pairing that carried the
 * live WCAG failure [#184](https://github.com/mandyMooreFan/linkpage/issues/184) fixed. A default
 * run of the ritual showed a reviewer of that change nothing at all, and `--variant` reached it
 * only for someone who already knew what they were looking for. For a review ritual that is the
 * wrong way round: **a ticket that moves a screen should get a picture of that screen without
 * knowing a flag.**
 *
 * **It is a covering set, not the product.** Four shapes × three type pairings × two modes is
 * twenty-four pages, and photographing all of them at both sizes is how you get a run nobody
 * opens. The two axes that decide *what colour lands on what* are shape and mode — §3.2 derives
 * every role against the backdrop the shape puts the page on, and the mode is which backdrop
 * that is — so those two are covered exhaustively. **The type pairing is covered once each**
 * rather than crossed: §6.1 makes a pairing entirely token-valued, so it changes the letters and
 * nothing about the contrast. `--variant` still reaches any of the twenty-four by name, and that
 * is the right shape for the sixteen this set leaves out: they are a lookup, not a review.
 *
 * **The design audit's four are kept verbatim** — `centred-classic-light`,
 * `colourBlock-modern-dark`, `floatingCard-friendly-light`, `ruledLeft-classic-dark` — so a set
 * taken today still lies beside [#172](https://github.com/mandyMooreFan/linkpage/issues/172)'s
 * baseline. The four added to them are the four missing shape/mode pairs, and
 * `floatingCard-friendly-dark` is deliberately the same pairing as its light twin: with the type
 * held still, that pair is a picture of the mode change on its own, which is the comparison #184
 * was about.
 */

/** §3.1's four shapes, in the order the style control offers them. */
export const SHAPES = ["centred", "colourBlock", "floatingCard", "ruledLeft"];

/** §3.1's two modes. */
export const MODES = ["light", "dark"];

/** §3.1's three type pairings. */
export const TYPES = ["classic", "modern", "friendly"];

/** The four the design audit captured, kept so old sets stay comparable. */
export const AUDIT_VARIANTS = [
  "centred-classic-light",
  "colourBlock-modern-dark",
  "floatingCard-friendly-light",
  "ruledLeft-classic-dark",
];

/**
 * The default set: every shape in both modes, grouped so a shape's two modes sit next to each
 * other in a folder listing — the pair a reviewer actually compares.
 */
export const DEFAULT_VARIANTS = [
  "centred-classic-light",
  "centred-friendly-dark",
  "colourBlock-classic-light",
  "colourBlock-modern-dark",
  "floatingCard-friendly-light",
  "floatingCard-friendly-dark",
  "ruledLeft-modern-light",
  "ruledLeft-classic-dark",
];

/** A combination's three parts, or `null` for something that is not one. */
export function parseVariant(combo) {
  const [shape, type, mode, ...rest] = String(combo).split("-");
  if (rest.length > 0) return null;
  if (!SHAPES.includes(shape) || !TYPES.includes(type) || !MODES.includes(mode)) return null;
  return { shape, type, mode };
}

/**
 * Which shape/mode pairs a set of combinations fails to reach.
 *
 * This is the gap that shipped, stated as a function so it can be asserted rather than noticed:
 * the old default set's missing pair was invisible until a reviewer went looking for a screen
 * that was not there.
 */
export function uncoveredPairs(variants) {
  const seen = new Set(
    variants
      .map(parseVariant)
      .filter((parsed) => parsed !== null)
      .map(({ shape, mode }) => `${shape}-${mode}`),
  );
  return SHAPES.flatMap((shape) => MODES.map((mode) => `${shape}-${mode}`)).filter(
    (pair) => !seen.has(pair),
  );
}

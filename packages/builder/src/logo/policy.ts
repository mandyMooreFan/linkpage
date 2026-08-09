/**
 * The constants and the arithmetic of `SPEC.md` §6.5 — everything the pipeline decides that
 * does not require looking at a pixel or touching a canvas.
 *
 * It is a separate module from `intake.ts` because these are the numbers a reader comes
 * looking for, and because every one of them is a claim about the world that could turn out
 * to be wrong. Each carries its derivation and what would move it.
 */

/** The only two encodings that may ever leave this pipeline. */
export type Encoding = "image/png" | "image/jpeg";

/**
 * Both of them, so a test can assert the set has not grown.
 *
 * **No WebP and no AVIF**, and the reason is worth keeping next to the list because the bug
 * it prevents ships looking like it works. Safari cannot encode WebP on any platform or
 * version, and the canvas fallback is *silent*: ask `toBlob`/`toDataURL` for
 * `image/webp` and you are handed a PNG with no error and no warning. Since iOS never gets
 * WebP, the working branch would serve desktop owners and the broken one would serve the
 * phone-first users this product is built around (§6.5). AVIF has no cross-browser canvas
 * encode at all. `browser.ts` checks `blob.type` regardless — see the note there.
 */
export const ENCODINGS: readonly Encoding[] = ["image/png", "image/jpeg"];

/**
 * The `accept` attribute for the file input: the explicit list, never `image/*` (§6.5).
 *
 * On desktop this greys a designer's `.ai` and `.eps` out of the picker, so the failure never
 * happens rather than being reported well. `accept` is a hint to the picker and never a gate:
 * "All files" is one tap away on every platform, and a file that arrives regardless is
 * decoded on its merits (see `importLogo`).
 *
 * **Media types only, no file extensions.** Listing both is the usual advice, and it is the
 * wrong trade here: extensions buy a little on old desktop pickers, and on iOS an `accept`
 * carrying extensions has been reported to disable the Photo Library option outright — which
 * on a phone-first product is the picker. §6.5's stated benefit is a desktop one, and media
 * types already deliver it there.
 *
 * On iOS this is also the lever on HEIC. See `SPEC.md` §11 item 1 for what is known.
 */
export const LOGO_ACCEPT = "image/png,image/jpeg,image/svg+xml";

/** The column the logo sits in: `min(100%, 25rem)`, so 400 CSS px at the default root size (§6.8). */
export const COLUMN_CSS_PX = 400;

/** Raster pixels per CSS pixel the logo is sized for (§6.5). */
export const LOGO_DENSITY = 3;

/**
 * The longest edge of the stored raster: 3 × 400 = **1200 px** (§6.5, §6.8).
 *
 * Confirmed rather than chosen by §6.8, and load-bearing in both directions: the column is
 * pinned because §5.2 and §7.6 depend on it, so if 3× turns out to be too little the
 * constant moves and the column does not. §11 item 3 is that question.
 */
export const LOGO_MAX_EDGE = COLUMN_CSS_PX * LOGO_DENSITY;

/**
 * The logo's share of §6.4's page budget, in bytes of `index.html`.
 *
 * Measured against the length of the `data:` URI, because that is the string that ends up in
 * the file and §6.4 is explicit that the budget counts encoded bytes on disk. base64's +33%
 * is therefore inside this number rather than something to correct for.
 *
 * **A budget, not a gate** (§6.4). Exceeding it resizes; it never refuses. A pipeline that
 * refused would strand an owner from their own page.
 */
export const LOGO_BUDGET_BYTES = 120 * 1024;

/**
 * The smallest longest-edge the budget loop may shrink to: 400 px, one CSS pixel per raster
 * pixel across the column.
 *
 * Below this the logo is soft on every screen made this decade, and shrinking further trades
 * something the owner can see for bytes nobody counted. If an image is still over budget
 * here, it ships over budget — §6.4 is a budget, not a gate.
 */
export const MIN_LOGO_EDGE = COLUMN_CSS_PX;

/** How many encode attempts the budget loop may make before it accepts what it has. */
export const MAX_ENCODE_ATTEMPTS = 6;

/**
 * JPEG quality, fixed.
 *
 * **Dimension is the lever that enforces the budget, not format** (§6.5) — and not quality
 * either. A quality slider driven by a byte target produces an image whose softness varies
 * with how big the owner's file happened to be, which is exactly the unpredictability §6.5
 * is avoiding. 0.82 is the shoulder of the quality/bytes curve for photographic content.
 */
export const JPEG_QUALITY = 0.82;

/**
 * The guard on the uploaded source file, in bytes (§6.5).
 *
 * Secure static mode stops scripts; it does not stop a pathologically large document from
 * hanging the tab, and the tab in question belongs to someone on a phone. 20 MB clears every
 * honest input by a wide margin — a 48-megapixel phone photo lands around 15 MB and a logo
 * from a designer is three orders of magnitude under it — so this is a guard against the
 * abnormal and not a limit the owner is expected to work around.
 */
export const MAX_SOURCE_BYTES = 20 * 1024 * 1024;

/**
 * The same guard for a source that looks like markup, in bytes.
 *
 * Much tighter, because bytes are a poor proxy for the cost of an SVG: nesting, filters and
 * entity expansion make a small file expensive, and the expensive part happens inside the
 * decoder where we cannot interrupt it. A real SVG logo is tens of kilobytes; 2 MB is already
 * a file nobody meant to make.
 */
export const MAX_MARKUP_BYTES = 2 * 1024 * 1024;

/** How long the decoder gets before the file is called unreadable, in milliseconds. */
export const DECODE_TIMEOUT_MS = 10_000;

/** Bytes read from the front of the file to recognise a markup document. */
export const SNIFF_BYTES = 512;

/** Why an upload did not become a logo. */
export type LogoFailure = "undecodable" | "too-large";

/**
 * The owner-facing half of a failure. The first is verbatim from §6.5.
 *
 * Neither names a format we could not parse, a byte count or a limit. What the owner can act
 * on is *which file to pick next*, and both sentences are about that.
 */
export const LOGO_MESSAGES: Record<LogoFailure, string> = {
  undecodable:
    "We can't read that kind of file. A PNG, JPG or SVG works. If your logo came from a " +
    "designer or sign-maker, ask them for a PNG.",
  "too-large":
    "That file is too big for us to open. A PNG, JPG or SVG saved for the web works — if it " +
    "came straight from a camera, try a smaller copy.",
};

/**
 * The one thing the pipeline ever says about a *successful* upload, verbatim from §6.5.
 *
 * Note what is not in it: no kilobytes, no percentage, and the word "compression" nowhere.
 * The owner is not being asked to evaluate a trade-off, they are being told the one thing
 * that would let them act — that a logo file would look better than the photo they picked.
 * And it is said **only** when the result will render visibly soft; announcing a resize that
 * lost nothing is noise, and it trains owners to skip the message that will one day matter.
 */
export const SOFT_RESULT_MESSAGE =
  "We made your logo smaller so your page loads quickly on a phone. Photos don't shrink as " +
  "well as logos do — if you have a logo file, it'll look sharper.";

/** A pixel size. */
export interface Size {
  readonly width: number;
  readonly height: number;
}

/** The longest edge of a size. */
export function longestEdge(size: Size): number {
  return Math.max(size.width, size.height);
}

/**
 * Scale a size so its longest edge is `maxEdge`, keeping the aspect ratio.
 *
 * `allowUpscale` is the difference between a raster source and a vector one. Enlarging a
 * photograph invents detail and wastes bytes, so a small PNG is left alone. Enlarging an SVG
 * costs nothing and is the whole reason the format exists — and the alternative is storing a
 * wordmark at whatever arbitrary size the decoder assigned an image that never had one.
 */
export function fitWithin(size: Size, maxEdge: number, allowUpscale = false): Size {
  const edge = longestEdge(size);
  if (edge <= 0) return { width: 0, height: 0 };
  const scale = allowUpscale ? maxEdge / edge : Math.min(1, maxEdge / edge);
  return {
    width: Math.max(1, Math.round(size.width * scale)),
    height: Math.max(1, Math.round(size.height * scale)),
  };
}

/**
 * The next size to try when the encoded result is over budget.
 *
 * Encoded bytes track pixel count, so the square root of the overshoot is the scale that
 * lands near the target — one step rather than a walk down a fixed ratio, which matters
 * because every step is a full re-encode on a phone. Clamped so a wild overshoot cannot
 * collapse the image in one go and a marginal one cannot fail to make progress.
 */
export function shrinkToward(size: Size, budgetBytes: number, actualBytes: number): Size {
  const overshoot = actualBytes / Math.max(1, budgetBytes);
  const scale = Math.min(0.9, Math.max(0.5, Math.sqrt(1 / overshoot)));
  const edge = Math.max(MIN_LOGO_EDGE, Math.floor(longestEdge(size) * scale));
  return fitWithin(size, edge);
}

/**
 * Half the size, floored at `MIN_LOGO_EDGE`.
 *
 * The recovery from a draw that came back empty, which is how iOS reports that an image
 * exceeded its canvas-area ceiling (§11 item 5). There is no measurement to aim at — the
 * result carried no information beyond "not this big" — so the step is a bisection.
 */
export function halve(size: Size): Size {
  return fitWithin(size, Math.max(MIN_LOGO_EDGE, Math.floor(longestEdge(size) / 2)));
}

/**
 * Whether the front of a file looks like an XML or HTML document.
 *
 * **This is not a gate and not a format check.** Nothing is accepted or rejected on the
 * strength of it: it selects which size guard applies and whether the raster may be enlarged.
 * Whether the file decodes is still decided by handing it to the decoder, because media types
 * and extensions both lie (§6.5).
 */
export function looksLikeMarkup(head: string): boolean {
  // A byte-order mark ahead of the declaration is common enough in exported SVG to be worth
  // stepping over, and invisible enough to be worth naming as an escape rather than pasting.
  return /^[\s\uFEFF]*<(\?xml|!doctype|!--|svg)/i.test(head);
}

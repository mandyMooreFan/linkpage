/**
 * Looking at pixels: the three questions the pipeline asks of a decoded image.
 *
 * Everything here is a pure function of an RGBA buffer, which is what makes the pipeline's
 * decisions testable without a browser. The buffer arrives from a canvas in production and
 * from a literal `Uint8ClampedArray` in the tests, and neither module knows the difference.
 *
 * The three questions, in the order the pipeline asks them:
 *
 * 1. **Is anything there at all?** (`isBlank`) — iOS refuses to rasterise past a canvas-area
 *    ceiling by returning a *fully transparent canvas and no error* (§11 item 5). A pipeline
 *    that does not look would store a blank logo and report success.
 * 2. **Is there meaningful transparency?** (`hasMeaningfulAlpha`) — if so the answer to
 *    question 3 does not matter, because JPEG has no alpha and there is no background to
 *    composite onto: the page has a light *and* a dark mode (§6.6).
 * 3. **Flat art or a photograph?** (`countDistinctColours`) — §6.6's mechanism, though not
 *    quite for §6.6's stated reason. See `PHOTOGRAPHIC_COLOURS` and `SPEC.md` §11 item 2.
 */

/**
 * An RGBA pixel buffer, structurally the DOM's `ImageData`.
 *
 * Declared rather than imported so this module compiles and runs anywhere; the browser
 * adapter hands its `ImageData` straight in.
 */
export interface Raster {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

/**
 * The edge of the square the image is sampled into before it is measured.
 *
 * 64 × 64 is 4096 pixels — enough that a photograph cannot avoid filling the histogram, few
 * enough that the whole measurement is a few hundred microseconds on a slow phone. The
 * sample is square regardless of the source's aspect ratio: nothing below is geometric.
 *
 * Doubling it to 128 was measured and separates the classes *worse*, for the same reason
 * quantising does — see `COLOUR_BITS`. It is also the size at which the sample must be drawn
 * **without smoothing**; an averaging resampler invents colours along every antialiased edge
 * and loses them in the middle of a photograph, which pushes both classes toward each other.
 */
export const SAMPLE_EDGE = 64;

/**
 * Alpha at or above which a pixel counts as opaque.
 *
 * Not 255, because a resampler will land a pixel at 254 on a flat opaque image and a
 * threshold that treats that as transparency would send every image down the PNG branch.
 */
export const OPAQUE_ALPHA = 250;

/** Alpha below which a pixel's colour is not worth counting — it is very nearly not there. */
const VISIBLE_ALPHA = 8;

/**
 * Bits kept per channel when colours are counted: **8, which is to say none are discarded.**
 *
 * Quantising looks obviously right — two pixels of the same flat ink differing by one in the
 * blue channel are the same colour to a reader, and counting them separately is how a
 * wordmark would come to look like a photograph — and it is measurably wrong. Five bits
 * separated the two classes *worse* than no quantisation at all, because it collapses a
 * low-key photograph (a rose, a sunset, an overcast street) into a handful of buckets far
 * faster than it collapses an antialiased edge. `SPEC.md` §11 item 2 records the numbers.
 *
 * Kept as a named constant rather than deleted because the finding is counter-intuitive
 * enough that the next person will reach for it again.
 */
export const COLOUR_BITS = 8;

/**
 * Distinct colours at or above which the sample is called photographic.
 *
 * **Measured, not reasoned** — `SPEC.md` §11 item 2 has the corpus and the confusion matrix.
 * The short version: the two classes overlap, so this is not the middle of a gap. It is
 * placed where the error it makes is the affordable one.
 *
 * - A wordmark — the case §6.6 names, and the only one where the wrong choice produces
 *   artefacts a reader can see — measures 29 to 510 across every provocation available:
 *   heavy JPEG, a drop shadow, a full-frame gradient behind the type, a photographed sign.
 *   That is a factor of two and a half below this line at the very worst.
 * - What overlaps a photograph is *detailed illustration flattened onto white*, where JPEG
 *   at this size is a defensible encoding anyway.
 */
export const PHOTOGRAPHIC_COLOURS = 1200;

/** What the content is, for the purpose of choosing an encoding. */
export type Content = "flat" | "photographic";

/** What a sample turned out to be. */
export interface Analysis {
  /** Nothing was drawn — a decode that failed without saying so (§11 item 5). */
  readonly blank: boolean;
  /** Transparency that compositing would destroy (§6.6). */
  readonly alpha: boolean;
  /** Distinct quantised colours among the visible pixels. */
  readonly colours: number;
  readonly content: Content;
}

/** Whether the raster has any addressable pixels at all. */
function isEmpty(raster: Raster): boolean {
  return raster.width <= 0 || raster.height <= 0 || raster.data.length < 4;
}

/**
 * Whether nothing was drawn.
 *
 * A canvas that was never successfully drawn into is transparent black, and so is the result
 * iOS hands back when an image exceeds its decode or canvas-area ceiling — silently, with a
 * `drawImage` that did not throw (§11 item 5). Any visible pixel anywhere disproves it, so
 * this is a scan that stops early on every real image and only runs to the end on the failure
 * it is looking for.
 */
export function isBlank(raster: Raster): boolean {
  if (isEmpty(raster)) return true;
  const { data } = raster;
  for (let i = 3; i < data.length; i += 4) {
    if ((data[i] ?? 0) >= VISIBLE_ALPHA) return false;
  }
  return true;
}

/**
 * Whether the image carries transparency worth keeping.
 *
 * **Deliberately the most generous test in this file: one pixel is enough.** The two
 * mistakes are not symmetrical. Keeping alpha that was not needed costs bytes, and §6.5 has
 * roughly ten times the headroom a real logo uses. Discarding alpha that was needed means
 * JPEG, which means compositing onto *a* background — and since the page has both a light and
 * a dark mode, whichever one is baked in is wrong half the time and cannot be undone (§6.6).
 *
 * Resampling cannot invent transparency: an opaque source drawn to fill an opaque-covered
 * canvas stays opaque, so a photograph does not trip this by accident.
 */
export function hasMeaningfulAlpha(raster: Raster): boolean {
  if (isEmpty(raster)) return false;
  const { data } = raster;
  for (let i = 3; i < data.length; i += 4) {
    if ((data[i] ?? 0) < OPAQUE_ALPHA) return true;
  }
  return false;
}

/**
 * Distinct colours in the sample, quantised to `COLOUR_BITS` per channel.
 *
 * Pixels that are essentially invisible are skipped rather than counted as black: the RGB
 * behind a fully transparent pixel is whatever the canvas happened to leave there, and
 * counting it would add a colour to every image with a transparent margin.
 */
export function countDistinctColours(raster: Raster): number {
  if (isEmpty(raster)) return 0;
  const { data } = raster;
  const shift = 8 - COLOUR_BITS;
  const seen = new Set<number>();
  for (let i = 0; i + 3 < data.length; i += 4) {
    if ((data[i + 3] ?? 0) < VISIBLE_ALPHA) continue;
    const r = (data[i] ?? 0) >> shift;
    const g = (data[i + 1] ?? 0) >> shift;
    const b = (data[i + 2] ?? 0) >> shift;
    seen.add((r << (COLOUR_BITS * 2)) | (g << COLOUR_BITS) | b);
  }
  return seen.size;
}

/** Ask all three questions of one sample. */
export function analyse(sample: Raster): Analysis {
  const blank = isBlank(sample);
  const colours = blank ? 0 : countDistinctColours(sample);
  return {
    blank,
    alpha: !blank && hasMeaningfulAlpha(sample),
    colours,
    content: colours >= PHOTOGRAPHIC_COLOURS ? "photographic" : "flat",
  };
}

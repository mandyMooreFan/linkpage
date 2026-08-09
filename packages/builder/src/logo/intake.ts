import type { Logo } from "@linkpage/renderer";
import { analyse, isBlank, SAMPLE_EDGE, type Raster } from "./analyse.js";
import {
  DECODE_TIMEOUT_MS,
  fitWithin,
  halve,
  JPEG_QUALITY,
  LOGO_BUDGET_BYTES,
  LOGO_MAX_EDGE,
  LOGO_MESSAGES,
  longestEdge,
  looksLikeMarkup,
  MAX_ENCODE_ATTEMPTS,
  MAX_MARKUP_BYTES,
  MAX_SOURCE_BYTES,
  shrinkToward,
  SNIFF_BYTES,
  SOFT_RESULT_MESSAGE,
  type Encoding,
  type LogoFailure,
  type Size,
} from "./policy.js";

/**
 * The logo intake pipeline: a file the owner picked in, a `{ src, width, height }` out (§6.6).
 *
 * **The browser is a parameter.** Everything that needs a canvas is behind `ImageCodec`, and
 * everything above it — the guards, the format decision, the resize arithmetic, the budget
 * loop, and every sentence the owner is shown — is ordinary code over ordinary values. That
 * is not testability decoration: it is the only way this file's decisions can be exercised at
 * all, since the one thing a headless test cannot do is decode a JPEG.
 *
 * **The order of the steps is the design.** Each one exists because of a specific way the
 * previous one can be lied to.
 *
 * 1. **Size guard, before the decoder ever sees the bytes** (§6.6). Rasterising through
 *    `<img>` puts an SVG in the browser's secure static mode, where script and external
 *    references are forbidden by the engine rather than by our sanitiser — that is the whole
 *    argument for rasterising. What secure static mode does *not* stop is a pathologically
 *    large or deeply nested document hanging the tab, so bytes are checked first, and a
 *    source that looks like markup is held to a much tighter limit than a photograph.
 * 2. **Decode or fail** (§6.6). No gate on media type and none on extension — both lie, and
 *    handing the file to the decoder is the only honest test. A decode that never finishes is
 *    a failure too, which is what the deadline is for.
 * 3. **Look at what came back.** A blank raster means the decode failed without saying so
 *    (§11 item 5); it is not a logo, however successfully it was returned.
 * 4. **Choose the encoding from the content, never from the input's format** (§6.6). Alpha
 *    first, because it overrides everything: JPEG has no alpha, the page has a light *and* a
 *    dark mode, and compositing bakes in the wrong one half the time.
 * 5. **Resize, then let dimension enforce the budget** (§6.6, §6.5). Quality and format are
 *    not levers here; the loop moves pixels and nothing else.
 *
 * **A failed input never damages what is already there.** Nothing in this module writes
 * anything: it returns a value, and the only way that value can replace an existing logo is
 * `applyIntake` in `apply.ts`, which cannot do so on the failing branch because the failing
 * branch of the union has no logo in it.
 */

/** An RGBA raster that can be inspected and encoded — one canvas, in the browser adapter. */
export interface RenderedImage {
  readonly width: number;
  readonly height: number;
  /** The pixels, for `analyse.ts`. Structurally the DOM's `ImageData`. */
  pixels(): Raster;
  /**
   * Encode as a `data:` URI.
   *
   * **Must reject if the encoder did not honour `type`.** Canvas encoding falls back
   * *silently*: ask for a type the browser cannot write and you receive a PNG, no error and
   * no warning (§6.6). The port carries the obligation because only the adapter can see the
   * evidence — `blob.type`.
   */
  encode(type: Encoding, quality: number): Promise<string>;
  release(): void;
}

/** A decoded image, not yet drawn at any particular size. */
export interface DecodedImage {
  /** Intrinsic size. For an SVG with no width or height this is whatever the engine assigned. */
  readonly width: number;
  readonly height: number;
  /**
   * Draw at exactly this size.
   *
   * `smooth` is off for the sample and on for the output, and the difference matters to the
   * flat-vs-photo decision: a smoothing resampler averages neighbouring pixels and therefore
   * *invents* colours along every antialiased edge, which is the mechanism by which a
   * wordmark would come to look like a photograph. Point sampling cannot add a colour the
   * image did not contain.
   */
  render(size: Size, smooth: boolean): Promise<RenderedImage>;
  release(): void;
}

/** The one thing this pipeline needs a browser for. */
export interface ImageCodec {
  /** Decode arbitrary bytes, or reject. Never inspects a media type to decide. */
  decode(source: Blob): Promise<DecodedImage>;
}

/** Everything the pipeline decided, and the one thing it may say about it. */
export interface LogoAccepted {
  readonly ok: true;
  /** Exactly what `project.json` stores (§4.1, §6.6). */
  readonly logo: Logo;
  readonly encoding: Encoding;
  /**
   * `null` in the common case, which is most of them.
   *
   * Set only when the budget forced the raster below the size it renders at, which is the
   * only outcome an owner can see (§6.6).
   */
  readonly notice: string | null;
}

/** Why nothing happened, and what to show. There is no logo on this branch, deliberately. */
export interface LogoRejected {
  readonly ok: false;
  readonly reason: LogoFailure;
  readonly message: string;
}

export type LogoIntake = LogoAccepted | LogoRejected;

export interface ImportOptions {
  readonly decodeTimeoutMs?: number;
  readonly maxSourceBytes?: number;
  readonly maxMarkupBytes?: number;
  readonly budgetBytes?: number;
  readonly maxEdge?: number;
}

function reject(reason: LogoFailure): LogoRejected {
  return { ok: false, reason, message: LOGO_MESSAGES[reason] };
}

/** The first bytes as text, for `looksLikeMarkup`. A source that cannot be read reads as empty. */
async function readHead(source: Blob): Promise<string> {
  try {
    return await source.slice(0, SNIFF_BYTES).text();
  } catch {
    return "";
  }
}

/**
 * Fail a decode that has not finished in time.
 *
 * A hung decode is indistinguishable from an unreadable file from where the owner sits, and
 * far worse: an error can be acted on and a spinner cannot. The late result is released if it
 * ever arrives, and its rejection is swallowed — by then nobody is waiting for it.
 */
function withDeadline(work: Promise<DecodedImage>, ms: number): Promise<DecodedImage> {
  return new Promise<DecodedImage>((resolve, rejectWith) => {
    let settled = false;
    const timer = setTimeout(() => {
      settled = true;
      rejectWith(new Error("decode timed out"));
    }, ms);
    work.then(
      (image) => {
        clearTimeout(timer);
        if (settled) image.release();
        else resolve(image);
      },
      (error: unknown) => {
        clearTimeout(timer);
        if (!settled) rejectWith(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

function usableSize(image: { width: number; height: number }): boolean {
  return (
    Number.isFinite(image.width) &&
    Number.isFinite(image.height) &&
    image.width >= 1 &&
    image.height >= 1
  );
}

/**
 * Turn whatever the owner picked into a logo, or into a sentence explaining why not.
 *
 * Never throws and never mutates: the caller decides what to do with the result, and on the
 * failing branch there is nothing it *can* do to the project (§6.6, §7.9).
 */
export async function importLogo(
  source: Blob,
  codec: ImageCodec,
  options: ImportOptions = {},
): Promise<LogoIntake> {
  const maxEdge = options.maxEdge ?? LOGO_MAX_EDGE;
  const budget = options.budgetBytes ?? LOGO_BUDGET_BYTES;

  // Step 1. Bytes, before the decoder. A source that looks like markup is held to the
  // tighter limit, because for markup the byte count understates the work by a long way.
  const vector = looksLikeMarkup(await readHead(source));
  const limit = vector
    ? (options.maxMarkupBytes ?? MAX_MARKUP_BYTES)
    : (options.maxSourceBytes ?? MAX_SOURCE_BYTES);
  if (source.size > limit) return reject("too-large");

  // Step 2. Decode or fail. Nothing above this line looked at `source.type`, and nothing
  // below it will either.
  let decoded: DecodedImage;
  try {
    decoded = await withDeadline(
      codec.decode(source),
      options.decodeTimeoutMs ?? DECODE_TIMEOUT_MS,
    );
  } catch {
    return reject("undecodable");
  }

  try {
    if (!usableSize(decoded)) return reject("undecodable");

    // Step 3 and 4. One small point-sampled draw answers every question about content.
    const sample = await decoded.render({ width: SAMPLE_EDGE, height: SAMPLE_EDGE }, false);
    let analysis;
    try {
      analysis = analyse(sample.pixels());
    } finally {
      sample.release();
    }
    if (analysis.blank) return reject("undecodable");

    // Alpha wins outright; content decides the rest (§6.6).
    const encoding: Encoding =
      analysis.alpha || analysis.content === "flat" ? "image/png" : "image/jpeg";

    // Step 5. A vector source may be enlarged to the constant — rasterising it at the size
    // the engine happened to assign an image that never had one would throw away the only
    // advantage the format has.
    const target = fitWithin(decoded, maxEdge, vector);
    if (target.width < 1 || target.height < 1) return reject("undecodable");

    let size = target;
    for (let attempt = 0; attempt < MAX_ENCODE_ATTEMPTS; attempt += 1) {
      const rendered = await decoded.render(size, true);
      let src: string | null;
      let drawn: Size;
      try {
        drawn = { width: rendered.width, height: rendered.height };
        // A canvas that came back empty at this size and not at 64 px is the iOS area
        // ceiling (§11 item 5). Shrinking is the recovery; storing a blank logo is not.
        src = isBlank(rendered.pixels()) ? null : await rendered.encode(encoding, JPEG_QUALITY);
      } catch {
        return reject("undecodable");
      } finally {
        rendered.release();
      }

      if (src === null) {
        const smaller = halve(size);
        if (longestEdge(smaller) >= longestEdge(size)) break;
        size = smaller;
        continue;
      }

      const last = attempt === MAX_ENCODE_ATTEMPTS - 1;
      const next = shrinkToward(size, budget, src.length);
      // Over budget, and there is still room to shrink. Dimension is the lever (§6.6); the
      // budget is not a gate (§6.5), so the last attempt ships whatever it produced.
      if (src.length > budget && !last && longestEdge(next) < longestEdge(size)) {
        size = next;
        continue;
      }

      return {
        ok: true,
        logo: { src, width: drawn.width, height: drawn.height },
        encoding,
        // Speak only when the result will render visibly soft — which is exactly when the
        // budget pushed the raster below the size it was sized for (§6.6).
        notice: longestEdge(size) < longestEdge(target) ? SOFT_RESULT_MESSAGE : null,
      };
    }

    // Every attempt came back blank. Whatever that file is, this browser cannot draw it.
    return reject("undecodable");
  } finally {
    decoded.release();
  }
}

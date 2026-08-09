/**
 * The logo intake pipeline. `SPEC.md` §6.6, and it lives entirely here (§5.1).
 *
 * The renderer receives a string it cannot decode, cannot measure and cannot re-encode; every
 * decision about what that string contains is made once, in the builder, at upload time. So
 * this is the module that turns the file an owner picked into the `{ src, width, height }`
 * that `project.json` stores.
 *
 * **What a screen needs from here is three things:**
 *
 * ```ts
 * <input type="file" accept={LOGO_ACCEPT} />           // policy.ts
 * const result = await importLogo(file, browserImageCodec());
 * setDraft(applyIntake(draft, result));                // a no-op if it failed
 * ```
 *
 * and then `result.ok ? result.notice : result.message` — at most one sentence, shown in
 * place beside the control that opened the picker (§7.9), and usually nothing at all.
 *
 * **The layering, and why it is worth keeping:**
 *
 * - `policy.ts` — the constants and the arithmetic. Every number §6.6 and §6.2 fix, with the
 *   reasoning that would move it.
 * - `analyse.ts` — the three questions asked of a pixel buffer.
 * - `intake.ts` — the order of the steps, which is the design.
 * - `browser.ts` — `<img>` and `<canvas>`. Four DOM calls and two checks.
 * - `apply.ts` — the one function that can change the project.
 *
 * Only the last-but-one needs a browser, which is why the rest of it is tested.
 */

export {
  analyse,
  countDistinctColours,
  hasMeaningfulAlpha,
  isBlank,
  SAMPLE_EDGE,
} from "./analyse.js";
export type { Analysis, Content, Raster } from "./analyse.js";

export {
  DECODE_TIMEOUT_MS,
  ENCODINGS,
  fitWithin,
  JPEG_QUALITY,
  LOGO_ACCEPT,
  LOGO_BUDGET_BYTES,
  LOGO_MAX_EDGE,
  LOGO_MESSAGES,
  MAX_MARKUP_BYTES,
  MAX_SOURCE_BYTES,
  MIN_LOGO_EDGE,
  SOFT_RESULT_MESSAGE,
} from "./policy.js";
export type { Encoding, LogoFailure, Size } from "./policy.js";

export { importLogo } from "./intake.js";
export type {
  DecodedImage,
  ImageCodec,
  ImportOptions,
  LogoAccepted,
  LogoIntake,
  LogoRejected,
  RenderedImage,
} from "./intake.js";

export { applyIntake, clearLogo } from "./apply.js";

export { browserImageCodec } from "./browser.js";

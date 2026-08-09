import { render, type Project } from "@linkpage/renderer";
import type { Draft } from "./project/index.js";

/**
 * The exported file: its name, and its bytes.
 *
 * **This module holds the builder's only call to `render`, and that is the point** (§5.2). The
 * preview drops this string into a `srcdoc` iframe and Download (§7.7) writes the same string
 * to disk, so "the preview is the export" is a property of there being one string, not a
 * promise anybody has to keep. `page.test.ts` fails the build if a second call site appears —
 * which is the mechanical form of the guarantee that already cost this project direct
 * manipulation, and is worth more than the comment saying so.
 */

/**
 * Fixed and load-bearing (§6.1): it is what every host serves at a directory root, and at least
 * one drop-style host skips its rename prompt for this name specifically.
 */
export const EXPORT_FILENAME = "index.html";

/**
 * The complete text of the owner's `index.html`.
 *
 * It takes a `Draft` rather than a `Project` because the page has to appear beside the flow
 * while the flow is still running (§7.1) — before there is a business name, and before there is
 * a brand colour. A `Project` is assignable to a `Draft`, so a finished project passes here
 * unchanged; what the wider type buys is that a half-answered one does too.
 *
 * The one cast in the builder that matters, and it is safe by the renderer's own contract:
 * `render` is total, reads every field as `unknown`, and treats missing, wrong-typed and
 * unrecognised alike as absent (§4.7). A draft with no name renders a page with no name — which
 * is exactly what "the page filling in beside them" means — rather than throwing and blanking
 * the preview.
 */
export function pageHtml(project: Draft): string {
  return render(project as Project);
}

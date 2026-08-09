/**
 * The Download sheet: one sheet, two sections, page first. `SPEC.md` §7.7, §8, §6.1.
 *
 * > **Your page is for the internet, and your project file is for you.**
 *
 * **What a screen needs from here is one component:**
 *
 * ```tsx
 * {open && <DownloadSheet draft={draft} onClose={() => setOpen(false)} />}
 * ```
 *
 * The three files, and the rule each keeps:
 *
 * - `DownloadSheet.tsx` — the sheet. Both sections' copy, in the order they happen, and no
 *   state about what has been downloaded (§7.7) because there is none to keep.
 * - `Hosting.tsx` — section one's guidance, which is **a placeholder on purpose**. §8 declares
 *   its own incompleteness in its first line; this component says only what §8 established and
 *   invents no steps. **It is the file #19 and #20 replace.**
 * - `save.ts` — the browser's file-write, and the `FileDownload` shape both sections are made
 *   of. The builder's only route to disk.
 *
 * **The seam, and who fills it.** The page is complete here: `index.html` is a fixed filename
 * (§6.1) and `page.ts` already holds its bytes. `project.json` is not — its slug rule (§7.7) and
 * its write are one decision with one owner, so they arrive together as a single optional
 * `projectDownload: FileDownload`, and `src/open/` supplies it from the same call that answers
 * §7.8's _is there anything to lose?_. Without one, section two still reads in full — the
 * consequence sentence is the point of it — and its button is unavailable rather than inert.
 */

export { DownloadSheet, PROJECT_FILENAME_FALLBACK } from "./DownloadSheet.js";
export type { DownloadSheetProps } from "./DownloadSheet.js";

export { Hosting } from "./Hosting.js";

export { HTML_TYPE, saveTextFile } from "./save.js";
export type { FileDownload } from "./save.js";

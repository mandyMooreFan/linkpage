/**
 * Opening and saving a `project.json` the owner already has. `SPEC.md` §7.7, §7.8, §7.9.
 *
 * > **Import always replaces. It never merges.**
 *
 * Merge has no coherent intent behind a one-page file: whose name wins, do the buttons
 * concatenate, which hours are real. So there is no merge here to get wrong — the store swaps or
 * it does not, and everything in this directory is about **what has to be true before it does**.
 *
 * Four pieces, and each is one sentence of the spec:
 *
 * - `projectFile.ts` — §7.7's slug rule and the write. One function answers both _what does the
 *   Download sheet offer?_ and _is there anything to lose?_, because they are the same question.
 *   `null` is §7.8's empty localStorage, **the one state that opens immediately**.
 * - `ReplaceConfirm.tsx` — §7.8's confirmation, which names the outgoing project and offers to
 *   download it first. No undo, and no silent auto-download.
 * - `RefusalNotice.tsx` — §7.9's message, in place, with §4.6's technical detail behind a
 *   disclosure. It does not decide where it appears; the entry point does.
 * - `ProjectPicker.tsx` — the OS dialog, with no control of its own.
 * - `open.css` — and what it does not contain is the point: no layer, no scrim, no position.
 *
 * **What is deliberately not here: the decision to refuse.** `project/document.ts` is the only
 * place in the codebase allowed to say no to a file, and this directory reads its answer. Nor is
 * a repair path, or a "missing fields" report — **a file missing required fields produces no
 * error surface at all**, because the flow collects them (§4.6, §7.2).
 */

export {
  PROJECT_FILE_SUFFIX,
  PROJECT_JSON_TYPE,
  projectFile,
  projectFilename,
  slugify,
} from "./projectFile.js";
export type { ProjectFile } from "./projectFile.js";

export { ProjectPicker } from "./ProjectPicker.js";
export type { ProjectPickerProps } from "./ProjectPicker.js";

export { RefusalNotice } from "./RefusalNotice.js";
export type { RefusalNoticeProps } from "./RefusalNotice.js";

export { ReplaceConfirm } from "./ReplaceConfirm.js";
export type { ReplaceConfirmProps } from "./ReplaceConfirm.js";

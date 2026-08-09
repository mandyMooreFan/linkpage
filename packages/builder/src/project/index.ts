/**
 * The project store: `project.json` in, `project.json` out, and one project in `localStorage`
 * in between. `SPEC.md` §4.2–§4.7.
 *
 * Two layers, and the screens should reach for the second:
 *
 * - **`schema.ts` / `document.ts`** — pure functions over text and objects. Read a file, refuse
 *   it, derive the typed view, merge it back, write it out. No storage, no clock, no globals.
 * - **`store.ts`** — the one project the builder is editing, autosaved.
 *
 * The three rules the rest of the builder can rely on without reading any of it: `version` is
 * the only thing that can refuse a file; nothing else is ever dropped; and what you loaded is
 * what you save unless you changed it.
 */

export {
  BUILDER_URL,
  IMPLIED_VERSION,
  REFUSAL_MESSAGES,
  readProjectFile,
  readVersion,
  serializeProject,
} from "./document.js";
export type {
  JsonRecord,
  ProjectDocument,
  ReadResult,
  Refusal,
  RefusalReason,
} from "./document.js";

export { emptyDraft, isComplete, missingRequired, readDraft, writeDraft } from "./schema.js";
export type { Draft, DraftHeader, DraftStyle, MissingField } from "./schema.js";

export { createProjectStore, PROJECT_STORAGE_KEY } from "./store.js";
export type { ProjectSnapshot, ProjectStore, ProjectStoreOptions, StorageLike } from "./store.js";

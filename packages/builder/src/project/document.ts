import { SCHEMA_VERSION } from "@linkpage/renderer";

/**
 * `project.json` as a **file**: reading one, refusing one, writing one back out.
 *
 * This module owns the whole of `SPEC.md` §4.2 and §4.6's refusal half, and it is the only
 * place in the codebase allowed to say no to a project file. Everything downstream —
 * `schema.ts`, `store.ts`, the screens — is total: it reads what it understands, leaves
 * alone what it does not, and never rejects.
 *
 * **Two refusals, and only two** (§4.6): the text is not a JSON object, or its `version` is
 * beyond us. A file missing required fields is not a refusal — it loads for what it has and
 * the flow collects the rest (§7.2). A file with an unrecognised `shape` is not a refusal —
 * it falls back for rendering and keeps its value in the file (§4.4).
 */

/** A JSON object. The parsed file, exactly as it arrived — including keys we know nothing about. */
export type JsonRecord = Record<string, unknown>;

/**
 * The parsed `project.json`, held alongside the typed view rather than replaced by it (§4.5).
 *
 * This is the thing that gets written back to disk, which is why unknown keys survive: the
 * typed view is derived *from* it and merged *into* it, and never becomes it.
 */
export type ProjectDocument = JsonRecord;

/**
 * The version an absent `version` reads as (§4.2).
 *
 * Deliberately the literal `1` and not `SCHEMA_VERSION`: when the schema bumps to 2, a file
 * with no version is still an old file, not a new one. The lenient assumption is safe because
 * the only files plausibly omitting it are the oldest ones we can definitely read.
 */
export const IMPLIED_VERSION = 1;

/**
 * The builder the "newer version" message points at (§4.3).
 *
 * Refusing forwards is only affordable because the canonical builder is a static site and is
 * always current, so the fix is following a link. Keep this in step with `base` in
 * `vite.config.ts` and the Pages deployment.
 */
export const BUILDER_URL = "https://mandymoorefan.github.io/linkpage/";

export type RefusalReason = "damaged" | "not-a-project" | "too-new";

/**
 * The owner-facing half of a refusal, verbatim from §4.6's table.
 *
 * Three messages for two failures, because "did not parse" and "parsed, wrong thing" are
 * different things to have done and the owner can act differently on each. None of them names
 * a JSON path — the technical half is `Refusal.detail`, which belongs behind a disclosure.
 */
export const REFUSAL_MESSAGES: Record<RefusalReason, string> = {
  damaged: "This file appears to be damaged.",
  "not-a-project": "This doesn't look like a linkpage file.",
  "too-new": "This page was made with a newer version of linkpage",
};

export interface Refusal {
  readonly reason: RefusalReason;
  /** Shown to the owner. No jargon, no JSON path (§4.6). */
  readonly message: string;
  /** Behind a disclosure, for whoever hand-edited the file (§4.6). */
  readonly detail: string;
  /** The canonical builder, on `too-new` only — the message links to it (§4.3). */
  readonly url?: string;
}

export type ReadResult =
  | { readonly ok: true; readonly document: ProjectDocument }
  | { readonly ok: false; readonly refusal: Refusal };

function refuse(reason: RefusalReason, detail: string): ReadResult {
  return {
    ok: false,
    refusal: {
      reason,
      message: REFUSAL_MESSAGES[reason],
      detail,
      ...(reason === "too-new" ? { url: BUILDER_URL } : {}),
    },
  };
}

/** Narrow to a plain JSON object — arrays and `null` are `typeof "object"` and are not one. */
export function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** What the top level turned out to be, for the disclosure text. */
function describe(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "an array";
  return `a ${typeof value}`;
}

/**
 * The file's `version`, as a number (§4.2).
 *
 * Absent reads as `1`. So does anything that is not a number, because §4.4 and §4.6 treat a
 * wrong-typed value as absent everywhere else in the schema and `version` gets no exemption
 * from that — only a genuine number can be *beyond us*. A hand-typed `"2"` therefore loads,
 * which is the deliberate cost of not having a second rule for one field.
 */
export function readVersion(document: JsonRecord): number {
  const raw = document["version"];
  return typeof raw === "number" && Number.isFinite(raw) ? raw : IMPLIED_VERSION;
}

/**
 * Parse and validate a `project.json` in full, refusing rather than half-loading.
 *
 * Nothing here mutates anything: the caller receives either a document or a refusal, and it
 * is the caller's job to keep the existing project untouched on the failing path (§4.6). The
 * store does that by only swapping state once this returns `ok`.
 */
export function readProjectFile(text: string): ReadResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch (error) {
    return refuse("damaged", error instanceof Error ? error.message : String(error));
  }

  if (!isRecord(parsed)) {
    return refuse(
      "not-a-project",
      `The file is valid JSON, but its top level is ${describe(parsed)} rather than an object.`,
    );
  }

  const version = readVersion(parsed);
  if (version > SCHEMA_VERSION) {
    return refuse(
      "too-new",
      `The file declares version ${version}; this builder reads version ${SCHEMA_VERSION}.`,
    );
  }

  return { ok: true, document: parsed };
}

/**
 * The canonical text of a project file: two-space JSON with a trailing newline.
 *
 * Formatting is fixed here and nowhere else, because §4.5's first guarantee — a file we wrote,
 * opened and saved unedited, is byte-identical — is only true if reading and writing agree on
 * it. `JSON.parse` preserves key order for non-numeric keys, the merge in `schema.ts` never
 * reorders, so parse → merge → serialise reproduces the input byte for byte.
 */
export function serializeProject(document: ProjectDocument): string {
  return `${JSON.stringify(document, null, 2)}\n`;
}

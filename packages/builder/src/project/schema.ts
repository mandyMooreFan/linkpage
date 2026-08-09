import { isIconName, SCHEMA_VERSION } from "@linkpage/renderer";
import type {
  Address,
  Advanced,
  Clock,
  ColorOverrides,
  Contact,
  Header,
  Hours,
  IconName,
  Interval,
  Link,
  Logo,
  Mode,
  Project,
  Shape,
  SocialLink,
  TypePairing,
  Weekday,
  WeekStart,
} from "@linkpage/renderer";
import { isRecord, type JsonRecord, type ProjectDocument } from "./document.js";

/**
 * The schema library. It lives in the builder because the renderer is dependency-free and
 * total, and a validator that throws would turn a data problem into a blank preview (§4.7).
 *
 * It is hand-rolled rather than a dependency for one reason: no general-purpose validator
 * does the thing this schema is mostly about. §4.5 requires that **unknown keys survive a
 * load-and-save round trip untouched**, and §4.4 requires that an unrecognised `shape` fall
 * back for rendering while the file keeps the original word. Both are properties of *writing*,
 * not of validating, and a parse-only library gives you a clean typed object with the
 * evidence thrown away.
 *
 * So every field is a `Codec` — a total reader and a preserving writer — and one rule joins
 * them:
 *
 * > **A field is written only when it is absent from the document, or when the typed value
 * > differs from what the document already reads as.**
 *
 * That single rule produces every behaviour §4.4 and §4.5 ask for:
 *
 * - `"shape": "brutalist"` reads as `"centred"`; the draft still says `"centred"`; so the
 *   document is left alone and the word survives (§4.4).
 * - `"corners": "big"` reads as the default; unedited, the string stays in the file (§4.6).
 * - unknown keys are never visited, so they cannot be dropped (§4.5).
 * - an unedited project reproduces its document object exactly, which is what makes the
 *   byte-identical round trip a consequence of the design rather than a special case.
 *
 * **What is deliberately absent: refusal.** Nothing here can reject a file. `document.ts`
 * owns the only two refusals there are.
 */

// ---------------------------------------------------------------------------
// Drafts
// ---------------------------------------------------------------------------

/**
 * `Style` as declared in `packages/renderer/src/project.ts`, reached through `Project` because
 * the renderer's barrel exports every other member of the schema but not that one. Projected
 * rather than re-declared so it cannot drift; worth exporting properly from the renderer.
 */
type Style = Project["style"];

/**
 * The two fields the flow asks for, missing (§4.6).
 *
 * `Project` is the shape of a *finished* project, and a project the owner is halfway through —
 * or one imported without a brand colour — is not that yet. §4.6 is explicit that a file with
 * no `style.brand` is "exactly the territory the flow exists for": **no error, no repair
 * dialog, no invented default**. Representing it as absent rather than as `""` or `"#000000"`
 * is what keeps that promise mechanical, because the store cannot then write a colour the
 * owner never chose.
 */
export type DraftStyle = Omit<Style, "brand"> & { brand?: string };

/** As `DraftStyle`: the business name is collected by the flow, never invented (§4.6). */
export type DraftHeader = Omit<Header, "name"> & { name?: string };

/**
 * A project as the builder holds it: a `Project` with the three things nobody has supplied
 * yet allowed to be absent.
 *
 * `lang` is the odd one out — it is filled from the browser rather than asked for (§4.1), so a
 * file arriving without it needs the caller's environment, not a question.
 *
 * Everything else keeps its `Project` type, because everything else has a defensible default:
 * a preference falls back (§4.4), a list starts empty, an optional section stays absent.
 */
export type Draft = Omit<Project, "lang" | "style" | "header"> & {
  lang?: string;
  style: DraftStyle;
  header: DraftHeader;
};

/** A required field the draft does not have yet. */
export type MissingField = "lang" | "style.brand" | "header.name";

// ---------------------------------------------------------------------------
// Codecs
// ---------------------------------------------------------------------------

/**
 * A total reader and a preserving writer for one field.
 *
 * `read` never throws and never refuses: anything it cannot use reads as absent, exactly as
 * the renderer treats it (§4.7). `write` is handed whatever the document already held at that
 * key, so it can keep the parts of it we do not model.
 */
interface Codec<T> {
  read(raw: unknown): T;
  write(value: T, raw: unknown): unknown;
}

/** A codec per known key. Unknown keys have no codec, which is precisely why they survive. */
type Fields<T> = { [K in keyof T]-?: Codec<T[K]> };

/** Structural equality over JSON values. Key order is irrelevant — this compares meaning. */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }
  if (isRecord(a) && isRecord(b)) {
    const keys = Object.keys(a);
    if (keys.length !== Object.keys(b).length) return false;
    return keys.every((key) => key in b && deepEqual(a[key], b[key]));
  }
  return false;
}

/**
 * An object with known keys, and any number of unknown ones.
 *
 * `write` starts from a copy of the document's object, so unknown keys keep both their values
 * and their positions; spreading and deleting preserve insertion order, which is half of why
 * the byte-identical guarantee holds.
 */
function structure<T extends object>(fields: Fields<T>): Codec<T> {
  // One cast, here, so that the per-key loops below are not fighting a union of codec types.
  // Everything outside this function sees the precise `Fields<T>` signature.
  const entries = Object.entries(fields as Record<string, Codec<unknown>>);

  return {
    read(raw) {
      const source = isRecord(raw) ? raw : {};
      const out: JsonRecord = {};
      for (const [key, codec] of entries) {
        const value = codec.read(source[key]);
        // Absent stays absent rather than becoming an explicit `undefined`, so a draft
        // compares and serialises the way the file reads.
        if (value !== undefined) out[key] = value;
      }
      return out as T;
    },

    write(value, raw) {
      const out: JsonRecord = isRecord(raw) ? { ...raw } : {};
      const current = value as JsonRecord;
      for (const [key, codec] of entries) {
        const next = current[key];
        // The rule. Present and unchanged means the document already says this, however
        // oddly — leave it exactly as the owner or their text editor left it.
        if (key in out && deepEqual(codec.read(out[key]), next)) continue;
        if (next === undefined) {
          delete out[key];
          continue;
        }
        out[key] = codec.write(next, out[key]);
      }
      return out;
    },
  };
}

/** An optional object-valued section: absent, or anything that is not an object, reads as absent. */
function section<T>(inner: Codec<T>): Codec<T | undefined> {
  return {
    read: (raw) => (isRecord(raw) ? inner.read(raw) : undefined),
    write: (value, raw) => inner.write(value as T, raw),
  };
}

/**
 * A list of objects.
 *
 * Elements are paired with the document's by position, so an unknown key inside a link follows
 * that link through an edit to a *different* link. Reordering or deleting rows re-pairs them,
 * which is the one place §4.5's preservation is positional rather than exact — and it is
 * bounded by the rule above, since a list nobody touched is never rewritten at all.
 *
 * Non-object elements are dropped: there is no owner content in a bare `42` in `links`.
 */
function listOf<T>(item: Codec<T>): Codec<T[]> {
  const rawItems = (raw: unknown): JsonRecord[] =>
    Array.isArray(raw) ? (raw as unknown[]).filter(isRecord) : [];

  return {
    read: (raw) => rawItems(raw).map((entry) => item.read(entry)),
    write(value, raw) {
      const existing = rawItems(raw);
      return value.map((entry, index) => {
        const before = existing[index];
        if (before !== undefined && deepEqual(item.read(before), entry)) return before;
        return item.write(entry, before);
      });
    },
  };
}

/** An optional list: absent, or anything that is not an array, reads as absent. */
function optionalList<T>(item: Codec<T>): Codec<T[] | undefined> {
  const list = listOf(item);
  return {
    read: (raw) => (Array.isArray(raw) ? list.read(raw) : undefined),
    write: (value, raw) => list.write(value ?? [], raw),
  };
}

/** The write half of every field that has nothing of its own to preserve. */
function identity(value: unknown): unknown {
  return value;
}

/** A string the owner typed. Anything else reads as absent. */
const optionalText: Codec<string | undefined> = {
  read: (raw) => (typeof raw === "string" ? raw : undefined),
  write: identity,
};

/**
 * A string with an empty default.
 *
 * For fields that are structurally required but are not questions the flow asks — a link's
 * label, a social entry's URL. An empty string is a blank box in the editor, not an invented
 * answer, and the rule above means the document is not rewritten to hold one until the owner
 * types something.
 */
const text: Codec<string> = {
  read: (raw) => (typeof raw === "string" ? raw : ""),
  write: identity,
};

/**
 * A preference drawn from a closed set (§4.4).
 *
 * An unrecognised word falls back for rendering and survives in the file. The accepted cost is
 * stated in §4.4: the control shows the default selected while the file says otherwise, and
 * touching the control overwrites the original.
 */
function preference<T extends string>(values: readonly T[], fallback: T): Codec<T> {
  return {
    read: (raw) => (typeof raw === "string" && values.includes(raw as T) ? (raw as T) : fallback),
    write: identity,
  };
}

/**
 * A preference drawn from a closed set that has no default (§4.4).
 *
 * There is nothing to fall back *to*, so an unrecognised value reads as absent — which for an
 * icon is exactly right: the link renders without a glyph rather than with the wrong one, and
 * the name stays in the file for a newer builder that knows it.
 */
function optionalPreference<T>(recognised: (value: unknown) => value is T): Codec<T | undefined> {
  return {
    read: (raw) => (recognised(raw) ? raw : undefined),
    write: identity,
  };
}

/** A number in `[min, max]`. Out of range clamps for the UI; the file keeps what it said. */
function bounded(min: number, max: number, fallback: number): Codec<number> {
  return {
    read: (raw) =>
      typeof raw === "number" && Number.isFinite(raw)
        ? Math.min(max, Math.max(min, raw))
        : fallback,
    write: identity,
  };
}

const flag: Codec<boolean> = {
  read: (raw) => raw === true,
  write: identity,
};

/**
 * An open map of strings — the advanced panel's hand-set colours (§3.4).
 *
 * The role names belong to the derivation and are not enumerated, so every key here is
 * "unknown" in the §4.5 sense and is preserved by position. Non-string values are left in
 * place for the same reason they are elsewhere: they are somebody's data, not ours to delete.
 */
const overrides: Codec<ColorOverrides> = {
  read(raw) {
    const out: ColorOverrides = {};
    if (isRecord(raw)) {
      for (const [key, value] of Object.entries(raw)) {
        if (typeof value === "string") out[key] = value;
      }
    }
    return out;
  },
  write(value, raw) {
    const out: JsonRecord = isRecord(raw) ? { ...raw } : {};
    for (const key of Object.keys(out)) {
      if (typeof out[key] === "string" && !(key in value)) delete out[key];
    }
    for (const [key, colour] of Object.entries(value)) {
      if (out[key] !== colour) out[key] = colour;
    }
    return out;
  },
};

/**
 * A day's opening intervals (§2.3).
 *
 * Absent and empty mean different things — unspecified versus explicitly closed — so an absent
 * day reads as `undefined` and not as `[]`, and the distinction survives the round trip.
 */
const intervals: Codec<Interval[] | undefined> = {
  read(raw) {
    if (!Array.isArray(raw)) return undefined;
    const out: Interval[] = [];
    for (const entry of raw as unknown[]) {
      if (!Array.isArray(entry)) continue;
      const [open, close] = entry as unknown[];
      if (typeof open === "string" && typeof close === "string") out.push([open, close]);
    }
    return out;
  },
  write: (value) => (value ?? []).map(([open, close]) => [open, close]),
};

/** Free-text lines, written the way the owner would write them on an envelope (§2.3). */
const lines: Codec<string[]> = {
  read: (raw) =>
    Array.isArray(raw)
      ? (raw as unknown[]).filter((line): line is string => typeof line === "string")
      : [],
  write: identity,
};

const size = bounded(0, Number.MAX_SAFE_INTEGER, 0);

const logoFields = structure<Logo>({ src: text, width: size, height: size });

/**
 * The logo, or nothing.
 *
 * `src` carries the whole point of the object, so an entry without one reads as no logo. The
 * dimensions fall back to `0` rather than being guessed: the renderer cannot measure a data
 * URI either, and #31 owns putting real numbers there.
 */
const logo: Codec<Logo | null> = {
  read: (raw) => (isRecord(raw) && typeof raw["src"] === "string" ? logoFields.read(raw) : null),
  write: (value, raw) => (value === null ? null : logoFields.write(value, raw)),
};

// ---------------------------------------------------------------------------
// The project
// ---------------------------------------------------------------------------

const SHAPES: readonly Shape[] = ["centred", "colourBlock", "floatingCard", "ruledLeft"];
const PAIRINGS: readonly TypePairing[] = ["classic", "modern", "friendly"];
const MODES: readonly Mode[] = ["light", "dark"];
const CLOCKS: readonly Clock[] = ["12h", "24h"];
const WEEK_STARTS: readonly WeekStart[] = ["mon", "sun"];

const advanced: Codec<Advanced> = structure<Advanced>({
  // Persisted even when disabled (§3.4): switching the panel off must not destroy the
  // owner's manual work, and switching it back on must return it intact.
  enabled: flag,
  colors: overrides,
});

const style: Codec<DraftStyle> = structure<DraftStyle>({
  // Required, and never invented — see `DraftStyle`. A hand-typed hex is honoured exactly
  // (§3.3), so anything that is a string is kept as it stands; the derivation deals with a
  // colour it cannot parse.
  brand: optionalText,
  accent: optionalText,
  shape: preference(SHAPES, "centred"),
  type: preference(PAIRINGS, "classic"),
  corners: bounded(0, 1, 0.6),
  mode: preference(MODES, "light"),
  advanced,
});

const header: Codec<DraftHeader> = structure<DraftHeader>({
  name: optionalText,
  tagline: optionalText,
  logo,
});

const link: Codec<Link> = structure<Link>({
  label: text,
  url: text,
  // An icon is a preference, not content: there is nothing authored behind the name, so an
  // unrecognised one falls back — to nothing, there being no default glyph — and survives in
  // the file (§4.4). The set is the renderer's, asked rather than copied.
  icon: optionalPreference<IconName>(isIconName),
});

const socialLink: Codec<SocialLink> = structure<SocialLink>({
  // `platform` holds the owner's data: behind it is a URL they typed. Unrecognised values are
  // kept verbatim in the draft as well as the file — unlike `shape`, there is nothing to fall
  // back *to*, and the link is the point (§4.4).
  platform: text,
  url: text,
});

/**
 * The week. Days absent from the object are unspecified; a day present with an empty array is
 * explicitly closed (§2.3) — and a key that is not a day of the week is somebody's typo, kept
 * forever like every other unknown key (§4.5).
 */
const days: Codec<Partial<Record<Weekday, Interval[]>>> = structure<
  Partial<Record<Weekday, Interval[]>>
>({
  mon: intervals,
  tue: intervals,
  wed: intervals,
  thu: intervals,
  fri: intervals,
  sat: intervals,
  sun: intervals,
});

const hours: Codec<Hours> = structure<Hours>({
  clock: preference(CLOCKS, "12h"),
  weekStart: preference(WEEK_STARTS, "mon"),
  days,
  note: optionalText,
});

const contact: Codec<Contact> = structure<Contact>({
  phone: optionalText,
  email: optionalText,
});

const address: Codec<Address> = structure<Address>({
  lines,
  directionsUrl: optionalText,
});

/**
 * `version` always reads as the version we write.
 *
 * Anything this codec ever sees has already survived `readProjectFile`, so it is 1 or older,
 * and an older file is upgraded by being read — silently, with no notice and no dialog (§4.3).
 * The write rule then keeps the file's own spelling of it, so a document already saying `1` is
 * not rewritten and a document saying nothing gains it.
 */
const version: Codec<typeof SCHEMA_VERSION> = {
  read: () => SCHEMA_VERSION,
  write: () => SCHEMA_VERSION,
};

const project: Codec<Draft> = structure<Draft>({
  version,
  lang: optionalText,
  style,
  header,
  links: listOf(link),
  hours: section(hours),
  contact: section(contact),
  address: section(address),
  social: optionalList(socialLink),
});

// ---------------------------------------------------------------------------
// The public surface
// ---------------------------------------------------------------------------

/**
 * The typed view of a document: total, defaulted, and safe for the editor to iterate.
 *
 * Nothing here can fail. A `links` holding the string `"hello"` reads as an empty list, a
 * `corners` holding `"big"` reads as the default — and both survive in the document, because
 * the draft is derived from it rather than replacing it.
 */
export function readDraft(document: ProjectDocument): Draft {
  return project.read(document);
}

/**
 * Merge a draft back into the document it came from (§4.5).
 *
 * The document is not mutated; a new one is returned with the same keys in the same order.
 * Pass `{}` for a project that has never been saved.
 */
export function writeDraft(draft: Draft, document: ProjectDocument = {}): ProjectDocument {
  return project.write(draft, document) as ProjectDocument;
}

/**
 * A project with nothing in it but a language.
 *
 * Derived from `readDraft({})` so that a new project and an empty file cannot drift apart:
 * whatever the codecs default to *is* the starting state. Note what is absent — brand and
 * name — which is why the builder's first screen is the flow and not a blank editor (§7.2).
 */
export function emptyDraft(lang: string): Draft {
  return { ...readDraft({}), lang };
}

/**
 * What the flow still has to collect (§4.6, §7.2).
 *
 * Deliberately not an error report: §4.6 rejects repair-and-report because "a report about
 * fields is a report in our vocabulary, and the flow can simply ask instead". This is the list
 * the flow walks, not a message to show anyone.
 */
export function missingRequired(draft: Draft): MissingField[] {
  const missing: MissingField[] = [];
  if (draft.lang === undefined) missing.push("lang");
  if (draft.style.brand === undefined) missing.push("style.brand");
  if (draft.header.name === undefined) missing.push("header.name");
  return missing;
}

/** Whether the flow has everything, and the draft is a `Project` the renderer can be given. */
export function isComplete(draft: Draft): draft is Project {
  return missingRequired(draft).length === 0;
}

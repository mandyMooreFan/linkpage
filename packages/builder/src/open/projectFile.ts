import { PROJECT_FILENAME_FALLBACK, saveTextFile, type FileDownload } from "../download/index.js";
import type { ProjectStore } from "../project/index.js";

/**
 * `project.json` as a file on the owner's disk: what it is called, and how it is written.
 * `SPEC.md` §7.7, §7.8.
 *
 * **One function answers both questions the spec asks about this file**, because they are the
 * same question. §7.7 asks _what does the Download sheet offer?_ and §7.8 asks _is there
 * anything to lose, and what is it called?_ — and both are `projectFile(store)`. That is why the
 * Download sheet took `projectDownload` as one optional value rather than a name and a writer:
 * whoever decides what the file is called is the one who knows how to produce it.
 *
 * **The name is copy, not plumbing.** `index.html` is anonymous in a downloads folder;
 * `adas-bakery.linkpage.json` is not, and the double extension quietly says what opens it. What
 * the name does **not** do is decide anything on the way back in — **import validates by
 * content, not by filename** (§7.7), so a file renamed `backup (3).txt` still opens and a file
 * called `adas-bakery.linkpage.json` holding a photo still refuses.
 */

/**
 * The double extension from §7.7, and the reason it is doubled.
 *
 * `.json` is what the file is, so the OS opens it in something that can read it; `.linkpage`
 * in front of it is what the file is _for_, which is the part the owner reads. Nothing in the
 * builder ever matches on either.
 */
export const PROJECT_FILE_SUFFIX = ".linkpage.json";

/**
 * `application/json`, with no `charset`.
 *
 * Unlike the page's `text/html;charset=utf-8`, the JSON media type has no charset parameter to
 * give it — the encoding is UTF-8 by definition of the format, so naming it here would be a
 * parameter no receiver is required to understand.
 */
export const PROJECT_JSON_TYPE = "application/json";

/**
 * How much of a business name survives into a filename.
 *
 * Long enough that no plausible shop name is cut, short enough that the whole filename clears
 * every filesystem's per-component limit with the suffix on the end and room to spare for the
 * `(1)` a browser adds to a duplicate.
 */
const MAX_SLUG_LENGTH = 64;

/**
 * A business name, made safe to be a filename and still recognisable as itself.
 *
 * The rule, in the order it runs, and what each step is for:
 *
 * 1. **Compatibility-decompose and drop combining marks.** `Café` becomes `cafe`, `Ａda` becomes
 *    `Ada`. A stripped accent is a filename that survives being emailed, unzipped on a different
 *    machine, and typed back in by hand.
 * 2. **Delete apostrophes rather than separating on them.** This is the one character that gets
 *    its own rule, and §7.7's own example is why: `Ada's Bakery` has to come out `adas-bakery`
 *    and not `ada-s-bakery`.
 * 3. **Lowercase**, because a downloads folder is easier to scan and half the world's
 *    filesystems are case-insensitive anyway.
 * 4. **Every run of anything that is not a letter or a digit becomes one `-`**, then leading and
 *    trailing dashes go. Spaces, `&`, `/`, `:` and a leading `.` are all the same kind of
 *    problem and get the same answer — and since a `.` cannot survive it, no name can produce a
 *    dotfile or a third extension.
 * 5. **Cut to `MAX_SLUG_LENGTH` code points**, then trim any dash the cut exposed.
 * 6. **Recompose**, so a decomposed Hangul syllable goes back to being one character.
 *
 * **Letters means letters, not ASCII.** `麵包店` keeps its name; it is the owner's shop and
 * `anchor.download` carries it intact. What has no letters or digits at all — an emoji, a name
 * written entirely in punctuation, a string of spaces — slugifies to `""`, and the caller falls
 * back (§7.7).
 */
export function slugify(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .replace(/['’ʼʹ`´]+/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");

  return [...slug].slice(0, MAX_SLUG_LENGTH).join("").replace(/-+$/g, "").normalize("NFC");
}

/**
 * `⟨business-name⟩.linkpage.json`, falling back to `linkpage.json` when there is no name (§7.7).
 *
 * The fallback is the bare name and not `linkpage.linkpage.json`: with nothing to identify the
 * file by, the doubled extension is saying the same thing twice.
 */
export function projectFilename(name?: string): string {
  const slug = name === undefined ? "" : slugify(name);
  return slug === "" ? PROJECT_FILENAME_FALLBACK : `${slug}${PROJECT_FILE_SUFFIX}`;
}

/**
 * The project as a file, or `null` when there is no project at all.
 *
 * `null` is §7.8's _empty localStorage_ — **the one state in which an import opens immediately,
 * with no confirmation.** Everything else is a project, and this is deliberately the store's own
 * "is there a document" and not a judgement about how much is in it: **any non-empty project
 * counts as something to lose, including one holding only a typed name** (§7.8). A project whose
 * name has not been typed yet has no `name` here, and the confirmation says so rather than
 * naming it something it is not.
 */
export interface ProjectFile {
  /** The business name, when there is one. §7.8's confirmation is built around saying it. */
  readonly name?: string;
  /** What it is called and how it is written — §7.7's section two, and §7.8's escape. */
  readonly download: FileDownload;
}

export function projectFile(store: ProjectStore): ProjectFile | null {
  const { draft } = store.snapshot();
  if (store.text() === null) return null;

  const name = draft?.header.name;
  const filename = projectFilename(name);

  return {
    ...(name === undefined ? {} : { name }),
    download: {
      filename,
      /**
       * The bytes are read at the press and not at the render, exactly as the page's are.
       * Autosave is write-through, so what lands on disk is the project as it stands — which
       * matters most on §7.8's path, where the confirmation may have been on screen for a
       * while before the owner takes the escape.
       */
      save: () => {
        const text = store.text();
        if (text !== null) saveTextFile(filename, text, PROJECT_JSON_TYPE);
      },
    },
  };
}

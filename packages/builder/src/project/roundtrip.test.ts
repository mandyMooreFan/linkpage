import { SCHEMA_VERSION, type Project } from "@linkpage/renderer";
import { describe, expect, it } from "vitest";
import { readProjectFile, serializeProject, type ProjectDocument } from "./document.js";
import { readDraft, writeDraft } from "./schema.js";
import { createProjectStore, PROJECT_STORAGE_KEY, type StorageLike } from "./store.js";

/**
 * §4.5's two guarantees, stated there as testable and tested here as written:
 *
 * 1. **A file we wrote, opened and saved with no edits, is byte-identical** — same key order,
 *    same formatting.
 * 2. **A hand-edited file, opened and saved, retains every key and value**, with our
 *    formatting normalised around them.
 *
 * The first is the stronger claim and the one that would rot silently: nothing in the editor
 * looks any different when a save quietly reorders keys or drops a `"hourz"` somebody typed.
 */

const complete: Project = {
  version: SCHEMA_VERSION,
  lang: "en-GB",
  style: {
    brand: "#c2185b",
    accent: "#00695c",
    shape: "floatingCard",
    type: "modern",
    corners: 0.6,
    mode: "light",
    advanced: { enabled: false, colors: { ink: "#111111" } },
  },
  header: {
    name: "Ada's Bakery",
    tagline: "Sourdough and very good coffee",
    logo: { src: "data:image/png;base64,AAAA", width: 1200, height: 1200 },
  },
  links: [
    { label: "Order online", url: "https://example.com/order", icon: "cart" },
    { label: "Book a table", url: "https://example.com/book" },
  ],
  hours: {
    clock: "12h",
    weekStart: "mon",
    days: { mon: [["09:00", "17:00"]], wed: [] },
    note: "Bank holidays vary",
  },
  contact: { phone: "+44 1422 000000", email: "hello@example.com" },
  address: { lines: ["12 Bridge Street", "Hebden Bridge"], directionsUrl: "https://maps.example" },
  social: [{ platform: "instagram", url: "https://instagram.example.com/ada" }],
};

/** The text the builder would have written for `complete`. */
const written = serializeProject(writeDraft(complete));

/** Every key and value of `original` is still there, at the same path, in `saved`. */
function retains(saved: unknown, original: unknown, path = "the file"): void {
  if (Array.isArray(original)) {
    expect(Array.isArray(saved), path).toBe(true);
    original.forEach((item, index) => {
      retains((saved as unknown[])[index], item, `${path}[${index}]`);
    });
    return;
  }
  if (original !== null && typeof original === "object") {
    expect(saved === null || typeof saved !== "object", path).toBe(false);
    for (const [key, value] of Object.entries(original as Record<string, unknown>)) {
      retains((saved as Record<string, unknown>)[key], value, `${path}.${key}`);
    }
    return;
  }
  expect(saved, path).toEqual(original);
}

function reopen(text: string): ProjectDocument {
  const result = readProjectFile(text);
  if (!result.ok) throw new Error(`refused: ${result.refusal.detail}`);
  return result.document;
}

function memoryStorage(seed?: string): StorageLike {
  const entries = new Map<string, string>();
  if (seed !== undefined) entries.set(PROJECT_STORAGE_KEY, seed);
  return {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => void entries.set(key, value),
    removeItem: (key) => void entries.delete(key),
  };
}

describe("a file we wrote", () => {
  it("comes back byte-identical when opened and saved unedited", () => {
    const document = reopen(written);
    const saved = serializeProject(writeDraft(readDraft(document), document));
    expect(saved).toBe(written);
  });

  it("comes back byte-identical through localStorage and a fresh session", () => {
    const storage = memoryStorage();
    const first = createProjectStore({ storage });
    first.open(written);
    expect(first.text()).toBe(written);

    // A new tab, a new store, the same bytes on disk.
    const second = createProjectStore({ storage });
    const draft = second.snapshot().draft;
    expect(draft).not.toBeNull();
    if (draft) second.update(draft);
    expect(second.text()).toBe(written);
  });

  it("survives being saved over and over", () => {
    let document = reopen(written);
    for (let i = 0; i < 5; i += 1) document = writeDraft(readDraft(document), document);
    expect(serializeProject(document)).toBe(written);
  });
});

describe("a hand-edited file", () => {
  // Four-space indent, keys in an order we would never write, values we do not recognise, and
  // a typo that will now live in this file forever. §4.5 chose permanent junk over occasional
  // loss on purpose: this is a file whose entire job is to survive.
  const handEdited = [
    "{",
    '    "version": 1,',
    '    "hourz": { "mon": "9 til 5" },',
    '    "style": {',
    '        "texture": "linen",',
    '        "brand": "#c2185b",',
    '        "shape": "brutalist",',
    '        "corners": "big"',
    "    },",
    '    "header": { "motto": "rise early", "name": "Ada" },',
    '    "links": [{ "url": "https://a.example", "tint": "gold" }],',
    '    "hours": { "days": { "funday": [["09:00", "17:00"]] } },',
    '    "social": [{ "platform": "myspace", "url": "https://m.example" }],',
    '    "lang": "cy"',
    "}",
  ].join("\n");

  const original = reopen(handEdited);
  const saved = writeDraft(readDraft(original), original);

  it("retains every key and every value", () => {
    retains(saved, original);
  });

  it("keeps the key order it arrived with, and normalises only the formatting", () => {
    expect(Object.keys(saved)).toEqual(Object.keys(original));
    expect(serializeProject(saved)).toBe(serializeProject(original));
    expect(serializeProject(saved)).not.toBe(handEdited);
  });

  it("adds nothing to a section that is already there, however thin", () => {
    // Defaults arrive with the key that was missing, not by filling in every object we pass.
    // `hours` said only `days`, and saving did not invent a clock or a week start for it.
    expect(saved["hours"]).toEqual({ days: { funday: [["09:00", "17:00"]] } });
  });
});

describe("a file from an older builder", () => {
  it("loads silently and gains only what was absent", () => {
    // §4.3: no notice, no dialog, no badge — and the upgrade is non-destructive by
    // construction, because it only ever adds defaults for things that were not there.
    const older = { lang: "en", style: { brand: "#c2185b" }, header: { name: "Ada" } };
    const saved = writeDraft(readDraft(older), older);
    retains(saved, older);
    expect(saved["version"]).toBe(SCHEMA_VERSION);
    expect(saved["links"]).toEqual([]);
  });

  it("leaves a version it can already read exactly as it found it", () => {
    const document = reopen('{"version": "1", "lang": "en"}');
    expect(writeDraft(readDraft(document), document)["version"]).toBe("1");
  });
});

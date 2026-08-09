// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { installDownloads, type FakeDownloads } from "../download/downloads.testing.js";
import { PROJECT_FILENAME_FALLBACK } from "../download/index.js";
import { createProjectStore, type ProjectStore, type StorageLike } from "../project/index.js";
import { projectFile, projectFilename, slugify } from "./projectFile.js";

/**
 * `project.json` as a file: what it is called, and whether there is one. `SPEC.md` §7.7, §7.8.
 *
 * Two claims live here and they are not the same claim. The **name** is copy — it has to be
 * recognisable in a downloads folder and safe on a disk, and every awkward business name is a
 * case. The **presence** is §7.8's fork: `null` is _empty localStorage, open immediately_, and
 * anything else is _something to lose_. Getting the second wrong is the one that loses work.
 */

function memory(): StorageLike {
  const entries = new Map<string, string>();
  return {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => void entries.set(key, value),
    removeItem: (key) => void entries.delete(key),
  };
}

const withProject = (json: object): ProjectStore => {
  const storage = memory();
  storage.setItem("linkpage.project", JSON.stringify(json));
  return createProjectStore({ storage });
};

describe("the slug rule (§7.7)", () => {
  it("produces the name the spec writes down", () => {
    // The one worked example §7.7 gives, and the reason apostrophes get their own rule: this
    // has to be `adas-bakery` and not `ada-s-bakery`.
    expect(projectFilename("Ada's Bakery")).toBe("adas-bakery.linkpage.json");
  });

  it("keeps the typographic apostrophe a phone would have typed", () => {
    expect(projectFilename("Ada’s Bakery")).toBe("adas-bakery.linkpage.json");
  });

  it("falls back to the bare name when there is none yet", () => {
    // Not `linkpage.linkpage.json`: with nothing to identify it by, the doubled extension says
    // the same thing twice.
    expect(projectFilename(undefined)).toBe(PROJECT_FILENAME_FALLBACK);
    expect(projectFilename("")).toBe("linkpage.json");
  });

  it("falls back when a name has no letters or digits to slug", () => {
    // An emoji shopfront, a name in punctuation, a box of spaces. Each would otherwise produce
    // an empty filename or a leading dot, and both are worse than the generic one.
    expect(projectFilename("   ")).toBe("linkpage.json");
    expect(projectFilename("🎂🎂🎂")).toBe("linkpage.json");
    expect(projectFilename("!!!")).toBe("linkpage.json");
    expect(projectFilename("...")).toBe("linkpage.json");
  });

  it("strips accents rather than carrying them onto a stranger's disk", () => {
    expect(slugify("Café Zoë")).toBe("cafe-zoe");
    expect(slugify("Ångström Bageri")).toBe("angstrom-bageri");
  });

  it("keeps a name that is not written in Latin letters", () => {
    // It is the owner's shop and `anchor.download` carries it intact. Falling back here would
    // hand most of the world the generic filename.
    expect(projectFilename("麵包店")).toBe("麵包店.linkpage.json");
    expect(projectFilename("Пекарня Ада")).toBe("пекарня-ада.linkpage.json");
  });

  it("recomposes what decomposing took apart", () => {
    // NFKD splits a Hangul syllable into jamo; a filename made of loose jamo is not the name
    // the owner typed, however it renders.
    expect(slugify("한글 빵집")).toBe("한글-빵집");
    expect(slugify("한글 빵집").normalize("NFC")).toBe(slugify("한글 빵집"));
  });

  it("turns every other run of punctuation into one dash", () => {
    expect(slugify("Bread & Butter")).toBe("bread-butter");
    expect(slugify("Fish // Chips")).toBe("fish-chips");
    expect(slugify("  Leading and trailing  ")).toBe("leading-and-trailing");
    expect(slugify("Ada & Sons <Bakers>")).toBe("ada-sons-bakers");
  });

  it("cannot produce a dotfile, a path, or a third extension", () => {
    // A `.` is punctuation like any other, so nothing a business is called can hide the file,
    // escape the downloads folder, or claim to be something else.
    expect(projectFilename(".hidden")).toBe("hidden.linkpage.json");
    expect(projectFilename("../../etc/passwd")).toBe("etc-passwd.linkpage.json");
    expect(projectFilename("report.pdf")).toBe("report-pdf.linkpage.json");
  });

  it("cuts a very long name without leaving a trailing dash", () => {
    const filename = projectFilename(`${"Bread ".repeat(40)}Shop`);
    expect(filename.length).toBeLessThanOrEqual(64 + ".linkpage.json".length);
    expect(filename).toContain("bread-bread");
    expect(filename).not.toContain("-.linkpage.json");
  });

  it("lowercases, because a downloads folder is easier to read than to match", () => {
    expect(slugify("ADA'S BAKERY")).toBe("adas-bakery");
  });
});

describe("is there anything to lose? (§7.8)", () => {
  it("answers null for empty storage — the one state that opens immediately", () => {
    expect(projectFile(createProjectStore({ storage: memory() }))).toBeNull();
  });

  it("counts a project holding only a typed name", () => {
    // §7.8 is explicit that this is something to lose. It is not a judgement about how much is
    // in the file: there is a document, so there is a project.
    const file = projectFile(withProject({ header: { name: "Ada's Bakery" } }));

    expect(file).not.toBeNull();
    expect(file?.name).toBe("Ada's Bakery");
    expect(file?.download.filename).toBe("adas-bakery.linkpage.json");
  });

  it("counts a project with no name at all, and does not invent one", () => {
    const file = projectFile(withProject({ style: { brand: "#c2185b" } }));

    expect(file).not.toBeNull();
    // The confirmation says so rather than naming it something it is not.
    expect(file?.name).toBeUndefined();
    expect(file?.download.filename).toBe("linkpage.json");
  });

  it("answers null for a stored file this builder cannot read", () => {
    // The store reports it and leaves it exactly where it is (#30). There is nothing here to
    // name and nothing to hand back, so there is nothing to offer to save either.
    const storage = memory();
    storage.setItem("linkpage.project", JSON.stringify({ version: 99 }));

    expect(projectFile(createProjectStore({ storage }))).toBeNull();
  });
});

describe("writing it", () => {
  let downloads: FakeDownloads;
  beforeEach(() => {
    downloads = installDownloads();
  });
  afterEach(() => downloads.restore());

  it("hands the browser the store's own bytes", async () => {
    const storage = memory();
    storage.setItem("linkpage.project", '{\n  "version": 1,\n  "header": { "name": "Bo" }\n}\n');
    const store = createProjectStore({ storage });

    projectFile(store)?.download.save();

    expect(downloads.written[0]?.filename).toBe("bo.linkpage.json");
    expect(downloads.written[0]?.blob?.type).toBe("application/json");
    // `store.text()` and nothing else, so the file the owner keeps is the file a reload reads —
    // with §4.5's formatting normalised around whatever a text editor left behind.
    expect(await downloads.written[0]?.blob?.text()).toBe(store.text());
    expect(await downloads.written[0]?.blob?.text()).toContain('"name": "Bo"');
  });

  it("reads the bytes at the press, not at the render", () => {
    // §7.8's escape can sit on screen for a while before it is taken; what lands on disk is the
    // project as it stands, the same way the page's own button builds on the press.
    const store = withProject({ version: 1, header: { name: "Bo" } });
    const file = projectFile(store);

    const draft = store.snapshot().draft;
    if (draft === null) throw new Error("no draft");
    store.update({ ...draft, header: { ...draft.header, tagline: "Later" } });
    file?.download.save();

    return expect(downloads.written[0]?.blob?.text()).resolves.toContain("Later");
  });
});

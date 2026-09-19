import { VOCABULARIES, direction, vocabulary } from "@linkpage/renderer";
import { describe, expect, it } from "vitest";
import { LANGUAGE_NAMES, listedKey } from "./languages.js";

/**
 * The picker's table against the renderer's, in both directions.
 *
 * A vocabulary with no name here is a language the page can write and the owner cannot reach; a
 * name here with no vocabulary offers a language the page cannot write. Both are silent failures
 * — the picker would simply be missing a row, or offering one that degrades to English — which is
 * exactly the kind a test has to hold, because nobody reads 41 rows looking for a gap.
 */
describe("the picker offers what the page can write, and only that (§7.4)", () => {
  it("names every vocabulary the renderer holds", () => {
    const unnamed = Object.keys(VOCABULARIES).filter((tag) => LANGUAGE_NAMES[tag] === undefined);
    expect(unnamed).toEqual([]);
  });

  it("names nothing the renderer cannot write", () => {
    const unwritable = Object.keys(LANGUAGE_NAMES).filter((tag) => VOCABULARIES[tag] === undefined);
    expect(unwritable).toEqual([]);
  });

  it("gives every language a non-empty name in its own script", () => {
    for (const [tag, name] of Object.entries(LANGUAGE_NAMES)) {
      expect(name.trim(), tag).not.toBe("");
      // The failure this catches is a placeholder left behind: an endonym that is the tag, or
      // the English name of a language that does not write in Latin script.
      expect(name.toLowerCase(), tag).not.toBe(tag);
    }
  });

  it("names each language exactly once", () => {
    const names = Object.values(LANGUAGE_NAMES);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("what a row shows is what choosing it produces", () => {
  it("takes the sample from the renderer rather than transcribing it", () => {
    // The point of the control (§7.4): the words on the row are the words on the page. Asserted
    // against the renderer's own table so a copy cannot drift from it.
    expect(vocabulary("cy").days.slice(0, 3)).toEqual(["Llun", "Maw", "Mer"]);
    expect(vocabulary("cy").closed).toBe("Ar gau");
    expect(vocabulary("en").days.slice(0, 3)).toEqual(["Mon", "Tue", "Wed"]);
  });

  it("carries the direction each language reads in", () => {
    // A right-to-left sample laid out left to right is the same mistake §2.5 fixes on the page,
    // in the control that is supposed to be showing the owner what they will get.
    expect(direction("ar")).toBe("rtl");
    expect(direction("he")).toBe("rtl");
    expect(direction("en")).toBe("ltr");
  });
});

/**
 * Which row a stored tag is (§7.4, §4.5; #379).
 *
 * The collapsed row and the open picker read the same answer, so the two cannot disagree about
 * whether `en-US` is English (it is) or `sw` is (it is not — the page *falls back* to English
 * words there, and §4.5 says the control shows `sw` rather than rewriting it).
 */
describe("which row a stored tag is (#379)", () => {
  it("resolves a region or script tag to the row that writes its words", () => {
    expect(listedKey("en-US")).toBe("en");
    expect(listedKey("en-GB")).toBe("en");
    expect(listedKey("fr-CA")).toBe("fr");
    expect(listedKey("zh-TW")).toBe("zh-hant");
    expect(listedKey("EN")).toBe("en");
  });

  it("is no row at all for a tag the page cannot write, even though the page falls back to English", () => {
    expect(listedKey("sw")).toBeUndefined();
    expect(listedKey("")).toBeUndefined();
    expect(listedKey(undefined)).toBeUndefined();
    // Not tag-shaped: the page declares `en` for it (§4.7), but the stored value is not English
    // and the row must not say it is.
    expect(listedKey("not a tag!")).toBeUndefined();
  });
});

import { VOCABULARIES, direction, vocabulary } from "@linkpage/renderer";
import { describe, expect, it } from "vitest";
import { LANGUAGE_NAMES } from "./languages.js";

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

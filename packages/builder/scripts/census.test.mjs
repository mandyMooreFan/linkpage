import { describe, expect, it } from "vitest";
import {
  covered,
  flowFrames,
  intended,
  LIST_FRAMES,
  missing,
  pageFrames,
  slug,
  unreached,
} from "./census.mjs";

/**
 * **The third check on the instrument**, beside `port.test.mjs` (#208) and `stability.test.mjs`
 * (#242), and drawing the same line they do: this is a check on the *instrument*, never on the
 * design. Nothing here opens a picture, and §7.4's terms are untouched — the ritual is still
 * hand-run and still never wired to CI.
 *
 * What it holds is the sentence #270 found was not being said: **a screen this run meant to
 * reach and did not get is not the same thing as a screen it left out on purpose.** Every
 * assertion below is written so it can fail on the failure it exists for — the map's rule that a
 * guard must prove it found something before it reports nothing wrong, measured there at 94 of
 * 119 tests still green with a corpus read broken.
 */

/** The shape of the real `ANSWERS`, cut short: some steps answered, some declined. */
const ANSWERS = {
  "What kind of business is this?": { kind: "preset" },
  "What's it called?": { kind: "type" },
  "Do you have a logo?": { kind: "skip" },
  "What's your colour?": { kind: "swatch" },
  "Where else are you online?": { kind: "skip" },
};

const RUN = {
  answers: ANSWERS,
  sizes: ["desktop", "mobile"],
  only: undefined,
  pageSize: "mobile",
  variants: ["centred-classic-light", "centred-friendly-dark"],
  hovered: ["centred-classic-light", "centred-friendly-dark"],
};

describe("what a run declares it is going for", () => {
  it("names the two import frames #270 lost, at both sizes", () => {
    // Named rather than counted, and named here rather than anywhere else: these are the exact
    // two frames that went missing from every set for three months while the run exited 0.
    const set = intended(RUN);
    expect(set).toContain("desktop/62-menu-file-refused");
    expect(set).toContain("desktop/63-menu-replace-confirm");
    expect(set).toContain("mobile/62-menu-file-refused");
    expect(set).toContain("mobile/63-menu-replace-confirm");
  });

  it("photographs an answered step twice and a declined one once", () => {
    // Not two frames a step: `skip` presses the escape, so there is nothing filled in to show.
    expect(flowFrames(ANSWERS)).toEqual([
      "01-what-kind-of-business-is-this-arrive",
      "01-what-kind-of-business-is-this-filled",
      "02-whats-it-called-arrive",
      "02-whats-it-called-filled",
      "03-do-you-have-a-logo-arrive",
      "04-whats-your-colour-arrive",
      "04-whats-your-colour-filled",
      "05-where-else-are-you-online-arrive",
    ]);
  });

  it("spells a frame's name the way the walk does", () => {
    // One copy of this, in one file, because the walk and the census have to agree letter for
    // letter or the census invents a missing screen (§7.4 on a repeated decision).
    expect(slug("Where does “See the menu” go?")).toBe("where-does-see-the-menu-go");
    expect(slug("What's your colour?")).toBe("whats-your-colour");
  });

  it("hovers only what was asked for", () => {
    expect(pageFrames(["a", "b"], ["b"])).toEqual(["pages/a", "pages/b", "pages/b-hover"]);
  });
});

describe("a flag is not a missing screen", () => {
  it("--only page declares no builder screens and no second size", () => {
    const set = intended({ ...RUN, only: "page" });
    expect(set).toContain("mobile/pages/centred-classic-light");
    expect(set).not.toContain("mobile/62-menu-file-refused");
    expect(set.filter((name) => name.startsWith("desktop/"))).toEqual([]);
  });

  it("--only builder declares no pages", () => {
    const set = intended({ ...RUN, only: "builder" });
    expect(set).toContain("desktop/61-menu");
    expect(set.filter((name) => name.includes("/pages/"))).toEqual([]);
  });

  it("--variant narrows the page set rather than losing it", () => {
    const one = intended({ ...RUN, variants: ["ruledLeft-modern-light"], hovered: [] });
    expect(one).toContain("mobile/pages/ruledLeft-modern-light");
    expect(one).not.toContain("mobile/pages/centred-classic-light");
    expect(one).not.toContain("mobile/pages/ruledLeft-modern-light-hover");
  });
});

describe("what the census reports", () => {
  it("names the screens that did not arrive, rather than counting them", () => {
    const set = intended(RUN);
    // Exactly #270, reproduced against the list: every frame arrived but the import fork's two.
    const lost = ["desktop/62-menu-file-refused", "desktop/63-menu-replace-confirm"];
    const took = set.filter((name) => !lost.includes(name));
    expect(missing(set, took)).toEqual(lost);
  });

  it("says nothing is missing only when nothing is", () => {
    const set = intended(RUN);
    expect(missing(set, set)).toEqual([]);
    // And the same call goes red on the thing above, so the green means something.
    expect(missing(set, set.slice(1))).toEqual([set[0]]);
  });

  it("counts a frame the run never declared as neither missing nor an error", () => {
    // The review list's rows are declared by the walk as it meets them; a run that takes more
    // than it declared is not a defect, and the census must not invent one.
    const set = intended(RUN);
    expect(missing(set, [...set, "desktop/52-01-businessname"])).toEqual([]);
  });

  it("refuses to pass over an empty declaration", () => {
    // The map's standing rule, applied to this guard: a census over nothing would report
    // "nothing missing" forever, and would have said exactly that for #270's three months.
    expect(() => missing([], [])).toThrow(/no screens to look for/);
  });
});

describe("the two voices", () => {
  it("says the set is incomplete, in those words, and names the frames", () => {
    const lines = unreached(
      ["desktop/62-menu-file-refused"],
      [{ what: "§7.9's refusal", why: "the menu has no item to press" }],
    ).join("\n");
    expect(lines).toContain("COULD NOT PHOTOGRAPH");
    expect(lines).toContain("desktop/62-menu-file-refused.png");
    expect(lines).toContain("the menu has no item to press");
    // The sentence the whole section is for: an identical pair of folders proves nothing here.
    expect(lines).toContain("proves nothing");
  });

  it("says nothing at all when there is nothing to say", () => {
    expect(unreached([], [])).toEqual([]);
  });

  it("carries a reason even when no declared frame is missing", () => {
    // A row that vanished, a hover the page could not offer: the walk knows why it gave up on
    // something the census could not have named in advance, and that is still not an omission.
    expect(
      unreached([], [{ what: "every review-list row", why: "the list came up empty" }]),
    ).not.toEqual([]);
  });

  it("makes the whole claim out loud when the set is whole", () => {
    // A guard that only speaks on failure teaches nobody it was looking (#242's precedent).
    expect(covered(["a", "b"]).join(" ")).toContain("all 2 of them");
  });
});

describe("the fixed frames", () => {
  it("holds the list's screens and leaves its rows to the walk", () => {
    expect(LIST_FRAMES).toContain("50-arrive");
    expect(LIST_FRAMES).toContain("60-download-sheet");
    // Row names come from the project the walk built, so they cannot be written down here.
    expect(LIST_FRAMES.filter((name) => name.startsWith("52-"))).toEqual([]);
  });
});

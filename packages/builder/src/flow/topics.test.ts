import { describe, expect, it } from "vitest";
import { emptyDraft, serializeProject, writeDraft, type Draft } from "../project/index.js";
import {
  addLink,
  answerBrand,
  answerLang,
  answerName,
  answerSection,
  answerTagline,
  hasContent,
  SECTIONS,
  TOPICS,
  type SectionAnswer,
} from "./topics.js";

/**
 * The door, and the one sentence it exists to make true.
 *
 * > **A ticked-but-empty section is not a state that exists.**
 *
 * These are not tests that the flow *avoids* writing an empty section — a UI test could only
 * show that one path does not. They are tests that there is **no argument** that makes the
 * door write one, which is a claim about every path there will ever be, including the ones
 * #34 and #36 have not written yet.
 */

const DRAFT = emptyDraft("en-GB");

/** Every shape of "the owner opened the form and said nothing" we can think of. */
const NOTHING: SectionAnswer[] = [
  { section: "hours", value: { clock: "12h", weekStart: "mon", days: {} } },
  { section: "hours", value: { clock: "12h", weekStart: "mon", days: {}, note: "   " } },
  // A day opened in the form and left blank, which is the one an over-eager screen produces.
  { section: "hours", value: { clock: "12h", weekStart: "mon", days: { mon: [["", ""]] } } },
  { section: "hours", value: { clock: "12h", weekStart: "mon", days: { mon: [["09:00", ""]] } } },
  { section: "contact", value: {} },
  { section: "contact", value: { phone: "", email: "" } },
  { section: "contact", value: { phone: "  ", email: "\t" } },
  { section: "address", value: { lines: [] } },
  { section: "address", value: { lines: ["", "  "] } },
  { section: "address", value: { lines: [""], directionsUrl: " " } },
  { section: "social", value: [] },
  { section: "social", value: [{ platform: "instagram", url: "" }] },
  { section: "social", value: [{ platform: "", url: "https://example.com" }] },
];

describe("a ticked-but-empty section is not a state that exists", () => {
  it.each(NOTHING.map((answer, index) => [`${answer.section} #${index}`, answer] as const))(
    "answers nothing with nothing: %s",
    (_name, answer) => {
      const after = answerSection(DRAFT, answer);

      // Identity, not equality. The flow reads `next === working` as "that answered nothing"
      // and stores nothing on the strength of it, so an equal-but-new object would still
      // create a project out of a question the owner declined.
      expect(after).toBe(DRAFT);
      expect(hasContent(after, answer.section)).toBe(false);
    },
  );

  it("leaves no key behind in the file either", () => {
    let draft = DRAFT;
    for (const answer of NOTHING) draft = answerSection(draft, answer);
    const document = writeDraft(draft, {});

    for (const section of SECTIONS) expect(section in document).toBe(false);
    expect(serializeProject(document)).not.toContain("hours");
  });

  it("keeps a day the owner said is closed, which is not the same as an empty one", () => {
    // §2.3: absent means unspecified, present-and-empty means explicitly closed. A page that
    // omits Sunday and a page that says "Sunday: closed" answer a visitor differently.
    const after = answerSection(DRAFT, {
      section: "hours",
      value: { clock: "12h", weekStart: "mon", days: { sun: [] } },
    });

    expect(after.hours?.days).toEqual({ sun: [] });
    expect(hasContent(after, "hours")).toBe(true);
  });

  it("drops the half-typed rows around a real answer rather than the answer", () => {
    const after = answerSection(DRAFT, {
      section: "hours",
      value: {
        clock: "12h",
        weekStart: "mon",
        days: { mon: [["09:00", "17:00"]], tue: [["", ""]], wed: [] },
        note: "  Bank holidays vary  ",
      },
    });

    expect(after.hours).toEqual({
      clock: "12h",
      weekStart: "mon",
      days: { mon: [["09:00", "17:00"]], wed: [] },
      note: "Bank holidays vary",
    });
  });

  it("keeps a social row it can render and drops one it cannot", () => {
    const after = answerSection(DRAFT, {
      section: "social",
      value: [
        { platform: "instagram", url: " https://instagram.com/ada " },
        { platform: "linkedin", url: "" },
      ],
    });

    // LinkedIn stays a legal platform (§4.4) — it is the missing *URL* that drops the row.
    expect(after.social).toEqual([{ platform: "instagram", url: "https://instagram.com/ada" }]);
  });
});

describe("a button exists only once it has a URL", () => {
  it.each(["", "   ", "\n"])("refuses a link with no destination (%j)", (url) => {
    const after = addLink(DRAFT, { label: "See the menu", url, icon: "menu" });

    expect(after).toBe(DRAFT);
    expect(after.links).toEqual([]);
  });

  it("appends one that has a destination, keeping its glyph", () => {
    const after = addLink(DRAFT, {
      label: " See the menu ",
      url: " https://x.example ",
      icon: "menu",
    });

    expect(after.links).toEqual([
      { label: "See the menu", url: "https://x.example", icon: "menu" },
    ]);
  });

  it("carries no icon when the owner named the button themselves", () => {
    // The curated set serves the preset suggestions (§2.4); guessing a glyph from a label the
    // owner invented would be decoration pretending to be meaning.
    const after = addLink(DRAFT, { label: "Our newsletter", url: "https://x.example" });

    expect(after.links[0]).toEqual({ label: "Our newsletter", url: "https://x.example" });
    expect(after.links[0] && "icon" in after.links[0]).toBe(false);
  });
});

describe("the required answers are answers, not defaults", () => {
  it.each(["", "  "])("refuses a blank business name (%j)", (name) => {
    expect(answerName(DRAFT, name)).toBe(DRAFT);
  });

  it.each(["", "  "])("refuses a blank colour (%j)", (brand) => {
    expect(answerBrand(DRAFT, brand)).toBe(DRAFT);
  });

  it("honours a hand-typed hex exactly (§3.3)", () => {
    expect(answerBrand(DRAFT, "  #C2185B ").style.brand).toBe("#C2185B");
  });

  it("refuses a blank tagline, which is how declining one is stored", () => {
    expect(answerTagline(DRAFT, "   ")).toBe(DRAFT);
    expect(hasContent(answerTagline(DRAFT, "   "), "tagline")).toBe(false);
  });
});

describe("lang is answered by the browser, never by a screen (§4.1)", () => {
  it("fills an absent one", () => {
    const without: Draft = { ...DRAFT, lang: undefined };
    expect(answerLang(without, "cy").lang).toBe("cy");
  });

  it("never overwrites one the file already had", () => {
    expect(answerLang(DRAFT, "cy")).toBe(DRAFT);
  });
});

describe("hasContent is the one definition of covered", () => {
  it("says a fresh project has covered nothing", () => {
    for (const topic of TOPICS) expect(hasContent(DRAFT, topic)).toBe(false);
  });

  it("agrees with the door on every topic it can write", () => {
    let draft = addLink(DRAFT, { label: "Shop", url: "https://x.example" });
    draft = answerTagline(draft, "Very good coffee");
    for (const answer of [
      { section: "hours", value: { clock: "12h", weekStart: "mon", days: { mon: [] } } },
      { section: "contact", value: { phone: "+44" } },
      { section: "address", value: { lines: ["12 Mill Lane"] } },
      { section: "social", value: [{ platform: "x", url: "https://x.example" }] },
    ] satisfies SectionAnswer[]) {
      draft = answerSection(draft, answer);
    }

    for (const topic of TOPICS) {
      // `logo` is the only one no answer above reaches — #31's pipeline owns it.
      expect([topic, hasContent(draft, topic)]).toEqual([topic, topic !== "logo"]);
    }
  });
});

import { vocabulary, type Interval } from "@linkpage/renderer";
import { describe, expect, it } from "vitest";
import { POPULATED } from "../fixtures.js";
import { uncoveredTopics } from "../flow/plan.js";
import { hasContent, TOPICS, type Topic } from "../flow/topics.js";
import type { Draft } from "../project/index.js";
import { removeTopic } from "./edits.js";
import { listRows, type RowId } from "./rows.js";

/** The three rows that are not topics are the three this partition does not speak about. */
const isTopic = (id: RowId): id is Topic => (TOPICS as readonly string[]).includes(id);

/**
 * The list and the flow have one opinion about what is filled in. `SPEC.md` §7.4, §7.1, §4.3.
 *
 * Everything below is one claim in three shapes: **a row and a tick-on are the same question
 * answered two ways.** If the list could think a section was there while the flow thought it
 * was not, the gap between them would be the half-filled row §7.1 built the two-screens rule
 * to prevent — so the interesting test is not that some particular section shows up, but that
 * the two halves of the screen are a *partition* of the topics, for any project at all.
 */

const EMPTY: Draft = {
  version: POPULATED.version,
  lang: "en-GB",
  style: POPULATED.style,
  header: { name: "Ada's Bakery", logo: null },
  links: [],
};

/** Every topic dropped one at a time, plus the two ends. */
function corpus(): Draft[] {
  return [POPULATED, EMPTY, ...TOPICS.map((topic) => removeTopic(POPULATED, topic))];
}

describe("what the list is a list of", () => {
  it("partitions the topics into rows and tick-ons, for any project", () => {
    for (const draft of corpus()) {
      const { rows, uncovered } = listRows(draft);
      const asRows = rows.map((row) => row.id).filter(isTopic);

      expect([...asRows, ...uncovered].sort()).toEqual([...TOPICS].sort());
      // Not merely disjoint: neither half is allowed a topic of its own.
      expect(asRows.filter((topic) => uncovered.includes(topic))).toEqual([]);
    }
  });

  it("asks the flow's own predicate rather than deciding for itself", () => {
    for (const draft of corpus()) {
      const { rows, uncovered } = listRows(draft);
      const asRows = new Set(rows.map((row) => row.id));

      for (const topic of TOPICS) {
        expect(asRows.has(topic)).toBe(hasContent(draft, topic));
      }
      expect(uncovered).toEqual(uncoveredTopics(draft));
    }
  });

  it("holds the three rows that are not topics, whatever else is missing", () => {
    for (const draft of corpus()) {
      const ids = listRows(draft).rows.map((row) => row.id);
      expect(ids).toContain("businessName");
      expect(ids).toContain("style");
      expect(ids).toContain("lang");
    }
  });

  it("reads in the page's order, then the two settings rows (§2.1)", () => {
    expect(listRows(POPULATED).rows.map((row) => row.id)).toEqual([
      "businessName",
      "tagline",
      "logo",
      "links",
      "hours",
      "contact",
      "address",
      "social",
      "style",
      "lang",
    ]);
  });

  it("never shows a row without an answer in it", () => {
    for (const draft of corpus()) {
      for (const row of listRows(draft).rows) {
        expect(row.summary.trim()).not.toBe("");
      }
    }
  });
});

/**
 * **A row says what is there, not what it says** (§7.4, #253).
 *
 * The rule is one sentence and it splits the nine rows in two: a row whose answer is a *list of
 * things* reports how many, and a row whose answer is *one short thing* still shows it. What is
 * asserted below is the wording itself, exactly, because the wording is the decision — and then
 * the property underneath it, which is that **nothing an owner can type reaches a counted row,
 * however much of it there is**.
 *
 * **Nothing here counts lines or characters.** That shape of guard has been written in this repo
 * and bitten it, and it would be the wrong instrument twice over: a row is one line because of
 * what it *contains* (#253 refused a clamp outright), and the length that matters is measured in
 * a browser at 390px, which is what #245 did. These hold the content rule; the pictures hold
 * the look.
 */
describe("every answer is a row, saying what is there (§7.4)", () => {
  const summary = (draft: Draft, id: string): string =>
    listRows(draft).rows.find((row) => row.id === id)?.summary ?? "";

  it("shows one short answer in the owner's own words", () => {
    expect(summary(POPULATED, "businessName")).toBe("Ada & Sons <Bakers>");
    expect(summary(POPULATED, "tagline")).toBe(
      'Sourdough, pastries, and "the best" cheese scone in town',
    );
    expect(summary(POPULATED, "contact")).toBe("+44 20 7946 0100 · hello@adasbakery.example");
    expect(summary(POPULATED, "address")).toBe("12 Mill Lane, Hebden Bridge, HX7 8AA");
  });

  it("reports how many, on a row holding a list", () => {
    expect(summary(POPULATED, "links")).toBe("2 link buttons");
    expect(summary(POPULATED, "social")).toBe("1 account");
    expect(summary(POPULATED, "hours")).toBe("Open 1 day · a note");
  });

  it("describes the logo exactly as it always did", () => {
    // The row this rule was taken *from*: it has always said what is there, because there was
    // never anything else it could say. It should now look like it belonged all along.
    expect(summary(POPULATED, "logo")).toBe("1200 × 400");
    const drawn: Draft = {
      ...POPULATED,
      header: {
        ...POPULATED.header,
        logo: { src: "data:image/png;base64,x", width: 0, height: 0 },
      },
    };
    expect(summary(drawn, "logo")).toBe("Added");
  });

  it("keeps the singular, because a list of one is an ordinary project", () => {
    const one: Draft = {
      ...POPULATED,
      links: [{ label: "See the menu", url: "https://adasbakery.example/menu" }],
    };
    expect(summary(one, "links")).toBe("1 link button");
    expect(summary(POPULATED, "social")).toBe("1 account");
    expect(summary(POPULATED, "hours")).toBe("Open 1 day · a note");
  });

  /**
   * **The claim that makes this a rule rather than three strings.**
   *
   * A summary that merely happened to be short for the fixture would be no better than the one
   * this replaced. So the row is asked twice with the owner's words changed underneath it and
   * nothing else changed: the answer must not move. Twelve buttons with those labels is the
   * renderer's own `MAXIMAL`, which is the project #245 measured at fourteen lines.
   */
  it("says how many, and nothing the owner typed decides it", () => {
    const twelve = (label: (i: number) => string): Draft => ({
      ...POPULATED,
      links: Array.from({ length: 12 }, (_, i) => ({
        label: label(i),
        url: `https://hebdenbridgebakehouse.example/order/${i}`,
      })),
    });
    const wordy = twelve((i) => `Order ${i} online for collection or delivery`);
    const terse = twelve(() => "x");

    // The haystack really is what #245 measured, before anything is asked about the needle.
    expect(wordy.links.map((link) => link.label).join(", ").length).toBeGreaterThan(400);

    expect(summary(wordy, "links")).toBe("12 link buttons");
    expect(summary(terse, "links")).toBe(summary(wordy, "links"));
    for (const link of wordy.links) expect(summary(wordy, "links")).not.toContain(link.label);
  });

  it("counts an unrecognised platform like any other account (§4.4)", () => {
    // §4.4's "shown as they wrote it" is about the *page*'s fallback for a platform we have no
    // mark for. It was never a reason for this row to become a list of names, and the name is
    // on the row's own screen a press away.
    const draft: Draft = {
      ...POPULATED,
      social: [
        { platform: "instagram", url: "https://instagram.example/a" },
        { platform: "linkedin", url: "https://linkedin.example/b" },
      ],
    };
    expect(summary(draft, "social")).toBe("2 accounts");
    expect(summary(draft, "social")).not.toContain("linkedin");
  });

  /**
   * The hours block has three states, so the row has three sentences.
   *
   * **Closed is a thing the owner said** (§2.3) and absent is not, which is why the middle case
   * cannot read *closed every day*: marking Sunday closed and leaving the rest unspecified says
   * nothing about Monday, and neither may the row.
   */
  describe("the hours row", () => {
    const withHours = (hours: Draft["hours"]): Draft => ({ ...POPULATED, hours });

    it("counts the days there are times for", () => {
      const open: Interval[] = [["07:30", "17:15"]];
      const week = { mon: open, tue: open, wed: open, thu: open, fri: open, sat: open, sun: open };
      expect(summary(withHours({ clock: "12h", weekStart: "mon", days: week }), "hours")).toBe(
        "Open 7 days",
      );
    });

    it("says a note is there without saying what it says", () => {
      const note = "Bank holidays vary — we post the week's hours on Instagram every Sunday.";
      const draft = withHours({
        clock: "12h",
        weekStart: "mon",
        days: { mon: [["07:30", "17:15"]] },
        note,
      });
      expect(summary(draft, "hours")).toBe("Open 1 day · a note");
      expect(summary(draft, "hours")).not.toContain("Instagram");
    });

    it("does not claim a day the owner never spoke about", () => {
      const draft = withHours({ clock: "12h", weekStart: "mon", days: { sun: [] } });
      expect(summary(draft, "hours")).toBe("No days open");
    });

    it("answers a hand-edited file that has a note and no days at all (§4.5)", () => {
      const draft = withHours({ clock: "12h", weekStart: "mon", days: {}, note: "Ring first" });
      expect(summary(draft, "hours")).toBe("Just a note");
      expect(summary(draft, "hours")).not.toContain("Ring first");
    });

    it("is the tool's own English, whatever language the page declares", () => {
      // It used to be the page's words — the seven abbreviations and the word for closed (§2.5)
      // — because it quoted the page. It no longer quotes it, so the row now reads like every
      // other label in the builder, and the language decides only which days `hoursView` finds.
      // The language really does change the page's words, or this test is blind to nothing.
      expect(vocabulary("cy").closed).not.toBe(vocabulary("en").closed);
      expect(vocabulary("cy").days).not.toEqual(vocabulary("en").days);

      const day: Interval[] = [["09:00", "17:00"]];
      const draft = withHours({ clock: "24h", weekStart: "mon", days: { mon: day } });
      expect(summary({ ...draft, lang: "cy" }, "hours")).toBe("Open 1 day");
      expect(summary({ ...draft, lang: "en-GB" }, "hours")).toBe("Open 1 day");
    });
  });

  it("shows the brand colour exactly as it was typed (§3.3)", () => {
    // Not the derivation's version of it: the row reports the answer, the page beside it
    // reports what was made of the answer.
    const draft: Draft = { ...POPULATED, style: { ...POPULATED.style, brand: "#FFFBE6" } };
    expect(summary(draft, "style")).toContain("#FFFBE6");
  });

  it("puts a defaulted field on the list like any other (§4.3)", () => {
    // A file that said nothing about shape or mode reads as the defaults, and the defaults
    // are what the row says — which is the whole of "loads silently" not meaning "invisibly".
    expect(summary(POPULATED, "style")).toBe("Raspberry · Centred · Light");
    expect(summary(POPULATED, "lang")).toBe("en-GB");
  });
});

/**
 * §7.9 decision 5: what cannot be used leaves a mark that outlives the screen.
 *
 * Derived from the very functions the renderer uses, so the builder and the page can never
 * disagree about whether a target exists — asking anything else would be a second opinion about
 * the same string.
 */
describe("a row whose value the page cannot use (§7.9)", () => {
  const mark = (draft: Draft, id: string): string | undefined =>
    listRows(draft).rows.find((row) => row.id === id)?.mark;

  it("says nothing at all when everything works", () => {
    for (const row of listRows(POPULATED).rows) expect(row.mark).toBeUndefined();
  });

  it("marks a link button whose address cannot become a target", () => {
    const draft = { ...POPULATED, links: [{ label: "Order online", url: "/menu" }] } as Draft;
    expect(mark(draft, "links")).toBe(
      "This button won't work — paste the address from your browser.",
    );
  });

  it("gives phone its own sentence, because nothing is broken", () => {
    // A vanity number is deliberate and correct; *this button won't work* would be false about
    // it. What justifies marking it is that the screen promised tap-to-call.
    const draft = { ...POPULATED, contact: { phone: "0800 CHICKEN" } } as Draft;
    expect(mark(draft, "contact")).toBe(
      "Tapping this won't dial — add the number in digits if you want it tappable.",
    );
  });

  it("marks an email the floor cannot use", () => {
    const draft = { ...POPULATED, contact: { email: "hello@nodot" } } as Draft;
    expect(mark(draft, "contact")).toBe("Tapping this won't open an email — check the address.");
  });

  it("calls directions and social links rather than buttons, because they are not", () => {
    // One pattern, one noun of variation (§7.9 decision 6) — not a second voice.
    const directions = {
      ...POPULATED,
      address: { lines: ["12 Bridge Street"], directionsUrl: "@mybakery" },
    } as Draft;
    expect(mark(directions, "address")).toBe(
      "This link won't work — paste the address from your browser.",
    );

    const social = { ...POPULATED, social: [{ platform: "instagram", url: "@ada" }] } as Draft;
    expect(mark(social, "social")).toBe(
      "This link won't work — paste the address from your browser.",
    );
  });

  it("never names our diagnosis", () => {
    const draft = { ...POPULATED, links: [{ label: "Order online", url: "/menu" }] } as Draft;
    for (const banned of ["invalid", "format", "valid"]) {
      expect(mark(draft, "links")?.toLowerCase()).not.toContain(banned);
    }
  });

  it("says nothing about a field the owner simply left empty", () => {
    // The mark is for what we cannot use, never for what is absent. §4.6 is explicit that a
    // missing field is collected by the flow rather than reported.
    const draft = { ...POPULATED, contact: {} } as Draft;
    expect(mark(draft, "contact")).toBeUndefined();
  });
});

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

describe("every answer is a row (§7.4)", () => {
  const summary = (draft: Draft, id: string): string =>
    listRows(draft).rows.find((row) => row.id === id)?.summary ?? "";

  it("says what the owner said, in their words", () => {
    expect(summary(POPULATED, "businessName")).toBe("Ada & Sons <Bakers>");
    expect(summary(POPULATED, "links")).toBe("See the menu, Order for pickup");
    expect(summary(POPULATED, "contact")).toBe("+44 20 7946 0100 · hello@adasbakery.example");
    expect(summary(POPULATED, "address")).toBe("12 Mill Lane, Hebden Bridge, HX7 8AA");
    expect(summary(POPULATED, "social")).toBe("Instagram");
    expect(summary(POPULATED, "logo")).toBe("1200 × 400");
    expect(summary(POPULATED, "hours")).toBe(
      "Mon 7:00 AM – 2:00 PM · Sat Closed · Sun Closed · Closed bank holidays",
    );
  });

  it("keeps an unrecognised platform as the owner wrote it (§4.4)", () => {
    const draft: Draft = { ...POPULATED, social: [{ platform: "linkedin", url: "https://x" }] };
    expect(summary(draft, "social")).toBe("linkedin");
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

import { describe, expect, it } from "vitest";
import { readDraft, type Draft } from "../project/index.js";
import {
  flowEntry,
  openingAt,
  planSteps,
  uncoveredTopics,
  type FlowEntry,
  type Pick,
} from "./plan.js";
import type { PresetId } from "./presets.js";

/**
 * The seam. `SPEC.md` §7.1, §7.2, §4.6.
 *
 * > **The flow re-enters for anything new; the list holds everything that already exists.**
 *
 * Two pure functions carry that whole rule, which is the point of them being pure: a multi-
 * screen sequence is otherwise only testable by driving it, and driving it tests the screens
 * rather than the rule. Here the rule is a list of strings.
 */

/** The steps as a reader of §7 would name them. */
function ids(steps: ReturnType<typeof planSteps>): string[] {
  return steps.map((step) => (step.id === "linkUrl" ? `linkUrl:${step.pick.label}` : step.id));
}

const EMPTY: FlowEntry = { kind: "empty" };

function plan(entry: FlowEntry, draft: Draft | null, preset: PresetId | null, picks: Pick[] = []) {
  return ids(planSteps({ entry, draft, preset, picks }));
}

/** A project that has everything required, as an import or a finished flow leaves it. */
const COMPLETE: Draft = readDraft({
  version: 1,
  lang: "en-GB",
  style: { brand: "#c2185b" },
  header: { name: "Ada's Bakery" },
  links: [{ label: "Order", url: "https://ada.example" }],
});

describe("which screen owns the window", () => {
  it("hands an empty builder to the flow — the flow *is* the empty state (§7.1)", () => {
    expect(flowEntry(null)).toEqual({ kind: "empty" });
  });

  it("hands a finished project to the list", () => {
    expect(flowEntry(COMPLETE)).toBeNull();
  });

  it.each([
    ["no colour", { version: 1, lang: "en", header: { name: "Ada's" } }],
    ["no name", { version: 1, lang: "en", style: { brand: "#c2185b" } }],
    ["neither", { version: 1, lang: "en" }],
  ])(
    "collects a required field an imported file lacks, rather than reporting it: %s",
    (_case, file) => {
      // §4.6: "A file with no `style.brand` is exactly the territory the flow exists for, so the
      // owner is walked through the colour question as if they had ticked a new section."
      expect(flowEntry(readDraft(file))).toEqual({ kind: "resume" });
    },
  );

  it("tells a first run apart from a project missing the same field (#65)", () => {
    // The two states this function used to spell the same way. They are one answer apart and
    // they are owed different flows — a first run is owed every question its preset selected, a
    // resume only what is missing — so the answer has to be taken at the moment a run starts
    // and then held, because the first answer of a first run turns the one into the other.
    expect(flowEntry(null)).toEqual({ kind: "empty" });
    expect(flowEntry(readDraft({ version: 1, lang: "en", header: { name: "Ada's" } }))).toEqual({
      kind: "resume",
    });
  });

  it("does not send an owner back to the flow over a missing lang (§4.1)", () => {
    // The one required field that is not a question: the browser answers it.
    const noLang = readDraft({ version: 1, style: { brand: "#c2185b" }, header: { name: "Ada" } });
    expect(noLang.lang).toBeUndefined();
    expect(flowEntry(noLang)).toBeNull();
  });
});

describe("the first run", () => {
  it("opens on the preset question and plans nothing past it", () => {
    // Step one decides which of the four optional steps exist at all, so there is nothing to
    // plan until it is answered.
    expect(plan(EMPTY, null, null)).toEqual(["preset"]);
  });

  it.each([
    ["food", ["hours", "contact", "address", "social"]],
    ["shop", ["hours", "contact", "address", "social"]],
    ["appointments", ["hours", "contact", "address", "social"]],
    ["mobile", ["contact", "social"]],
    ["online", ["social"]],
    ["other", ["hours", "contact", "address", "social"]],
  ] satisfies [PresetId, string[]][])("runs %s end to end", (preset, sections) => {
    expect(plan(EMPTY, null, preset)).toEqual([
      "preset",
      "name",
      "tagline",
      "logo",
      "brand",
      "links",
      ...sections,
    ]);
  });

  it("never asks 'we come to you' where they live", () => {
    expect(plan(EMPTY, null, "mobile")).not.toContain("address");
  });

  it("re-plans when the preset is chosen again, since nothing is filled in yet (§7.3)", () => {
    // Re-choosable while still in the flow; there is no "change business type" control after.
    expect(plan(EMPTY, null, "food")).toContain("hours");
    expect(plan(EMPTY, null, "online")).not.toContain("hours");
  });

  it("adds one URL screen per pick, in the order they were picked", () => {
    const picks: Pick[] = [
      { id: "suggested:See the menu", label: "See the menu", icon: "menu" },
      { id: "own:0:Our newsletter", label: "Our newsletter" },
    ];

    expect(plan(EMPTY, null, "online", picks)).toEqual([
      "preset",
      "name",
      "tagline",
      "logo",
      "brand",
      "links",
      "linkUrl:See the menu",
      "linkUrl:Our newsletter",
      "social",
    ]);
  });
});

describe("re-entry (§7.1)", () => {
  it("spans every unanswered topic, in page order, opening at the one ticked (#146)", () => {
    // COMPLETE covers name, brand and links; everything else is unanswered territory, and the
    // run offers all of it rather than walking the one ticked section alone.
    const steps = planSteps({
      entry: { kind: "add", topics: ["hours"] },
      draft: COMPLETE,
      preset: null,
      picks: [],
    });
    expect(ids(steps)).toEqual(["tagline", "logo", "hours", "contact", "address", "social"]);
    expect(openingAt(steps, { kind: "add", topics: ["hours"] })).toBe(2);
  });

  it("opens at the top for every other entry", () => {
    const first = planSteps({ entry: EMPTY, draft: null, preset: "food", picks: [] });
    expect(openingAt(first, EMPTY)).toBe(0);
  });

  it("is the same step the first run would have used", () => {
    const first = plan(EMPTY, null, "food");
    for (const topic of ["hours", "contact", "address", "social"] as const) {
      expect(first).toContain(topic);
      expect(plan({ kind: "add", topics: [topic] }, COMPLETE, null)).toContain(topic);
    }
  });

  it("never plans the preset question — it is one-time and unreachable from the list (§7.3)", () => {
    const everything = plan(
      {
        kind: "add",
        topics: ["tagline", "logo", "links", "hours", "contact", "address", "social"],
      },
      COMPLETE,
      // Even handed one, which the list cannot do, because the list has no preset to hand.
      "food",
    );
    expect(everything).not.toContain("preset");
  });

  it("keeps the page's own order however the topics arrive", () => {
    expect(plan({ kind: "add", topics: ["social", "hours", "tagline"] }, COMPLETE, null)).toEqual([
      "tagline",
      "logo",
      "hours",
      "contact",
      "address",
      "social",
    ]);
  });

  it("asks a topic once however often it is asked for", () => {
    const once = plan({ kind: "add", topics: ["hours", "hours"] }, COMPLETE, null);
    expect(once.filter((id) => id === "hours")).toEqual(["hours"]);
  });

  it("collects a required field on the way, without the preset question (§4.6)", () => {
    const noBrand = readDraft({ version: 1, lang: "en", header: { name: "Ada's" } });
    const steps = plan({ kind: "add", topics: ["hours"] }, noBrand, null);
    expect(steps).toContain("brand");
    expect(steps).not.toContain("preset");
    expect(steps).not.toContain("name");
  });

  it("still never re-asks what the file already has", () => {
    // COMPLETE covers name, brand and links; none of the three appears however the run spans.
    const steps = plan({ kind: "add", topics: ["hours"] }, COMPLETE, null);
    expect(steps).not.toContain("name");
    expect(steps).not.toContain("brand");
    expect(steps).not.toContain("links");
  });
});

/**
 * The state that looks exactly like a first run and is not. `SPEC.md` §4.6.
 *
 * > "A file with no `style.brand` is exactly the territory the flow exists for, so the owner is
 * > walked through the colour question as if they had ticked a new section."
 *
 * **As if they had ticked a new section** — one question, then the list. Not the first run
 * again: this owner has a project, and everything the flow does not ask them for is a row on
 * the list they can tick when they want it.
 */
describe("resuming a project that is missing something required (§4.6)", () => {
  const NO_BRAND = readDraft({ version: 1, lang: "en", header: { name: "Ada's" } });
  const NO_NAME = readDraft({ version: 1, lang: "en", style: { brand: "#c2185b" } });

  it("plans the missing field and nothing else", () => {
    expect(plan({ kind: "resume" }, NO_BRAND, null)).toEqual(["brand"]);
    expect(plan({ kind: "resume" }, NO_NAME, null)).toEqual(["name"]);
    expect(plan({ kind: "resume" }, readDraft({ version: 1 }), null)).toEqual(["name", "brand"]);
  });

  it("is not the first run, even though the draft cannot tell you which you are in (#65)", () => {
    // A first run one answer in *is* `NO_BRAND` — same draft, different flow. Which one the
    // owner is in is a fact about when the run started, so it is decided there and held.
    expect(plan(EMPTY, NO_BRAND, "food")).toEqual([
      "preset",
      "tagline",
      "logo",
      "brand",
      "links",
      "hours",
      "contact",
      "address",
      "social",
    ]);
    expect(plan({ kind: "resume" }, NO_BRAND, "food")).toEqual(["brand"]);
  });

  it("never asks the preset question, whatever it is handed (§7.3)", () => {
    expect(plan({ kind: "resume" }, NO_BRAND, "food")).not.toContain("preset");
  });

  it("has nothing to do for a project that is not missing anything", () => {
    expect(plan({ kind: "resume" }, COMPLETE, null)).toEqual([]);
  });
});

describe("what the list may offer", () => {
  it("offers exactly the territory the owner has not covered", () => {
    expect(uncoveredTopics(COMPLETE)).toEqual([
      "tagline",
      "logo",
      "hours",
      "contact",
      "address",
      "social",
    ]);
  });

  it("stops offering a section once it holds something", () => {
    const withHours: Draft = {
      ...COMPLETE,
      hours: { clock: "12h", weekStart: "mon", days: { mon: [] } },
    };
    expect(uncoveredTopics(withHours)).not.toContain("hours");
  });

  it("still offers a section that arrived from a file with nothing in it", () => {
    // §4.5 keeps `"contact": {}` in the file; §7.1 says a ticked-but-empty section does not
    // exist as a *state*, so the list treats an empty one as territory still uncovered.
    const hollow = readDraft({
      version: 1,
      lang: "en",
      style: { brand: "#c2185b" },
      header: { name: "Ada's" },
      contact: {},
      address: { lines: [] },
    });
    expect(uncoveredTopics(hollow)).toContain("contact");
    expect(uncoveredTopics(hollow)).toContain("address");
  });
});

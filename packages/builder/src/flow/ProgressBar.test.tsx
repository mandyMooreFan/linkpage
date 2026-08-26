// @vitest-environment jsdom

import { cleanup, fireEvent, render as mount, screen, within } from "@testing-library/react";
import { useState, type JSX } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { emptyDraft, readDraft, type Draft } from "../project/index.js";
import { Flow } from "./Flow.js";
import { barUnits } from "./ProgressBar.js";
import { planSteps, type FlowEntry } from "./plan.js";
import { findPreset, PRESETS, type PresetId } from "./presets.js";
import { TYPE } from "../ui/type.js";

/**
 * The progress bar's arithmetic and its two promises. `SPEC.md` §7.2 as amended (#139, #146).
 *
 * The load-bearing claims: the bar counts **topics, not screens**, so the total exists from the
 * preset onwards and link picks never move it; the fill **never retreats**, so `Back` cannot
 * pull it down; and it is **absent on the preset screen**, where a total does not exist yet.
 */

afterEach(cleanup);

const bar = (): HTMLElement | null => document.querySelector("[data-progress-bar]");
const barText = (): string => bar()?.textContent ?? "";

function harness(entry: FlowEntry = { kind: "empty" }, draft: Draft | null = null): void {
  function Harness(): JSX.Element {
    const [done, setDone] = useState(false);
    if (done) return <p>the review list</p>;
    return (
      <Flow
        entry={entry}
        draft={draft}
        lang="en-GB"
        onChange={vi.fn()}
        onDone={() => setDone(true)}
      />
    );
  }
  mount(<Harness />);
}

const topicList = (): HTMLElement | null => document.querySelector("[data-topic-list]");

/** Tap the bar itself, which is the whole control (§7.2). */
function tapBar(): void {
  fireEvent.click(document.querySelector("[data-progress-bar] > button") as Element);
}

/** Open the bar's list and jump to the named topic. */
function jumpTo(label: string): void {
  tapBar();
  fireEvent.click(
    within(topicList() as HTMLElement).getByRole("button", { name: new RegExp(label) }),
  );
}

const title = (): string => screen.getByRole("heading", { level: 1 }).textContent ?? "";

function choosePreset(preset: PresetId): void {
  const entry = PRESETS.find((each) => each.id === preset);
  fireEvent.click(screen.getByRole("button", { name: new RegExp(entry?.label ?? "") }));
}

/** Decline screens until the given heading is on screen, answering the two required ones. */
function walkTo(heading: string): void {
  for (let guard = 0; guard < 40 && title() !== heading; guard += 1) {
    if (title() === "What's it called?") {
      fireEvent.change(screen.getByLabelText(/Business name/), { target: { value: "Ada's" } });
      fireEvent.click(document.querySelector('button[type="submit"]') as Element);
      continue;
    }
    if (title() === "What's your colour?") {
      fireEvent.click(document.querySelectorAll("[data-swatch]")[0] as Element);
      fireEvent.click(document.querySelector('button[type="submit"]') as Element);
      continue;
    }
    fireEvent.click(document.querySelector("[data-escape]") as Element);
  }
  expect(title()).toBe(heading);
}

describe("the units are topics, not screens (§7.2)", () => {
  it("groups a food-preset plan into nine units regardless of link picks", () => {
    const base = { entry: { kind: "empty" } as const, draft: null, preset: "food" as const };

    const unpicked = barUnits(planSteps({ ...base, picks: [] }));
    expect(unpicked.map((unit) => unit.label)).toEqual([
      "Name",
      "Tagline",
      "Logo",
      "Colour",
      "Link buttons",
      "Opening hours",
      "Phone and email",
      "Address",
      "Social accounts",
    ]);

    // Three picks add three URL screens and zero units: the total the bar shows cannot move.
    const picks = findPreset("food").suggestions.map((each, index) => ({
      id: `pick-${index}`,
      ...each,
    }));
    const picked = barUnits(planSteps({ ...base, picks }));
    expect(planSteps({ ...base, picks }).length).toBeGreaterThan(
      planSteps({ ...base, picks: [] }).length,
    );
    expect(picked.length).toBe(unpicked.length);
  });

  it("has no units to show before a plan exists", () => {
    expect(
      barUnits(planSteps({ entry: { kind: "empty" }, draft: null, preset: null, picks: [] })),
    ).toEqual([]);
  });
});

describe("the bar on screen (§7.2)", () => {
  it("is absent on the preset screen and present from the first question", () => {
    harness();
    expect(bar()).toBeNull();

    choosePreset("food");
    expect(bar()).not.toBeNull();
    expect(barText()).toContain("Name");
    expect(barText()).toContain("0 of 9 done");
  });

  it("holds its total through the link run and names the run one thing", () => {
    harness();
    choosePreset("food");
    walkTo("Which of these do you have?");
    expect(barText()).toContain("4 of 9 done");

    for (const label of ["See the menu", "Order for pickup"]) {
      fireEvent.click(screen.getByRole("checkbox", { name: label }));
    }
    fireEvent.click(document.querySelector('button[type="submit"]') as Element);

    // Two URL screens follow. Same unit, same total, no movement until the run is passed.
    expect(barText()).toContain("Link buttons");
    expect(barText()).toContain("4 of 9 done");
    fireEvent.click(document.querySelector("[data-escape]") as Element);
    expect(barText()).toContain("4 of 9 done");
    fireEvent.click(document.querySelector("[data-escape]") as Element);

    expect(title()).toBe("When are you open?");
    expect(barText()).toContain("5 of 9 done");
  });

  it("never retreats on Back", () => {
    harness();
    choosePreset("food");
    walkTo("One line about what you do?");
    expect(barText()).toContain("1 of 9 done");

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(title()).toBe("What's it called?");
    expect(barText()).toContain("1 of 9 done");
    expect(barText()).toContain("Name");
  });
});

describe("the bar is the run's navigation (§7.2, #146)", () => {
  it("drops open the run's topic list on tap and jumps where tapped", () => {
    harness();
    choosePreset("food");
    expect(topicList()?.hidden).toBe(true);

    tapBar();
    expect(topicList()?.hidden).toBe(false);
    fireEvent.click(
      within(topicList() as HTMLElement).getByRole("button", { name: /Opening hours/ }),
    );

    expect(title()).toBe("When are you open?");
    // Territory jumped over is not done — the gap is the honest report.
    expect(barText()).toContain("0 of 9 done");
  });

  it("discards a half-answered screen on jump, exactly as Back does", () => {
    harness();
    choosePreset("food");
    fireEvent.change(screen.getByLabelText(/Business name/), { target: { value: "Ada's" } });

    jumpTo("Opening hours");
    jumpTo("Name");
    expect((screen.getByLabelText(/Business name/) as HTMLInputElement).value).toBe("");
  });

  it("counts a topic done only when it is left forwards, whatever the visit order", () => {
    harness();
    choosePreset("food");
    walkTo("One line about what you do?");
    expect(barText()).toContain("1 of 9 done");

    jumpTo("Opening hours");
    expect(barText()).toContain("1 of 9 done");
    fireEvent.click(document.querySelector("[data-escape]") as Element);

    // Escaping hours finishes it; the tagline and everything jumped over stays open.
    expect(barText()).toContain("2 of 9 done");
  });

  it("opens a re-entry run at the ticked topic, with the whole territory on offer (#146)", () => {
    const draft = readDraft({
      version: 1,
      lang: "en-GB",
      style: { brand: "#c2185b" },
      header: { name: "Ada's" },
    });
    harness({ kind: "add", topics: ["contact"] }, draft);

    expect(title()).toBe("How do people reach you?");
    // Everything unanswered is in the run: tagline, logo, links, hours, contact, address, social.
    expect(barText()).toContain("0 of 7 done");
  });

  it("offers Done for now on a re-entry run and nowhere else", () => {
    harness();
    choosePreset("food");
    tapBar();
    expect(within(topicList() as HTMLElement).queryByText("Done for now")).toBeNull();
    cleanup();

    harness({ kind: "add", topics: ["hours"] }, emptyDraft("en-GB"));
    tapBar();
    fireEvent.click(
      within(topicList() as HTMLElement).getByRole("button", { name: "Done for now" }),
    );
    expect(screen.queryByText("the review list")).not.toBeNull();
  });
});

/**
 * The bar names the topic you are on at one size (design change 11, finding B-31).
 *
 * The header and the drawer used to be 14px and 16px, so tapping the bar open showed the same
 * words twice, two sizes apart, on one screen — while the `done` marker inside those 16px rows
 * was itself 14px, so one row mixed both and its header twin mixed neither.
 *
 * **This mounts the real bar and reads the size each name actually inherits**, rather than
 * checking that two class strings match. `controls.test.ts` holds the source rule — the bar may
 * set a size exactly once, on itself — and this holds the consequence: the two places the same
 * label appears resolve to the same step. A guard on the classes alone would go green if the
 * drawer grew an ancestor with a size of its own, which is exactly how the defect arrived.
 */
describe("one size per role: the bar's own type (§2, B-31)", () => {
  /** The step an element is set at, resolved the way the cascade resolves it: nearest ancestor. */
  const stepOf = (node: Element | null): string | undefined => {
    for (let at = node; at !== null; at = at.parentElement) {
      const step = [...at.classList].find((name) => /^text-(xs|sm|base|lg|[2-9]?xl)$/.test(name));
      if (step !== undefined) return step;
    }
    return undefined;
  };

  const named = (label: string, within: Element): Element | undefined =>
    [...within.querySelectorAll("span")].find((span) => span.textContent === label);

  it("sets the topic you are on at the same step in the header and in the drawer", () => {
    harness();
    choosePreset("food");
    tapBar();

    const header = named("Name", bar() as Element);
    const drawer = named("Name", topicList() as Element);
    expect(header, "the header does not name the current topic").toBeDefined();
    expect(drawer, "the drawer does not name the current topic").toBeDefined();

    expect(stepOf(header ?? null), "the header names it at no step at all").toBeDefined();
    expect(stepOf(drawer ?? null)).toBe(stepOf(header ?? null));
  });

  it("sets the whole bar at that step, marker included", () => {
    harness();
    choosePreset("food");
    walkTo("What's your colour?");
    tapBar();

    const step = stepOf(bar());
    expect(step).toBe(TYPE.bar.className);

    const inside = [...(bar() as Element).querySelectorAll("*")].filter((node) =>
      [...node.classList].some((name) => /^text-(xs|sm|base|lg|[2-9]?xl)$/.test(name)),
    );
    expect(inside, "nothing inside the bar may set a second size").toEqual([]);
  });
});

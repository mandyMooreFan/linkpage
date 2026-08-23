// @vitest-environment jsdom

import { cleanup, fireEvent, render as mount, screen } from "@testing-library/react";
import { useState, type JSX } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Draft } from "../project/index.js";
import { Flow } from "./Flow.js";
import { barUnits } from "./ProgressBar.js";
import { planSteps } from "./plan.js";
import { findPreset, PRESETS, type PresetId } from "./presets.js";

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

function harness(): void {
  function Harness(): JSX.Element {
    const [done, setDone] = useState(false);
    if (done) return <p>the review list</p>;
    return (
      <Flow entry={{ kind: "empty" }} draft={null} lang="en-GB" onChange={vi.fn()} onDone={() => setDone(true)} />
    );
  }
  mount(<Harness />);
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
    expect(barUnits(planSteps({ entry: { kind: "empty" }, draft: null, preset: null, picks: [] }))).toEqual([]);
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

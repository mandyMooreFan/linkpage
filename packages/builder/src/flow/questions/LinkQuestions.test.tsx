// @vitest-environment jsdom

import { cleanup, render as mount } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PRESETS } from "../presets.js";
import { LinksQuestion } from "./LinkQuestions.js";

/**
 * The link-buttons screen says what a tick commits to. `SPEC.md` §7.3; #369.
 *
 * The cold desktop walk (#359, moment 11) ticked two suggestions without knowing they would
 * become buttons: *See the menu* and *Book a table* read as questions about the business, and
 * the hint spoke of where each one *goes* before the owner knew they were links. The screen now
 * says so in one plain sentence, in the hint, and says it in the words the screen actually
 * offers — *tick* where there are suggestions, *add* where *Something else* left none.
 */

afterEach(cleanup);

const hint = (): string => document.querySelector("[data-question-hint]")?.textContent ?? "";

function show(suggestions: (typeof PRESETS)[number]["suggestions"]): void {
  mount(
    <LinksQuestion suggestions={suggestions} initial={[]} onAnswer={vi.fn()} onSkip={vi.fn()} />,
  );
}

describe("the screen says the ticks become buttons (§7.3, #369)", () => {
  it("with a preset's suggestions: each one you tick becomes a button on your page", () => {
    show(PRESETS[0]!.suggestions);
    expect(hint()).toContain("Each one you tick becomes a button on your page.");
  });

  it("for Something else, with nothing to tick: each one you add becomes a button", () => {
    show([]);
    expect(hint()).toContain("Each one you add becomes a button on your page.");
    expect(hint()).not.toContain("tick");
  });

  it("still promises nothing is added until it has somewhere to point", () => {
    show(PRESETS[0]!.suggestions);
    expect(hint()).toContain("nothing is added until it has somewhere to point");
  });
});

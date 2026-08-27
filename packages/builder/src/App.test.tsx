// @vitest-environment jsdom

import { act, cleanup, fireEvent, render as mount, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App.js";
import { installDownloads, type FakeDownloads } from "./download/downloads.testing.js";
import { PROJECT_STORAGE_KEY, type StorageLike } from "./project/index.js";
import { WEIGHT } from "./ui/Button.js";
import { filledLabels } from "./ui/fill.testing.js";

/**
 * The seam, end to end. `SPEC.md` §7.1.
 *
 * > **The flow is the empty state; the review list is the editing screen. They are the same
 * > product at two moments.**
 *
 * Everything below is one claim: which screen the owner gets is decided by what is in the
 * project, and nothing else. There is no "have they seen the wizard" flag, no first-run
 * marker, and nothing to keep in step — which is why coming back a month later opens the list
 * and ticking a section opens the flow, without either being a case anybody wrote.
 */

afterEach(cleanup);

/**
 * The one project, somewhere the test owns.
 *
 * Handed to `App` rather than reached for as a global: Node 26 ships a `localStorage` of its
 * own that shadows jsdom's and answers `undefined`, so the ambient one is a different object
 * depending on which runtime CI picked. This is also what makes "a month later" expressible —
 * the storage outlives the mount, which is the whole of what a second visit is.
 */
function memory(): StorageLike {
  const entries = new Map<string, string>();
  return {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => void entries.set(key, value),
    removeItem: (key) => void entries.delete(key),
  };
}

let storage: StorageLike;
beforeEach(() => {
  storage = memory();
});

const title = (): string => screen.getByRole("heading", { level: 1 }).textContent ?? "";
const submit = (): Element => document.querySelector('button[type="submit"]') as Element;
const escapeButton = (): Element | null => document.querySelector("[data-escape]");
/** Stated positively, so "the walk ended" cannot be confused with "the walk got stuck". */
const onList = (): boolean => document.querySelector('[data-screen="list"]') !== null;

const PRESET_QUESTION = "What kind of business is this?";
const NAME = "What's it called?";
const TAGLINE = "One line about what you do?";
const LOGO = "Do you have a logo?";
const COLOUR = "What's your colour?";
const LINKS = "Which of these do you have?";
const HOURS = "When are you open?";
const CONTACT = "How do people reach you?";
const ADDRESS = "Where are you?";
const SOCIAL = "Where else are you online?";

/**
 * Walk the flow from wherever it is standing to the list, declining everything that can be
 * declined, and **return the heading of every screen it passed through**.
 *
 * The itinerary is the return value because asserting it is the point (#65). The walker this
 * replaces answered the two required questions, escaped everything else and stopped when it ran
 * out of escapes — so a run that asked for a name, asked for a colour and gave up satisfied it
 * exactly as well as the whole flow did, and that is what shipped. **A test that walks a flow
 * without checking where it went is most of the reason.**
 */
function walk(preset: RegExp = /Food & drink/, name = "Ada's Bakery"): string[] {
  const seen: string[] = [];

  for (let guard = 0; guard < 40 && !onList(); guard += 1) {
    const heading = title();
    seen.push(heading);

    if (heading === PRESET_QUESTION) {
      fireEvent.click(screen.getByRole("button", { name: preset }));
      continue;
    }
    if (heading === NAME) {
      fireEvent.change(screen.getByLabelText(/Business name/), { target: { value: name } });
      fireEvent.click(submit());
      continue;
    }
    if (heading === COLOUR) {
      fireEvent.click(document.querySelectorAll("[data-swatch]")[0] as Element);
      fireEvent.click(submit());
      continue;
    }
    // §7.2: every other step carries an always-present "not for us" escape. A step that has
    // none and is not one of the two exceptions hangs the walk, which is the right failure.
    const escape = escapeButton();
    expect(escape, `no escape on "${heading}"`).not.toBeNull();
    fireEvent.click(escape as Element);
  }

  expect(onList()).toBe(true);
  return seen;
}

/** Walk a first run under §7.3's "Food & drink", declining everything optional. */
function firstRun(name = "Ada's Bakery"): string[] {
  return walk(/Food & drink/, name);
}

/**
 * The first run, through the front door. `SPEC.md` §7.1, §7.2, §7.3.
 *
 * > **you never face a blank field you weren't walked into**
 *
 * Everything below asserts a *sequence of questions*, because a first run that terminates is
 * not the claim — a first run that asks for the tagline, the logo, the link buttons and the
 * sections its preset selected is (#65). Those screens exist and are tested one by one; what is
 * only assertable here is that the front door reaches them.
 *
 * **A run is planned once, when it starts.** The plan orders are held in `plan.test.ts` and the
 * screens in `flow.test.tsx`, both against an entry handed in and held still by the test. This
 * file is the only place the entry is chosen by the application, which is the only place the
 * bug could live and did.
 */
describe("the first run walks everything the preset selected (§7.2, §7.3)", () => {
  const HEAD = [PRESET_QUESTION, NAME, TAGLINE, LOGO, COLOUR, LINKS];

  it.each([
    ["Food & drink", /Food & drink/, [HOURS, CONTACT, ADDRESS, SOCIAL]],
    ["Shop or venue", /Shop or venue/, [HOURS, CONTACT, ADDRESS, SOCIAL]],
    ["Appointments", /Appointments/, [HOURS, CONTACT, ADDRESS, SOCIAL]],
    ["We come to you", /We come to you/, [CONTACT, SOCIAL]],
    ["Online only", /Online only/, [SOCIAL]],
    ["Something else", /Something else/, [HOURS, CONTACT, ADDRESS, SOCIAL]],
  ] satisfies [string, RegExp, string[]][])("%s", (_label, preset, sections) => {
    mount(<App storage={storage} />);

    // §7.3's table, walked. The header's own two steps and the link pick-list run for every
    // preset because none of them selects those; the sections are the preset's whole effect.
    expect(walk(preset)).toEqual([...HEAD, ...sections]);
  });

  it("never asks 'we come to you' where they live (§7.3)", () => {
    // The decision a preset makes better than a well-labelled checkbox: a sole trader does not
    // publish their home address because the flow asked and they answered.
    mount(<App storage={storage} />);
    expect(walk(/We come to you/)).not.toContain(ADDRESS);
  });

  it("does not restart when the first answer creates the project (#65)", () => {
    mount(<App storage={storage} />);
    fireEvent.click(screen.getByRole("button", { name: /Food & drink/ }));
    fireEvent.change(screen.getByLabelText(/Business name/), { target: { value: "Ada's Bakery" } });
    fireEvent.click(submit());

    // The mechanism, rather than its symptom. Answering the name is what creates the project,
    // and it used to re-plan the run and remount it — so the proof that this is still the same
    // run is that everything behind the owner is still there. A rebuilt one would have lost the
    // preset, and with it the way back to step one (§7.3).
    expect(title()).toBe(TAGLINE);
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(title()).toBe(NAME);
    expect(screen.getByLabelText(/Business name/)).toHaveProperty("value", "Ada's Bakery");
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(title()).toBe(PRESET_QUESTION);
  });
});

/**
 * §7.4's arrival line, and where it is held.
 *
 * The list was never blank on arrival — the owner's own name heads it and the page sits beside
 * it — but they have just answered ten questions and have never been told what happens next,
 * with §8's guidance living inside a sheet they have no reason to open.
 */
describe("arriving from a run says so, once (§7.4)", () => {
  const arrival = (): string | undefined =>
    document.querySelector("[data-arrival]")?.textContent ?? undefined;

  it("says nothing before the questions run out", () => {
    mount(<App storage={storage} />);
    expect(arrival()).toBeUndefined();
  });

  it("greets the owner when the flow hands the window back", () => {
    mount(<App storage={storage} />);
    walk();
    expect(onList()).toBe(true);
    expect(arrival()).toBe("Your page is ready. Look it over, then download it.");
  });

  it("is held in memory, never in the file", () => {
    // §4.5 stays clean: no flag reaches `project.json`, so it belongs to the transition rather
    // than to the list.
    mount(<App storage={storage} />);
    walk();
    const saved = storage.getItem(PROJECT_STORAGE_KEY) ?? "";
    expect(saved).not.toContain("arriv");
    expect(saved).not.toContain("ready");
  });

  it("is gone on the next visit, because a reload is not an arrival", () => {
    mount(<App storage={storage} />);
    walk();
    expect(arrival()).toBeDefined();

    cleanup();
    mount(<App storage={storage} />);
    expect(onList()).toBe(true);
    expect(arrival()).toBeUndefined();
  });
});

describe("which screen the owner gets", () => {
  it("opens on the preset question when there is nothing stored (§7.8)", () => {
    mount(<App storage={storage} />);

    expect(title()).toBe("What kind of business is this?");
    expect(screen.getByText(/Already have a project file/)).toBeTruthy();
  });

  it("lands on the list when the questions run out, and stays there on the next visit", () => {
    mount(<App storage={storage} />);
    firstRun();
    expect(title()).toBe("Ada's Bakery");

    // A month later. The project came back from storage, so the list opens — not the flow.
    cleanup();
    mount(<App storage={storage} />);
    expect(title()).toBe("Ada's Bakery");
    expect(screen.queryByText(/Already have a project file/)).toBeNull();
  });

  it("re-enters the flow for a section ticked on the list, and returns to it (§7.1)", () => {
    mount(<App storage={storage} />);
    firstRun();

    // "An owner who skipped opening hours and comes back to add them ticks the box" — and the
    // run opens on hours with the rest of the unanswered territory on offer (§7.1, #146).
    fireEvent.click(screen.getByRole("button", { name: "Opening hours" }));
    expect(title()).toBe("When are you open?");
    expect(screen.queryByText("What kind of business is this?")).toBeNull();

    fireEvent.click(
      within(screen.getByRole("radiogroup", { name: "Monday" })).getByRole("radio", {
        name: "Closed",
      }),
    );
    fireEvent.click(submit());

    // The run offers what is still unanswered; leaving is the bar's own exit (#146).
    fireEvent.click(document.querySelector("[data-progress-bar] > button") as Element);
    fireEvent.click(screen.getByRole("button", { name: "Done for now" }));
    expect(title()).toBe("Ada's Bakery");
    // Answered, so it is no longer territory the owner has not covered.
    expect(screen.queryByRole("button", { name: "Opening hours" })).toBeNull();
  });

  it("leaves the list unchanged when the owner declines the thing they ticked", () => {
    mount(<App storage={storage} />);
    firstRun();
    const before = storage.getItem(PROJECT_STORAGE_KEY);

    fireEvent.click(screen.getByRole("button", { name: "Address" }));
    fireEvent.click(escapeButton() as Element);

    fireEvent.click(document.querySelector("[data-progress-bar] > button") as Element);
    fireEvent.click(screen.getByRole("button", { name: "Done for now" }));
    expect(title()).toBe("Ada's Bakery");
    expect(storage.getItem(PROJECT_STORAGE_KEY)).toBe(before);
    // Still on offer, because a declined section is not a section (§7.1).
    expect(screen.getByRole("button", { name: "Address" })).toBeTruthy();
  });

  it("collects what an imported file is missing instead of reporting it (§4.6)", () => {
    // A hand-written file with no colour: exactly the territory the flow exists for.
    storage.setItem(
      PROJECT_STORAGE_KEY,
      JSON.stringify({ version: 1, lang: "en-GB", header: { name: "Ada's Bakery" } }),
    );
    mount(<App storage={storage} />);
    expect(document.querySelector("[data-open-error]")).toBeNull();

    // **One question, then the list** — "as if they had ticked a new section", not the first
    // run again. This owner has a project, so the sibling of the run above resumes narrowly and
    // the two states stay distinct even though the draft cannot tell them apart (#65).
    expect(walk()).toEqual([COLOUR]);
    expect(title()).toBe("Ada's Bakery");
    // And what it did not ask for is on the list, waiting to be ticked (§7.1).
    expect(screen.getByRole("button", { name: "Opening hours" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "A line about what you do" })).toBeTruthy();
  });

  it("shows what a file arrived without as ordinary rows (§4.3)", () => {
    // A hand-written file with the two required answers and nothing else: `lang` comes from
    // the browser (§4.1) and the five structural style controls take their defaults. Neither
    // is announced — but §4.3's rule is that a field defaulted on load is on the list, so the
    // way to find out is the product's normal surface rather than a dialog that fires once.
    storage.setItem(
      PROJECT_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        header: { name: "Ada's Bakery" },
        style: { brand: "#c2185b" },
      }),
    );
    mount(<App storage={storage} />);

    expect(title()).toBe("Ada's Bakery");
    expect(screen.getByRole("button", { name: /^How it looks/ }).textContent).toContain("Centred");

    const language = screen.getByRole("button", { name: /^Page language/ });
    expect(language.textContent).toContain(navigator.language);
    // Silently, and permanently the moment the file opens — which is safe because the upgrade
    // only ever adds defaults for things that were absent.
    expect(JSON.parse(storage.getItem(PROJECT_STORAGE_KEY) ?? "{}")).toMatchObject({
      lang: navigator.language,
    });
  });

  it("re-enters the flow for another link button, and lands back on the list (§7.1)", () => {
    mount(<App storage={storage} />);
    firstRun();

    fireEvent.click(screen.getByRole("button", { name: "Link buttons" }));
    expect(title()).toBe("Which of these do you have?");

    fireEvent.change(screen.getByLabelText("Something else"), { target: { value: "Our menu" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    fireEvent.click(submit());
    fireEvent.change(screen.getByLabelText("Web address"), {
      target: { value: "https://ada.example/menu" },
    });
    fireEvent.click(submit());

    fireEvent.click(document.querySelector("[data-progress-bar] > button") as Element);
    fireEvent.click(screen.getByRole("button", { name: "Done for now" }));
    expect(title()).toBe("Ada's Bakery");
    // And it is a row now, with the answer in it, rather than a tick-on. The answer is what is
    // there rather than what it says (§7.4, #245) — the button the run just added, counted;
    // *Our menu* itself is in the row's own fields, a press away (`list.test.tsx`).
    expect(screen.getByRole("button", { name: /^Link buttons\s*1 link button/ })).toBeTruthy();
  });

  it("autosaves each answer as it is given, not at the end", () => {
    mount(<App storage={storage} />);
    fireEvent.click(screen.getByRole("button", { name: /Food & drink/ }));

    // A preset is not an answer about the business, so nothing has been stored yet (§7.3).
    expect(storage.getItem(PROJECT_STORAGE_KEY)).toBeNull();

    fireEvent.change(screen.getByLabelText(/Business name/), { target: { value: "Ada's" } });
    fireEvent.click(submit());

    expect(JSON.parse(storage.getItem(PROJECT_STORAGE_KEY) ?? "{}")).toMatchObject({
      header: { name: "Ada's" },
    });
  });
});

/**
 * **One set of verbs across both screens, and the list has fewer events to spend them on.**
 * `SPEC.md` §7.11, §7.1. [#247](https://github.com/mandyMooreFan/linkpage/issues/247).
 *
 * §7.11 says *the list moves exactly as the flow does (§7.1: both or neither)*, and measured in
 * Chromium at 390×844 against the built app, opening or closing a review row ran **zero**
 * animations while the flow's identical question — the same `Question.tsx` shell — ran the
 * two-phase fade. That reads as a broken promise and is not one: what both screens share is the
 * 320ms arrival fade, and the flow's *second* verb answers an event the list does not have.
 *
 * **The fade is the verb for a screen change, and a screen change is a still frame whose
 * contents swap.** A row opening is the frame itself changing: the rows below move 313px. Both
 * ways of animating it were built and photographed on this ticket rather than argued — scoped to
 * the row body, the surrounding rows jump at full speed and a 313px hole stands open for 320ms
 * while the editor fades into it; scoped to the whole surface, every row ghosts over its own new
 * position, which is the whole-surface alternative §7.11's diagnosis rejected in the first place.
 *
 * **This file is the only one that can hold it**, because the claim is about two screens being
 * the same product at two moments and nothing that mounts one of them can compare. Both halves
 * are read off the rendered app rather than off the sources (#213), and the second is written so
 * that it **cannot report "nothing ran" without first proving the instrument fires**: one stub,
 * one mount, the flow's Continue and the list's row-open measured against each other.
 */
describe("the list moves exactly as the flow does — both or neither (§7.11, #247)", () => {
  /** jsdom has no view transitions, so the fallback is the default and the stub is the case. */
  const host = document as { startViewTransition?: (update: () => void) => unknown };

  afterEach(() => {
    delete host.startViewTransition;
  });

  /** The classes a screen's own root wears, as whole words — never a substring (#201). */
  const rootClasses = (which: "flow" | "list"): string[] => {
    const root = document.querySelector(`[data-screen="${which}"]`);
    expect(root, `no ${which} screen is mounted at all`).not.toBeNull();
    const worn = ((root as Element).className || "").split(/\s+/).filter((one) => one !== "");
    expect(worn, `the ${which} root wears no classes at all`).not.toEqual([]);
    return worn;
  };

  it("gives both screens the same arrival, which is the half of the sentence that binds", () => {
    mount(<App storage={storage} />);
    const flow = rootClasses("flow");
    expect(flow, "the flow's root does not fade in when a run begins").toContain("enter-fade");

    firstRun();

    const list = rootClasses("list");
    expect(list, "the list arrives without the fade the flow arrives with").toContain("enter-fade");
    // Neither screen may grow motion the other has not got: the shared class is the whole of it.
    expect(
      flow.filter((one) => one.includes("fade") || one.includes("animate")),
      "the two roots no longer arrive alike",
    ).toEqual(list.filter((one) => one.includes("fade") || one.includes("animate")));
  });

  it("starts a transition for a screen change and none for a row opening", () => {
    const started = vi.fn((update: () => void) => {
      update();
      return {};
    });
    host.startViewTransition = started;

    mount(<App storage={storage} />);
    fireEvent.click(screen.getByRole("button", { name: /Food & drink/ }));

    // **Non-vacuity, and it is the whole design of this test.** A guard that only asserts the
    // list runs nothing goes green on a stub that was never installed, on a screen that never
    // mounted, and on an app with no motion left in it. So the instrument is proved on the flow
    // first, in the same mount, with the same stub: one screen change, one call.
    expect(started, "the flow's own screen change did not reach the stub").toHaveBeenCalledTimes(1);

    const afterFlow = started.mock.calls.length;
    firstRun();
    expect(started.mock.calls.length, "walking the flow ran no screen changes").toBeGreaterThan(
      afterFlow,
    );
    const onArrival = started.mock.calls.length;

    // Now the same question, through the same shell, on the other screen.
    const row = screen.getByRole("button", { name: /^Business name/ });
    fireEvent.click(row);
    expect(row.getAttribute("aria-expanded"), "the row did not open").toBe("true");
    expect(
      started,
      "the list started a view transition for a disclosure — §7.11 says it has no verb for one",
    ).toHaveBeenCalledTimes(onArrival);

    fireEvent.click(row);
    expect(row.getAttribute("aria-expanded"), "the row did not close").toBe("false");
    expect(started, "closing the row started one").toHaveBeenCalledTimes(onArrival);
  });
});

/**
 * Download, from the button on the list to the bytes the browser is handed. `SPEC.md` §7.7.
 *
 * The sheet's own copy and order are held in `download/download.test.tsx`. What is worth
 * asserting *here* is the only part neither of those files can see on its own: that the button
 * §7.4 puts on the list is connected to the sheet, and that pressing the sheet's page button
 * produces the page **this owner just built** — not a fixture, and not a second rendering of it.
 */
describe("download, end to end (§7.7)", () => {
  let downloads: FakeDownloads;
  beforeEach(() => {
    downloads = installDownloads();
  });
  afterEach(() => downloads.restore());

  it("writes the owner's own page from the list's Download button", async () => {
    mount(<App storage={storage} />);
    firstRun("Ada & Sons <Bakers>");

    fireEvent.click(screen.getByRole("button", { name: "Download" }));

    // The sheet, in §7.7's order: the page, then the project file.
    expect(screen.getAllByRole("heading", { level: 3 }).map((node) => node.textContent)).toEqual([
      "Put your page online",
      "Keep a copy of your work",
    ]);

    fireEvent.click(screen.getByRole("button", { name: "Download index.html" }));

    expect(downloads.written).toHaveLength(1);
    expect(downloads.written[0]?.filename).toBe("index.html");
    // The owner's name, escaped the way the export escapes it — so this is the file they built
    // and not a page assembled a second time on the way to disk (§5.2).
    const text = (await downloads.written[0]?.blob?.text()) ?? "";
    expect(text.startsWith("<!doctype html>")).toBe(true);
    expect(text).toContain("Ada &amp; Sons &lt;Bakers&gt;");
  });

  it("leaves the list where it was when the sheet is closed", () => {
    mount(<App storage={storage} />);
    firstRun();

    fireEvent.click(screen.getByRole("button", { name: "Download" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(title()).toBe("Ada's Bakery");
  });

  /**
   * One filled button per screen, across the seam §7.7 opens (§4, §6; #250).
   *
   * `list.test.tsx` holds the expression and the two sizes. This is the other half: the sheet
   * raised the way the owner raises it, from the one boolean `App` also mounts the sheet from —
   * so the thing being checked is that the two cannot get out of step, which is a claim about
   * the wiring and not about either component.
   *
   * **The phone's `covered` case, end to end, without asking for it.** jsdom has no `matchMedia`,
   * so the list lands page-first and Download is already in the drawer's header (#186). Pressing
   * it there is precisely the ordering #250 settled: the sheet is `fixed inset-0` at `z-30` over
   * the drawer's `z-20`, and its `bg-ink/40` scrim leaves the drawer's own filled Download plainly
   * legible above it — photographed while this was built. So `downloading` outranks `covered`,
   * which is the one term of the four that does.
   */
  it("steps the list's Download down while §7.7's sheet is over it, and hands the fill back (#250)", () => {
    mount(<App storage={storage} />);
    firstRun();

    expect(filledLabels()).toEqual(["Download"]);
    fireEvent.click(screen.getByRole("button", { name: "Download" }));

    // Not two solid ink rectangles in one viewport with the upper one inert — one, on the sheet
    // that was raised. **Identified, never counted.**
    expect(filledLabels()).toEqual(["Download index.html"]);
    expect(screen.getByRole("button", { name: "Download" }).className).toContain(WEIGHT.secondary);

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    // The sheet is gone, so the drawer is the screen again and its one control is filled — which
    // is B-48's fix (#186) still standing on the other side of this change.
    expect(filledLabels()).toEqual(["Download"]);
  });

  it("writes the owner's project file under §7.7's name for it", async () => {
    mount(<App storage={storage} />);
    firstRun("Ada's Bakery");
    fireEvent.click(screen.getByRole("button", { name: "Download" }));

    // The consequence sentence is the point of section two, and the name is what the owner has
    // to recognise a month later in a folder where `index.html` is anonymous.
    expect(document.body.textContent).toContain(
      "if you lose it, you’d have to build your page again from scratch",
    );
    fireEvent.click(screen.getByRole("button", { name: "Download adas-bakery.linkpage.json" }));

    expect(downloads.written).toHaveLength(1);
    expect(downloads.written[0]?.filename).toBe("adas-bakery.linkpage.json");
    expect(downloads.written[0]?.blob?.type).toBe("application/json");
    // The exact bytes in storage — so what the owner keeps is what a reload would read, and
    // opening it again is a no-op rather than a re-formatting (§4.5).
    expect(await downloads.written[0]?.blob?.text()).toBe(storage.getItem(PROJECT_STORAGE_KEY));
  });
});

/**
 * Opening a project you already have, from both doorways. `SPEC.md` §7.8, §7.9, §4.6.
 *
 * > **Import always replaces. It never merges.**
 *
 * The pieces are held apart in `open/open.test.tsx` — what the confirmation says, what the escape
 * writes, what a refusal shows. What only exists here is the wiring, and the two claims that are
 * about the whole application rather than about any component in it:
 *
 * 1. **Which branch of §7.8 a picked file takes is decided by the project, not by the control.**
 *    The quiet line always opens immediately because the screen carrying it is the screen with
 *    nothing to lose; the menu always confirms because the list only exists once there is a
 *    project. Neither is a rule anybody wrote down twice.
 * 2. **A refusal leaves the existing project exactly where it was** — asserted against the bytes
 *    in storage, because "untouched" is a claim about the file and not about the screen.
 */
describe("opening a project you already have (§7.8, §7.9)", () => {
  let downloads: FakeDownloads;
  beforeEach(() => {
    downloads = installDownloads();
  });
  afterEach(() => downloads.restore());

  /** A project file as we write them, so seeding storage and picking a file agree on the bytes. */
  const projectJson = (project: object): string => `${JSON.stringify(project, null, 2)}\n`;

  const ADAS = {
    version: 1,
    lang: "en-GB",
    style: { brand: "#c2185b" },
    header: { name: "Ada's Bakery" },
    hours: { days: { mon: [["07:00", "14:00"]] } },
  };

  const BOS = {
    version: 1,
    lang: "en-GB",
    style: { brand: "#1a3ea8" },
    header: { name: "Bo's Books" },
  };

  /** Hand the OS picker's answer to whichever screen is showing. */
  async function pick(text: string, filename = "project.json"): Promise<void> {
    // The picker is `aria-hidden` and out of the tab order (#254), so it is reached by its
    // §7.4 hook — being unreachable by role is the point of it.
    const input = document.querySelector("[data-file-picker]") as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, {
        target: { files: [new File([text], filename, { type: "application/json" })] },
      });
    });
  }

  /** Open the list's menu and reach for a file, as the owner does. */
  function openTheMenu(): void {
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Open a project file…" }));
  }

  const confirmation = (): string => document.querySelector("[data-replace]")?.textContent ?? "";

  describe("the quiet line, with nothing to lose", () => {
    it("opens the file immediately, with no confirmation (§7.8)", async () => {
      mount(<App storage={storage} />);
      expect(title()).toBe("What kind of business is this?");

      await pick(projectJson(ADAS));

      // The majority path: a second device, an empty browser, an owner holding a file. Nothing
      // is at risk, so nothing is asked.
      expect(title()).toBe("Ada's Bakery");
      expect(confirmation()).toBe("");
      expect(JSON.parse(storage.getItem(PROJECT_STORAGE_KEY) ?? "{}")).toMatchObject({
        header: { name: "Ada's Bakery" },
      });
    });

    it("opens a file whose name says nothing about it (§7.7)", async () => {
      mount(<App storage={storage} />);

      // Import validates by content, not by filename. A renamed file still opens.
      await pick(projectJson(ADAS), "backup (3).txt");
      expect(title()).toBe("Ada's Bakery");
    });

    it("refuses in place, with the preset question above it untouched (§7.9)", async () => {
      mount(<App storage={storage} />);

      await pick("{ this is not a file");

      const message = document.querySelector("[data-open-error]")?.textContent ?? "";
      expect(message).toContain("This file appears to be damaged.");
      // Never a modal, never a navigation: the next action is pick again, and in place makes
      // that one press rather than dismiss → re-find the control → re-open the picker.
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(title()).toBe("What kind of business is this?");
      expect(screen.getByRole("button", { name: /Food & drink/ })).toBeTruthy();
      expect(storage.getItem(PROJECT_STORAGE_KEY)).toBeNull();
    });

    it("clears the message by picking again, which is the whole recovery (§7.9)", async () => {
      mount(<App storage={storage} />);

      await pick("[1, 2, 3]");
      expect(document.querySelector("[data-open-error]")?.textContent).toContain(
        "This doesn't look like a linkpage file.",
      );

      await pick(projectJson(ADAS));
      expect(title()).toBe("Ada's Bakery");
      expect(document.querySelector("[data-open-error]")).toBeNull();
    });

    it("says nothing at all about a file that is only missing things (§4.6)", async () => {
      mount(<App storage={storage} />);

      // No `style.brand`: exactly the territory the flow exists for. No error, no repair dialog,
      // no invented default — the owner is walked through the colour question instead.
      await pick(projectJson({ version: 1, lang: "en", header: { name: "Ada's Bakery" } }));

      expect(title()).toBe("What's your colour?");
      expect(document.querySelector("[data-open-error]")).toBeNull();
      expect(document.querySelector("[data-refusal]")).toBeNull();
    });
  });

  describe("the list's menu, with a project to lose", () => {
    beforeEach(() => {
      storage.setItem(PROJECT_STORAGE_KEY, projectJson(ADAS));
      mount(<App storage={storage} />);
    });

    it("confirms by name, and changes nothing until it is answered (§7.8)", async () => {
      const before = storage.getItem(PROJECT_STORAGE_KEY);
      openTheMenu();

      await pick(projectJson(BOS));

      expect(confirmation()).toContain(
        "You’re working on Ada's Bakery. Opening this file will replace it.",
      );
      expect(title()).toBe("Ada's Bakery");
      expect(storage.getItem(PROJECT_STORAGE_KEY)).toBe(before);
    });

    it("replaces on the press that says so, and never merges (§7.8)", async () => {
      openTheMenu();
      await pick(projectJson(BOS));
      fireEvent.click(screen.getByRole("button", { name: "Open the file" }));

      expect(title()).toBe("Bo's Books");
      // Ada's opening hours are gone rather than carried across: whose name wins and which hours
      // are real have no answer behind a one-page file, so there is no merge to get wrong.
      expect(screen.getByRole("button", { name: "Opening hours" })).toBeTruthy();
      expect(JSON.parse(storage.getItem(PROJECT_STORAGE_KEY) ?? "{}")).not.toHaveProperty("hours");
    });

    it("offers to download the outgoing project first — both paths safe (§7.8)", async () => {
      const before = storage.getItem(PROJECT_STORAGE_KEY);
      openTheMenu();
      await pick(projectJson(BOS));

      fireEvent.click(screen.getByRole("button", { name: "Download my work first" }));

      // §7.7's name for it, and the outgoing bytes — not the incoming ones.
      expect(downloads.written[0]?.filename).toBe("adas-bakery.linkpage.json");
      expect(await downloads.written[0]?.blob?.text()).toBe(before);
      // And it has not opened anything: the escape and the replacement are two presses.
      expect(title()).toBe("Ada's Bakery");

      fireEvent.click(screen.getByRole("button", { name: "Open the file" }));
      expect(title()).toBe("Bo's Books");
    });

    it("keeps what is there when the confirmation is cancelled, and downloads nothing", async () => {
      const before = storage.getItem(PROJECT_STORAGE_KEY);
      openTheMenu();
      await pick(projectJson(BOS));

      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

      expect(confirmation()).toBe("");
      expect(title()).toBe("Ada's Bakery");
      expect(storage.getItem(PROJECT_STORAGE_KEY)).toBe(before);
      // No silent auto-download either: the same preservation without consent (§7.8).
      expect(downloads.written).toEqual([]);
    });

    it("leaves the existing project untouched when a file is refused (§4.6, §7.9)", async () => {
      const before = storage.getItem(PROJECT_STORAGE_KEY);
      openTheMenu();

      await pick("<!doctype html>\n<html>…", "index.html");

      // The most likely mistake in the room: they grabbed `index.html` instead of the project
      // file. Nothing was parsed far enough to touch anything, so there is nothing to restore.
      expect(storage.getItem(PROJECT_STORAGE_KEY)).toBe(before);
      expect(title()).toBe("Ada's Bakery");
      expect(confirmation()).toBe("");
      // Ada's hours are still hers: the row is a row, not a tick-on offering to add them.
      expect(screen.queryByRole("button", { name: "Opening hours" })).toBeNull();
    });

    it("puts the refusal in the menu's own surface, not in a modal (§7.9)", async () => {
      openTheMenu();
      await pick("{ this is not a file");

      const panel = document.querySelector("[data-menu-panel]");
      expect(panel?.textContent).toContain("This file appears to be damaged.");
      expect((panel as HTMLElement).hidden).toBe(false);
      expect(screen.queryByRole("dialog")).toBeNull();
      // The project is intact behind it — the list, its rows and the preview are all still there.
      expect(title()).toBe("Ada's Bakery");
      expect(document.querySelectorAll("[data-row]").length).toBeGreaterThan(0);
    });

    it("puts the technical half behind a disclosure, closed (§4.6)", async () => {
      openTheMenu();
      await pick('{"version": 99}');

      expect(document.querySelector("[data-refusal-message]")?.textContent).toContain(
        "This page was made with a newer version of linkpage",
      );
      const disclosure = document.querySelector("details") as HTMLDetailsElement;
      expect(disclosure.open).toBe(false);
      expect(disclosure.textContent).toContain("Technical detail");
    });

    it("recovers by picking again, straight from the refusal (§7.9)", async () => {
      openTheMenu();
      await pick("{ this is not a file");
      expect(document.querySelector("[data-refusal]")).not.toBeNull();

      await pick(projectJson(BOS));

      // The message is gone and the confirmation has taken its place: pick again, and the fork
      // is where it always was.
      expect(document.querySelector("[data-refusal]")).toBeNull();
      expect(confirmation()).toContain("Opening this file will replace it.");
    });

    /**
     * One filled button per screen, across the seam that composes the two (§4, §6; #228).
     *
     * `list.test.tsx` holds the expression itself, with the real `ReplaceConfirm` handed to it.
     * This is the other half: the fork raised the way the owner raises it — a file coming back
     * from the OS picker — and answered the way the owner answers it, with the fill going back
     * where it came from. The two fills belong to two components and only `App` puts them on one
     * screen, so only here can the defect be reproduced end to end.
     *
     * jsdom has no `matchMedia`, so the drawer reads the phone and the list lands page-first —
     * which is why *Edit your page* comes first. That is the same press #200 needed to photograph
     * this surface at 390px, and with the page up `covered` outranks the confirmation anyway and
     * Download travels into the drawer's header still filled (#186; held in `list.test.tsx`).
     */
    it("steps the list's Download down while the fork is open, and hands the fill back (#228)", async () => {
      fireEvent.click(screen.getByRole("button", { name: "Edit your page" }));
      expect(filledLabels()).toEqual(["Download"]);

      openTheMenu();
      await pick(projectJson(BOS));

      // Two solid fills a couple of centimetres apart is what this fixes: the confirmation's own
      // errand keeps the one fill (#200), and Download steps to the same box without it.
      expect(filledLabels()).toEqual(["Open the file"]);
      expect(screen.getByRole("button", { name: "Download" }).className).toContain(
        WEIGHT.secondary,
      );

      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

      // The fork is answered, so the screen is the list again and Download is what it is for.
      expect(filledLabels()).toEqual(["Download"]);
    });
  });
});

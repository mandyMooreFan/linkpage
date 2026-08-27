// @vitest-environment jsdom

import { cleanup, fireEvent, render as mount, screen, within } from "@testing-library/react";
import { useState, type JSX } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { serializeProject, writeDraft, readDraft, type Draft } from "../project/index.js";
import { Flow } from "./Flow.js";
import type { FlowEntry } from "./plan.js";
import { PRESETS, type PresetId } from "./presets.js";
import {
  filledButtons,
  quietButtons,
  textClasses,
  widthDisagreements,
} from "../ui/fill.testing.js";

/**
 * The flow, driven screen by screen. `SPEC.md` §7.1–§7.3, §7.8, §7.9.
 *
 * A multi-screen sequence is mostly tested where it is a data structure — `plan.test.ts` holds
 * the orders and `topics.test.ts` holds the door. What is left for a DOM is the part that only
 * exists once a person is pressing things: that every screen can be declined, that declining
 * every screen produces a project with nothing declined in it, and that **two owners who reach
 * the same page have byte-identical files whether one took a preset and the other ticked boxes
 * by hand** (§7.3).
 *
 * The walker below is deliberately dumb: it reads the heading, takes the escape if there is
 * one, and answers the two questions that have none. That is a test of the *shape* of the
 * flow — if a step ever appears without an escape and without being required, the walk hangs
 * on it, which is exactly the failure worth catching.
 */

afterEach(cleanup);

/** Where the flow deposits the owner. #34 builds the real one (§7.4). */
const LIST = "the review list";

interface HarnessProps {
  readonly entry?: FlowEntry;
  readonly draft?: Draft | null;
  readonly onOpenFile?: (file: File) => void;
  readonly fileError?: string;
}

/** Records every draft the flow hands out, and swaps to the list when it is done. */
function harness({ entry = { kind: "empty" }, draft = null, ...rest }: HarnessProps = {}) {
  const saved: Draft[] = [];
  const onChange = vi.fn((next: Draft) => void saved.push(next));

  function Harness(): JSX.Element {
    const [done, setDone] = useState(false);
    if (done) return <p>{LIST}</p>;
    return (
      <Flow
        entry={entry}
        draft={draft}
        lang="en-GB"
        onChange={onChange}
        onDone={() => setDone(true)}
        {...rest}
      />
    );
  }

  mount(<Harness />);
  return { saved, onChange, latest: () => saved[saved.length - 1] };
}

const title = (): string => screen.getByRole("heading", { level: 1 }).textContent ?? "";
const onList = (): boolean => screen.queryByText(LIST) !== null;
const escapeButton = (): HTMLButtonElement | null => document.querySelector("[data-escape]");
const submit = (): HTMLButtonElement | null => document.querySelector('button[type="submit"]');

const NAME = "What's it called?";
const COLOUR = "What's your colour?";
const PRESET_QUESTION = "What kind of business is this?";

function choosePreset(preset: PresetId): void {
  const entry = PRESETS.find((each) => each.id === preset);
  fireEvent.click(screen.getByRole("button", { name: new RegExp(entry?.label ?? "") }));
}

/** Type into the field whose label starts with this text. */
function type(label: string | RegExp, value: string): void {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function press(name: string): void {
  fireEvent.click(screen.getByRole("button", { name }));
}

/**
 * Walk the whole flow, declining everything that can be declined.
 *
 * Returns the heading of every screen it passed through, which is the flow as the owner
 * experienced it.
 */
function decline(preset: PresetId, name = "Ada's Bakery", colour = 0): string[] {
  const seen: string[] = [];

  for (let guard = 0; guard < 40 && !onList(); guard += 1) {
    const heading = title();
    seen.push(heading);

    /**
     * §4, §6: **exactly one solid high-contrast button per screen** (design change 3).
     *
     * Asserted here rather than in a test of its own because it is the same kind of claim the
     * walk already makes — a property every screen must have, checked on every screen there is,
     * for every preset. The hours step is why it is worth holding: it stacked seven solid ink
     * blocks for seven days nobody had chosen while Continue sat disabled and pale, so the
     * strongest objects on the screen were defaults and the one real action was the faintest
     * thing on it. #192 moved the segments onto the shared picked mark; this is what says they
     * stay off the fill.
     *
     * **Identity rather than a count**, because the count alone would go green on a screen whose
     * one fill had wandered onto something that is not the action: what §4 gives the fill to is
     * *the* primary action, and on every step that has one, that is Continue. The step that has
     * none is §7.3's first — choosing a preset *is* answering it, so there is no submit and
     * nothing on it is filled.
     */
    expect(filledButtons(), `the one fill belongs to Continue, on "${heading}"`).toEqual(
      submit() === null ? [] : [submit()],
    );

    /**
     * B-21 (#234): **one ink for every small text-only button**, on the screen rather than in the
     * source. `controls.test.ts` says no call site spells a colour on a `<Button>`; this says
     * what the buttons a person is looking at actually came out as, on every step of every
     * preset. The size travels with the ink deliberately — `text-base` beside `text-ink-quiet`
     * is the pair that keeps a pressable sentence from reading as one of #198's hints.
     */
    for (const button of quietButtons()) {
      expect(textClasses(button), `"${button.textContent?.trim()}" on "${heading}"`).toEqual([
        "text-base",
        "text-ink-quiet",
      ]);
    }

    /**
     * B-72 (#230): **one width for every button**, on the screen rather than in the source. The
     * flow is where the finding showed — `Continue` stretched this column while the same weight
     * in the download sheet fit its words — and it is where the escape one line below it, a
     * different weight in the same container, has to come out the same box.
     */
    expect(widthDisagreements(), `the width a weight names, on "${heading}"`).toEqual([]);

    if (heading === PRESET_QUESTION) {
      // Step one has no escape and no Continue: choosing *is* answering (§7.3).
      expect(escapeButton()).toBeNull();
      choosePreset(preset);
      continue;
    }

    if (heading === NAME || heading === COLOUR) {
      // The two required questions, and the only two without an escape (§3.1, §4.6).
      expect(escapeButton()).toBeNull();
      if (heading === NAME) type(/Business name/, name);
      else fireEvent.click(document.querySelectorAll("[data-swatch]")[colour] as Element);
      fireEvent.click(submit() as Element);
      continue;
    }

    // §7.2: every other step carries an always-present "not for us" escape.
    const escape = escapeButton();
    expect(escape, `no escape on "${heading}"`).not.toBeNull();
    fireEvent.click(escape as Element);
  }

  expect(onList()).toBe(true);
  return seen;
}

describe("the flow runs end to end, for each preset", () => {
  const HEAD = [
    PRESET_QUESTION,
    NAME,
    "One line about what you do?",
    "Do you have a logo?",
    COLOUR,
  ];
  const LINKS = "Which of these do you have?";
  const HOURS = "When are you open?";
  const CONTACT = "How do people reach you?";
  const ADDRESS = "Where are you?";
  const SOCIAL = "Where else are you online?";

  it.each([
    ["food", [HOURS, CONTACT, ADDRESS, SOCIAL]],
    ["shop", [HOURS, CONTACT, ADDRESS, SOCIAL]],
    ["appointments", [HOURS, CONTACT, ADDRESS, SOCIAL]],
    ["mobile", [CONTACT, SOCIAL]],
    ["online", [SOCIAL]],
    ["other", [HOURS, CONTACT, ADDRESS, SOCIAL]],
  ] satisfies [PresetId, string[]][])("%s", (preset, sections) => {
    const flow = harness();
    expect(decline(preset)).toEqual([...HEAD, LINKS, ...sections]);

    // Everything was declined, so the project holds the two things that cannot be.
    const draft = flow.latest() as Draft;
    expect(draft.header.name).toBe("Ada's Bakery");
    expect(draft.style.brand).toBeTruthy();
    expect(draft.header.tagline).toBeUndefined();
    expect(draft.header.logo).toBeNull();
    expect(draft.links).toEqual([]);
    expect(draft.hours).toBeUndefined();
    expect(draft.contact).toBeUndefined();
    expect(draft.address).toBeUndefined();
    expect(draft.social).toBeUndefined();
  });

  it("writes no section key at all into the file it declined them in", () => {
    const flow = harness();
    decline("food");

    const text = serializeProject(writeDraft(flow.latest() as Draft, {}));
    for (const key of ["hours", "contact", "address", "social", "tagline"]) {
      expect(text).not.toContain(`"${key}"`);
    }
  });
});

describe("a preset leaves no trace in project.json (§7.3)", () => {
  /**
   * The same page, answered the same way, reached through a different step one.
   *
   * A name, a colour and a phone number — three answers every preset's flow gets round to
   * asking for, however many other questions it does or does not run on the way.
   */
  function build(preset: PresetId): string {
    const flow = harness();

    for (let guard = 0; guard < 40 && !onList(); guard += 1) {
      const heading = title();
      if (heading === PRESET_QUESTION) {
        choosePreset(preset);
      } else if (heading === NAME) {
        type(/Business name/, "Ada's Bakery");
        fireEvent.click(submit() as Element);
      } else if (heading === COLOUR) {
        fireEvent.click(document.querySelectorAll("[data-swatch]")[1] as Element);
        fireEvent.click(submit() as Element);
      } else if (heading === "How do people reach you?") {
        type(/Phone/, "+44 20 7946 0100");
        fireEvent.click(submit() as Element);
      } else {
        fireEvent.click(escapeButton() as Element);
      }
    }

    const text = serializeProject(writeDraft(flow.latest() as Draft, {}));
    cleanup();
    return text;
  }

  it("produces byte-identical files from every preset that can reach the same page", () => {
    // Four different rows of §7.3's table: different section steps, different suggestion sets,
    // one page. Nothing about which was taken survives into the file, because a preset is an
    // action and not a property — there is no `preset` field and there must not be one.
    // Every preset that asks for a phone number, which is every one but "Online only" — and
    // that exception is a difference in what was *asked*, not a trace of what was chosen.
    const files = (["food", "shop", "appointments", "mobile", "other"] satisfies PresetId[]).map(
      build,
    );
    expect(new Set(files).size).toBe(1);
  });

  it("writes no preset field under any name", () => {
    const text = build("appointments");
    expect(text.toLowerCase()).not.toContain("preset");
    expect(JSON.parse(text)).toEqual({
      version: 1,
      lang: "en-GB",
      style: {
        brand: expect.any(String) as string,
        shape: "centred",
        type: "classic",
        corners: 0.6,
        mode: "light",
        advanced: { enabled: false, colors: {} },
      },
      header: { logo: null, name: "Ada's Bakery" },
      links: [],
      contact: { phone: "+44 20 7946 0100" },
    });
  });

  it("sets no style field but the colour it asked for", () => {
    // The preset knows about your business; "How it looks" knows about your brand (§7.3).
    const flow = harness();
    decline("food", "Ada's Bakery", 0);

    const { style } = flow.latest() as Draft;
    expect(style).toEqual({
      brand: "#b0122f",
      shape: "centred",
      type: "classic",
      corners: 0.6,
      mode: "light",
      advanced: { enabled: false, colors: {} },
    });
  });
});

describe("link buttons seed as a pick-list, never as pre-created rows (§7.3)", () => {
  function toTheLinkStep(preset: PresetId = "food"): ReturnType<typeof harness> {
    const flow = harness();
    choosePreset(preset);
    type(/Business name/, "Ada's Bakery");
    fireEvent.click(submit() as Element);
    fireEvent.click(escapeButton() as Element); // tagline
    fireEvent.click(escapeButton() as Element); // logo
    fireEvent.click(document.querySelectorAll("[data-swatch]")[0] as Element);
    fireEvent.click(submit() as Element);
    return flow;
  }

  it("suggests the preset's buttons and writes none of them", () => {
    const flow = toTheLinkStep();

    for (const label of ["See the menu", "Order for pickup", "Book a table"]) {
      expect(screen.getByRole("checkbox", { name: label })).toBeTruthy();
    }
    // Nothing on this screen has touched the project: the last thing written was the colour.
    expect((flow.latest() as Draft).links).toEqual([]);
  });

  it("suggests nothing for 'something else', and still offers the owner's own", () => {
    toTheLinkStep("other");
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
    expect(screen.getByLabelText(/Something else/)).toBeTruthy();
  });

  /**
   * §7.2's one honest count. The picks are fixed the moment the links screen is answered, the run
   * is contiguous, and skipping one leaves the plan alone — so unlike a global counter this can
   * neither stale nor jump, which is the whole reason it is the count that gets shown.
   */
  describe("the run says where you are in it (§7.2)", () => {
    const hintOf = (): string => document.querySelector("[data-question-hint]")?.textContent ?? "";

    const pickThese = (labels: string[]): void => {
      toTheLinkStep();
      for (const label of labels) {
        fireEvent.click(screen.getByRole("checkbox", { name: label }));
      }
      fireEvent.click(submit() as Element);
    };

    it("counts through the run in words", () => {
      pickThese(["See the menu", "Order for pickup", "Book a table"]);

      expect(hintOf()).toContain("The first of three.");
      fireEvent.click(escapeButton() as Element);
      expect(hintOf()).toContain("The second of three.");
      fireEvent.click(escapeButton() as Element);
      expect(hintOf()).toContain("The third of three.");
    });

    it("keeps the screen's own sentence, because the count is an addition", () => {
      pickThese(["See the menu", "Order for pickup"]);
      expect(hintOf()).toBe(
        "Paste the web address. It's usually easiest to copy it from your browser. The first of two.",
      );
    });

    it("says nothing at all when the run is one screen long", () => {
      // "The first of one" answers a question nobody asked. There is no position to orient
      // within, so silence is the honest answer rather than a degenerate sentence.
      pickThese(["See the menu"]);
      expect(hintOf()).toBe(
        "Paste the web address. It's usually easiest to copy it from your browser.",
      );
    });

    it("does not change under the owner when one is skipped", () => {
      // The planner's own guarantee, asserted from the outside: a skipped pick writes no button
      // and leaves the plan alone, so the denominator cannot move mid-run.
      pickThese(["See the menu", "Order for pickup", "Book a table"]);
      fireEvent.click(escapeButton() as Element);
      expect(hintOf()).toContain("of three.");
      fireEvent.click(escapeButton() as Element);
      expect(hintOf()).toContain("The third of three.");
    });
  });

  it("creates no button when every destination is skipped", () => {
    const flow = toTheLinkStep();

    for (const label of ["See the menu", "Order for pickup", "Book a table"]) {
      fireEvent.click(screen.getByRole("checkbox", { name: label }));
    }
    fireEvent.click(submit() as Element);

    // Three screens asking where each goes, three refusals, and no rows anywhere.
    for (const label of ["See the menu", "Order for pickup", "Book a table"]) {
      expect(title()).toBe(`Where does “${label}” go?`);
      fireEvent.click(escapeButton() as Element);
    }
    expect((flow.latest() as Draft).links).toEqual([]);
  });

  it("creates one only once it has a URL, with the glyph its suggestion carries", () => {
    const flow = toTheLinkStep();

    fireEvent.click(screen.getByRole("checkbox", { name: "Book a table" }));
    fireEvent.click(submit() as Element);
    expect(title()).toBe("Where does “Book a table” go?");

    // Continue is unavailable until there is a destination.
    expect(submit()?.disabled).toBe(true);
    type(/Web address/, "https://ada.example/book");
    fireEvent.click(submit() as Element);

    expect((flow.latest() as Draft).links).toEqual([
      { label: "Book a table", url: "https://ada.example/book", icon: "calendar" },
    ]);
  });

  it("writes the scheme on the line, so a pasted bare domain is still an address (#197)", () => {
    const flow = toTheLinkStep();

    fireEvent.click(screen.getByRole("checkbox", { name: "Book a table" }));
    fireEvent.click(submit() as Element);

    // What an owner actually pastes: what they copied, without the scheme. The line already
    // reads `https://` in front of it, and the stored answer says the same thing.
    type(/Web address/, "ada.example/book");
    expect(document.querySelector("[data-url-scheme]")?.textContent).toBe("https://");
    fireEvent.click(submit() as Element);

    expect((flow.latest() as Draft).links).toEqual([
      { label: "Book a table", url: "https://ada.example/book", icon: "calendar" },
    ]);
  });

  it("takes a button the owner named, and gives it no glyph", () => {
    const flow = toTheLinkStep("other");

    type(/Something else/, "Our newsletter");
    press("Add");
    fireEvent.click(submit() as Element);
    type(/Web address/, "https://ada.example/news");
    fireEvent.click(submit() as Element);

    expect((flow.latest() as Draft).links).toEqual([
      { label: "Our newsletter", url: "https://ada.example/news" },
    ]);
  });
});

describe("the flow re-enters for anything new (§7.1)", () => {
  const COMPLETE: Draft = readDraft({
    version: 1,
    lang: "en-GB",
    style: { brand: "#c2185b" },
    header: { name: "Ada's Bakery" },
    links: [],
  });

  it("opens on the ticked section, offers the rest, and Done for now ends it (§7.1, #146)", () => {
    const flow = harness({ entry: { kind: "add", topics: ["hours"] }, draft: COMPLETE });

    // No preset question a month later: it is one-time and unreachable once the list is
    // reached (§7.3). The run spans everything unanswered but opens on the thing ticked.
    expect(title()).toBe("When are you open?");
    fireEvent.click(
      within(screen.getByRole("radiogroup", { name: "Monday" })).getByRole("radio", {
        name: "Open",
      }),
    );
    // §7.10's box commits on leaving the field — which is what pressing `Continue` does on its
    // way to the button.
    const opens = screen.getByLabelText("Monday opens");
    fireEvent.change(opens, { target: { value: "9am" } });
    fireEvent.blur(opens);
    const closes = screen.getByLabelText("Monday closes");
    fireEvent.change(closes, { target: { value: "5pm" } });
    fireEvent.blur(closes);
    fireEvent.click(submit() as Element);

    // The hours are committed and the run carries on into the rest of the unanswered
    // territory (#146) — leaving is a decision, made here through the bar's own exit.
    expect(title()).toBe("How do people reach you?");
    expect((flow.latest() as Draft).hours?.days).toEqual({ mon: [["09:00", "17:00"]] });

    fireEvent.click(document.querySelector("[data-progress-bar] > button") as Element);
    fireEvent.click(screen.getByRole("button", { name: "Done for now" }));
    expect(onList()).toBe(true);
  });

  it("leaves nothing behind when the owner changes their mind", () => {
    const flow = harness({ entry: { kind: "add", topics: ["hours"] }, draft: COMPLETE });

    // Escaping the ticked section moves on rather than out (#146); Done for now is the exit.
    fireEvent.click(escapeButton() as Element);
    expect(onList()).toBe(false);
    fireEvent.click(document.querySelector("[data-progress-bar] > button") as Element);
    fireEvent.click(screen.getByRole("button", { name: "Done for now" }));

    expect(onList()).toBe(true);
    expect(flow.onChange).not.toHaveBeenCalled();
  });

  it("collects a required field an imported file lacked, with no error surface (§4.6)", () => {
    const noBrand = readDraft({ version: 1, lang: "en", header: { name: "Ada's Bakery" } });
    const flow = harness({ entry: { kind: "resume" }, draft: noBrand });

    expect(title()).toBe(COLOUR);
    expect(document.querySelector("[data-notice]")).toBeNull();
    expect(document.querySelector("[data-open-error]")).toBeNull();

    fireEvent.click(document.querySelectorAll("[data-swatch]")[0] as Element);
    fireEvent.click(submit() as Element);

    expect(onList()).toBe(true);
    expect((flow.latest() as Draft).style.brand).toBe("#b0122f");
    expect((flow.latest() as Draft).header.name).toBe("Ada's Bakery");
  });
});

describe("nothing is written until something is answered", () => {
  it("stores no project for an owner who only chose a business type", () => {
    // §7.8 counts any non-empty project as something to lose, "including one holding only a
    // typed name". A preset is not an answer about the business, so it creates nothing.
    const flow = harness();
    choosePreset("food");

    expect(title()).toBe(NAME);
    expect(flow.onChange).not.toHaveBeenCalled();
  });
});

describe("the preset is re-choosable while still in the flow (§7.3)", () => {
  it("comes back on Back, and re-planning follows the new answer", () => {
    harness();
    choosePreset("food");
    expect(title()).toBe(NAME);

    press("Back");
    expect(title()).toBe(PRESET_QUESTION);
    choosePreset("online");

    // "Online only" runs one section step, so the flow is shorter than the one just left.
    expect(decline("online")).toEqual([
      NAME,
      "One line about what you do?",
      "Do you have a logo?",
      COLOUR,
      "Which of these do you have?",
      "Where else are you online?",
    ]);
  });
});

/**
 * One ink for every small text-only button (finding B-21, #234).
 *
 * The walk above sweeps every screen, and a sweep passes when it finds nothing. `Back` is the
 * site that makes it worth naming: until #234 it was the *only* place in the tool where the
 * tertiary ink was written down at all, as a `text-ink-quiet` on its own call site, with every
 * other quiet button left on whatever ink its screen happened to set. The rule lives on the
 * weight now, so this asserts `Back` still arrives at that ink — by inheritance from the
 * component rather than by an instruction beside it.
 */
describe("one ink for every small text-only button (B-21)", () => {
  it("gives Back the quiet ink from the weight, with nothing laid over it", () => {
    harness();
    choosePreset("food");
    expect(title()).toBe(NAME);

    const back = screen.getByRole("button", { name: "Back" });
    expect(quietButtons(), "Back is a quiet button").toContain(back);
    expect(textClasses(back)).toEqual(["text-base", "text-ink-quiet"]);
  });
});

describe("already have a project file? open it (§7.8, §7.9)", () => {
  it("puts the line beneath the preset question, and nothing between it and the picker", () => {
    harness({ onOpenFile: vi.fn() });

    const picker = document.querySelector("[data-file-picker]") as HTMLInputElement;
    const opened = vi.fn();
    picker.addEventListener("click", opened);

    press("Open it.");

    // Straight to the OS picker: an intermediate "import a project" screen would be a screen
    // whose only content is a button.
    expect(opened).toHaveBeenCalledTimes(1);
    expect(title()).toBe(PRESET_QUESTION);
  });

  it("shows a refusal under the line, with the question above it untouched", () => {
    harness({ onOpenFile: vi.fn(), fileError: "This file appears to be damaged." });

    // §7.9: in place, attached to the control that opened the picker. Never a modal, never a
    // navigation — _try a different file_ is overwhelmingly the next action.
    const error = document.querySelector("[data-open-error]");
    expect(error?.textContent).toBe("This file appears to be damaged.");
    expect(title()).toBe(PRESET_QUESTION);
    expect(screen.getAllByRole("button", { name: /Food & drink/ })).toHaveLength(1);
  });

  it("offers no such line once the owner is being walked through something new", () => {
    harness({ entry: { kind: "add", topics: ["hours"] }, draft: readDraft({}) });
    expect(screen.queryByText(/Already have a project file/)).toBeNull();
  });
});

describe("the page fills in beside the question (§7.1, §7.6)", () => {
  it("keeps the preview on every screen, as the one drawer it is", () => {
    harness();
    expect(screen.getByRole("button", { name: "See the page" })).toBeTruthy();

    choosePreset("food");
    expect(screen.getByRole("button", { name: "See the page" })).toBeTruthy();
  });
});

/**
 * The bar sits next to the question it describes (#196, finding B-70).
 *
 * #148's phone walk composed the flow within the viewport — bar as header, question centred, the
 * drawer's control as footer — and the first two thirds of that are right and stay. The centring
 * is the part the design audit came back on: measured at 390, the gap from the bar to the heading
 * ran **24px on the hours step and 185px on the name step**, because the question floated in
 * whatever the bar and the drawer left over. The bar is a caption for the question; a caption
 * that lands a screen-height away from its subject has stopped captioning it.
 *
 * So the content is pinned under the bar and the *space* goes to the bottom, where the drawer's
 * control still sits on the footer edge — which is #148's other two thirds, unchanged. jsdom has
 * no layout, so what is held here is the rule rather than the pixels; `controls.test.ts` guards
 * it for every screen and the ritual measures it.
 */
describe("the bar is a caption for the question, not a header for the screen (#196)", () => {
  const body = () => document.querySelector("[data-flow-body]") as HTMLElement;

  it("pins the question under the bar rather than centring it in what is left", () => {
    harness();
    expect(body().className).not.toContain("justify-center");
  });

  it("still lets the space below it grow, so the drawer's control keeps the footer edge", () => {
    harness();
    // #148's footer: the column grows, and the question does not grow with it.
    expect(body().className).toContain("flex-1");
  });
});

describe("a screen change is a view transition, chrome held still (§7.11)", () => {
  /** jsdom has no view transitions, which is itself the fallback the language relies on. */
  const host = document as { startViewTransition?: (update: () => void) => unknown };

  afterEach(() => {
    delete host.startViewTransition;
  });

  it("routes the swap through the browser's transition when it has one", () => {
    const started = vi.fn((update: () => void) => {
      update();
      return {};
    });
    host.startViewTransition = started;

    harness();
    choosePreset("food");
    expect(title()).toBe(NAME);
    expect(started).toHaveBeenCalledTimes(1);

    type(/Business name/, "Ada's Bakery");
    fireEvent.click(submit() as Element);
    expect(title()).toBe("One line about what you do?");
    expect(started).toHaveBeenCalledTimes(2);
  });

  it("swaps instantly where the browser cannot transition — the honest reduced form", () => {
    harness();
    choosePreset("food");
    expect(title()).toBe(NAME);
  });
});

describe("the first screen orients before it asks (§7.3, #141)", () => {
  const LINE =
    "About ten quick questions. Everything stays on this device — stop anytime, nothing is lost.";
  const preamble = () => document.querySelector("[data-question-preamble]");

  it("carries the line above the question, and only on screen one", () => {
    harness();
    expect(preamble()?.textContent).toBe(LINE);
    // Orientation first, interrogation second: the line precedes the heading in the document.
    const heading = screen.getByRole("heading", { level: 1 });
    expect(
      (preamble()?.compareDocumentPosition(heading) ?? 0) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    choosePreset("food");
    expect(preamble()).toBeNull();
  });

  it("does not orient an owner who is already oriented — a re-entry run carries no line", () => {
    harness({
      entry: { kind: "add", topics: ["hours"] },
      draft: readDraft({
        version: 1,
        lang: "en-GB",
        style: { brand: "#c2185b" },
        header: { name: "Ada's Bakery" },
      }),
    });
    expect(preamble()).toBeNull();
  });
});

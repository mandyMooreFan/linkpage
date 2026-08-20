// @vitest-environment jsdom

import { cleanup, fireEvent, render as mount, screen } from "@testing-library/react";
import { useState, type JSX } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { serializeProject, writeDraft, readDraft, type Draft } from "../project/index.js";
import { Flow } from "./Flow.js";
import type { FlowEntry } from "./plan.js";
import { PRESETS, type PresetId } from "./presets.js";

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

  it("walks a ticked section and puts the owner back on the list", () => {
    const flow = harness({ entry: { kind: "add", topics: ["hours"] }, draft: COMPLETE });

    // No preset question a month later: it is one-time and unreachable once the list is
    // reached (§7.3). Straight to the thing that was ticked.
    expect(title()).toBe("When are you open?");
    fireEvent.change(screen.getByLabelText("Monday"), { target: { value: "open" } });
    fireEvent.change(screen.getByLabelText("Monday opens"), { target: { value: "09:00" } });
    fireEvent.change(screen.getByLabelText("Monday closes"), { target: { value: "17:00" } });
    fireEvent.click(submit() as Element);

    expect(onList()).toBe(true);
    expect((flow.latest() as Draft).hours?.days).toEqual({ mon: [["09:00", "17:00"]] });
  });

  it("leaves nothing behind when the owner changes their mind", () => {
    const flow = harness({ entry: { kind: "add", topics: ["hours"] }, draft: COMPLETE });

    fireEvent.click(escapeButton() as Element);

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

describe("already have a project file? open it (§7.8, §7.9)", () => {
  it("puts the line beneath the preset question, and nothing between it and the picker", () => {
    harness({ onOpenFile: vi.fn() });

    const picker = screen.getByLabelText("Open a project file");
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

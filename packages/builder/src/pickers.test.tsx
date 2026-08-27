// @vitest-environment jsdom

import type { Logo } from "@linkpage/renderer";
import {
  cleanup,
  fireEvent,
  isInaccessible,
  render as mount,
  screen,
} from "@testing-library/react";
import type { JSX } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LogoQuestion } from "./flow/questions/LogoQuestion.js";
import { PresetQuestion } from "./flow/questions/PresetQuestion.js";
import { ProjectPicker } from "./open/ProjectPicker.js";

/**
 * The file pickers are not controls. `SPEC.md` §7.6, §7.8, §6.6; #254, and #188 before it.
 *
 * Three screens open an OS file dialog, and none of them can draw the control that does it: a
 * `<input type="file">` wears the browser's box, not paper's (§7.4). So each clips the input and
 * presses it from a button of its own — and each had **copied the same mistake**, which is why
 * this is one file rather than three paragraphs in three suites. The recipe now lives once, in
 * `ui/FilePicker.tsx`, and the two halves below are what stop it coming back:
 *
 * - **The corpus half** says nothing else in the builder writes `type="file"` — the shape
 *   `page.test.ts` uses for `render`, for the same reason. A fourth picker is not a decision
 *   anyone announces; it is one more screen that needed a dialog and had an `<input>` to hand.
 * - **The rendered half** mounts all three real screens and asks the *rendered* tree the two
 *   questions the defect was made of. #213 found five controls that could render nothing while
 *   two files of perfect source guards passed, and #188's own note on this defect is what a
 *   source guard cannot see: `sr-only` clips a control without removing it from anything.
 *
 * **Neither question can be asked of jsdom alone**, so neither is trusted to it: the tab order
 * and the computed accessible name were both measured in Chromium, before and after, by a walk
 * that reaches every stop by pressing Tab. What is asserted here are the two DOM facts those
 * measurements turn on — `tabIndex` and presence in the accessibility tree — which jsdom does
 * model, and which is the most this layer can honestly hold.
 */

afterEach(cleanup);

/** The clipped input on whatever is mounted. Every assertion below starts by finding it. */
const picker = (): HTMLInputElement => {
  const found = document.querySelectorAll<HTMLInputElement>("[data-file-picker]");
  // Found-something-first, and found *one*: a screen with two dialogs is the copying this file
  // exists to stop, and a `querySelector` would have quietly reported on the first of them.
  expect(found.length, "one picker on the screen").toBe(1);
  expect(found[0]?.getAttribute("type"), "the hook is on the file input").toBe("file");
  return found[0]!;
};

/**
 * Everything Tab can land on in the rendered tree, in document order.
 *
 * The browser's own rule, spelled out: an element is a tab stop when it is focusable and its
 * `tabIndex` is not negative. Asserting *membership* of this list rather than its length is
 * #181's "identify, don't count" — a stop appearing elsewhere must not be able to pay for the
 * one that went away.
 */
function tabStops(): Element[] {
  const focusable = document.querySelectorAll<HTMLElement>(
    "a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]",
  );
  return [...focusable].filter((el) => el.tabIndex >= 0);
}

/**
 * The whole rule, asked of one rendered screen.
 *
 * `driver` is the visible control the ticket says must carry the name — passed as its expected
 * accessible name, because that is the assertion: the words on the screen *are* the name.
 */
function isNotAControl(driver: string | null): void {
  const input = picker();

  // 1. Tab never lands on it. This is the defect itself: a 1×1 invisible box between two real
  //    buttons, carrying #188's ring where nothing can show it.
  expect(input.tabIndex, "the picker is out of the tab order").toBe(-1);
  const stops = tabStops();
  expect(stops, "the picker is not among the screen's tab stops").not.toContain(input);

  // 2. It is not in the accessibility tree either, which is the half the tab order does not
  //    cover. It reported `role=button` with a name of its own, so each of these screens offered
  //    two buttons for one action — one of them invisible.
  expect(isInaccessible(input), "the picker is hidden from the accessibility tree").toBe(true);
  expect(input.getAttribute("aria-hidden")).toBe("true");
  expect(input.hasAttribute("aria-label"), "no second name of its own").toBe(false);
  expect(input.hasAttribute("aria-labelledby")).toBe(false);
  expect(input.closest("label"), "and nothing names it from outside").toBeNull();

  if (driver === null) {
    // Nothing else is mounted here, so `not.toContain` above would pass over an empty list.
    // Said positively instead: this component renders one element, and it is not a stop.
    expect(document.querySelectorAll("input"), "one element, and it is the picker").toHaveLength(1);
    expect(stops, "which is not a tab stop").toEqual([]);
    return;
  }

  // 3. The name is the visible control's own words, and that control is the only one there is.
  const control = screen.getByRole("button", { name: driver });
  expect(stops.length, "the screen has tab stops to be absent from").toBeGreaterThan(0);
  expect(stops, "the visible control is the stop").toContain(control);
  expect(screen.queryAllByRole("button"), "and the picker is not a second one").not.toContain(
    input,
  );

  // 4. Pressing it reaches the dialog — so the stop that went away was carrying nothing.
  const opened = vi.fn();
  input.addEventListener("click", opened);
  fireEvent.click(control);
  expect(opened, "the visible control opens the dialog").toHaveBeenCalledTimes(1);
}

const LOGO: Logo = { src: "data:image/png;base64,iVBORw0KGgo=", width: 1200, height: 400 };

const logoScreen = (logo: Logo | null): JSX.Element => (
  <LogoQuestion
    logo={logo}
    onPick={vi.fn()}
    onContinue={vi.fn()}
    onSkip={vi.fn()}
    intake={() =>
      Promise.resolve({ ok: true as const, logo: LOGO, encoding: "image/png", notice: null })
    }
  />
);

describe("a file picker is the dialog, never a control (#254)", () => {
  it("the logo step: the name is `Choose a file`, and the input is not a second button", () => {
    mount(logoScreen(null));
    isNotAControl("Choose a file");
  });

  it("the logo step, once there is a logo: the name follows the control's state", () => {
    // The invented name never did. `Choose a logo file` said the same thing on both halves of a
    // step whose visible button changes its offer, which is the ordinary cost of a second name.
    mount(logoScreen(LOGO));
    isNotAControl("Choose a different file");
  });

  it("step one's quiet line: the name is `Open it.`", () => {
    mount(<PresetQuestion chosen={null} onChoose={vi.fn()} onOpenFile={vi.fn()} />);
    isNotAControl("Open it.");
  });

  it("the review list's picker, which has no control beside it at all", () => {
    // §7.8 puts this one's control in the list's menu, a component away — so the name that
    // matters is the menu item's (`list.test.tsx` holds "Open a project file…"), and what is
    // asserted here is that the input adds no second one from the far side of the screen. It
    // was the last tabbable node in the whole document, measured on the list in Chromium.
    mount(<ProjectPicker onPick={vi.fn()} />);
    isNotAControl(null);
  });
});

/**
 * Does this source write a file input of its own?
 *
 * Keyed on the JSX attribute rather than the token `file`, and read from code with the comments
 * stripped, because this repo's doc comments describe the markup constantly — `ui/FilePicker.tsx`
 * and this file both quote `<input type="file">` in prose while explaining it, and `logo/index.ts`
 * carried the logo screen's calling shape as a three-line sketch. A grep that counted those would
 * report pickers that do not exist. #181: a finding's stated cause can be wrong, and a guard's
 * can too.
 */
export function writesAFileInput(text: string): boolean {
  const code = text.replaceAll(/\/\*[\s\S]*?\*\//g, "").replaceAll(/(^|[^:])\/\/.*$/gm, "$1");
  return /type\s*=\s*(["']file["']|\{\s*["']file["']\s*\})/.test(code);
}

describe("the single file-picker", () => {
  const sources = import.meta.glob("./**/*.{ts,tsx}", {
    query: "?raw",
    import: "default",
    eager: true,
  }) as Record<string, string>;

  it('has one file in the builder that writes an `<input type="file">`', () => {
    const writers = Object.entries(sources)
      .filter(([path]) => !path.endsWith(".test.ts") && !path.endsWith(".test.tsx"))
      .filter(([, text]) => writesAFileInput(text))
      .map(([path]) => path)
      .sort();

    // If this fails, the fix is to render `FilePicker` rather than to add a name to the list.
    expect(writers).toEqual(["./ui/FilePicker.tsx"]);
  });

  it("found the sources it claims to be scanning", () => {
    // A glob that silently matched nothing would make the assertion above vacuous — the failure
    // #181 measured, where breaking one corpus read left 94 of 119 tests green.
    expect(Object.keys(sources)).toContain("./ui/FilePicker.tsx");
    expect(Object.keys(sources)).toContain("./flow/questions/LogoQuestion.tsx");
    expect(Object.keys(sources)).toContain("./open/ProjectPicker.tsx");
  });
});

describe("the guard itself", () => {
  it("counts a file input, however it is spelled", () => {
    expect(writesAFileInput(`<input type="file" />`)).toBe(true);
    expect(writesAFileInput(`<input type='file' />`)).toBe(true);
    expect(writesAFileInput(`<input type={"file"} />`)).toBe(true);
  });

  it("does not count prose about one", () => {
    // Both shapes are real: a docblock quoting the markup, and a line of prose about it.
    expect(writesAFileInput(`/** <input type="file" accept={LOGO_ACCEPT} /> */`)).toBe(false);
    expect(writesAFileInput(`// nothing else writes type="file"`)).toBe(false);
  });

  it("does not count the other inputs the tool is full of", () => {
    expect(writesAFileInput(`<input type="text" />`)).toBe(false);
    expect(writesAFileInput(`<input type="radio" className="sr-only" />`)).toBe(false);
    expect(writesAFileInput(`const profile = { type: "file" };`)).toBe(false);
  });
});

// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  isInaccessible,
  render as mount,
  screen,
} from "@testing-library/react";
import { useRef, type ComponentType, type JSX } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Button } from "./Button.js";
import { FilePicker, type FilePickerProps } from "./FilePicker.js";

/**
 * The recipe itself, not the screens that follow it. `SPEC.md` §7.12 commitment 6; #254, #262.
 *
 * `pickers.test.tsx` mounts the three real screens and asks them #254's two questions. That is
 * the right guard for those screens and it is **not** a guard on the shared component: it can
 * only ever say that three named callers are correct today. §7.12 said so out loud — _"the shared
 * `FilePicker` has no test of its own"_ — and [#262](https://github.com/mandyMooreFan/linkpage/issues/262)
 * filed the gap, because the recipe was written **once so that a fourth site inherits the fix**,
 * and a fourth site inherits nothing that only the first three are checked for.
 *
 * **A source guard is two-thirds of a rule** (#213). _Written here_ and _here has callers_ are
 * both facts about the source; **the component wearing it** is not, which is how two files of
 * perfect source guards sat over five controls that could render nothing. So every assertion
 * below reads the rendered DOM.
 *
 * The two questions, which are the two halves of #254's defect:
 *
 * 1. **One accessible name for one action.** The sharper half, and the one the tab order does not
 *    cover: the clipped input reported `role=button` with a name of its own, so every screen
 *    offered **two buttons for one action** — `Choose a file` beside `Choose a logo file`. It is a
 *    _count_ that is asserted here, not an absence: "the picker is not a second button" is true of
 *    a screen with three of them.
 * 2. **No file input in the tab order.** A 1×1 clipped box is still a stop, and it is the one stop
 *    that can never show #188's ring.
 *
 * **What jsdom reaches, said plainly, because a count is worth exactly what its instrument sees.**
 * Measured while writing this file: `queryAllByRole("button")` does **not** match
 * `<input type="file">` here — jsdom's mapping gives it no role — so a role-based count is blind
 * to precisely the defect #254 found, and passes over the pre-fix markup unchanged. The count that
 * carries this test is therefore an inventory of every **exposed, named** control in the rendered
 * tree, built below from the attributes jsdom does model. Chromium is where the roles themselves
 * were read (#254's Tab walk), and §7.12's bound is unchanged: what the browser exposes, never
 * what a screen reader announces.
 */

afterEach(cleanup);

/** The visible control's own words — the name #254 settled on, at every site. */
const NAME = "Choose a file";

/**
 * The shape all three callers render: one visible control, and the dialog behind it.
 *
 * `Picker` is a parameter so the same rules can be pointed at deliberately broken recipes below.
 * Nothing else in the harness moves, so a red result names the mutation and not the fixture.
 */
function Picking({ Picker }: { readonly Picker: ComponentType<FilePickerProps> }): JSX.Element {
  const dialog = useRef<HTMLInputElement>(null);
  return (
    <>
      <Button onClick={() => dialog.current?.click()}>{NAME}</Button>
      <Picker ref={dialog} accept="image/png" onPick={vi.fn()} />
    </>
  );
}

/** The clipped input on whatever is mounted. Every rule below starts by finding it. */
const picker = (): HTMLInputElement => {
  const found = document.querySelectorAll<HTMLInputElement>("[data-file-picker]");
  // Found something first, and found *one*: two dialogs on one screen is the copying `FilePicker`
  // exists to stop, and a `querySelector` would have quietly reported on the first of them.
  expect(found.length, "one picker on the screen").toBe(1);
  expect(found[0]?.getAttribute("type"), "the hook is on the file input").toBe("file");
  return found[0]!;
};

/** What names an element, from the shapes jsdom models. Not a full name computation. */
function nameOf(el: Element): string {
  const label = el.getAttribute("aria-label")?.trim();
  if (label !== undefined && label !== "") return label;

  const ids = (el.getAttribute("aria-labelledby") ?? "").split(" ").filter((id) => id !== "");
  if (ids.length > 0)
    return ids
      .map((id) => document.getElementById(id)?.textContent?.trim() ?? "")
      .join(" ")
      .trim();

  const wrapping = el.closest("label");
  if (wrapping !== null) return wrapping.textContent?.trim() ?? "";

  const id = el.getAttribute("id");
  const forLabel = id === null ? null : document.querySelector(`label[for="${id}"]`);
  if (forLabel !== null) return forLabel.textContent?.trim() ?? "";

  return el.matches("button,a[href]") ? (el.textContent?.trim() ?? "") : "";
}

/** `button "Choose a file"` — identify, don't count (#181). A file input says which it is. */
const describeEl = (el: Element): string => {
  const tag = el.tagName.toLowerCase();
  const type = el.getAttribute("type");
  return `${tag}${tag === "input" && type !== null ? `[type=${type}]` : ""} "${nameOf(el)}"`;
};

/** Everything that could carry a name: the elements a role would be computed for. */
const CANDIDATES = "button,a[href],input,select,textarea,[role],[tabindex]";

/** Every control the accessibility tree exposes *and* names, in document order. */
const namedControls = (): Element[] =>
  [...document.body.querySelectorAll(CANDIDATES)].filter(
    (el) => !isInaccessible(el as HTMLElement) && nameOf(el) !== "",
  );

/**
 * Everything Tab can land on, in document order. The browser's rule spelled out: focusable, and
 * `tabIndex` not negative.
 */
const tabStops = (): Element[] =>
  [
    ...document.querySelectorAll<HTMLElement>(
      "a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]",
    ),
  ].filter((el) => el.tabIndex >= 0);

/** Rule 1 — one accessible name for one action. */
function oneNameOneAction(): void {
  const input = picker();

  // The count, not the absence: the visible control is the *only* named thing on the screen.
  expect(namedControls().map(describeEl), "one name, and it is the control's own words").toEqual([
    `button "${NAME}"`,
  ]);

  // The picker's own half of that: nothing in the tree, and nothing naming it from either side.
  expect(isInaccessible(input), "the picker is hidden from the accessibility tree").toBe(true);
  expect(input.getAttribute("aria-hidden")).toBe("true");
  expect(input.hasAttribute("aria-label"), "no second name of its own").toBe(false);
  expect(input.hasAttribute("aria-labelledby")).toBe(false);
  expect(input.closest("label"), "and nothing names it from outside").toBeNull();

  // Strict, so a second element answering to this name is a failure rather than the first match.
  expect(screen.getByRole("button", { name: NAME })).toBe(document.querySelector("button"));
}

/** Rule 2 — no file input in the tab order. */
function notInTheTabOrder(): void {
  const input = picker();

  expect(input.tabIndex, "the picker is out of the tab order").toBe(-1);
  const stops = tabStops();
  expect(stops.length, "the screen has stops for it to be absent from").toBeGreaterThan(0);
  expect(stops.map(describeEl), "the visible control is the only stop").toEqual([
    `button "${NAME}"`,
  ]);
  expect(stops, "and the picker is not among them").not.toContain(input);
}

describe("the shared file picker is the dialog, never a control (#254, §7.12)", () => {
  it("offers one accessible name for one action", () => {
    mount(<Picking Picker={FilePicker} />);
    oneNameOneAction();
  });

  it("puts no file input in the tab order", () => {
    mount(<Picking Picker={FilePicker} />);
    notInTheTabOrder();
  });

  it("still opens the dialog from the visible control", () => {
    // The stop that went away was carrying nothing — which is what makes hiding it a fix rather
    // than a loss. Clipped rather than `display: none` for this reason and no other.
    mount(<Picking Picker={FilePicker} />);
    const opened = vi.fn();
    picker().addEventListener("click", opened);
    fireEvent.click(screen.getByRole("button", { name: NAME }));
    expect(opened, "the visible control reaches the dialog").toHaveBeenCalledTimes(1);
  });
});

/**
 * One recipe, broken on purpose. Each is a shape that shipped or could ship.
 */
function broken(defect: {
  readonly hidden?: boolean;
  readonly named?: string;
  readonly focusable?: boolean;
  readonly insideALabel?: boolean;
}): ComponentType<FilePickerProps> {
  return function BrokenPicker({ accept, onPick, ref }: FilePickerProps): JSX.Element {
    const input = (
      <input
        {...(ref === undefined ? {} : { ref })}
        type="file"
        accept={accept}
        className="sr-only"
        {...(defect.focusable === true ? {} : { tabIndex: -1 })}
        {...(defect.hidden === false ? {} : { "aria-hidden": true })}
        {...(defect.named === undefined ? {} : { "aria-label": defect.named })}
        data-file-picker
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onPick(file);
        }}
      />
    );
    return defect.insideALabel === true ? <label>Pick one{input}</label> : input;
  };
}

/**
 * The guard proves it found something before it is allowed to report nothing wrong.
 *
 * #181's lesson at the map's stated stakes: three mechanisms there returned empty and passed, and
 * #265 measured that an **empty document** reports 0 axe violations and 4 passes. A rule that has
 * never been seen red is a rule nobody has read. Each mutant below is _identified_, not counted —
 * the half that owns it goes red and the other half stays green, so a mutation cannot be paid for
 * by an unrelated failure.
 */
describe("the rules go red on a broken recipe", () => {
  it("a second accessible name — #254's own defect, restored", () => {
    // `Choose a logo file` beside `Choose a file`, exactly as the logo step shipped it.
    mount(<Picking Picker={broken({ hidden: false, named: "Choose a logo file" })} />);
    expect(oneNameOneAction).toThrow();
    expect(notInTheTabOrder, "the tab order is untouched by this one").not.toThrow();
  });

  it("a focusable file input — the dead tab stop", () => {
    mount(<Picking Picker={broken({ focusable: true })} />);
    expect(notInTheTabOrder).toThrow();
    expect(oneNameOneAction, "it carries no name; the stop is the whole defect").not.toThrow();
  });

  it("back in the accessibility tree, even unnamed", () => {
    // An exposed control with no name at all is worse than a second name, not better.
    mount(<Picking Picker={broken({ hidden: false })} />);
    expect(oneNameOneAction).toThrow();
  });

  it("named from outside, by a wrapping label", () => {
    mount(<Picking Picker={broken({ hidden: false, insideALabel: true })} />);
    expect(oneNameOneAction).toThrow();
  });

  it("and the finder itself fails when the screen has no picker", () => {
    // `namedControls()` and `tabStops()` both read a live document, so an empty render must be a
    // failure rather than a vacuous pass — the shape both rules open with.
    mount(<Button>{NAME}</Button>);
    expect(picker).toThrow();
  });
});

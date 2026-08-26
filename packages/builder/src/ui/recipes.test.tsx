// @vitest-environment jsdom

import { cleanup, render as mount } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Button, WEIGHT, type ButtonWeight } from "./Button.js";
import { Checkbox, CHECKBOX_CLASS } from "./Checkbox.js";
import { Panel, PANEL_CLASS, PANEL_EDGE, type PanelTone } from "./Panel.js";
import {
  INPUT_CLASS,
  TEXTAREA_CLASS,
  TextArea,
  TextInput,
  URL_BOX_CLASS,
  URL_PREFIX_CLASS,
  URL_ROW_CLASS,
  UrlInput,
} from "./TextInput.js";

/**
 * Every shared control wears the recipe it writes. `SPEC.md` §7.4; #213.
 *
 * **This is the join nothing was standing on.** §7.4's component layer is held in two halves
 * today and they are both halves of the *source*: `controls.test.ts` asserts what each recipe
 * says (`INPUT_CLASS` draws the underline in `control-edge`, `CHECKBOX_CLASS` is `accent-ink`,
 * `PANEL_CLASS` is a rule on the leading edge) and that no other file spells it — and the
 * rendered tests mount screens and reach for controls by role and by label, which say nothing
 * about class at all. Between the two sits a step neither of them takes: **the component
 * actually putting its recipe on the element it renders.**
 *
 * It was not a hypothetical gap. Every one of these was verified by breaking it on `main`:
 *
 * | broken | tests that noticed |
 * | --- | --- |
 * | `TextInput` renders no `INPUT_CLASS` | **none** |
 * | `TextArea` renders no `TEXTAREA_CLASS` | **none** |
 * | `UrlInput` renders none of its three | **none** |
 * | `Checkbox` renders no `CHECKBOX_CLASS` | **none** |
 * | `Panel` renders neither `PANEL_CLASS` nor its edge | **none** |
 * | `Button` renders no `WEIGHT[weight]` | 22 |
 *
 * So on `main` every text field in the tool could lose its ruled line, its focus treatment, its
 * placeholder colour and §7.6's tap floor at once — B-23, B-29, B-64 and #188 re-opened in one
 * edit — and the suite stayed green. The tick box could go back to the browser's saturated blue,
 * which **is** B-56, the defect `Checkbox` was created to have fixed. The rule was written, the
 * rule was unique, and nothing said it reached the DOM.
 *
 * **`Button` is the exception, and how it came to be one is the pattern worth copying.** It is
 * held by `fill.testing.ts`, which finds a filled button by looking for `WEIGHT.primary` in a
 * rendered `className` — a helper written for §4's one-fill-per-screen rule, which needed the
 * rendered class for its own reasons and bought this guarantee incidentally. Nothing generalised
 * it, so the other five inherited nothing.
 *
 * **Compared against the exported recipe, never against a spelled-out class string**, which is
 * `fill.testing.ts`'s rule and `open.test.tsx`'s: a second copy of the recipe inside a test is
 * exactly what the component layer exists to prevent, and a test that re-types it goes green on
 * its own copy the day the real one changes. What is asserted here is a *relation* — what the
 * component renders contains what the component exports — so a change to the recipe moves both
 * sides together and only a component that stops wearing its own recipe fails.
 *
 * **What this deliberately does not do is look at the classes.** Whether `accent-ink` is the
 * right ink, whether the placeholder clears 4.5:1, whether `resize-none` belongs on the textarea
 * and not on the input — all of that is `controls.test.ts`'s, decided against `theme.css` and
 * against the sources. This file asks one question and it is the one nobody was asking.
 */

afterEach(cleanup);

/** The rendered element, by the hook or the tag the component is known by. */
const rendered = (selector: string): HTMLElement => {
  const found = document.querySelector<HTMLElement>(selector);
  if (found === null) throw new Error(`nothing rendered for ${selector}`);
  return found;
};

describe("the one text input", () => {
  it("wears the recipe it is the only place of", () => {
    mount(<TextInput />);
    expect(rendered("input").className).toContain(INPUT_CLASS);
  });

  it("keeps a caller's own class after its own, never instead of it", () => {
    // The composition every one of these components documents — `${RECIPE} ${className}` — and
    // the order is load-bearing: `fill.testing.ts` reads "this size and this ink, with nothing
    // laid over them" off the fact that the recipe comes first.
    mount(<TextInput className="w-24" />);
    expect(rendered("input").className).toBe(`${INPUT_CLASS} w-24`);
  });
});

describe("the several-line answer", () => {
  it("wears the recipe, and the grip stays off it", () => {
    mount(<TextArea rows={4} />);
    expect(rendered("textarea").className).toContain(TEXTAREA_CLASS);
  });
});

describe("the prefixed web-address field", () => {
  const openUrl = (): void => void mount(<UrlInput scheme="https://" readOnly value="" />);

  it("stands the row on the ruled line", () => {
    openUrl();
    expect(rendered("[data-url-field]").className).toContain(URL_ROW_CLASS);
  });

  it("keeps the prefix quiet and the box unboxed", () => {
    openUrl();
    expect(rendered("[data-url-scheme]").className).toContain(URL_PREFIX_CLASS);
    expect(rendered("input").className).toContain(URL_BOX_CLASS);
  });
});

describe("the tick box", () => {
  it("wears the ink that is the whole of why it exists (B-56)", () => {
    mount(<Checkbox />);
    expect(rendered('input[type="checkbox"]').className).toContain(CHECKBOX_CLASS);
  });
});

describe("the aside surface", () => {
  /**
   * Reached by the hook a real call site brings, because `Panel` has none of its own — which is
   * itself the passthrough its docblock calls load-bearing: without it the four hand-rolled
   * copies could not have moved here without losing the hooks their tests already read.
   */
  const panel = (): HTMLElement => rendered("[data-notice]");

  it("wears the recipe and the edge its tone names, on both tones", () => {
    for (const tone of Object.keys(PANEL_EDGE) as PanelTone[]) {
      cleanup();
      mount(
        <Panel tone={tone} data-notice>
          Something the tool is saying.
        </Panel>,
      );
      expect(panel().className, tone).toContain(PANEL_CLASS);
      expect(panel().className, tone).toContain(PANEL_EDGE[tone]);
    }
  });

  it("takes the quiet tone when a caller names none", () => {
    mount(<Panel data-notice>Something the tool is saying.</Panel>);
    expect(panel().className).toContain(PANEL_EDGE.quiet);
  });
});

describe("the one button", () => {
  it("wears every weight it names", () => {
    // Held here as well as in `fill.testing.ts` because that helper only ever looks for
    // `primary`: a `secondary` that stopped drawing its hairline would leave the fill rule
    // perfectly satisfied.
    for (const weight of Object.keys(WEIGHT) as ButtonWeight[]) {
      cleanup();
      mount(<Button weight={weight}>Press</Button>);
      expect(rendered("button").className, weight).toBe(WEIGHT[weight]);
    }
  });

  it("takes the outlined weight when a caller names none", () => {
    mount(<Button>Press</Button>);
    expect(rendered("button").className).toBe(WEIGHT.secondary);
  });
});

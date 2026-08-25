import { contrastRatio, parseHex } from "@linkpage/renderer";
import { describe, expect, it } from "vitest";
import { INPUT_CLASS, TEXTAREA_CLASS } from "./TextInput.js";
import { WEIGHT } from "./Button.js";
import { CHECKBOX_CLASS } from "./Checkbox.js";

/**
 * The control layer holds, and the two colours it spends.
 *
 * `SPEC.md` §7.4: **"Controls are React components, not repeated utility strings and not
 * `@apply`."** That is a rule about the source, so these are guards on the source — written the
 * way `page.test.ts` guards §5.2's single rendering path, by reading the builder's own files.
 *
 * The rule had stopped holding. The input recipe existed in thirteen places and the copy that
 * owned the placeholder colour had no call sites at all, so the placeholder rule reached nothing;
 * four pre-Tailwind class names were still in the markup and defined in no stylesheet, which is
 * why two escape buttons rendered as bare text with no tap target. None of that is visible in a
 * test that only renders a component — a second copy of a class string renders perfectly.
 *
 * **Why a contrast assertion lives here at all.** The builder had none. The generated page's
 * guarantee is enforced by construction and asserted in `palette.test.ts`, but the tool's own
 * colours were only ever checked by eye, and the design audit found the underline that *is* a
 * text field sitting at 1.31:1. A ratio either clears the line or it does not, so it belongs in
 * a test rather than in a review comment.
 */

/** Comments describe these strings constantly. Only code counts. */
const code = (text: string): string =>
  text.replaceAll(/\/\*[\s\S]*?\*\//g, "").replaceAll(/(^|[^:])\/\/.*$/gm, "$1");

const sources = import.meta.glob("../**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

/** Every file except the one that is allowed to hold the string, and the tests. */
const others = (owner: string): [string, string][] =>
  Object.entries(sources)
    .filter(([path]) => !path.includes(".test.") && !path.endsWith(owner))
    .map(([path, text]) => [path, code(text)]);

describe("the one text input", () => {
  it("is the only place the underlined-field recipe is written", () => {
    // The distinguishing part of the recipe: a bottom rule and nothing else, at input size.
    const recipe = "border-0 border-b border-rule";
    const offenders = others("./TextInput.tsx")
      .filter(([, text]) => text.includes(recipe))
      .map(([path]) => path);
    expect(offenders).toEqual([]);
  });

  it("carries the placeholder colour, so every field actually gets one", () => {
    expect(INPUT_CLASS).toContain("placeholder:text-ink-quiet");
  });

  /**
   * §7.4 moves the exact-colour field's example *out of the hint and into the placeholder* so it
   * stops reading as instruction. That only works while the placeholder is readable — it is
   * carrying information, not decoration, so it is held to the body threshold rather than to a
   * "lighter than the value" feel. At `/60` it composited to 2.49:1.
   */
  it("sets a placeholder that clears the body contrast threshold", () => {
    expect(INPUT_CLASS).not.toMatch(/placeholder:text-ink-quiet\//);
    const quiet = parseHex("#6b6257"); // --color-ink-quiet
    const ground = parseHex("#faf7f2"); // --color-ground
    expect(quiet).not.toBeNull();
    expect(ground).not.toBeNull();
    expect(contrastRatio(quiet!, ground!)).toBeGreaterThanOrEqual(4.5);
  });
});

/**
 * The two native controls (design change 6, findings B-56 and B-73).
 *
 * **These guard an absence, which is why they read the sources.** Neither defect was findable by
 * reading classes: a raw `<input type="checkbox">` and a bare `<textarea>` have empty class lists
 * and look perfectly deliberate in a diff. What they do is take the browser's defaults — a
 * saturated accent blue belonging to no ramp, and a grip that drags the field out of §7.6's
 * column — and no test that renders a component can see either, because jsdom paints nothing.
 * So the assertion is that the element does not appear raw anywhere: a future tick box or
 * multi-line field has to come through the component that carries the styling.
 */
describe("the two native controls", () => {
  it("has no raw checkbox left in the markup", () => {
    const offenders = others("./Checkbox.tsx")
      .filter(([, text]) => text.includes('type="checkbox"'))
      .map(([path]) => path);
    expect(offenders).toEqual([]);
  });

  it("paints the tick in the tool's own ink, at a size you can see", () => {
    expect(CHECKBOX_CLASS).toContain("accent-ink");
    // Stepped up from the browser's ~0.8125rem, which reads as a stray mark beside `text-lg`.
    expect(CHECKBOX_CLASS).toMatch(/\bsize-[5-9]\b/);
    // §7.6's floor is the pressable row's, not the box's: `tap` is a min-height, and a
    // 1.25rem-wide box 2.75rem tall is a stretched rectangle. See `Checkbox.tsx`.
    expect(CHECKBOX_CLASS).not.toMatch(/\btap\b/);
  });

  it("has no raw textarea left in the markup", () => {
    const offenders = others("./TextInput.tsx")
      .filter(([, text]) => text.includes("<textarea"))
      .map(([path]) => path);
    expect(offenders).toEqual([]);
  });

  it("cannot be dragged, and is otherwise the same ruled line", () => {
    expect(TEXTAREA_CLASS).toContain(INPUT_CLASS);
    // Not `resize-y`: Chromium paints the identical grip for it, so the mark stays. See
    // `TextInput.tsx` for the two alternatives the review shots ruled out.
    expect(TEXTAREA_CLASS).toMatch(/\bresize-none\b/);
  });
});

describe("the one button", () => {
  it("is the only place a weight's class string is written", () => {
    // `rounded-sm border border-rule bg-transparent px-4 py-2` is the secondary recipe, and the
    // shape most often copied by hand.
    const recipe = "rounded-sm border border-rule bg-transparent px-4 py-2";
    const offenders = others("./Button.tsx")
      .filter(([, text]) => text.includes(recipe))
      .map(([path]) => path);
    expect(offenders).toEqual([]);
  });

  it("keeps every pressable weight above §7.6's tap floor, except the deliberate inline one", () => {
    for (const [name, classes] of Object.entries(WEIGHT)) {
      if (name === "inline") continue; // a link inside a sentence; see Button.tsx
      expect(classes, `${name} must carry the tap floor`).toContain("tap");
    }
  });

  it("differs between weights only in fill, border and rule — never in size or type", () => {
    for (const [name, classes] of Object.entries(WEIGHT)) {
      if (name === "inline") continue;
      expect(classes, `${name} must declare its type size`).toContain("text-base");
      expect(classes, `${name} must not invent its own padding`).toMatch(/\bpy-2\b/);
    }
    // Primary and secondary sit side by side in a row, so their boxes have to agree.
    expect(WEIGHT.primary).toContain("px-4");
    expect(WEIGHT.secondary).toContain("px-4");
  });

  it("tells you when it is unavailable, whatever the weight", () => {
    for (const [name, classes] of Object.entries(WEIGHT)) {
      if (name === "inline") continue;
      expect(classes, `${name} needs a disabled treatment`).toContain("disabled:");
    }
  });
});

/**
 * Every escape is the same button. `SPEC.md` §7.2, §7.4; design change 2 (#189).
 *
 * An escape is a **branch**, not a footnote: "we don't have set hours" is an answer, and the
 * project it produces is as finished as the one `Continue` produces. §4's secondary recipe is
 * what that is owed — a hairline outline with the radius, padding and type it already shares
 * with `primary`, differing from it only in fill. `quiet` gave it none of those, and gave it
 * the *same* treatment as `Back` sitting one line below, so a screen offered three actions in
 * two weights and paired the wrong two together.
 *
 * **The rule is held on `data-escape` rather than on the copy**, because the copy is eight
 * different sentences by design — §7.2 wants the owner's own words, never "skip" — and a guard
 * that matched on them would go red the day someone improved one. The hook is a contract
 * (§7.4); the sentences are not. It is also the handle `flow.test.tsx` and the deployed smoke
 * already steer by, so marking the list's two escapes with it makes them the same species to
 * every reader, test and script that asks.
 *
 * Deliberately **not** guarded here: `Back`, which stays `quiet` because it genuinely is
 * tertiary, and the language row's "Or type a code", which discloses a second way to answer the
 * question rather than declining it. Neither carries the hook, and neither should.
 */
describe("the escape", () => {
  /**
   * Arrow functions put a `>` inside the props, so the tag cannot be matched naively. Blanking
   * them first is enough: nothing else in these call sites writes one.
   */
  const buttonTags = (text: string): string[] =>
    [...text.replaceAll("=>", "==").matchAll(/<Button\b[^>]*>/g)].map(([tag]) => tag);

  const escapeTags = (): [string, string][] =>
    Object.entries(sources)
      .filter(([path]) => !path.includes(".test."))
      .flatMap(([path, text]) =>
        buttonTags(code(text))
          .filter((tag) => tag.includes("data-escape"))
          .map((tag): [string, string] => [path, tag]),
      );

  it("wears the outlined weight everywhere one is written", () => {
    const offenders = escapeTags()
      .filter(([, tag]) => !tag.includes('weight="secondary"'))
      .map(([path]) => path);
    expect(offenders, "an escape is a branch of the flow, so it takes §4's secondary").toEqual([]);
  });

  it("is written in more than one place, so the rule above cannot pass by finding none", () => {
    // The shell writes the flow's eight (`Question.tsx`), and the review list writes its own two.
    expect(escapeTags().length).toBeGreaterThanOrEqual(3);
  });

  it("is not the same object as Back, which is the defect that started this", () => {
    // The two differ in the way §4 says they should: the branch has a boundary, the navigation
    // control has none. Same size, same type — the weight is carried by the outline and the fill.
    expect(WEIGHT.secondary).toContain("border");
    expect(WEIGHT.quiet).not.toContain("border");
    expect(WEIGHT.secondary).not.toBe(WEIGHT.quiet);
  });

  it("differs from Continue only in fill", () => {
    expect(WEIGHT.primary).toContain("bg-ink");
    expect(WEIGHT.secondary).toContain("bg-transparent");
    for (const shared of ["rounded-sm", "px-4", "py-2", "text-base", "tap"]) {
      expect(WEIGHT.secondary, `secondary must share ${shared} with primary`).toContain(shared);
      expect(WEIGHT.primary, `primary must share ${shared} with secondary`).toContain(shared);
    }
  });
});

describe("the pre-Tailwind stylesheets", () => {
  /**
   * `theme.css` is the builder's only stylesheet and defines none of these. An element carrying
   * one renders with nothing at all — which is what made two escapes bare text.
   */
  it("left no class names behind in the markup", () => {
    const dead = ["question__hint", "question__escape", "field__label"];
    const offenders = Object.entries(sources)
      .filter(([path]) => !path.includes(".test."))
      .flatMap(([path, text]) =>
        dead.filter((name) => code(text).includes(name)).map((name) => `${path}: ${name}`),
      );
    expect(offenders).toEqual([]);
  });
});

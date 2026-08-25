import { contrastRatio, parseHex } from "@linkpage/renderer";
import { describe, expect, it } from "vitest";
import { INPUT_CLASS } from "./TextInput.js";
import { WEIGHT } from "./Button.js";

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

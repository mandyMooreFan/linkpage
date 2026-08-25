import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { contrastRatio, parseHex, type Rgb } from "@linkpage/renderer";
import { describe, expect, it } from "vitest";
import {
  INPUT_CLASS,
  LINE_CLASS,
  TEXTAREA_CLASS,
  URL_BOX_CLASS,
  URL_PREFIX_CLASS,
  URL_ROW_CLASS,
} from "./TextInput.js";
import { WEIGHT } from "./Button.js";
import { CHECKBOX_CLASS } from "./Checkbox.js";
import { LADDER } from "./ladder.js";
import { MENU_PANEL } from "../list/List.js";
import { ROW_BUTTON, ROW_OPEN, ROW_PADDING, ROW_STACK_PADDING } from "./row.js";
import { BRAND_SWATCHES } from "../flow/index.js";

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
 *
 * **So the tokens are read out of `theme.css`, not copied into this file.** A ratio asserted
 * against a hex re-typed here is a test of the copy: the stylesheet is the only place these
 * values exist, so it is the only honest thing to measure. The lesson is `palette.test.ts`'s
 * (#184) — that suite asserted the generated page's roles against one backdrop while the page
 * drew them on two, and the tests mirrored the derivation's gap exactly, which is how a live
 * failure shipped and stayed shipped. **Name the backdrop, and check every backdrop the thing is
 * drawn on.** In the builder there are two: `ground` is every screen, `surface` is the preview
 * sheet, the drawer at narrow widths and the menu panel.
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

/** Every source, tests aside — for rules that hold everywhere rather than everywhere-but-one. */
const everySource = (): [string, string][] =>
  Object.entries(sources)
    .filter(([path]) => !path.includes(".test."))
    .map(([path, text]) => [path, code(text)]);

/**
 * `theme.css`, off the disk rather than through `import.meta.glob`.
 *
 * The glob above is how the rest of this file reads the builder, but it cannot read the
 * stylesheet: vitest stubs CSS modules to an empty string unless the suite opts into processing
 * them, and `?raw` is stubbed with them. That failure is silent — every ratio below would be
 * measured against a file with no tokens in it and the suite would go green on nothing, which is
 * the exact way a guarantee rots that this file exists to prevent. Hence `readFileSync`, and the
 * assertion that it found something.
 */
const theme = code(readFileSync(fileURLToPath(new URL("../theme.css", import.meta.url)), "utf8"));

/** One `@theme` token, by the name `theme.css` gives it. */
const token = (name: string): Rgb => {
  const declared = new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{3,8})\\s*;`).exec(theme)?.[1];
  const rgb = parseHex(declared);
  if (rgb === null) throw new Error(`theme.css declares no --color-${name}`);
  return rgb;
};

/** Contrast between two tokens, written the way the stylesheet names them. */
const between = (a: string, b: string): number => contrastRatio(token(a), token(b));

/**
 * The two backdrops the builder paints, worst case first.
 *
 * `ground` is every screen; `surface` is the preview sheet, the drawer covering a phone and the
 * menu panel. `surface` is the lighter of the two, so a token dark enough for the ground has
 * cleared the sheet as well — but that is a fact to assert rather than one to assume, which is
 * the whole of #184's lesson.
 */
const BACKDROPS = ["ground", "surface"] as const;

/** A warm cast: the red channel leads and the blue trails. */
const isWarm = ({ r, b }: Rgb): boolean => r > b;

/**
 * Every quoted run in a file, which is where a class list lives.
 *
 * Deliberately not "every `className=`": the interesting ones are assembled from template
 * literals and shared constants, and a rule that only reads the attribute misses them. Over-
 * matching is harmless here — the rules below fire only on a string holding *two* utilities at
 * once, and no ordinary string does.
 */
const classLists = (text: string): string[] =>
  [...text.matchAll(/["'`]([^"'`]*)["'`]/g)].map((match) => match[1] ?? "");

describe("the one text input", () => {
  it("is the only place the underlined-field recipe is written", () => {
    // The distinguishing part of the recipe: a bottom rule and nothing else, at input size.
    const recipe = "border-0 border-b border-control-edge";
    const offenders = others("./TextInput.tsx")
      .filter(([, text]) => text.includes(recipe))
      .map(([path]) => path);
    expect(offenders).toEqual([]);
  });

  /**
   * The underline **is** the control (item 1.2, findings B-23 and B-64).
   *
   * Paper gives a field no fill, no box and no other boundary, so the hairline under it is the
   * field's entire perceivable extent — which makes it exactly what SC 1.4.11 means by the part
   * of a control that identifies it, at 3:1 against the adjacent colour. Drawn in `rule` it was
   * **1.31:1**, under half of that, and an empty field read as a gap with a faint line beneath
   * it rather than as somewhere to type.
   */
  it("draws its underline in the control-boundary colour, not the decorative rule", () => {
    expect(INPUT_CLASS).toContain("border-control-edge");
    expect(INPUT_CLASS, "the rule is for separators now").not.toMatch(/\bborder-rule\b/);
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
    for (const backdrop of BACKDROPS) {
      expect(between("ink-quiet", backdrop), `on ${backdrop}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});

/**
 * The one pattern swap in the whole audit (design change 10, finding B-55).
 *
 * **What is borrowed is the prefix, not the box.** The free Tailwind input group puts its leading
 * add-on inside a rounded, outlined, filled wrapper, and paper's boundary is the underline — so
 * the wrapper here *is* the line, and nothing gains a card, a fill, a radius or a second border.
 * This is the place in the audit most likely to drift back into a box, and a drift would be one
 * plausible-looking class in a diff, so it is a test rather than a note in a review.
 */
describe("the prefixed web-address field", () => {
  it("stands on the same ruled line as every other field, not a copy of it", () => {
    // Written once, so a later change to the rule's colour or weight reaches both.
    expect(INPUT_CLASS).toContain(LINE_CLASS);
    expect(URL_ROW_CLASS).toContain(LINE_CLASS);
  });

  it("gains no box: no card, no fill, no radius, no second border", () => {
    expect(URL_ROW_CLASS, "a bottom rule and nothing else").toContain("border-0 border-b");
    expect(URL_ROW_CLASS).not.toMatch(/\brounded/);
    expect(URL_ROW_CLASS).not.toMatch(/\bshadow/);
    expect(URL_ROW_CLASS).not.toMatch(/\bring\b/);
    expect(URL_ROW_CLASS).not.toMatch(/\bbg-(?!transparent\b)/);
    // The box inside draws nothing at all — the line above it is the only boundary there is.
    expect(URL_BOX_CLASS).toContain("border-0");
    expect(URL_BOX_CLASS).not.toMatch(/\bborder-b\b/);
    expect(URL_BOX_CLASS).not.toMatch(/\brounded/);
    expect(URL_BOX_CLASS).not.toMatch(/\bbg-(?!transparent\b)/);
  });

  it("recolours the line on focus, since the thing focused is now inside it", () => {
    // The same treatment the field always had — the line recolours and nothing moves. The ring
    // on the box is #188's business and is deliberately untouched here.
    expect(INPUT_CLASS).toContain("focus:border-ink");
    expect(URL_ROW_CLASS).toContain("focus-within:border-ink");
  });

  it("keeps the prefix quiet, and out of the answer", () => {
    expect(URL_PREFIX_CLASS).toContain("text-ink-quiet");
    expect(URL_PREFIX_CLASS).toContain("select-none");
  });

  it("has left no web address relying on a placeholder for its scheme", () => {
    // The defect itself (B-55): `https://` was a placeholder on all four web-address fields, so
    // it vanished the moment the owner typed. A guard on the source, because a fifth field
    // reaching for the same placeholder would look entirely reasonable in a diff.
    const offenders = Object.entries(sources)
      .filter(([path]) => !path.includes(".test."))
      .filter(([, text]) => code(text).includes('placeholder="https://'))
      .map(([path]) => path);
    expect(offenders).toEqual([]);
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

/**
 * One spec for a hairline-separated row. `SPEC.md` §7.4, §6; design change 4 (#191), finding B-43.
 *
 * The audit found four: the review rows at `py-4`, the language picker at `py-2` with the
 * *identical* two-line structure, the link rows at `py-3`, and the contrast readings at `py-1`
 * under a rule per line. Unifying them once is worth little on its own — the four were not written
 * together, they drifted apart one edit at a time — so the durable half is a guard that reads the
 * sources, the way the input and button rules above are held.
 *
 * **Scoped to `list/`**, deliberately. B-43 named four sites and all four are the review list's.
 * The flow's own sub-lists (the hours days, the social rows, the progress bar's topics) were looked
 * at by the same audit and left off the change list, and the map is explicit that a ticket adding a
 * finding is arguing with a closed map. What this guard says is exactly what this ticket did: after
 * it, no file in the review list writes its own row hairline.
 */
describe("the one hairline-separated row", () => {
  it("is the only place the row recipe is written", () => {
    // `divide-y divide-rule` is how a list draws the hairlines *between* its rows and nothing
    // else does it; `ROW_BUTTON` is the pressable row's own string, checked whole so the guard
    // cannot drift from what it guards.
    const recipes = ["divide-y divide-rule", ROW_BUTTON];
    const offenders = others("./row.ts")
      .filter(([, text]) => recipes.some((recipe) => text.includes(recipe)))
      .map(([path]) => path);
    expect(offenders).toEqual([]);
  });

  it("leaves no hand-written hairline on a row in the review list", () => {
    // `border-b border-rule` is how all four sites drew their own separator. The one legitimate
    // writer of that string is `TextInput`, which is a *field* underline and lives elsewhere.
    const offenders = Object.entries(sources)
      .filter(([path]) => path.includes("/list/") && !path.includes(".test."))
      .filter(([, text]) => code(text).includes("border-b border-rule"))
      .map(([path]) => path);
    expect(offenders).toEqual([]);
  });

  it("is used in more than one place, so the rules above cannot pass by finding none", () => {
    const users = Object.entries(sources)
      .filter(([path]) => !path.includes(".test.") && !path.endsWith("./ui/row.ts"))
      .filter(([, text]) => code(text).includes("ROW_LIST"))
      .map(([path]) => path);
    expect(users.length).toBeGreaterThanOrEqual(2);
  });

  it("keeps the row's padding above the gap inside a two-line row (§1)", () => {
    // `py-4` against `gap-0.5` is 16px against 2px — comfortably past the ≥4× floor the stacked
    // list anchor asks for, which is the measurement the language picker's `py-2` failed at 4:1.
    expect(ROW_BUTTON).toContain(ROW_PADDING.className);
    expect(ROW_BUTTON).toContain("gap-0.5");
    expect(ROW_PADDING.px).toBeGreaterThanOrEqual(4 * 2);
  });

  /**
   * The rung the row spec has to stay true against, and the reason the numbers are carried in
   * code rather than only in a class name.
   *
   * A boundary narrower than the gaps it separates inverts the grouping §1 is made of, and the
   * ladder moves under this file: #187 widened field-to-field from 16px to 32px, which on its own
   * turned the link rows' `py-3` into a 24px boundary around 32px contents. These comparisons go
   * red the next time a rung moves, instead of the screen quietly stopping making sense.
   */
  it("stays monotonic against the ladder inside a row (§1)", () => {
    // Two rows meet at twice the padding, and a row holding fields has to clear the gap between
    // two of them — which `ROW_PADDING` alone does not, at exactly `betweenFields`.
    expect(2 * ROW_STACK_PADDING.px).toBeGreaterThan(LADDER.betweenFields.px);
    expect(2 * ROW_STACK_PADDING.px).toBeGreaterThanOrEqual(LADDER.betweenSections.px);
  });

  it("makes an open row's own boundary the widest gap on the screen (B-41, B-42)", () => {
    // Below: past the section rung, so nothing inside the form it closes can be mistaken for the
    // way out of it. Above: level with the widest rung inside the form, and owned once.
    expect(ROW_OPEN.bottomPx).toBeGreaterThan(LADDER.betweenSections.px);
    expect(ROW_OPEN.topPx).toBeGreaterThanOrEqual(LADDER.betweenFields.px);
    expect(ROW_OPEN.bottomPx).toBeGreaterThan(ROW_OPEN.topPx);
  });
});

/**
 * One way of showing a picked option. `SPEC.md` §7.4, §6; design change 5 (#192).
 *
 * Five treatments used to say *this one*: a ring on the colour swatches, a border plus a
 * bracket-valued inset shadow on the preset rows, a solid ink fill on the hours segments, bold
 * text on the language list, and the same outline again on the style swatches — six sites, no two
 * of which agreed, and a seventh carrying the preset recipe's pressed classes on a button that is
 * never pressed. **A sixth treatment is exactly the kind of thing that arrives one file at a
 * time**, so the rule is guarded by reading the sources rather than by care: every selection
 * variant in the builder resolves to `picked`, and `picked` is written once, in `theme.css`.
 *
 * **Selection is inside; focus is outside** (#179's decision, variant A) — and the assertion that
 * actually protects that is the one about the *property*. B-35's swatch drew selection and focus
 * as the same `outline` in two colours, and moving selection's offset inside does not fix it: a
 * utility beats `@layer base`, so the picked outline still replaces the focus outline on the one
 * control that is both, and the ring still vanishes silently. `picked` therefore draws on its own
 * pseudo-element and touches the control's `outline` not at all, which leaves focus free to be
 * whatever #188 decides. **If a later hand moves the mark back onto `outline`, this goes red**,
 * which is the whole point — the failure it is guarding against is invisible in every test that
 * only renders a chosen control, because it only appears when the control is also focused.
 */
describe("the one picked state", () => {
  /** Every `aria-pressed:` / `has-checked:` utility written anywhere in the builder. */
  const marks = (): [string, string][] =>
    Object.entries(sources)
      .filter(([path]) => !path.includes(".test."))
      .flatMap(([path, text]) =>
        [...code(text).matchAll(/\b(?:aria-pressed|has-checked):([^\s"'`]+)/g)].map(
          (match): [string, string] => [path, match[1] ?? ""],
        ),
      );

  it("is the only treatment any selection variant resolves to", () => {
    const offenders = marks()
      .filter(([, token]) => token !== "picked")
      .map(([path, token]) => `${path}: ${token}`);
    expect(offenders).toEqual([]);
  });

  it("is carried by every control that shows a choice", () => {
    const bare = [...new Set(marks().map(([path]) => path))].filter(
      (path) => !/(?:aria-pressed|has-checked):picked\b/.test(code(sources[path]!)),
    );
    expect(
      bare,
      "a selection variant that does not reach for `picked` is a sixth treatment",
    ).toEqual([]);
  });

  it("is written in more than one place, so the rules above cannot pass by finding none", () => {
    // The two swatch grids, the preset rows, the hours segments, the language list.
    const sites = marks().filter(([, token]) => token === "picked");
    expect(sites.length).toBeGreaterThanOrEqual(5);
  });

  it("is defined once, in the one stylesheet", () => {
    expect([...theme.matchAll(/@utility picked\b/g)]).toHaveLength(1);
  });

  /** The `@utility picked { … }` block, braces balanced one level deep for the `&::after`. */
  const pickedRule = (): string =>
    /@utility picked \{(?:[^{}]|\{[^{}]*\})*\}/.exec(theme)?.[0] ?? "";

  it("marks the inside", () => {
    expect(pickedRule(), "the mark is drawn within the control's own bounds").toMatch(
      /inset:\s*\d/,
    );
  });

  it("leaves the control's own outline alone, so focus can have it", () => {
    const body = pickedRule().replace(/&::after \{[^{}]*\}/, "");
    expect(body, "a picked control must not set an outline of its own").not.toMatch(/outline/);
    expect(pickedRule(), "the mark needs a box of its own to be drawn on").toContain("&::after");
  });

  it("keeps focus outside, on the property it has always owned", () => {
    const focus = /:focus-visible \{[^}]*\}/.exec(theme)?.[0] ?? "";
    expect(focus, "focus is drawn outside the control").toMatch(/outline-offset:\s*\d/);
    expect(focus).not.toMatch(/outline-offset:\s*-/);
  });

  it("builds no faux border out of a bracket-valued shadow", () => {
    const offenders = Object.entries(sources)
      .filter(([path]) => !path.includes(".test."))
      .filter(([, text]) => code(text).includes("shadow-["))
      .map(([path]) => path);
    expect(offenders, "paper is not elevated, and one border is enough").toEqual([]);
  });

  /**
   * SC 1.4.11 asks the same 3:1 of a state indicator that it asks of a focus ring, and the mark is
   * ink. Against the ground it clears comfortably; laid straight onto the owner's colour it does
   * not, on most of the twelve — `#c2185b` sits at 2.88 and `#4527a0` at 1.64. **That is what the
   * ring of ground around the mark is for**, and it is the reason the same mark can be used on a
   * filled swatch and on a bare row without one of them being a special case.
   */
  it("draws its mark against the ground, never straight onto a brand colour", () => {
    const ink = parseHex("#1f1b16"); // --color-ink
    const ground = parseHex("#faf7f2"); // --color-ground
    expect(ink).not.toBeNull();
    expect(ground).not.toBeNull();
    expect(contrastRatio(ink!, ground!)).toBeGreaterThanOrEqual(3);
    expect(pickedRule(), "the mark carries its own clearing").toMatch(
      /outline:\s*\d+px solid var\(--color-ground\)/,
    );

    const legibleOnTheColour = BRAND_SWATCHES.filter((swatch) => {
      const hex = parseHex(swatch.hex);
      return hex !== null && contrastRatio(ink!, hex) >= 3;
    });
    expect(
      legibleOnTheColour.length,
      "if this ever reaches twelve the clearing is free to go — until then it is load-bearing",
    ).toBeLessThan(BRAND_SWATCHES.length);
  });

  it("reaches both swatch grids, which are one field with two callers", () => {
    const swatches = Object.entries(sources)
      .filter(([path]) => !path.includes(".test."))
      .filter(([, text]) => code(text).includes("data-swatch"));
    expect(swatches, "the flow's grid and the list's").toHaveLength(2);
    for (const [path, text] of swatches) {
      expect(code(text), path).toContain("aria-pressed:picked");
    }
  });
});

/**
 * The narrow container, and the one alignment (design change 9; B-53, B-54, B-67, B-70).
 *
 * **All three of these guard a layout rule that has no rendered form in jsdom**, so they read
 * the sources the way the guards above do. §7.4 refuses a standing visual-regression suite, and
 * the pixels themselves are the ritual's job — what a test can hold is that the *rule* is still
 * written down: nothing is right-aligned, nothing floats down the middle of a screen, and the
 * one panel that cannot grow to fit its contents has been given a size that can.
 */
describe("one alignment on every screen (B-54)", () => {
  it("right-aligns nothing — the shared left margin is the only alignment", () => {
    // "See the page" was the single `justify-end` in the builder, on a screen where the
    // heading, the fields, Continue, the escape and Back all start at the same left margin.
    // The two-ended bar is a different device and keeps its own class (`justify-between`).
    const offenders = everySource()
      .filter(([, text]) => text.includes("justify-end"))
      .map(([path]) => path);
    expect(offenders).toEqual([]);
  });

  it("centres nothing down the length of a screen (B-70)", () => {
    // The bar describes the question, so it has to sit next to it. Centring the question in
    // whatever the bar left over put them 24px apart on the hours step and 185px apart on the
    // name step — the same screen, at the same width, reading as two unrelated objects.
    //
    // Only a *column* is in scope: `wide:justify-center` on a row centres the two columns in
    // the viewport, and the drawer centres the page frame across its own width. Both are the
    // cross-screen axis and neither is what floats.
    const unprefixed = (token: string): RegExp => new RegExp(String.raw`(?:^|\s)${token}(?:\s|$)`);
    const offenders = everySource().flatMap(([path, text]) =>
      classLists(text)
        .filter(
          (list) => unprefixed("flex-col").test(list) && unprefixed("justify-center").test(list),
        )
        .map(() => path),
    );
    expect(offenders).toEqual([]);
  });
});

describe("the menu gives its buttons room (B-53, B-67)", () => {
  /**
   * The panel is `absolute` inside a shrink-wrapped `relative`, so shrink-to-fit resolves
   * against the Menu button's own width and the content can never push the panel wider. A
   * `min-width` in that position is not a floor, it *is* the width — which is why "Download my
   * work first" had **0px** of slack inside it, measured with the ritual at both of §7.6's
   * sizes. Not one pixel: exactly none.
   */
  it("caps the panel wider than it floors it, so the content can ask for the difference", () => {
    expect(MENU_PANEL.capPx).toBeGreaterThan(MENU_PANEL.floorPx);
    expect(MENU_PANEL.className).toContain("w-max");
  });

  it("clears the widest control it has to hold, with room left over", () => {
    const room = (width: number): number => width - MENU_PANEL.chromePx - MENU_PANEL.insetPx;

    // What was wrong: the floor left the widest control nothing at all.
    expect(room(MENU_PANEL.floorPx)).toBe(MENU_PANEL.widestControlPx);

    // What is right: room enough that a fallback font, a longer translation or one more word
    // does not put the label on two lines again.
    expect(room(MENU_PANEL.capPx)).toBeGreaterThan(MENU_PANEL.widestControlPx);
  });

  it("is the only place the panel's width is written", () => {
    const offenders = others("/List.tsx")
      .filter(([, text]) => text.includes(MENU_PANEL.className))
      .map(([path]) => path);
    expect(offenders).toEqual([]);
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

/**
 * The hairline, split by job (item 1.2, findings B-23 and B-64).
 *
 * One token was doing two jobs at one value: the line **between** two rows, and the line that
 * **is** a text field. Only the second is an interactive-component boundary, so only the second
 * is bound by SC 1.4.11's 3:1 — a row divider is decoration, and paper wants it to stay a
 * hairline you barely notice. Held at one value the pair could only be wrong one way or the
 * other, and it was wrong the way that matters: the field's own edge sat at 1.31:1.
 *
 * So `rule` keeps the decorative job at the value it always had, and `control-edge` is the new
 * one, blended from the same warm hue toward the ink until it reaches the line.
 */
describe("the rule and the control edge", () => {
  it("is measuring the real stylesheet, not an empty string", () => {
    expect(theme).toContain("@theme");
  });

  it("are two tokens, because they answer to two different rules", () => {
    expect(token("control-edge")).not.toEqual(token("rule"));
  });

  it("puts the control edge over 3:1 on every backdrop the builder paints", () => {
    for (const backdrop of BACKDROPS) {
      expect(between("control-edge", backdrop), `on ${backdrop}`).toBeGreaterThanOrEqual(3);
    }
  });

  /**
   * Ground is the darker of the two backdrops, so it is the one that decides. Asserted rather
   * than assumed: it is the ordering the loop above leans on, and #184 shipped a WCAG failure
   * precisely by assuming which backdrop was the worst case.
   */
  it("is checked against the worse of the two, and knows which that is", () => {
    expect(between("control-edge", "ground")).toBeLessThan(between("control-edge", "surface"));
  });

  it("keeps the warm cast, so the field's line still belongs to paper", () => {
    expect(isWarm(token("control-edge"))).toBe(true);
  });

  /**
   * The split only buys anything while the decorative half stays decorative. If `rule` is ever
   * darkened to 3:1 there are two tokens for one value again, and the argument above — that a
   * row divider is not bound by 1.4.11 — has quietly been abandoned rather than decided.
   */
  it("leaves the rule where it is: a separator, not a boundary", () => {
    expect(between("rule", "ground")).toBeLessThan(3);
  });

  it("spends the control edge on the control's own edge and nothing else", () => {
    const offenders = others("./TextInput.tsx")
      .filter(([, text]) => text.includes("control-edge"))
      .map(([path]) => path);
    expect(offenders, "a separator takes `rule`; this token is a control's boundary").toEqual([]);
  });
});

/**
 * §7.4's one deliberate exception, delivered whole (item 1.7, finding B-26).
 *
 * The bar was bought for the standard pattern's own vocabulary — *a grey track with a coloured
 * fill* — and drew two boundaries to say it: the fill against the track, which is how much is
 * done, and the track against the ground, which is how much there is. The second was at
 * **1.16:1** and invisible: you could see how far you had come, not how far was left. Half of
 * why is that the track was a **cool** grey sitting on a warm ground.
 *
 * **The two boundaries were in competition until the fill moved (#222).** Contrast composes
 * along the two steps ground → track → fill, so a track at 3:1 under a fill at 3:1 needs the
 * fill itself to clear **9:1** on the ground. At `#4f46e5` it was 5.88, so #185 could only buy
 * one edge: it held the one carrying the state — the fill against the track, the one you read a
 * proportion off — and left the track as dark as that allowed, 1.82, with `fill/ground < 9`
 * asserted as the arithmetic pinning why it stopped there. The owner has since darkened §7.4's
 * exception colour to indigo-800, which is what that guard was holding the door open for, so it
 * is replaced below by the pair of 3:1s rather than deleted.
 */
describe("the progress bar's two boundaries", () => {
  it("reads the state off the fill against the track, at 3:1", () => {
    expect(between("progress", "progress-track")).toBeGreaterThanOrEqual(3);
  });

  it("shows how much is left: the track clears 3:1 on the ground", () => {
    // 1.16 before #185, 1.82 after it, 3.08 now — the half of B-26 that took two tickets.
    expect(between("progress-track", "ground")).toBeGreaterThanOrEqual(3);
  });

  it("is warm now, like everything else on the ground", () => {
    expect(isWarm(token("progress-track"))).toBe(true);
  });

  /**
   * The arithmetic that used to say *stop here*, now saying *this is why both fit*. A contrast
   * ratio is the same two luminances at every step, so with the track's luminance between the
   * other two it composes by multiplication **exactly**: the fill's reading on the ground *is*
   * the product of the bar's two boundaries. That identity is where 9 comes from — 3 × 3 — and
   * it is what makes the two assertions above satisfiable together rather than a pair someone
   * hopes will hold. Lighten §7.4's exception colour back under 9 and no track colour answers
   * both again, which is the corner #185 was in.
   */
  it("has the headroom that lets both boundaries clear at once", () => {
    expect(between("progress", "ground")).toBeCloseTo(
      between("progress", "progress-track") * between("progress-track", "ground"),
      6,
    );
    expect(between("progress", "ground")).toBeGreaterThanOrEqual(9);
  });

  /**
   * §7.4 grants the bar *one* exception, and an exception that leaks stops being one. The
   * docblock on the tokens has always said nothing else may borrow them for decoration; this is
   * that sentence with teeth, and it is what keeps a change to the tool's second colour a
   * change to the progress bar and to nothing else.
   */
  it("is the only thing spending §7.4's exception colour", () => {
    const offenders = others("/ProgressBar.tsx")
      .filter(([, text]) => text.includes("progress-track") || /\bbg-progress\b/.test(text))
      .map(([path]) => path);
    expect(offenders, "paper is not up for discussion outside the bar").toEqual([]);
  });
});

/**
 * One way of saying *unavailable* (item 1.8, finding B-25).
 *
 * The reorder arrows said it in `rule` — 1.31:1, so they did not read as unavailable, they
 * vanished — while the button weights and the menu's disabled item said it in `ink-quiet`. The
 * settled vocabulary is `disabled:text-ink-quiet disabled:border-rule`: the text steps back to
 * the quiet ink and the boundary stays a hairline.
 *
 * **The allowance is read off `WEIGHT` rather than re-spelled here**, so the component layer
 * stays the definition of what a disabled control looks like and a hand-written control can
 * only borrow from it.
 */
describe("one disabled vocabulary", () => {
  const disabledIn = (text: string): string[] => [
    ...new Set([...text.matchAll(/disabled:[a-z0-9/.-]+/g)].map(([hit]) => hit)),
  ];

  const allowed = new Set(Object.values(WEIGHT).flatMap(disabledIn));

  it("is the one the weights already spend", () => {
    expect([...allowed].sort()).toEqual([
      "disabled:bg-rule",
      "disabled:border-rule",
      "disabled:cursor-default",
      "disabled:text-ink-quiet",
    ]);
  });

  it("is the only one written anywhere in the builder", () => {
    const offenders = everySource()
      .flatMap(([path, text]) => disabledIn(text).map((hit) => `${path}: ${hit}`))
      .filter((hit) => !allowed.has(hit.split(": ")[1] ?? ""));
    expect(offenders, "`disabled:text-rule` is how the arrows disappeared").toEqual([]);
  });

  it("is worn by the arrows, which is where the defect was", () => {
    const arrows = everySource().find(([path]) => path.endsWith("list/LinkButtons.tsx"))?.[1] ?? "";
    expect(arrows).toContain("disabled:text-ink-quiet");
    expect(arrows).toContain("disabled:border-rule");
  });

  /**
   * WCAG exempts an inactive control from the contrast minimum, so this is not that: the item
   * asks for a control that **reads as unavailable** rather than one that is gone, and a colour
   * nobody can find is not a state. `ink-quiet` clears the non-text line with room to spare on
   * both backdrops, which is what makes it legible as *off* rather than absent.
   */
  it("says it in a colour you can still see", () => {
    for (const backdrop of BACKDROPS) {
      expect(between("ink-quiet", backdrop), `on ${backdrop}`).toBeGreaterThanOrEqual(3);
    }
  });
});

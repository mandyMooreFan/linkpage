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
import { WEIGHT, type ButtonWeight } from "./Button.js";
import { CHECKBOX_CLASS } from "./Checkbox.js";
import { declaredWidth, widthsIn } from "./fill.testing.js";
import { LADDER } from "./ladder.js";
import { PANEL_CLASS, PANEL_EDGE } from "./Panel.js";
import { HEADING, TYPE } from "./type.js";
import { SHEET_SURFACE } from "../download/DownloadSheet.js";
import { REORDER_CLASS } from "../list/LinkButtons.js";
import { MENU_PANEL, MENU_SURFACE } from "../list/List.js";
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

/**
 * Every colour `theme.css` names, so a rule about colours cannot be written against a list of
 * them typed out here and left behind the day an eleventh arrives.
 */
const COLOUR_NAMES = [...theme.matchAll(/--color-([a-z0-9-]+)\s*:/g)].map(([, name]) => name ?? "");

/** The colour classes a class string sets **at rest** — `disabled:` and friends excluded. */
const restingColours = (classes: string): string[] =>
  classes
    .split(/\s+/)
    .filter((one) => !one.includes(":") && COLOUR_NAMES.some((name) => one === `text-${name}`));

/**
 * Every `<Name …>` element in a file, as the text of its opening tag.
 *
 * **Brace-matched rather than regex-terminated**, because the first `>` after `<Button` is very
 * often the one in an `onClick={() => …}`. Anything inside braces or quotes is skipped, so the
 * tag ends at the first `>` the JSX itself owns — which is what makes "no button spells its own
 * colour" a rule about the *button* rather than about the whole file it happens to sit in.
 *
 * **Taken off `<Button>` and given a name to walk** by #240. Walking `<Button>` is what #234 and
 * #230 needed and it is also what neither of them could see past: the recipe that never went
 * through the component renders no `<Button>` tag to walk. The lowercase `<button>` walk below is
 * the same instrument pointed at the elements those rules were blind to.
 */
const openingTags = (text: string, name: string): string[] => {
  const found: string[] = [];
  const opener = new RegExp(`<${name}\\b`, "g");
  for (let hit = opener.exec(text); hit !== null; hit = opener.exec(text)) {
    let depth = 0;
    let quote = "";
    for (let at = hit.index + hit[0].length; at < text.length; at += 1) {
      const char = text[at];
      if (quote !== "") {
        if (char === quote) quote = "";
      } else if (char === '"' || char === "'" || char === "`") {
        quote = char;
      } else if (char === "{") {
        depth += 1;
      } else if (char === "}") {
        depth -= 1;
      } else if (char === ">" && depth === 0) {
        found.push(text.slice(hit.index, at));
        break;
      }
    }
  }
  return found;
};

/** The `<Button …>` call sites #234's and #230's rules are written about. */
const buttonElements = (text: string): string[] => openingTags(text, "Button");

/** The raw `<button …>` elements that never went through the component at all (#240). */
const hostButtons = (text: string): string[] => openingTags(text, "button");

/**
 * The two halves of the one focus treatment, read out of `theme.css` (#179 variant A, #188).
 *
 * **The ring, for everything with no line to thicken**, lives in `@layer base` — and it is read
 * from that block by name rather than by finding the first `:focus-visible` in the file, because
 * there are two focus rules now and the other one is deliberately *not* a ring.
 */
const focusRing = (): string => /@layer base \{(?:[^{}]|\{[^{}]*\})*\}/.exec(theme)?.[0] ?? "";

/** **The line, for the controls that are one**: `@utility focus-line { … }`, one level deep. */
const focusLine = (): string =>
  /@utility focus-line \{(?:[^{}]|\{[^{}]*\})*\}/.exec(theme)?.[0] ?? "";

/**
 * Every property a block sets, by name.
 *
 * A declaration opens a line and closes with a semicolon on it; a selector — `label:has(…)` — opens
 * one the same way and closes with a brace, which is the whole reason the tail of this pattern is
 * not optional.
 */
const propertiesIn = (block: string): string[] => [
  ...new Set([...block.matchAll(/^\s*([a-z-]+):[^;{]*;/gm)].map((match) => match[1] ?? "")),
];

/**
 * The corpus every rule below sweeps, asserted before any of them sweeps it. #213.
 *
 * **Nearly every guard in this file is an absence** — `expect(offenders).toEqual([])` — and an
 * absence is exactly the shape that goes green when the thing doing the looking finds nothing to
 * look at. `import.meta.glob` is a build-time transform: a pattern that stops matching does not
 * throw, it returns `{}`, and `others(…)` and `everySource()` then hand every rule an empty list.
 *
 * **Measured rather than argued.** Breaking the glob on `main` left **94 of this file's 119 tests
 * green**. The 25 that noticed did so incidentally — they happen to name a file and read
 * something out of it — so the tripwire existed but belonged to nobody, and a *partial* failure
 * (the pattern still matching `.ts` but no longer `.tsx`, say) would trip fewer of them still.
 * This is the same silent green `readFileSync` exists to prevent one layer up for `theme.css`,
 * and the same one #188's focus block opens by ruling out: **assert the thing you are measuring
 * is there before measuring it.**
 *
 * **Named rather than counted** (#190, #198): a threshold on how many files the glob found would
 * pass on any handful of them. What is asserted is that the corpus contains the files these rules
 * name as owners — if one of those is renamed, the rule that owns it is already broken and this
 * says so first, in one line, instead of going quiet.
 */
describe("the sources every rule below reads", () => {
  /** The owners: each is the one place some rule below allows its recipe to be written. */
  const OWNERS = [
    "./TextInput.tsx",
    "./Button.tsx",
    "./Checkbox.tsx",
    "./Panel.tsx",
    "./row.ts",
    "./type.ts",
    "../flow/ProgressBar.tsx",
    "../flow/questions/Question.tsx",
    "../list/List.tsx",
    "../list/LinkButtons.tsx",
    "../download/DownloadSheet.tsx",
  ];

  it("is the builder itself, and not an empty glob", () => {
    const paths = Object.keys(sources);
    for (const owner of OWNERS) {
      expect(paths, `the glob must reach ${owner}`).toContain(owner);
    }
  });

  it("read each of them, rather than a stub of one", () => {
    // `?raw` is stubbed to `""` for anything vitest does not process — which is how a token
    // assertion against `theme.css` once went green measuring a file with nothing in it.
    const empty = Object.entries(sources)
      .filter(([, text]) => text.trim() === "")
      .map(([path]) => path);
    expect(empty).toEqual([]);
  });

  it("leaves exactly the owner out when a rule asks for everyone else", () => {
    // `others(owner)` is how "written in one place" is spelled, so the one thing it must never do
    // is exclude nothing — or everything.
    const owner = "./Button.tsx";
    const excluded = Object.keys(sources).filter(
      (path) => !path.includes(".test.") && !others(owner).some(([kept]) => kept === path),
    );
    expect(excluded).toEqual([owner]);
  });
});

/**
 * A recipe reaches a screen. `SPEC.md` §7.4; findings B-47 and #183's; generalised by #213.
 *
 * **The second half of "written in one place", and the half that keeps being missing.** Twice now
 * a component has held a rule and had **no call sites at all**: `TextInput` owned the placeholder
 * colour while thirteen screens wrote the recipe out by hand (#183), and `Panel` owned §7.9's
 * aside while four screens hand-rolled it (B-47, #199). In both the "only place it is written"
 * guard was perfectly satisfied — a component nobody calls is not a second copy, so there was
 * nothing for it to find. #199 wrote the answer for `Panel` and the map asked for it to become
 * the default rather than something each ticket reinvents. This is that.
 *
 * **It is live, not theoretical.** On `main`, deleting `TextArea`'s only call site — swapping the
 * address field to a `TextInput` — passed the entire suite: the address silently became a
 * one-line box and `TEXTAREA_CLASS`'s `resize-none`, which is the whole of design change 6's
 * finding B-73, reached nothing.
 *
 * **Named, not counted**, because the two halves want different instruments. "Is this called at
 * all" is a count question and `Panel`'s guard rightly asks it that way; *which* screens call it
 * is what a count cannot say, and for the four controls whose call sites their own docblocks
 * claim to enumerate — the address is the one textarea, the tick boxes are two — naming them is
 * what makes the claim fail when it stops being true rather than quietly age.
 */
describe("every shared control reaches a screen", () => {
  /** Every file rendering `<Name …>`, the owner's own file aside. */
  const callersOf = (name: string, owner: string): string[] =>
    everySource()
      .filter(([path]) => !path.endsWith(owner))
      .filter(([, text]) => new RegExp(`<${name}\\b`).test(text))
      .map(([path]) => path)
      .sort();

  it("renders the several-line answer at the one field that is one", () => {
    // `TextInput.tsx` says so itself: "for an answer that runs to several — the address, and
    // nothing else today". A second textarea is a decision, not a diff.
    expect(callersOf("TextArea", "/TextInput.tsx")).toEqual([
      "../flow/questions/SectionQuestions.tsx",
    ]);
  });

  it("renders the prefixed field at the one field that owns every web address", () => {
    // All four web addresses come through `UrlField`, which is where the split lives (#197).
    expect(callersOf("UrlInput", "/TextInput.tsx")).toEqual(["./TextField.tsx"]);
  });

  it("renders the tick box at both tick boxes", () => {
    // #193's ticket pointed at the wrong file, so these are named: the link-button picks and the
    // advanced tier's own switch. `Checkbox.tsx` reasons about "both call sites" by name.
    expect(callersOf("Checkbox", "/Checkbox.tsx")).toEqual([
      "../flow/questions/LinkQuestions.tsx",
      "../list/Advanced.tsx",
    ]);
  });

  it("renders the aside on the surfaces §7.9 speaks from", () => {
    // B-47's four copies, now callers: the logo step, the preset step and the list menu's two.
    expect(callersOf("Panel", "/Panel.tsx")).toEqual([
      "../flow/questions/LogoQuestion.tsx",
      "../flow/questions/PresetQuestion.tsx",
      "../list/List.tsx",
    ]);
  });

  it("renders the one text input and the one button on screens rather than nowhere", () => {
    // These two are on nearly every screen there is, so naming the set would be a list that
    // changes whenever a screen does. What is worth holding is the thing that was actually wrong
    // in #183 — a recipe with no reader — and that is emptiness.
    expect(callersOf("TextInput", "/TextInput.tsx"), "#183's defect exactly").not.toEqual([]);
    expect(callersOf("Button", "/Button.tsx")).not.toEqual([]);
  });
});

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
   * The answer is not a size step above its own label (B-29, B-71, item 0; #227).
   *
   * The line was `text-lg` against a `text-base` label and a `text-sm` hint, so the loudest type
   * inside a field was the field's contents — and on an empty one the *placeholder* came out
   * bigger than the name of the field, which is B-71 and is the same defect seen from the front.
   * §2 allows one step per level of hierarchy and puts weight and colour ahead of size; a label
   * and its answer are one field rather than two levels, so the size is what holds still and the
   * `font-medium` on the label, the ink against `text-ink-quiet` and the underline do the work.
   *
   * **Asserted by naming the recipe, not by counting sizes** (#190's lesson, #198's shape): a
   * line that swapped its size for the hint's would still hold exactly one, and would read
   * wrongly. So this says *which* role the line is set at, and that it sets nothing else.
   */
  it("sets the owner's answer at the role type.ts names, and at no size of its own", () => {
    expect(LINE_CLASS).toContain(TYPE.answer.className);
    const own = LINE_CLASS.replace(TYPE.answer.className, "");
    expect(own, "one size on the line, and it comes from the scale").not.toMatch(
      /\btext-(xs|sm|base|lg|[2-9]?xl)\b/,
    );
  });

  it("keeps no text control above the size of the label naming it", () => {
    // 16px, anchored on `Field`'s own label rather than restated here — the number this ticket
    // settled is a *relation* between two elements, so the guard has to read both.
    const question =
      everySource().find(([path]) => path.endsWith("flow/questions/Question.tsx"))?.[1] ?? "";
    expect(question, "Question.tsx was not read").not.toBe("");
    expect(question, "the field label is the body step").toMatch(/\btext-base font-medium\b/);
    expect(TYPE.answer.px).toBe(16);
    expect(TYPE.answer.px, "and a hint stays below both").toBeGreaterThan(TYPE.quietLine.px);
  });

  /**
   * `text-lg` reaches no text control anywhere, which is the sweep half of B-29.
   *
   * The finding named "every input" and listed six sites; they all come through this file now, so
   * one string closes it — but a seventh could be hand-written tomorrow and would look entirely
   * ordinary in a diff. The reorder arrows are the deliberate exception and are named as such: an
   * arrow glyph sized to be pressable is not a level of type hierarchy.
   *
   * **The exception is the arrows' recipe, not a count of two** — amended by #199, which found the
   * sharper form the same day. This asked for *exactly two* `text-lg` in `LinkButtons.tsx`,
   * meaning the two hand-copied class strings; #199 wrote that recipe once, because it is on the
   * screen twice and the pair must not drift, and the count went red for a de-duplication that
   * changed no pixel. What the rule is really saying is that 18px in that file **belongs to the
   * arrows**: it is written in `REORDER_CLASS`, nowhere else in the file, and `REORDER_CLASS` is
   * what both buttons wear. That survives the recipe being written once *and* still catches a
   * seventh control reaching for the step — which a count does not, since two hand-written
   * `text-lg` on something that is not an arrow would have satisfied it exactly.
   */
  it("leaves 18px on nothing that holds type", () => {
    const offenders = everySource()
      .filter(([path]) => !path.endsWith("list/LinkButtons.tsx"))
      .filter(([, text]) => /\btext-lg\b/.test(text))
      .map(([path]) => path);
    expect(offenders, "the value's size comes from the scale now").toEqual([]);

    expect(REORDER_CLASS, "the arrows are where 18px survives").toMatch(/\btext-lg\b/);
    const arrows = everySource().find(([path]) => path.endsWith("list/LinkButtons.tsx"))?.[1] ?? "";
    expect(arrows, "LinkButtons.tsx was not read").not.toBe("");
    const recipe = /export const REORDER_CLASS =[\s\S]*?;/.exec(arrows)?.[0];
    expect(recipe, "the arrows' recipe must still be written down").toBeDefined();
    expect(arrows.replace(recipe ?? "", ""), "nothing else in that file holds 18px").not.toMatch(
      /\btext-lg\b/,
    );
    expect(
      [...arrows.matchAll(/className=\{REORDER_CLASS\}/g)],
      "and both arrows wear it, so the pair cannot drift",
    ).toHaveLength(2);
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

  it("answers focus on the line, since the thing focused is now inside it", () => {
    // The same treatment the field always had — the line answers and nothing moves — and now
    // literally the same one: `focus-line` sits on `LINE_CLASS` and asks both questions, so the
    // row needs no `focus-within:` of its own. It said `focus-within:border-ink` until #188.
    expect(URL_ROW_CLASS).toContain("focus-line");
    expect(URL_ROW_CLASS).not.toMatch(/\bfocus-within:/);
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
    // Stepped up from the browser's ~0.8125rem, which reads as a stray mark beside body type.
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

  /**
   * **The half the rule above cannot see** — and #234 is why it is here. A `disabled:` class that
   * restates something the weight already wears at rest satisfies "has a disabled treatment" and
   * draws nothing: `quiet` used to say unavailable with `disabled:text-ink-quiet`, which was a
   * real step back from an ink it inherited, and stopped being one the moment the weight rested
   * at `ink-quiet` itself. That is B-1's defect — a declaration that styles nothing — arriving
   * through a guard that only counted the presence of a prefix.
   */
  it("says it by drawing something it does not already draw", () => {
    for (const [name, classes] of Object.entries(WEIGHT)) {
      if (name === "inline") continue;
      const worn = new Set(classes.split(/\s+/).filter((one) => !one.includes(":")));
      const changed = classes
        .split(/\s+/)
        .filter((one) => one.startsWith("disabled:"))
        .map((one) => one.slice("disabled:".length))
        // A pointer is not paint, and `disabled:border-rule` is `secondary` saying out loud that
        // its hairline is the one thing that does *not* step back. Neither is a mark on its own.
        .filter((one) => one !== "cursor-default" && !worn.has(one));
      expect(changed, `${name} draws nothing new when it is unavailable`).not.toEqual([]);
    }
  });
});

/**
 * One ink for every small text-only button. `SPEC.md` §4, §7.4; finding B-21, ticket #234.
 *
 * **The owner's call, and it is a taste call rather than a deduction** — which is why it sat open
 * from #183 (deferred out of a refactor) through #227 (which set out why B-29's reading does not
 * settle it) to #231's audit, one of only two findings on the whole change list deliberately left.
 * The rejected alternative split the weight by what the button *does*: navigation (`Back`) lighter
 * than acting on your own work (`Remove`, `Cancel`, "Or type a code"). One rule won, because two
 * buckets is one more thing to sort a new button into.
 *
 * **What was actually wrong on `main` was worse than a split — it was unwritten.** `WEIGHT.quiet`
 * declared no colour, so five of the six small text-only buttons took whatever ink their screen
 * set, and the single place the tertiary colour appeared anywhere in the tool was the *exception*:
 * `text-ink-quiet` on `Back`'s own call site. So these rules are two: the weight names the ink,
 * **and no call site names one** — the second is the whole of the ticket, and the reason the first
 * one alone would be green while the tool still had two tertiary inks on it.
 */
describe("one ink for every small text-only button (B-21)", () => {
  it("is named by the weight", () => {
    expect(restingColours(WEIGHT.quiet)).toEqual(["text-ink-quiet"]);
  });

  /**
   * **Identity, not a count** (#190, #198, and #199's `text-lg` guard going red inside a day).
   * "Exactly one weight names a colour" would be satisfied by `primary` alone and by any colour
   * at all, so each weight is named against the ink it is supposed to take: `primary`'s own,
   * because it stands on a fill; none for `secondary`, which takes the ink of the surface; none
   * for `inline`, which takes the ink of the sentence it is a word of.
   */
  it("leaves every other weight taking the ink around it", () => {
    expect(restingColours(WEIGHT.primary), "sits on a fill").toEqual(["text-ground"]);
    expect(restingColours(WEIGHT.secondary), "takes the screen's ink").toEqual([]);
    expect(restingColours(WEIGHT.inline), "takes its sentence's ink").toEqual([]);
  });

  it("is never respelled on a button, anywhere in the builder", () => {
    const offenders = everySource().flatMap(([path, text]) =>
      buttonElements(text)
        .flatMap((element) => classLists(element).flatMap(restingColours))
        .map((colour) => `${path}: ${colour}`),
    );
    expect(offenders, "colour is the weight's business, not the call site's").toEqual([]);
  });

  /**
   * The scanner above is a sweep, and a sweep that finds nothing passes. This names the one site
   * the override lived at, so the rule cannot go green by failing to see a `<Button>` at all.
   */
  it("still reaches the call site the override was written at", () => {
    const question =
      everySource().find(([path]) => path.endsWith("flow/questions/Question.tsx"))?.[1] ?? "";
    const back = buttonElements(question).find((element) => element.includes('weight="quiet"'));
    expect(back, "Question.tsx renders `Back` as a quiet button").toBeDefined();
    expect(back, "and hands it a rung of the ladder, which is all it hands it").toContain(
      "LADDER.betweenSections",
    );
  });

  /**
   * **Name the backdrop, and check every backdrop the thing is drawn on** (#184). This one is not
   * hypothetical: `Cancel` is a quiet button inside §7.8's replace confirmation, which renders in
   * the list menu's panel — `bg-surface` — while `Back`, `Remove` and "Or type a code" stand on
   * the ground. Both are asserted, worst case first.
   *
   * A button is text a person has to read, so it is §3.3's 4.5 rather than SC 1.4.11's 3:1. The
   * same ink at the same numbers already carries the placeholder (5.60 on the ground); what is new
   * is that it now carries a *control*, which is a different promise made of the same two hexes.
   */
  it("clears the body threshold on both backdrops", () => {
    for (const backdrop of BACKDROPS) {
      expect(between("ink-quiet", backdrop), `on ${backdrop}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  /**
   * **The tension #227 raised, as an assertion rather than a hope.** §4's tertiary is grey and
   * underlined, and #198 gave a hint `text-sm text-ink-quiet` — so a quiet button that drifted
   * down to 14px, or a hint that grew an underline, would leave the tool with one recipe saying
   * both *supporting text* and *press me*. Two instruments keep them apart: the size step, and the
   * underline, which in paper **is** the control (§7.4).
   */
  it("still reads as a control and not as a hint", () => {
    expect(WEIGHT.quiet, "a control is pressable, and says so").toMatch(/\bunderline\b/);
    expect(TYPE.quietLine.className, "a hint is not").not.toMatch(/\bunderline\b/);
    expect(WEIGHT.quiet).toContain(TYPE.answer.className);
    expect(TYPE.answer.px, "and stands a step above one").toBeGreaterThan(TYPE.quietLine.px);
  });
});

/**
 * A button is as wide as its words. `SPEC.md` §4, §6; finding B-72, ticket #230.
 *
 * **The finding is two screens showing one weight at two widths**: `Continue` stretching the whole
 * flow column, and `Download index.html` — the same `primary`, one screen over — fitting its
 * words. §4 asks that the buttons on a screen share one box per size variant and §6 that a
 * repeated element be pixel-identical, and this was the last dimension in which they were not:
 * B-16 had already settled the padding, the radius and the type size.
 *
 * **What was on `main` was #234's shape again — the width was not decided by the weight at all.**
 * `primary` carried `shrink-0`, which is a *main-axis* class: it says a flex item may not be
 * squeezed, and says nothing whatever about how wide a button is drawn. Of the five `primary`
 * sites, four are not flex rows and the fifth holds a one-word label, so it drew nothing anywhere.
 * `secondary` and `quiet` carried `self-start`, which does reach the width — by way of the cross
 * axis, dragging a screen's vertical alignment with it, which is exactly the collision B-40 found
 * and #199 had to answer with a `self-center` at a call site. So the real decision lived in the
 * containers: three of them wrote `items-start` to stop their buttons stretching and then `w-full`
 * on every child that was not a button to put the default back, and the one container that did not
 * — the flow's own form — is where B-72 shows.
 *
 * **So the weight names it, and nothing else may.** `w-fit` on the three box weights: a definite
 * width, so an ancestor's `align-items: stretch` has nothing left to stretch, and capped at the
 * space available, so a long label still wraps inside its column. `inline` names none, because it
 * is a word in a sentence rather than a box (see `Button.tsx`).
 *
 * Both halves are here, and neither is enough alone — the same pairing B-21 needed. The source
 * says the weight declares one width and no call site declares any; the rendered walks in
 * `flow.test.tsx`, `list.test.tsx`, `download/download.test.tsx` and `open/open.test.tsx` say
 * what the buttons a person is actually looking at came out as, which is where "the same weight,
 * two containers, two widths" would show.
 */
describe("one width for every button (B-72)", () => {
  it("is named by the weight, and it is the same width for all three boxes", () => {
    // Identity, not a count: "every weight declares a width" would be satisfied by `primary`
    // saying `w-full` while the escape beside it says `w-fit`, which is the defect with a
    // declaration on it.
    expect(declaredWidth("primary"), "the fill fits its words").toEqual(["w-fit"]);
    expect(declaredWidth("secondary"), "and so does the outline beside it").toEqual(["w-fit"]);
    expect(declaredWidth("quiet"), "and the sentence you can press").toEqual(["w-fit"]);
  });

  /**
   * `inline` is the one weight without a width, for the reason it is the one without `tap`: a
   * word inside a sentence is not a box, so a width for it would be a width for nothing.
   */
  it("leaves the one weight that is a word rather than a box saying nothing", () => {
    expect(declaredWidth("inline")).toEqual([]);
  });

  /**
   * The two classes B-72 named as the instrument, kept off the weights on purpose. `shrink-0` is
   * still a real utility with a real job — the `https://` prefix, the tick box, a swatch dot, the
   * hours segment group, all fixed-size things that must not collapse in a row — and borrowing it
   * to mean *width* is how `primary` came to have none.
   */
  it("says width on the axis width is on", () => {
    for (const [name, classes] of Object.entries(WEIGHT)) {
      expect(classes.split(/\s+/), `${name} must not reach for the cross axis`).not.toContainEqual(
        expect.stringMatching(/^self-/),
      );
      expect(
        classes.split(/\s+/),
        `${name} must not mistake shrinking for width`,
      ).not.toContainEqual(expect.stringMatching(/^shrink-/));
    }
  });

  it("is never respelled on a button, anywhere in the builder", () => {
    const offenders = everySource().flatMap(([path, text]) =>
      buttonElements(text)
        .flatMap((element) => classLists(element).flatMap(widthsIn))
        .map((one) => `${path}: ${one}`),
    );
    expect(offenders, "width is the weight's business, not the call site's").toEqual([]);
  });

  /**
   * The sweep above is a sweep, and a sweep that finds nothing passes — and this one has a second
   * way to pass vacuously, since it would also be green if it found every `<Button>` and read no
   * classes off any of them. So it is pinned to the one call site that hands a `<Button>` a class
   * string at all: §7.7's `SaveButton`, which passes a margin and an overflow rule and no width.
   */
  it("still reads the classes a call site does hand a button", () => {
    const sheet =
      everySource().find(([path]) => path.endsWith("download/DownloadSheet.tsx"))?.[1] ?? "";
    const save = buttonElements(sheet).find((element) => element.includes("className="));
    expect(
      save,
      "DownloadSheet renders its download through Button, with a class string",
    ).toBeDefined();
    expect(classLists(save ?? "").flatMap((one) => one.split(/\s+/))).toContain("mt-4");
    expect(classLists(save ?? "").flatMap(widthsIn), "and none of it is a width").toEqual([]);
  });

  /**
   * **The other side of the same rule**: with the width on the weight, nothing in the tool has a
   * reason left to countermand its container's alignment. Every `self-*` in the builder was one
   * of these — `WEIGHT.secondary`, `WEIGHT.quiet`, the two `self-center`s put back over them at
   * `HoursQuestion` and `Preview`, and a `self-start` in `Advanced.tsx` sitting in an ordinary
   * block where `align-self` reached nothing at all. A new one is a container deciding a button's
   * width again, by the back door B-72 came in through; if some future thing genuinely needs one,
   * this rule is the place to say why.
   */
  it("leaves nothing in the tool aligning itself against its own row", () => {
    const offenders = everySource().flatMap(([path, text]) =>
      [...text.matchAll(/\bself-(?:start|center|end|stretch)\b/g)].map(
        ([one]) => `${path}: ${one}`,
      ),
    );
    expect(offenders, "alignment is the container's business").toEqual([]);
  });
});

/**
 * No button is drawn by hand, anywhere. `SPEC.md` §7.4; finding B-3, ticket #240.
 *
 * **The question none of the button rules asked.** B-3 is "the button weights are hand-copied at
 * ten sites", and #183 answered it by unifying `WEIGHT` and moving ten `<Button>` call sites.
 * Every rule built on top of that answer — #198's one size per role, #234's one ink, #230's one
 * width — is enforced by **walking `<Button>` opening tags**, and #231's audit recorded B-3 as
 * landed by checking that `WEIGHT` is unified, which it is. All four were right about the
 * definition and none of them could see a call site that bypasses the component: an eleventh copy
 * survived on a plain `<button>` in `Advanced.tsx` for four tickets, still wearing the recipe as
 * it read before #198 gave `quiet` a size and #234 gave it an ink.
 *
 * **This is #213's shape one level over.** *Written here* and *here has callers* are source facts,
 * and *the component wears it* is the third; **nothing else wears it by hand** is a fourth, and it
 * is a question about every element in the tool rather than about the component's own file.
 *
 * **What can be held, and what cannot.** The rule "everything pressable is a `Button`" cannot: six
 * files render a raw `<button>` on purpose — a progress step, two colour swatches, the reorder
 * arrows, a preset tile, the review rows and the menu items — and none of them is one of §4's
 * weights. The last test below is that list, named rather than counted, so a seventh is a decision
 * somebody argues rather than a diff. What **can** be held is the recipe: a class string may not be
 * copied out of a weight, and the marks that say *this is one of the tool's buttons* may not be
 * written outside the file that draws them.
 *
 * **And the limit, stated rather than left to be discovered** (#213's habit). The two rules cover
 * different halves and one weight falls between them: a hand-written `secondary` that both drops
 * `w-fit` *and* adds a class of its own is neither a subset of the recipe nor wearing a mark, and
 * would pass. `primary` cannot do that (`bg-ink` and `text-ground` are both its alone), nor can
 * `quiet` or `inline` (`underline-offset-4`), and `secondary`'s escape is only open because every
 * other utility it wears — the hairline, the radius, the padding, the tap floor — is shared paper
 * vocabulary the tiles and rows use for their own reasons. Narrowing it further would mean an
 * allow-list of the strings that are *allowed* to look like a button, which is the maintained
 * exception list #213 declined to write.
 */
describe("no button is drawn by hand (B-3)", () => {
  /**
   * The utilities a class string writes, interpolations dropped.
   *
   * `${…}` is a *composition* — `MENU_PANEL.className` and the ladder's rungs arrive that way —
   * so what is left after removing it is the part this file wrote out by hand, which is the part
   * the rule is about. Dropping the whole string instead would let a hand-copy hide behind one
   * interpolated rung.
   */
  const utilities = (classes: string): string[] =>
    classes
      .replaceAll(/\$\{[^}]*\}/g, " ")
      .split(/\s+/)
      .filter((one) => one !== "");

  /**
   * **Three, and it is a floor rather than a threshold** — the rule is the subset, not the size.
   * Two utilities are not a recipe: `disabled:border-rule disabled:text-ink-quiet` on the reorder
   * arrows is exactly `secondary`'s disabled pair and is *meant* to be, which *one disabled
   * vocabulary* below requires of it by reading that vocabulary off `WEIGHT`. Borrowing two words
   * of a shared vocabulary is not copying a button.
   */
  const COPY_FLOOR = 3;

  /**
   * The weights a class string is a hand-copy of — **every** utility in it comes out of that one
   * weight's recipe, and there are enough of them to be a recipe rather than a coincidence.
   *
   * **Subset, not overlap**, and the difference is the whole reason this is not a false-positive
   * machine. Raw overlap says the preset tile is 7/10 of a `secondary` — it shares `tap`,
   * `rounded-sm`, `border border-rule`, `bg-transparent`, `px-4`, `font-sans` — while being a
   * full-width `flex-col` card at `py-3`, which is a different species wearing the same paper
   * vocabulary. What makes a hand-copy a hand-copy is that it adds **nothing**: the string in
   * `Advanced.tsx` was `WEIGHT.quiet` with three utilities dropped and not one put back.
   *
   * Derived from `WEIGHT` rather than spelled out, so the day a weight is rewritten this follows
   * it instead of guarding a recipe nobody uses any more.
   */
  const handCopiedWeights = (classes: string): ButtonWeight[] => {
    const written = utilities(classes);
    if (written.length < COPY_FLOOR) return [];
    return (Object.keys(WEIGHT) as ButtonWeight[]).filter((name) => {
      const recipe = new Set(utilities(WEIGHT[name]));
      return written.every((one) => recipe.has(one));
    });
  };

  /**
   * The marks that say *this is one of the tool's buttons* — one per weight, so no weight can be
   * hand-written without tripping something even when the copy adds a class of its own and stops
   * being a subset.
   *
   * - **`w-fit`** — a button is as wide as its words (B-72). Nothing else in the tool is: rows,
   *   tiles, fields and menu items are `w-full`, and a swatch is `size-12`.
   * - **`text-ground`** — ink drawn *on* a fill, which only `primary` stands on.
   * - **`underline-offset-4`** — the underline that in paper **is** the control (§7.4, `quiet` and
   *   `inline`). The one other `underline` in the builder is a word in a refusal message, and it
   *   sets no offset.
   *
   * `primary`'s fourth mark, `bg-ink`, is deliberately not repeated here: *one solid fill, spent
   * once* holds it the same way, for §4's own reasons. Between the two, every weight has at least
   * one utility that cannot be written outside `Button.tsx`.
   */
  const MARKS = ["w-fit", "text-ground", "underline-offset-4"];

  /**
   * **The pin, and it is positive rather than incidental** (#213: breaking `controls.test.ts`'s
   * corpus read left 94 of 119 tests green). Both rules below are absences, and an absence goes
   * green when the thing doing the looking has stopped being able to see. So the reader is run
   * against a copy it must catch and against two shared recipes it must let through, before it is
   * pointed at the builder at all.
   */
  it("knows a copied recipe from a recipe of its own", () => {
    // What was live on `Advanced.tsx` from #183 until #240 — `WEIGHT.quiet` frozen at the moment
    // it was copied, missing the size #198 gave it and the ink #234 gave it.
    const wasLive = "tap bg-transparent py-2 font-sans underline underline-offset-4";
    expect(handCopiedWeights(wasLive)).toEqual(["quiet"]);
    for (const name of Object.keys(WEIGHT) as ButtonWeight[]) {
      expect(handCopiedWeights(WEIGHT[name]), `a whole ${name}`).toContain(name);
    }
    // The two nearest things in the tool that are not buttons, and must not be read as ones.
    expect(handCopiedWeights(ROW_BUTTON), "a review row is not a button").toEqual([]);
    expect(handCopiedWeights(INPUT_CLASS), "and neither is a text field").toEqual([]);
    expect(handCopiedWeights("tap font-sans"), "two words are not a recipe").toEqual([]);
  });

  it("finds no copy of a weight anywhere in the builder", () => {
    const offenders = others("./Button.tsx").flatMap(([path, text]) =>
      classLists(text).flatMap((classes) =>
        handCopiedWeights(classes).map((name) => `${path}: ${name} — "${classes}"`),
      ),
    );
    expect(offenders, "a weight is written in `Button.tsx` and worn through `Button`").toEqual([]);
  });

  it("keeps every mark that identifies a button inside the file that draws it", () => {
    for (const mark of MARKS) {
      // Named marks go stale silently, so each is checked against `WEIGHT` first: a mark no weight
      // wears any more is a rule guarding nothing, which is the same vacuous green one layer up.
      expect(
        Object.values(WEIGHT).some((classes) => utilities(classes).includes(mark)),
        `${mark} must still be a mark some weight wears`,
      ).toBe(true);

      const offenders = others("./Button.tsx")
        .filter(([, text]) => new RegExp(`\\b${mark}\\b`).test(text))
        .map(([path]) => path);
      expect(offenders, `${mark} says "this is one of the tool's buttons"`).toEqual([]);
    }
  });

  /**
   * **The half the `<Button>` walk cannot reach**, pointed at the elements it was blind to — and
   * the honest answer to "is everything pressable a `Button`?", which is **no**, on purpose.
   *
   * Named rather than counted (#190, #198), and exhaustive by *file*: a second swatch inside
   * `StyleStep` is a diff, a seventh file rendering a raw `<button>` is a decision. Every one of
   * these is a pressable thing that is not one of §4's weights — a progress step, a colour
   * swatch, a reorder arrow, a preset tile, a review row, a menu item — and this is also what
   * stops the sweep above being green because it found nothing to read.
   */
  it("reads the pressable things that are not buttons, and lets them be", () => {
    const raw = others("./Button.tsx")
      .filter(([, text]) => hostButtons(text).length > 0)
      .map(([path]) => path)
      .sort();
    expect(raw, "a raw <button> that is not a weight is a decision, not a diff").toEqual([
      "../flow/ProgressBar.tsx",
      "../flow/questions/ColourQuestion.tsx",
      "../flow/questions/PresetQuestion.tsx",
      "../list/LinkButtons.tsx",
      "../list/List.tsx",
      "../list/StyleStep.tsx",
    ]);

    const offenders = others("./Button.tsx").flatMap(([path, text]) =>
      hostButtons(text).flatMap((element) =>
        classLists(element)
          .flatMap(utilities)
          .filter((one) => MARKS.includes(one))
          .map((mark) => `${path}: ${mark}`),
      ),
    );
    expect(offenders, "and it must not dress as one either").toEqual([]);
  });
});

/**
 * There is one solid fill, and it belongs to one action. `SPEC.md` §7.4, §4, §6; design change 3
 * (#190), findings B-18, B-19, B-51, B-60.
 *
 * §4 gives the highest-contrast fill on a screen to the single primary action, which only means
 * anything if the tool has exactly one fill to give. It nearly had three: the review list showed
 * the pinned Download and an opened row's Save at once, the Download sheet rendered both of its
 * downloads solid, and the hours step stacked **seven** — one per day, every one of them a
 * default nobody had chosen — under a Continue that was disabled and pale.
 *
 * **Two halves, and neither is enough alone.** Here is the half the source can answer: the fill is
 * `WEIGHT.primary` and there is no second way to spell it, so a hand-written `bg-ink` cannot open
 * a fourth front the way the escape's `question__escape` did. *How many* of it reach a screen at
 * once is a fact about state rather than about the source — all three defects above read
 * perfectly in the files — so that half is asserted on the rendered screens, by `filledLabels`
 * (`fill.testing.ts`) in `flow.test.tsx`, `list.test.tsx` and `download/download.test.tsx`.
 *
 * The hours step's own fix was **not** a weight change and is not held here: #192 took the
 * segments off the fill and onto `theme.css`'s one `picked` mark, which *the one picked state*
 * below guards. What holds it from this side is the flow walk, which now counts the fills on
 * every step of every preset.
 */
describe("one solid fill, spent once (design change 3)", () => {
  /**
   * `bg-ink` as a whole class, so `bg-ink/40` is not caught by it.
   *
   * The distinction is the point rather than an escape hatch: a 40% wash over a screen is a scrim
   * and not a fill, and #199 is about to spend exactly that on the sheet's `bg-black/40`, which
   * is the one colour in the tool that is not a paper token.
   */
  const FILL = /\bbg-ink(?![\w-])(?!\/)/;

  it("is written in the one button component and nowhere else", () => {
    const offenders = others("./Button.tsx")
      .filter(([, text]) => FILL.test(text))
      .map(([path]) => path);
    expect(offenders, "the solid fill is a weight, not a class to reach for").toEqual([]);
  });

  it("belongs to exactly one weight, so a screen cannot have two primaries by accident", () => {
    const filled = Object.entries(WEIGHT).filter(([, classes]) => FILL.test(classes));
    expect(filled.map(([name]) => name)).toEqual(["primary"]);
  });

  it("has one weight to step down to that is still the same box", () => {
    // What a stepped-down primary becomes. *Differs from Continue only in fill* above is the
    // measurement: the button that gives up the fill keeps its padding, radius, type and tap
    // floor, so nothing moves on the screen when the fill travels.
    expect(FILL.test(WEIGHT.secondary)).toBe(false);
    expect(WEIGHT.secondary).toContain("bg-transparent");
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
    // `w-fit` is in this list because of B-72 (#230): before it, Continue stretched the flow's
    // column while the escape one line below it fit its words, so "differs only in fill" was a
    // sentence this file asserted and the screen contradicted.
    for (const shared of ["rounded-sm", "px-4", "py-2", "text-base", "tap", "w-fit"]) {
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
    // Read from `@layer base` rather than from the first `:focus-visible` in the file: since
    // #188 the stylesheet holds two focus rules, and the other one is a *line*, not a ring.
    expect(focusRing(), "focus is drawn outside the control").toMatch(/outline-offset:\s*\d/);
    expect(focusRing()).not.toMatch(/outline-offset:\s*-/);
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
 * One focus treatment per species of control. `SPEC.md` §7.4; #179 variant A, #188.
 *
 * **The line owns focus on a text control; the ring owns it everywhere else.** A text field is a
 * line at rest, so it is a line when you reach it: the underline thickens 1px → 2px and recolours
 * to ink, in place, and the rectangle steps aside. Anything with no line to thicken — a button, a
 * swatch, a segment — keeps the ring, because there is nothing there to thicken.
 *
 * **What these guard is the part no rendering test can see.** `:focus-visible` is precisely what
 * jsdom does not model: it parses the selector and never matches it, so a suite that mounts a
 * field and fires `focus` sees the resting styles and goes green whatever the stylesheet says.
 * The pixels are checked in a browser by hand (see the ticket); what a test can hold is that the
 * *rules* are still written down, and — the load-bearing half — that the three numbers the
 * no-reflow promise is made of still agree with each other.
 *
 * **The blocks are asserted non-empty first.** Both readers fall back to `""` when their regex
 * finds nothing, and every `not.toMatch` below would then pass while measuring an empty string —
 * the same silent-green failure `readFileSync` exists to prevent one layer up.
 */
describe("the one focus treatment", () => {
  it("is reading two real rules, not two empty strings", () => {
    expect(focusLine(), "@utility focus-line went missing from theme.css").toContain(
      ":focus-visible",
    );
    expect(focusRing(), "the base ring went missing from theme.css").toContain(":focus-visible");
  });

  it("is spelled twice in the whole tool: once as a line, once as a ring", () => {
    expect([...theme.matchAll(/@utility focus-line\b/g)]).toHaveLength(1);
    expect([...theme.matchAll(/@layer base\b/g)]).toHaveLength(1);
  });

  /**
   * B-36's root, guarded. The recolour used to say `focus:` and the ring `:focus-visible`, so the
   * two disagreed about what focus *is* — one fired on a mouse press and the other did not, and
   * every input drew both at once. There is one question now and it is asked in one place, which
   * is why no component may spell it for itself.
   */
  it("asks one question about focus, and no screen asks its own", () => {
    for (const block of [focusLine(), focusRing()]) {
      expect(block, "the keyboard's question, not any focus at all").not.toMatch(/:focus(?![-\w])/);
      expect(block).not.toMatch(/:focus-within\b/);
    }
    const offenders = everySource().flatMap(([path, text]) =>
      classLists(text)
        .filter((list) => /\bfocus(?:-within)?:/.test(list))
        .map(() => path),
    );
    expect(offenders, "`focus:` and `focus-within:` are the two spellings #188 removed").toEqual(
      [],
    );
  });

  describe("on a text control, where the line is the whole signal", () => {
    it("thickens and recolours the line the field already draws", () => {
      expect(focusLine()).toMatch(/border-bottom-width:\s*2px/);
      expect(focusLine()).toMatch(/border-bottom-color:\s*var\(--color-ink\)/);
    });

    /**
     * B-58: the ring was a rectangle drawn around a control that has no rectangle. It is turned
     * **transparent** rather than off, because `outline-style: none` would leave a text field
     * with no indicator at all in Windows High Contrast — where a 1px and a 2px border are both
     * `CanvasText` and the thickening is nearly the whole signal. Forced colours repaint a
     * transparent outline and cannot repaint an absent one.
     */
    it("draws no rectangle, and does not remove the one forced colours need", () => {
      expect(focusLine(), "a line at rest is a line when you reach it").not.toMatch(
        /outline:\s*\d/,
      );
      expect(focusLine()).not.toMatch(/outline-style/);
      expect(focusLine()).toMatch(/outline-color:\s*transparent/);
    });

    /**
     * **The no-reflow promise, as arithmetic rather than as prose.** The three numbers have to
     * agree: the resting padding `LINE_CLASS` asks for, the width the line thickens to, and the
     * pixel taken back out underneath. Written as `calc()` on the same token the utility uses, so
     * moving `py-2` to any other rung goes red here rather than shifting every hint and button
     * below a focused field by a pixel — which `theme.css` argues is how a focus style gets
     * turned off.
     *
     * **B-29 (#227) moved the line's height and this still holds.** The single-line field was
     * 45px, over §7.6's floor, so the padding was the only thing keeping its box still; at
     * `TYPE.answer` it is 41px and `tap` holds it at 44, so the box cannot grow either way. What
     * the pixel buys now is that the typed characters do not move inside it — 44 − 8 − 8 − 1 and
     * 44 − 8 − 7 − 2 are the same 27px of content box — and the four-row address `<textarea>`
     * still clears the floor, so there it is the box, exactly as before. Re-measured in Chromium
     * on the name step: box 44px both, `Continue` at y 329.5 both, document 900 both.
     */
    it("takes the extra pixel out of the padding, so nothing below the line moves", () => {
      const rung = /\bpy-(\d+)\b/.exec(LINE_CLASS)?.[1];
      expect(rung, "the line's resting padding is what the thickening spends").toBeDefined();
      expect(LINE_CLASS, "and the floor is what the box now rests on").toMatch(/\btap\b/);
      const focused = Number(/border-bottom-width:\s*(\d+)px/.exec(focusLine())?.[1]);
      // `border-b` with no width is Tailwind's 1px, which is what the line rests at.
      expect(LINE_CLASS).toMatch(/\bborder-b\b(?!-)/);
      expect(focusLine()).toContain(
        `padding-bottom: calc(var(--spacing) * ${rung} - ${focused - 1}px)`,
      );
    });

    it("moves nothing else at all", () => {
      expect(propertiesIn(focusLine()).sort()).toEqual([
        "border-bottom-color",
        "border-bottom-width",
        "outline-color",
        "padding-bottom",
      ]);
    });

    /**
     * **It sits on the line rather than on the component**, which is what lets one treatment
     * reach both things standing on that line: the plain field, which draws the line itself, and
     * #197's prefixed row, where a `<span>` draws it around a scheme *and* a box. Hence the two
     * selectors — the line either took focus or contains what took it.
     */
    it("belongs to the line, so both things standing on one get it once", () => {
      expect(LINE_CLASS).toContain("focus-line");
      for (const recipe of [INPUT_CLASS, TEXTAREA_CLASS, URL_ROW_CLASS]) {
        expect(recipe).toContain("focus-line");
      }
      expect(focusLine(), "the line itself took focus").toMatch(/&:focus-visible/);
      expect(focusLine(), "or the box standing on it did").toMatch(/&:has\(:focus-visible\)/);
      expect(focusLine(), "and that box's own ring is the one turned transparent").toMatch(
        /& :focus-visible/,
      );
      const offenders = others("./TextInput.tsx")
        .filter(([, text]) => text.includes("focus-line"))
        .map(([path]) => path);
      expect(offenders, "one line, one treatment, one place it is written").toEqual([]);
    });
  });

  describe("on everything else, where there is no line to thicken", () => {
    it("is an outline, so reaching a control never moves the page", () => {
      expect(focusRing()).toMatch(/outline:\s*\d+px solid var\(--color-notice\)/);
      expect(focusRing(), "a ring utility is a shadow, and a shadow is not paper").not.toMatch(
        /box-shadow/,
      );
      expect(propertiesIn(focusRing()).sort()).toEqual(["outline", "outline-offset"]);
    });

    /**
     * **The ring is drawn on the thing you can see.** A segmented control puts its radio in
     * `sr-only` (§7.10's hours step), so the element matching `:focus-visible` is a clipped 1px
     * box and the ring around it is clipped away with it — the one control in the tool that had
     * no working focus treatment at all. Forwarding it to the label is the whole fix, and it
     * lives in the stylesheet so the ring stays spelled once. Scoped to `label` deliberately: an
     * `sr-only` control with no label around it (the two file pickers, driven by a `Button`
     * beside them) has no visible stand-in, and a `:has()` without it would ring whatever
     * ancestor happened to hold the input. `HoursQuestion.test.tsx` holds the markup half.
     */
    it("reaches a control that hides its own input inside a label", () => {
      expect(focusRing()).toMatch(/label:has\(>\s*\.sr-only:focus-visible\)/);
    });

    /**
     * SC 1.4.11 asks 3:1 of a focus indicator against what is beside it, and #192 had to buy the
     * `picked` mark a clearing of ground to get there. **Focus needs no such purchase, because it
     * is drawn outside the control**: at a positive offset the pixels it colours were ground a
     * moment ago and are `notice` now, so a brand colour is never adjacent to it and never under
     * it. The corpus assertion is what makes that load-bearing rather than decorative — laid on
     * the owner's colour this ring clears 3:1 on **none** of the twelve, from 1.04 to 1.66.
     */
    it("is measured against the ground, because it never touches the fill", () => {
      expect(focusRing(), "drawn outside the control").toMatch(/outline-offset:\s*\d/);
      expect(focusRing()).not.toMatch(/outline-offset:\s*-/);
      for (const backdrop of BACKDROPS) {
        expect(between("notice", backdrop), `on ${backdrop}`).toBeGreaterThanOrEqual(3);
      }
    });

    it("would fail on the colour itself, which is what the offset is buying", () => {
      const notice = token("notice");
      const legibleOnTheColour = BRAND_SWATCHES.filter((swatch) => {
        const hex = parseHex(swatch.hex);
        return hex !== null && contrastRatio(notice, hex) >= 3;
      });
      expect(
        legibleOnTheColour.length,
        "if this ever reaches twelve the offset is free to go negative — until then it is not",
      ).toBe(0);
    });
  });
});

/**
 * `prefers-reduced-motion` collapses **every** duration a screen change runs (`SPEC.md` §7.11).
 *
 * **The gap this exists to keep closed is the half nobody writes.** A view transition runs two
 * kinds of animation and the stylesheet only ever named one of them: the `old`/`new` fades are
 * ours, so they were in the reduced-motion block from the first day; the **group** animation is
 * the browser's own, is put on every named group whether we ask for it or not, and ran the full
 * 250 ms under `reduce` because nothing here mentioned it. §7.11 says the reduced form
 * "shortens durations toward instant"; measured in Chromium before this rule existed, a flow
 * screen change took **291 ms under `reduce` against 354 ms at full motion** — 18 % off, not
 * instant.
 *
 * **So the rule is written against the names, not against a list typed here.** Every
 * `view-transition-name` the builder declares gets a group; `root` gets one whether anything
 * asks or not. Reading the names out of the sources is what makes a third name — the day
 * someone scopes a second transition — fail this rather than slip past it, which is exactly how
 * `flow-content`'s own group slipped past for the life of the language.
 */
describe("the motion language collapses under reduced motion (§7.11)", () => {
  /** The one `@media (prefers-reduced-motion: reduce)` block, and proof it was found. */
  const reducedBlock = (): string => {
    const at = theme.indexOf("@media (prefers-reduced-motion: reduce)");
    expect(at, "theme.css has no prefers-reduced-motion block at all").toBeGreaterThan(-1);
    const open = theme.indexOf("{", at);
    let depth = 0;
    let end = open;
    for (let i = open; i < theme.length; i += 1) {
      if (theme[i] === "{") depth += 1;
      if (theme[i] === "}") {
        depth -= 1;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    const body = theme.slice(open + 1, end);
    expect(body.trim(), "the reduced-motion block is empty").not.toBe("");
    return body;
  };

  /** `root`, plus every name the builder puts on an element itself. */
  const groupNames = (): string[] => {
    const declared = everySource().flatMap(([, text]) =>
      [...text.matchAll(/view-transition-name:\s*([a-zA-Z][\w-]*)/g)].map(([, name]) => name ?? ""),
    );
    // Non-vacuity: the builder scopes at least one transition of its own, and if this read ever
    // comes back with only `root` in it the loop below would assert almost nothing.
    expect(declared, "no view-transition-name found in the builder's sources").not.toEqual([]);
    return ["root", ...new Set(declared)];
  };

  it("shortens every group the browser will animate, not only the fades we wrote", () => {
    const block = reducedBlock();
    for (const name of groupNames()) {
      expect(
        block,
        `::view-transition-group(${name}) still runs the browser's own 250ms under reduce`,
      ).toContain(`::view-transition-group(${name})`);
    }
  });

  it("shortens the two fades it always did, and the arrival fade with them", () => {
    const block = reducedBlock();
    for (const selector of [
      ".enter-fade",
      "::view-transition-old(flow-content)",
      "::view-transition-new(flow-content)",
    ]) {
      expect(block, `${selector} is no longer collapsed under reduce`).toContain(selector);
    }
    expect(block, "the block sets no duration").toMatch(/animation-duration:\s*1ms/);
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

/**
 * The stray sweep. `SPEC.md` §7.4, §6, §1; design change 12 (#199), findings B-12, B-22, B-27,
 * B-37, B-38, B-39, B-40, B-45, B-47, B-66, B-69.
 *
 * Eleven findings, none of them individually worth a ticket, which is exactly why they were still
 * there: a scrim in a colour that belongs to no ramp, the one shadow in a design whose stylesheet
 * says nothing is elevated, two overlays 8× apart on radius, a tap constant restated as a magic
 * number, four bracket values nobody had explained, a row whose padding equalled the gap inside
 * it, a label wrapping away from the buttons it labels, an off-ladder margin built by stacking two
 * others, and a component with a rule in it and **zero call sites**.
 *
 * **What these guard is a floor, not a look.** Each of these is one plausible-looking class away
 * from coming back — `bg-black/40` reads as a scrim to anyone, `shadow-lg` reads as a dropdown,
 * `rounded-2xl` reads as a sheet — so the durable half of this ticket is a rule that names the
 * thing rather than counting how many of it there are. #190's lesson: a test that asserts *how
 * many* solid fills exist stays green when the one fill wanders onto the wrong element. So every
 * rule below either names the site (`SHEET_SURFACE`, `MENU_SURFACE`, `REORDER_CLASS`) or lists
 * the offenders by path, and the bracket rule asserts the whole **set** of arbitrary values in the
 * builder against a written one, so a new one arrives in the failure message by name.
 */
describe("the stray sweep (design change 12)", () => {
  /**
   * A class list's tokens, with any variant prefixes removed — `wide:`, and the awkward ones:
   * `data-[open=true]:`, `wide:group-data-[open=true]:`, `[&_code]:`.
   *
   * A variant ends at a `:` written **outside** brackets, which is why this counts depth rather
   * than reaching for a pattern. Inside brackets a colon is part of the value (`[&:not([hidden])]`,
   * `[overflow-wrap:anywhere]`) and splitting on it would invent utilities that are not there.
   * What survives is the utility itself, which is what B-39 is about: an arbitrary *variant* is a
   * selector with no utility equivalent, an arbitrary *value* is a number nobody wrote down.
   */
  const utilities = (list: string): string[] =>
    list
      .split(/\s+/)
      .filter((token) => token !== "")
      .map((token) => {
        let depth = 0;
        let start = 0;
        for (const [at, ch] of [...token].entries()) {
          if (ch === "[") depth += 1;
          else if (ch === "]") depth -= 1;
          else if (ch === ":" && depth === 0) start = at + 1;
        }
        return token.slice(start);
      });

  /** Every utility written anywhere in the builder, with the file that writes it. */
  const everyUtility = (): [string, string][] =>
    everySource().flatMap(([path, text]) =>
      classLists(text).flatMap((list) => utilities(list).map((u): [string, string] => [path, u])),
    );

  describe("the scrim, which was the one colour outside the ramp (B-27, B-69)", () => {
    it("veils the list in the tool's own ink", () => {
      // Named on the element rather than counted: the sheet has exactly one full-bleed wash and
      // this is it. `bg-ink/40` and not `bg-ink` — a 40% wash is a scrim, not §4's one fill,
      // which is why *one solid fill* above excludes the slashed form on purpose.
      const sheet = sources["../download/DownloadSheet.tsx"] ?? "";
      expect(sheet, "reading the real component, not a missing glob key").toContain("data-scrim");
      const scrim = /<div className="([^"]*)" data-scrim(?=[\s>/])/.exec(sheet);
      expect(scrim?.[1], "the sheet must still draw a scrim").toBeDefined();
      expect(scrim?.[1]).toContain("bg-ink/40");
    });

    it("leaves no colour in the builder that is not a paper token", () => {
      // `theme.css` declares six colours plus the three the progress bar and the notice spend,
      // and pure black is not among them: `--color-ink` is a warm `#1f1b16`. The finding is not
      // pedantry — B-69 read the temperature break off a real screenshot, because the veil is
      // always immediately beside an unveiled warm surface.
      const offenders = everyUtility()
        .filter(([, u]) =>
          /^(?:bg|text|border|divide|outline|accent|ring|from|via|to)-(?:black|white)(?:\/|$)/.test(
            u,
          ),
        )
        .map(([path, u]) => `${path}: ${u}`);
      expect(offenders).toEqual([]);
    });
  });

  describe("nothing is elevated (B-37)", () => {
    it("spends no shadow anywhere, which is what `theme.css` already says out loud", () => {
      const offenders = everyUtility()
        .filter(([, u]) => /^shadow(?:-|$)/.test(u))
        .map(([path, u]) => `${path}: ${u}`);
      expect(offenders, "paper has no elevation ladder to use sparingly").toEqual([]);
    });

    it("separates the menu panel the three ways §1 allows instead", () => {
      // The site that had the shadow, named — so this cannot go green by the panel disappearing.
      expect(MENU_SURFACE, "a background shift off the ground").toContain("bg-surface");
      expect(MENU_SURFACE, "a hairline").toContain("border border-rule");
      expect(MENU_SURFACE, "and a stacking order").toContain("z-10");
    });
  });

  describe("one radius across the two overlays (B-38)", () => {
    /** The radius *steps* a class list names, with the side prefix (`-t`, `-b`, `-s`) removed. */
    const radiusSteps = (classes: string): string[] => [
      ...new Set(
        [
          ...classes.matchAll(
            /rounded(?:-(?:t|b|s|e|tl|tr|bl|br|ss|se|es|ee))?-([a-z0-9]+)(?=\s|$)/g,
          ),
        ].map((match) => match[1] ?? ""),
      ),
    ];

    it("names the same step on both of them", () => {
      // Identifying, not counting: each overlay has to *say* `sm`. A rule that only checked the
      // two agreed would go green if both drifted to `rounded-2xl` together.
      expect(radiusSteps(SHEET_SURFACE), "the download sheet").toEqual(["sm"]);
      expect(radiusSteps(MENU_SURFACE), "the list's menu panel").toEqual(["sm"]);
    });

    it("is the same step the rest of the tool already used", () => {
      // `rounded-2xl` was 1rem — 8× the radius of everything it sat above, and the only step in
      // the builder that was neither `rounded-sm` nor a circle. So the whole tool is asserted,
      // rather than the two overlays in isolation: `sm` for a box, `full` for a circle, nothing
      // else, and a third step arrives here by name with the file that introduced it.
      const steps = [
        ...new Set(everySource().flatMap(([, text]) => classLists(text).flatMap(radiusSteps))),
      ].sort();
      expect(steps).toEqual(["full", "sm"]);
    });
  });

  describe("the tap floor, held once on both axes (B-22)", () => {
    /** One `@utility` block's declarations, by property. */
    const utilityBlock = (name: string): Record<string, string> => {
      const block = new RegExp(`@utility ${name} \\{([^{}]*)\\}`).exec(theme)?.[1] ?? "";
      return Object.fromEntries(
        [...block.matchAll(/([a-z-]+):\s*([^;]+);/g)].map((m) => [m[1] ?? "", (m[2] ?? "").trim()]),
      );
    };

    it("gives `tap-square` the same number `tap` holds, rather than a second copy of it", () => {
      const tap = utilityBlock("tap");
      const square = utilityBlock("tap-square");
      expect(tap["min-height"], "reading the real stylesheet, not an empty string").toBe("2.75rem");
      expect(square["min-height"]).toBe(tap["min-height"]);
      expect(square["min-width"]).toBe(tap["min-height"]);
      // Both axes and nothing else — a width floor is the whole of what this adds.
      expect(Object.keys(square).sort()).toEqual(["min-height", "min-width"]);
    });

    it("leaves 2.75rem written nowhere but the stylesheet", () => {
      // `min-w-11` *is* 2.75rem, restated beside the utility that exists to hold it once.
      const offenders = everyUtility()
        .filter(([, u]) => /^min-w-11$/.test(u))
        .map(([path]) => path);
      expect(offenders).toEqual([]);
      const spelled = everySource()
        .filter(([, text]) => text.includes("2.75rem"))
        .map(([path]) => path);
      expect(spelled, "the number lives in `theme.css` and in prose about it").toEqual([]);
    });

    it("is what the reorder arrows carry, since they are the control that needed it", () => {
      expect(REORDER_CLASS).toContain("tap-square");
      // The one-axis floor would be a silent regression here: the box would still be 44px tall.
      expect(REORDER_CLASS).not.toMatch(/(?:^|\s)tap(?:\s|$)/);
    });
  });

  describe("no arbitrary value without a written reason (B-39)", () => {
    /**
     * **The whole set, asserted against a written one.** Counting them would go green the day one
     * is swapped for another; naming them means a new arbitrary value arrives in the failure
     * message with its own spelling, and whoever added it has to come here and say why.
     *
     * Arbitrary **variants** are deliberately out of scope, which is B-39's own line: `data-[…]:`
     * and `[&_code]:` are selectors with no utility equivalent, not numbers nobody wrote down.
     * `utilities()` strips them before this rule sees a token.
     */
    const REASONED = [
      // The drawer beside the question has no height to inherit and states one. `Preview.tsx`.
      "h-[min(80dvh,46rem)]",
      // The sheet bottom-anchored, leaving a strip of veiled list. `DownloadSheet.tsx`.
      "max-h-[92dvh]",
      // The same sheet centred inside `wide:p-8`, which spends 64px first. `DownloadSheet.tsx`.
      "max-h-[88dvh]",
      // The menu panel's cap, clamped to a viewport narrower than we photograph. `List.tsx`.
      "max-w-[min(20rem,calc(100vw-2.5rem))]",
      // The panel 4px under the button that opens it — off the form ladder on purpose. `List.tsx`.
      "top-[calc(100%+0.25rem)]",
      // Plumbing: naming the property to transition has no utility equivalent. `ProgressBar.tsx`.
      "transition-[width]",
    ].sort();

    it("holds exactly the six the builder has written a reason for", () => {
      const found = [
        ...new Set(
          everyUtility()
            .filter(([, u]) => u.includes("-["))
            .map(([, u]) => u),
        ),
      ].sort();
      expect(found).toEqual(REASONED);
    });

    it("has stopped hand-writing the two measures that had tokens available", () => {
      // `max-w-[34rem]` was 544px beside a list already set at `max-w-lg`'s 512 — two hands
      // agreeing by hand, which is the drift `--breakpoint-wide` exists to name.
      expect(SHEET_SURFACE, "the sheet takes the list's own measure").toContain("max-w-lg");
      // And 27.5rem is a token now, so the frame's width is written once.
      expect(theme).toMatch(/--container-page:\s*27\.5rem;/);
      const spelled = everySource()
        .filter(([, text]) => text.includes("27.5rem"))
        .map(([path]) => path);
      expect(spelled).toEqual([]);
    });
  });

  describe("the aside surface, which had four copies and no callers (B-47)", () => {
    it("is written in the one component and nowhere else", () => {
      // `border-s-2` is the distinguishing half of the recipe: a rule on the leading edge is what
      // makes this an aside rather than a card, and nothing else in the tool draws one.
      const offenders = others("./Panel.tsx")
        .filter(([, text]) => text.includes("border-s-2"))
        .map(([path]) => path);
      expect(offenders).toEqual([]);
    });

    it("is actually called, which is the half that was missing", () => {
      // The defect was not four copies; it was four copies *and* a component with no call sites,
      // so the rule it held reached nothing — #183's finding, second instance. A count is the
      // right instrument here precisely because "reaches something" is what is being asserted.
      const callers = everySource()
        .filter(([path]) => !path.endsWith("./Panel.tsx") && !path.endsWith("/Panel.tsx"))
        .filter(([, text]) => /<Panel\b/.test(text))
        .map(([path]) => path);
      expect(
        callers.length,
        "the logo step, the preset step and the list menu's two",
      ).toBeGreaterThanOrEqual(3);
    });

    it("keeps the notice colour on the edge, where §7.9's meaning lives", () => {
      expect(PANEL_CLASS).toContain("border-s-2");
      expect(PANEL_EDGE.notice).toBe("border-notice");
      expect(PANEL_EDGE.quiet).toBe("border-rule");
      expect(PANEL_CLASS, "an aside, not a card").not.toMatch(/\bbg-|\brounded|\bshadow/);
    });
  });

  describe("the off-ladder margin (B-45)", () => {
    it("has no `mt-5` left to stack a second margin on", () => {
      // 28px, built by putting `mt-5` on a wrapper whose first child was `mt-2`, in a sheet whose
      // every other step is 8, 12, 16 or 32. The step is not on any ladder in the tool.
      const offenders = everyUtility()
        .filter(([, u]) => u === "mt-5")
        .map(([path]) => path);
      expect(offenders).toEqual([]);
    });
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
 * **`disabled:no-underline` joined it with B-21's ink** (#234). Stepping the text back to
 * `ink-quiet` is the move a control makes when it is *not* already there, and once `quiet` rests
 * at that ink it had nothing left to step back to — so the one mark it has left, the underline
 * that makes it pressable, is what it gives up. The vocabulary still says the same sentence in
 * each weight's own instrument: the fill leaves, the text quietens, the offer to press goes.
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
      "disabled:no-underline",
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

/**
 * One size per role, and one recipe per heading level. `SPEC.md` §7.4, §2; design change 11
 * (#198), findings B-30, B-31, B-32, B-33.
 *
 * **These guards say which size each role has, not how many sizes exist.** That distinction is
 * #190's, learned one ticket earlier: a test that asserted the *number* of solid fills stayed
 * green the day the one fill wandered onto the wrong element, because the count was still one.
 * "One size per role" is exactly the rule where that bites — a screen that swaps its hint's size
 * for its label's has the same number of sizes on it as before and reads wrongly. So every rule
 * below names an element and asserts what *that* element is set at.
 *
 * The counting assertions that do appear are deliberately the other kind: each one exists to stop
 * an identity rule passing by finding nothing, which is the failure mode of every guard that
 * sweeps the sources for a shape.
 */
describe("one size per role (design change 11)", () => {
  /** The recipe each HTML heading level takes. A level with no entry is a heading with no home. */
  const HEADING_RECIPE: Readonly<Record<string, string>> = {
    1: "HEADING.page",
    2: "HEADING.screen",
    3: "HEADING.section",
  };

  /** Arrow functions put a `>` in the props, exactly as they do in the escape's tags above. */
  const tagsMatching = (text: string, pattern: RegExp): string[] =>
    [...text.replaceAll("=>", "==").matchAll(pattern)].map(([tag]) => tag);

  const headingTags = (): { path: string; level: string; tag: string }[] =>
    everySource().flatMap(([path, text]) =>
      tagsMatching(text, /<h([1-6])\b[^>]*>/g).map((tag) => ({ path, level: tag[2] ?? "", tag })),
    );

  /** Any size, leading or tracking utility written by hand rather than taken from a recipe. */
  const OWN_TYPE = /\b(text-(xs|sm|base|lg|[2-9]?xl)|leading-[a-z]+|tracking-[a-z]+)\b/;

  it("gives every heading in the builder the recipe for its level", () => {
    const offenders = headingTags()
      .filter(({ level, tag }) => {
        const recipe = HEADING_RECIPE[level];
        return recipe === undefined || !tag.includes(recipe);
      })
      .map(({ path, tag }) => `${path}: ${tag}`);
    expect(
      offenders,
      "two `<h3>` recipes eight pixels apart is the defect this closes (B-32)",
    ).toEqual([]);
  });

  it("finds a heading at all three levels, so the rule above cannot pass by finding none", () => {
    const levels = new Set(headingTags().map(({ level }) => level));
    expect([...levels].sort()).toEqual(["1", "2", "3"]);
  });

  it("lets no heading set a size, a leading or a tracking of its own beside the recipe", () => {
    const offenders = headingTags()
      .filter(({ tag, level }) => OWN_TYPE.test(tag.replace(HEADING_RECIPE[level] ?? "", "")))
      .map(({ path, tag }) => `${path}: ${tag}`);
    expect(offenders).toEqual([]);
  });

  it("steps down exactly once per level, and never sideways", () => {
    const px = [HEADING.page.px, HEADING.screen.px, HEADING.section.px];
    expect(px).toEqual([...px].sort((a, b) => b - a));
    expect(new Set(px).size, "two levels at one size is two levels with one voice").toBe(px.length);
    const classes = Object.values(HEADING).map((recipe) => recipe.className);
    expect(new Set(classes).size).toBe(classes.length);
  });

  /**
   * Every recipe reaches a screen.
   *
   * #195 retired `1.125rem` from the exported page rather than rehousing it — a step no rule sets
   * is bytes for nothing. The builder pays in generated utilities rather than in exported bytes,
   * but the reason survives the change of currency: an unused step is one more option offered to
   * the next person choosing, with nothing on screen to compare it against.
   */
  it("keeps no step the builder does not set", () => {
    const named = [
      ...Object.keys(HEADING).map((role) => `HEADING.${role}`),
      ...Object.keys(TYPE).map((role) => `TYPE.${role}`),
    ];
    const elsewhere = everySource().filter(([path]) => !path.endsWith("ui/type.ts"));
    const unused = named.filter((reference) =>
      elsewhere.every(([, text]) => !text.includes(reference)),
    );
    expect(unused, "a step no role sets is a step with nothing to compare it against").toEqual([]);
  });

  /**
   * The roles that are not headings, named by the hook the markup already carries.
   *
   * §7.4: the tool's markup carries `data-*` hooks where a test needs to name a thing it cannot
   * reach by role. These are those hooks — so each assertion is *this element is set at this
   * size* rather than *the builder contains this many sizes*.
   */
  const ROLE_HOOKS: readonly (readonly [string, string])[] = [
    // One quiet line: above a title, under a label, under the option it belongs to.
    ["data-question-preamble", "TYPE.quietLine"],
    ["data-question-hint", "TYPE.quietLine"],
    ["data-hint", "TYPE.quietLine"],
    ["data-arrival", "TYPE.quietLine"],
    ["data-carried", "TYPE.quietLine"],
    ["data-row-label", "TYPE.quietLine"],
    // The tool saying something will not work (§7.9).
    ["data-message", "TYPE.notice"],
    ["data-mark", "TYPE.notice"],
    ["data-warning", "TYPE.notice"],
  ];

  const hookTags = (hook: string): [string, string][] =>
    everySource().flatMap(([path, text]) =>
      tagsMatching(text, new RegExp(`<[a-z]+\\b[^>]*\\b${hook}\\b[^>]*>`, "g")).map(
        (tag): [string, string] => [path, tag],
      ),
    );

  it.each(ROLE_HOOKS)("sets every %s at %s", (hook, recipe) => {
    const tags = hookTags(hook);
    expect(
      tags.length,
      `no element carries ${hook}, so this rule is measuring nothing`,
    ).toBeGreaterThan(0);
    const offenders = tags.filter(([, tag]) => !tag.includes(recipe)).map(([path]) => path);
    expect(offenders).toEqual([]);
  });

  /**
   * The two the change list called one meaning at three treatments are the same step.
   *
   * A notice is not a louder hint; it is a hint about something broken. §2 ranks colour above
   * size, so the colour changes and the size does not — which is what "the colour is already the
   * emphasis" means once it is written down as a number.
   */
  it("sets a notice at the same size as a hint, because the colour is the emphasis", () => {
    expect(TYPE.notice.px).toBe(TYPE.quietLine.px);
    expect(TYPE.notice.className).toContain("text-notice");
    expect(TYPE.quietLine.className).toContain("text-ink-quiet");
    expect(TYPE.notice.className, "a weight would say it twice").not.toMatch(/\bfont-\w+\b/);
  });

  it("keeps both quiet roles below the body size the labels beside them take", () => {
    // 16px, from `Field`'s label and `WEIGHT`'s own `text-base`. A hint the same size as the
    // label above it is separated from it by weight alone — one instrument doing two jobs.
    expect(WEIGHT.primary).toContain("text-base");
    expect(TYPE.quietLine.px).toBeLessThan(16);
  });

  /**
   * A hand-rolled copy of either recipe is how three treatments for one meaning happened.
   *
   * Written in the shape the input, the button and the row rules above are: the string lives in
   * one file, and every other file has to ask for it by name.
   */
  it.each(["text-sm text-ink-quiet", "text-sm text-notice"])(
    "is the only place `%s` is written",
    (recipe) => {
      const offenders = others("./type.ts")
        .filter(([, text]) => text.includes(recipe))
        .map(([path]) => path);
      expect(offenders).toEqual([]);
    },
  );

  /**
   * The progress bar sets its size once, on itself (B-31).
   *
   * It used to name the topic you are on at 14px in its header and at 16px in the drawer that
   * opens directly beneath it. Setting both to 14px would have closed the instance and left the
   * shape — two declarations that have to agree. This asserts *which* element owns the size, so a
   * second one appearing anywhere inside the bar fails rather than merely disagreeing.
   * `ProgressBar.test.tsx` measures the same claim on the rendered bar.
   */
  it("lets the progress bar set a type size exactly once, on the bar itself", () => {
    const bar = everySource().find(([path]) => path.endsWith("flow/ProgressBar.tsx"))?.[1] ?? "";
    expect(bar, "ProgressBar.tsx was not read").not.toBe("");
    const sized = tagsMatching(bar, /<[a-z]+\b[^>]*>/g).filter(
      (tag) => OWN_TYPE.test(tag) || tag.includes("TYPE.bar"),
    );
    expect(sized.map((tag) => tag.includes("data-progress-bar"))).toEqual([true]);
  });

  /**
   * Two weights, and this says which two (§2: "at most two font weights in the UI").
   *
   * `font-semibold` was the only occurrence in the audited scope and it sat on one of the
   * notice's three treatments — a third weight spent saying what `--color-notice` was already
   * saying. With the default 400 and `<strong>`'s browser bold, the sheet and the list carried
   * four.
   *
   * **`<strong>` is deliberately not counted here.** It is semantic emphasis inside a sentence
   * rather than a weight chosen from a palette, and taking it out would remove the emphasis
   * rather than restyle it — a copy decision, and one #180 does not ask for. What this holds is
   * the set of weights the tool *chooses*.
   */
  it("chooses exactly one weight above the default, everywhere in the builder", () => {
    const weights = new Set(
      everySource().flatMap(([, text]) =>
        [...text.matchAll(/\bfont-(\w+)\b/g)].map(([, weight]) => weight ?? ""),
      ),
    );
    for (const face of ["sans", "serif", "mono"]) weights.delete(face);
    expect([...weights]).toEqual(["medium"]);
  });
});

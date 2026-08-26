import { describe, expect, it } from "vitest";
import { render } from "./render.js";
import { SHAPES, shapeRules } from "./chrome.js";
import { contrastRatio, parseHex } from "./color.js";
import { POPULATED as full } from "./fixtures.js";
import type { Project, Shape, Style } from "./project.js";

/**
 * The page's two ladders — the spacing rhythm and the type scale — and the promise that no rule
 * steps off them.
 *
 * `render.test.ts` and `chrome.test.ts` already snapshot the stylesheet, and a snapshot is the
 * wrong instrument for this job twice over: it pins the *text* of a rule rather than the
 * geometry the visitor sees, so `gap:var(--lp-space-7)` reads as a change where `gap:1.75rem`
 * did not, and it says nothing at all about a value that has not been written yet. What is
 * asserted here is the resolved page — every `var()` substituted, the way a browser sees it —
 * so that tokenising a length is provably a no-op, and so that the next number added to this
 * stylesheet has to be a rung or has to come and argue with this file.
 */

/** The contents of the export's one `<style>` block. */
function css(project: Project): string {
  return /<style>([\s\S]*?)<\/style>/.exec(render(project))?.[1] ?? "";
}

function shaped(shape: Shape): Project {
  return { ...full, style: { ...full.style, shape } as Style };
}

/** The `:root` declarations, as a map from custom property to its written value. */
function declaredTokens(project: Project): Map<string, string> {
  const block = /:root\{([^}]*)\}/.exec(css(project))?.[1] ?? "";
  return new Map(
    block
      .split(";")
      .filter((declaration) => declaration.startsWith("--"))
      .map((declaration) => {
        const colon = declaration.indexOf(":");
        return [declaration.slice(0, colon), declaration.slice(colon + 1)] as const;
      }),
  );
}

/** Everything that is not the token block: the rules the shapes and the base contribute. */
function ruleText(project: Project): string {
  return css(project).replace(/:root\{[^}]*\}\n?/, "");
}

/**
 * One value with every `var()` expanded, repeatedly, the way the cascade resolves it.
 *
 * `--lp-gutter` points at a rung rather than at a length, so one pass is not enough; the loop
 * is bounded so a token that ever pointed at itself fails the test instead of hanging it.
 */
function resolve(value: string, tokens: Map<string, string>): string {
  let out = value;
  for (let pass = 0; pass < 10 && out.includes("var("); pass++) {
    out = out.replace(/var\((--[a-z0-9-]+)\)/g, (whole, name: string) => tokens.get(name) ?? whole);
  }
  return out;
}

/**
 * The page as a browser computes it: selector → property → resolved value, with a later rule
 * beating an earlier one so a shape's delta lands on top of the base exactly as it does live.
 *
 * Every selector in this stylesheet has the same specificity as its own repeats, so "last wins"
 * is the whole cascade there is to model — which is itself a property of the design and not a
 * simplification: `chrome.ts` emits at most one delta, and a delta only ever restates a base
 * selector.
 */
function resolvedPage(project: Project): Map<string, Map<string, string>> {
  const tokens = declaredTokens(project);
  const page = new Map<string, Map<string, string>>();

  for (const [, selector, body] of ruleText(project).matchAll(/([^{}\n]+)\{([^}]*)\}/g)) {
    const rule = page.get(selector!) ?? new Map<string, string>();
    for (const declaration of body!.split(";")) {
      const colon = declaration.indexOf(":");
      if (colon < 0) continue;
      rule.set(declaration.slice(0, colon), resolve(declaration.slice(colon + 1), tokens));
    }
    page.set(selector!, rule);
  }
  return page;
}

function declaration(project: Project, selector: string, property: string): string | undefined {
  return resolvedPage(project).get(selector)?.get(property);
}

// ---------------------------------------------------------------------------
// The ladder itself
// ---------------------------------------------------------------------------

describe("the spacing ladder (§1)", () => {
  const tokens = declaredTokens(full);
  const rungs = [...tokens].filter(([name]) => name.startsWith("--lp-space-"));

  /**
   * §1's base unit, restated as arithmetic rather than as a comment. A rung is named for its
   * own multiple, so `--lp-space-7` is seven units and there is no second place to look up what
   * 1.75rem was supposed to mean.
   */
  it("names every rung for its own multiple of the 0.25rem unit", () => {
    expect(rungs.length).toBeGreaterThan(0);
    for (const [name, value] of rungs) {
      const multiple = Number(name.slice("--lp-space-".length));
      expect(value).toBe(`${multiple * 0.25}rem`);
    }
  });

  it("climbs, and never repeats a value", () => {
    const values = rungs.map(([, value]) => Number.parseFloat(value));
    expect(values).toEqual([...values].sort((a, b) => a - b));
    expect(new Set(values).size).toBe(values.length);
  });

  /**
   * **The rung set is closed.** Eight steps is the point: a ladder that holds every multiple
   * would answer no question a literal did not, and the missing numbers are the ones no rule
   * has needed. This fails when someone adds one, which is when the decision should be visible.
   */
  it("holds the eight steps the page uses and no more", () => {
    expect(rungs.map(([name]) => name)).toEqual([
      "--lp-space-1",
      "--lp-space-2",
      "--lp-space-3",
      "--lp-space-4",
      "--lp-space-5",
      "--lp-space-7",
      "--lp-space-10",
      "--lp-space-14",
    ]);
  });

  it("puts the gutter on the ladder rather than beside it", () => {
    expect(tokens.get("--lp-gutter")).toBe("var(--lp-space-5)");
    expect(resolve("var(--lp-gutter)", tokens)).toBe("1.25rem");
  });
});

describe("the type scale (§2)", () => {
  const steps = [...declaredTokens(full)].filter(([name]) => name.startsWith("--lp-text-"));

  it("holds four steps, each of which more than the page's body text can reach for", () => {
    expect(steps).toEqual([
      ["--lp-text-sm", "0.875rem"],
      ["--lp-text-base", "1rem"],
      ["--lp-text-lg", "1.375rem"],
      ["--lp-text-xl", "1.625rem"],
    ]);
  });

  /**
   * Every step is used. A scale carrying a size no rule sets is bytes on every exported page in
   * exchange for nothing (§6.5), which is what retired `1.125rem` when the hours mark stopped
   * being set larger than the text around it.
   */
  it("sets every step somewhere, and sets no size that is not a step", () => {
    const sizes = [...ruleText(full).matchAll(/font-size:([^;}]+)/g)].map(([, value]) => value!);
    const used = new Set(sizes);
    for (const [name] of steps) expect(used).toContain(`var(${name})`);
    for (const size of used) expect(steps.map(([name]) => `var(${name})`)).toContain(size);
  });
});

// ---------------------------------------------------------------------------
// No strays
// ---------------------------------------------------------------------------

/**
 * The lengths that are deliberately not rungs, with the reason each one is exempt. This list is
 * the whole of the exception, and adding to it is the decision the ladder exists to surface.
 */
const NOT_RHYTHM = new Map<string, string>([
  ["25rem", "§6.2's column cap — a bound on the page, not a step in its rhythm"],
  ["3rem", "the link button's tap floor"],
  ["2.75rem", "the social button's tap floor"],
  ["9rem", "§6.6's logo height cap — a bound on the owner's artwork"],
  ["1px", "hairlines, the visually-hidden clip and the underline's thickness"],
  ["2px", "the focus ring"],
  ["3px", "the focus ring's offset and ruledLeft's axis"],
  ["0.18em", "§6.9's underline offset, which tracks the type rather than the grid"],
  ["0.5rem", "floatingCard's outer curve, relative to --lp-radius rather than to the grid"],
]);

describe("no rule steps off the ladder", () => {
  const LENGTH = /(\d*\.?\d+)(rem|px|em)\b/g;

  it.each(SHAPES)("writes no length of its own in %s", (shape) => {
    const strays = [...ruleText(shaped(shape)).matchAll(LENGTH)]
      .map(([whole]) => whole)
      .filter((length) => !NOT_RHYTHM.has(length));
    expect(strays).toEqual([]);
  });

  /**
   * The other half of the same guarantee, and the one a reader of the rules cannot check:
   * `var(--lp-space-6)` is not a compile error and not a parse error — it resolves to nothing,
   * the declaration is dropped, and the page loses a gap silently.
   */
  it.each(SHAPES)("references no token it did not declare, in %s", (shape) => {
    const project = shaped(shape);
    const declared = declaredTokens(project);
    for (const [, name] of ruleText(project).matchAll(/var\((--lp-[a-z0-9-]+)\)/g)) {
      expect([...declared.keys()]).toContain(name);
    }
  });

  it.each(SHAPES)("keeps every exemption earning its place in %s", (shape) => {
    const used = new Set([...ruleText(shaped(shape)).matchAll(LENGTH)].map(([whole]) => whole));
    for (const length of used) expect(NOT_RHYTHM.has(length)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// The page a visitor sees, resolved
// ---------------------------------------------------------------------------

/**
 * **Every spacing value on the default page, after the tokens resolve.**
 *
 * This is the table that says naming the ladder moved nothing. Each entry was measured off the
 * stylesheet as it stood before the ladder existed, and only three of them were meant to change
 * — they carry the before-and-after in their comment. Everything else is the same geometry it
 * always was, now spelled with a name.
 */
const GEOMETRY: [string, string, string][] = [
  ["body", "padding", "2.5rem 1.25rem 3.5rem"],
  [".lp-page", "gap", "1.75rem"],
  [".lp-header", "gap", "0.75rem"],
  // Was 0.625rem, the off-grid value used four times. Up a rung, with the other three lists.
  [".lp-links", "gap", "0.75rem"],
  [".lp-link", "gap", "0.5rem"],
  [".lp-link", "padding", "0.75rem 1rem"],
  [".lp-link", "min-height", "3rem"],
  // Was 1rem 1.125rem. The horizontal padding was the page's only 18px; it is a rung now.
  [".lp-panel", "padding", "1rem 1.25rem"],
  [".lp-hours", "gap", "0.5rem 1rem"],
  // Was 0 0 0.625rem. The mark now sits at the hours grid's own row gap.
  [".lp-hours-mark", "margin", "0 0 0.5rem"],
  [".lp-note", "margin", "1rem 0 0"],
  [".lp-rows", "gap", "0.75rem"],
  // Was 0.625rem on the row, 0.625rem on the address and 0.375rem inside a named social link,
  // against 0.5rem inside a link button. One icon-to-text gap now, and it is the button's.
  [".lp-row", "gap", "0.5rem"],
  [".lp-address", "gap", "0.5rem"],
  [".lp-address .lp-icon", "margin-top", "0.25rem"],
  [".lp-social", "gap", "0.25rem"],
  [".lp-social-link", "width", "2.75rem"],
  [".lp-social-link", "height", "2.75rem"],
  [".lp-social-link--named", "gap", "0.5rem"],
  // Was 0 0.625rem.
  [".lp-social-link--named", "padding", "0 0.75rem"],
];

describe("the resting page, with the tokens resolved", () => {
  it.each(GEOMETRY)("%s { %s }", (selector, property, expected) => {
    expect(declaration(full, selector, property)).toBe(expected);
  });

  /** The type scale, same treatment: four sizes, resolved, on the page that uses them. */
  it.each([
    [".lp-name", "1.625rem"],
    [".lp-note", "0.875rem"],
    [".lp-social-link", "1.375rem"],
    [".lp-social-link--named", "1rem"],
    [".lp-social-name", "0.875rem"],
    ["body", "1rem"],
  ])("sets %s at %s", (selector, expected) => {
    expect(declaration(full, selector, "font-size")).toBe(expected);
  });
});

// ---------------------------------------------------------------------------
// The two things that were meant to move
// ---------------------------------------------------------------------------

/**
 * **The hours mark takes one instrument, and the instrument is colour.**
 *
 * §6.9 gave the hours panel a clock because a glyph can name a panel where §2.5 forbids the
 * word a heading would need — and it was then set both larger than the text and quieter than
 * it, which is a heading and a caption cancelling out. §2 ranks colour above size and §6 keeps
 * icons near their drawn size, so it keeps the colour and gives up the size: `--lp-ink-muted`
 * at the body size, which is exactly what every other icon on the page already is.
 */
describe("the hours mark (§6.9, §2, §6)", () => {
  it("is set at the size it is drawn at, like every other icon on the page", () => {
    expect(declaration(full, ".lp-hours-mark", "font-size")).toBeUndefined();
  });

  it("carries the same muted ink as the icons in the contact rows", () => {
    expect(declaration(full, ".lp-hours-mark", "color")).toBe(
      declaration(full, ".lp-row .lp-icon", "color"),
    );
  });
});

/**
 * **`floatingCard` gives the hairline the page's own gap back.**
 *
 * The shape is the one place the panel stops being a box, so the hairline becomes the only
 * thing dividing two sections — and the shape used to *tighten* the space around it at the same
 * moment, from 1.75rem to 1.25rem. §1 buys separation with space before it buys it with a
 * heavier line, so the gap is restored on both sides of the rule and no line got heavier.
 */
describe("floatingCard's hairline (§1)", () => {
  const card = shaped("floatingCard");

  it("keeps the page's gap rather than restating a tighter one", () => {
    expect(declaration(card, ".lp-page", "gap")).toBe(declaration(full, ".lp-page", "gap"));
    expect(shapeRules("floatingCard")).not.toContain("gap:");
  });

  it("sits the rule midway: the same gap above it as the padding below it", () => {
    expect(declaration(card, ".lp-panel", "padding")).toBe("1.75rem 0 0");
    expect(declaration(card, ".lp-page", "gap")).toBe("1.75rem");
  });

  it("makes no line heavier to pay for it", () => {
    expect(declaration(card, ".lp-panel", "border-top")).toMatch(/^1px solid /);
  });
});

/**
 * `ruledLeft`'s panel padding was the one declaration in the stylesheet naming a physical side —
 * the four-value `padding` shorthand, whose fourth value is `padding-left`. The axis beside it
 * is `border-inline-start`, so on a page whose `lang` reads right to left the rule moved to the
 * far edge and the text stayed pushed off the near one.
 */
describe("ruledLeft stays on the inline axis (§4.1)", () => {
  it("names no physical side", () => {
    expect(ruleText(shaped("ruledLeft"))).not.toMatch(/padding-(left|right)|margin-(left|right)/);
    expect(declaration(shaped("ruledLeft"), ".lp-panel", "padding-inline-start")).toBe("1rem");
  });

  it("pads the panel and the header off the axis by the same rung", () => {
    const page = resolvedPage(shaped("ruledLeft"));
    expect(page.get(".lp-panel")?.get("padding-inline-start")).toBe(
      page.get(".lp-header")?.get("padding-inline-start"),
    );
  });
});

/**
 * The page's focus ring — finding R-9, settled by #179 and built by #188.
 *
 * It used to be drawn in `--lp-accent-text`, **the link's own colour**, so on a link button the
 * ring read as a halo thrown by the thing it was meant to be pointing at rather than as a mark
 * on it. And since the accent and the fill both come from one brand colour, it was the least
 * distinguishable colour on the page for the job: on `POPULATED` it stood at 1.15:1 against the
 * fill it ringed.
 *
 * **`--lp-ink` is the one colour a button is never made of, and the one role §3.3 pins at 7:1.**
 * The accent is guaranteed 4.5:1 — a body-text promise — so moving the ring to the ink roughly
 * triples the headroom it is entitled to as well as ending the halo: on `POPULATED` it goes from
 * 4.84:1 to **15.56:1** on the ground in light mode, and 5.10 to **16.64** in dark.
 *
 * **Asserted on the resolved rule rather than on the role table**, because what a visitor gets is
 * the declaration that ships. `palette.test.ts` carries the other half — that ink clears 7:1 on
 * every backdrop, across the corpus and both modes.
 */
describe("the page's focus ring (R-9)", () => {
  it("is not the colour of the link it is drawn around", () => {
    const page = resolvedPage(full);
    const ring = page.get("a:focus-visible")?.get("outline");
    const accent = page.get("a")?.get("color");
    expect(ring, "the page draws a focus ring at all").toBeDefined();
    expect(accent, "and the links have a colour of their own to be told apart from").toBeDefined();
    expect(ring).not.toContain(accent);
    expect(ring).toContain(declaredTokens(full).get("--lp-ink"));
  });

  it("is drawn in the page's ink, on every shape", () => {
    for (const shape of SHAPES) {
      const project = shaped(shape);
      const ink = declaredTokens(project).get("--lp-ink");
      expect(resolvedPage(project).get("a:focus-visible")?.get("outline"), shape).toBe(
        `2px solid ${ink}`,
      );
    }
  });

  /**
   * **The positive offset is what makes the ratio above the right one to quote.** §3.3 guarantees
   * the ink against the page's two backdrops and says nothing at all about the ink against a
   * button's fill — and on `POPULATED` that pairing is **2.80:1** in light mode, under SC
   * 1.4.11's line. At `+3px` the ring never touches the fill: page ground surrounds it on both
   * sides, which is the same clearing the builder's own picked mark has to buy for itself. A
   * negative offset would move it silently onto the brand colour and take it under the line, so
   * the assertion is on the sign rather than on the number.
   */
  it("stands clear of the button it rings, so the ground is what it is measured against", () => {
    for (const shape of SHAPES) {
      const offset = resolvedPage(shaped(shape)).get("a:focus-visible")?.get("outline-offset");
      expect(offset, shape).toMatch(/^\d/);
    }
  });

  it("would be under the line if it were laid on the fill, which is what the offset buys", () => {
    const tokens = declaredTokens(full);
    const ink = parseHex(tokens.get("--lp-ink") ?? "");
    const fill = parseHex(tokens.get("--lp-fill") ?? "");
    const ground = parseHex(tokens.get("--lp-ground") ?? "");
    expect(ink).not.toBeNull();
    expect(fill).not.toBeNull();
    expect(ground).not.toBeNull();
    expect(
      contrastRatio(ink!, fill!),
      "if this ever clears 3:1 for every brand the offset is free to go — until then it is not",
    ).toBeLessThan(3);
    expect(
      contrastRatio(ink!, ground!),
      "which is where the ring is actually drawn",
    ).toBeGreaterThanOrEqual(7);
  });

  it("moves nothing when it appears", () => {
    // An outline, never a border or a shadow: a page that reflows as a visitor tabs through it
    // is the argument `theme.css` makes in the builder, made on the page the builder makes.
    const rule = resolvedPage(full).get("a:focus-visible");
    expect([...(rule?.keys() ?? [])]).toEqual(["outline", "outline-offset"]);
  });
});

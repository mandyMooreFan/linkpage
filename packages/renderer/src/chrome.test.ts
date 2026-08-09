import { describe, expect, it } from "vitest";
import { render } from "./render.js";
import {
  DEFAULT_CORNERS,
  DEFAULT_SHAPE,
  DEFAULT_TYPE,
  MODES,
  SHAPES,
  TYPE_PAIRINGS,
  radius,
  resolveChrome,
  shapeRules,
  typeTokens,
} from "./chrome.js";
import { POPULATED as full } from "./fixtures.js";
import type { Mode, Project, Shape, Style, TypePairing } from "./project.js";

/**
 * The four shapes, the three type pairings and the corner slider (`SPEC.md` §3.1).
 *
 * §5.3 asks for per-section snapshots; `render.test.ts` has those, and this file extends them
 * across the other axis — **all twelve shape/type combinations, in both modes**. What is
 * snapshotted is the part of the export those controls actually move: the `:root` token block
 * and the shape's delta. The rest of the stylesheet is the same bytes in all twenty-four and is
 * already pinned by `render.test.ts`'s whole-document snapshot, so repeating it here would be
 * twenty-four copies of one thing and a diff nobody reads.
 *
 * The assertions around the snapshots are the ones a snapshot cannot make: that the twelve are
 * one stylesheet rather than twelve, that the markup does not change between them, that no
 * shape introduces a colour, and that nothing fetches a font.
 */

const combinations: [Shape, TypePairing][] = SHAPES.flatMap((shape) =>
  TYPE_PAIRINGS.map((type): [Shape, TypePairing] => [shape, type]),
);

/**
 * The populated fixture in one particular combination.
 *
 * The patch is keyed by `Style` but valued `unknown`, because half of what these tests hand it
 * is what a hand-edited file holds rather than what the builder writes — `"brutalist"`, a
 * corner slider at 4, a shape that is a number. A typo'd *key* is still a compile error.
 */
function styled(patch: Partial<Record<keyof Style, unknown>>): Project {
  return { ...full, style: { ...full.style, ...patch } as Style };
}

/** The contents of the export's one `<style>` block. */
function css(project: Project): string {
  return /<style>([\s\S]*?)<\/style>/.exec(render(project))?.[1] ?? "";
}

/** The `:root` block — where the palette, the pairing and the corner slider all land. */
function tokenBlock(project: Project): string {
  return /:root\{[^}]*\}/.exec(css(project))?.[0] ?? "";
}

/** Everything that is not the token block: the rules. */
function rules(project: Project): string {
  return css(project).replace(/:root\{[^}]*\}\n?/, "");
}

/** The `<main>` element, which is the whole of the page's markup. */
function markup(project: Project): string {
  const html = render(project);
  const start = html.indexOf('<main class="lp-page">');
  return html.slice(start, html.indexOf("</main>") + "</main>".length);
}

/**
 * The one contiguous run of bytes `shaped` has and `base` does not, or `null` if the two
 * differ in more than one place.
 *
 * This is how the "not twelve stylesheets" claim is checked rather than asserted: if choosing a
 * shape did anything other than append its own delta — a second block, a changed base rule, a
 * different token — the difference would not be a single insertion and this returns `null`.
 */
function soleInsertion(base: string, shaped: string): string | null {
  if (shaped.length < base.length) return null;

  let head = 0;
  while (head < base.length && base[head] === shaped[head]) head++;

  let tail = 0;
  while (
    tail < base.length - head &&
    base[base.length - 1 - tail] === shaped[shaped.length - 1 - tail]
  ) {
    tail++;
  }

  return head + tail === base.length ? shaped.slice(head, shaped.length - tail) : null;
}

// ---------------------------------------------------------------------------
// The twelve combinations, in both modes
// ---------------------------------------------------------------------------

describe("all twelve shape/type combinations render, in both modes", () => {
  const cases = MODES.flatMap((mode) =>
    combinations.map(([shape, type]): [string, Shape, TypePairing, Mode] => [
      `${shape}/${type} in ${mode}`,
      shape,
      type,
      mode,
    ]),
  );

  it.each(cases)("%s", (_name, shape, type, mode) => {
    const project = styled({ shape, type, mode });
    expect(`${tokenBlock(project)}\n${shapeRules(shape)}`.trim()).toMatchSnapshot();
  });

  it.each(cases)("%s is a complete document", (_name, shape, type, mode) => {
    const html = render(styled({ shape, type, mode }));
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html.trimEnd().endsWith("</html>")).toBe(true);
    expect(html).toContain("<style>:root{");
  });
});

// ---------------------------------------------------------------------------
// Twelve combinations, one stylesheet
// ---------------------------------------------------------------------------

describe("twelve combinations are not twelve stylesheets (§6.4)", () => {
  it.each(combinations)("%s/%s adds its shape's delta and nothing else", (shape, type) => {
    const base = css(styled({ shape: DEFAULT_SHAPE, type }));
    const chosen = css(styled({ shape, type }));

    const delta = soleInsertion(base, chosen);
    expect(delta, `${shape} changed the stylesheet in more than one place`).not.toBeNull();
    expect(delta?.trim()).toBe(shapeRules(shape));
  });

  it("spends no rule at all on the type pairing", () => {
    // A pairing is five token values and nothing else, which is why the third axis costs the
    // same handful of bytes whichever of the three is chosen.
    const perPairing = TYPE_PAIRINGS.map((type) => rules(styled({ type })));
    expect(new Set(perPairing).size).toBe(1);
  });

  it("spends no rule at all on the corner slider", () => {
    const perPosition = [0, 0.25, 0.5, 0.75, 1].map((corners) => rules(styled({ corners })));
    expect(new Set(perPosition).size).toBe(1);
  });

  it("emits the default combination with no delta at all", () => {
    expect(shapeRules(DEFAULT_SHAPE)).toBe("");
  });
});

// ---------------------------------------------------------------------------
// A shape is presentation
// ---------------------------------------------------------------------------

describe("a shape changes the stylesheet, never the markup", () => {
  it("renders byte-identical markup for all twelve combinations", () => {
    const reference = markup(full);
    for (const [shape, type] of combinations) {
      expect(markup(styled({ shape, type })), `${shape}/${type}`).toBe(reference);
    }
  });

  it("renders byte-identical markup at either end of the corner slider", () => {
    expect(markup(styled({ corners: 0 }))).toBe(markup(styled({ corners: 1 })));
  });
});

// ---------------------------------------------------------------------------
// Structure only, never a palette (§3.2)
// ---------------------------------------------------------------------------

/** Anything that is a colour written out rather than a role named. */
const LITERAL_COLOUR = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|lab|lch|color)\(/;
/** Every custom property the rules may refer to has to be declared in the token block. */
const TOKEN_REFERENCE = /var\((--[a-z0-9-]+)\)/g;

describe("shapes and type pairings carry structure only, never a palette (§3.2)", () => {
  it.each(combinations)("%s/%s names roles rather than colours", (shape, type) => {
    // Every colour on the page is derived (§3.2) and reaches the stylesheet as a token. Outside
    // the `:root` block, a literal colour would mean a shape had introduced one of its own —
    // which would put the tool's taste ahead of the owner's brand on the owner's own page.
    expect(rules(styled({ shape, type }))).not.toMatch(LITERAL_COLOUR);
  });

  it.each(combinations)("%s/%s refers only to tokens it declares", (shape, type) => {
    const project = styled({ shape, type });
    const declared = new Set(
      [...tokenBlock(project).matchAll(/(--[a-z0-9-]+):/g)].map((match) => match[1]),
    );
    for (const [, name] of rules(project).matchAll(TOKEN_REFERENCE)) {
      expect(declared.has(name), `${shape}/${type} uses undeclared ${name}`).toBe(true);
    }
  });

  it("keeps the column at §6.8's cap under every shape", () => {
    for (const [shape, type] of combinations) {
      const sheet = css(styled({ shape, type }));
      expect(sheet, `${shape}/${type}`).toContain(".lp-page{width:min(100%, 25rem)");
      expect(sheet, `${shape}/${type}`).not.toMatch(/\.lp-page\{[^}]*width:(?!min\(100%, 25rem\))/);
      expect(sheet, `${shape}/${type}`).not.toMatch(/max-width:\s*(?:400px|[3-9]\d(?:\.\d+)?rem)/);
    }
  });
});

// ---------------------------------------------------------------------------
// Type pairings (§6.2)
// ---------------------------------------------------------------------------

describe("type pairings resolve to system font stacks (§6.2)", () => {
  it.each(TYPE_PAIRINGS)("%s fetches nothing", (type) => {
    const sheet = css(styled({ type }));
    expect(sheet).not.toContain("@font-face");
    expect(sheet).not.toContain("@import");
    expect(sheet).not.toMatch(/url\(/);
  });

  it.each(TYPE_PAIRINGS)("%s ends its stacks in a generic family", (type) => {
    const [body] = typeTokens(type);
    expect(body).toMatch(/(?:sans-serif|serif|monospace)$/);
  });

  it("gives the three pairings three different body faces", () => {
    const faces = TYPE_PAIRINGS.map((type) => typeTokens(type)[0]);
    expect(new Set(faces).size).toBe(TYPE_PAIRINGS.length);
  });

  it("points a one-face pairing's display token at the body token rather than repeating it", () => {
    expect(typeTokens("modern")[1]).toBe("--lp-font-head:var(--lp-font)");
    expect(typeTokens("classic")[1]).toContain("serif");
  });

  it("reaches the page through the tokens the rules name", () => {
    const sheet = css(styled({ type: "friendly" }));
    expect(sheet).toContain("--lp-font:ui-rounded");
    expect(sheet).toContain("font-family:var(--lp-font)");
    expect(sheet).toContain("font-family:var(--lp-font-head)");
  });
});

// ---------------------------------------------------------------------------
// Corner softness (§3.1)
// ---------------------------------------------------------------------------

describe("corner softness maps the slider to one radius", () => {
  it("runs from sharp to rounded", () => {
    expect(radius(0)).toBe("0rem");
    expect(radius(1)).toBe("1.25rem");
    expect(radius(DEFAULT_CORNERS)).toBe("0.75rem");
  });

  it("is monotonic across the slider", () => {
    const lengths = [0, 0.2, 0.4, 0.6, 0.8, 1].map((c) => Number.parseFloat(radius(c)));
    expect(lengths).toEqual([...lengths].sort((a, b) => a - b));
    expect(new Set(lengths).size).toBe(lengths.length);
  });

  it("stays in rem, for the reason §6.8 puts the column in rem", () => {
    for (const corners of [0, 0.3, 0.6, 1]) {
      expect(css(styled({ corners }))).toContain(`--lp-radius:${radius(corners)}`);
      expect(radius(corners)).toMatch(/rem$/);
    }
  });

  it("never emits floating-point noise, so the export stays deterministic (§6.6)", () => {
    for (let step = 0; step <= 100; step++) {
      const length = radius(step / 100);
      expect(length, `corners=${step / 100}`).toMatch(/^\d+(?:\.\d{1,3})?rem$/);
    }
  });

  it("clamps a hand-edited value rather than refusing it", () => {
    expect(resolveChrome({ corners: 4 }).corners).toBe(1);
    expect(resolveChrome({ corners: -3 }).corners).toBe(0);
  });

  it("falls back when there is no number to read an intent out of", () => {
    for (const value of [undefined, null, "0.5", "quite round", NaN, Infinity, {}, []]) {
      expect(resolveChrome({ corners: value }).corners, JSON.stringify(value)).toBe(
        DEFAULT_CORNERS,
      );
    }
  });
});

// ---------------------------------------------------------------------------
// Unknown enum values (§4.4)
// ---------------------------------------------------------------------------

describe("an unrecognised preference falls back for rendering (§4.4)", () => {
  it("renders an unknown shape as the default", () => {
    // The renderer's job is only the fallback: the original value survives in `project.json`
    // through the builder's raw-object merge (§4.5), so a newer builder restores the choice.
    const unknown = styled({ shape: "brutalist" });
    expect(render(unknown)).toBe(render(styled({ shape: DEFAULT_SHAPE })));
  });

  it("renders an unknown type pairing as the default", () => {
    const unknown = styled({ type: "blackletter" });
    expect(render(unknown)).toBe(render(styled({ type: DEFAULT_TYPE })));
  });

  it("keeps the preview and the export in agreement, which is what §5.2 needs", () => {
    // Both are this one function, so the fallback the preview shows is the fallback the
    // downloaded file contains — the guarantee §4.4 says its rule exists to protect.
    const unknown = styled({ shape: "brutalist", type: "blackletter" });
    expect(render(unknown)).toBe(render(unknown));
    expect(css(unknown)).toContain("--lp-font-head:");
  });
});

// ---------------------------------------------------------------------------
// Totality (§4.7)
// ---------------------------------------------------------------------------

describe("resolveChrome is total", () => {
  const WRONG: unknown[] = [undefined, null, 0, true, "", "centred", [], ["centred"], NaN];

  it("reads anything at all as the defaults", () => {
    for (const value of WRONG) {
      expect(() => resolveChrome(value), JSON.stringify(value)).not.toThrow();
      expect(resolveChrome(value)).toEqual({
        mode: "light",
        shape: DEFAULT_SHAPE,
        type: DEFAULT_TYPE,
        corners: DEFAULT_CORNERS,
      });
    }
  });

  it("reads a wrong-typed control as absent rather than coercing it", () => {
    for (const value of WRONG) {
      const chrome = resolveChrome({ shape: value, type: value, mode: value, corners: value });
      expect(chrome.shape, JSON.stringify(value)).toBe(DEFAULT_SHAPE);
      expect(chrome.type, JSON.stringify(value)).toBe(DEFAULT_TYPE);
      expect(chrome.mode, JSON.stringify(value)).toBe("light");
      // `0` is the one member of the list above that is a *right*-typed corner value — it is
      // the sharp end of the slider — so the slider is checked against the rest.
      const expected = typeof value === "number" && Number.isFinite(value) ? value : undefined;
      expect(chrome.corners, JSON.stringify(value)).toBe(expected ?? DEFAULT_CORNERS);
    }
  });

  it("takes each control independently, so one bad value does not reset the others", () => {
    const chrome = resolveChrome({ shape: "ruledLeft", type: 7, corners: 0.2, mode: "dark" });
    expect(chrome).toEqual({ mode: "dark", shape: "ruledLeft", type: DEFAULT_TYPE, corners: 0.2 });
  });
});

import { describe, expect, it, vi } from "vitest";
import { render } from "./render.js";
import { VOCABULARIES } from "./locale.js";
import { FIXTURES, MAXIMAL, POPULATED } from "./fixtures.js";
import type { Project } from "./project.js";

/**
 * `MAXIMAL` in every language the table holds (#48).
 *
 * Both guarantees in this file have to survive the translation table, and each is at risk in
 * its own way: the abbreviations are multi-byte in most languages, which the *byte* budget
 * notices where `String.length` would not, and a table is the one thing in the renderer that
 * could plausibly make output depend on something other than the argument.
 */
const TRANSLATED = Object.keys(VOCABULARIES).map(
  (lang) => ({ ...MAXIMAL, lang }) satisfies Project,
);

/**
 * The two guarantees the export makes about itself as a *file* rather than as a page: it is
 * the same file every time (`SPEC.md` §6.7), and its chrome fits in 30 KB (§6.5).
 *
 * They are one suite because they are measured the same way — on the bytes — and because each
 * is the other's precondition. A size assertion on output that varied run to run would be a
 * flake waiting to happen, and a determinism claim nobody weighed would be free to grow.
 */

// ---------------------------------------------------------------------------
// Measuring
// ---------------------------------------------------------------------------

/**
 * **Encoded bytes**, which §6.5 is explicit about: "the actual size of `index.html` on disk …
 * That is the file the owner emails, drops onto a host, and sees in a downloads folder, and it
 * is what CI counts. Any other reading puts the spec and the test in disagreement."
 *
 * So this counts UTF-8 bytes, not `String.length`. The difference is not academic — the en dash
 * between two opening times is one character and three bytes, and a page of hours carries
 * fourteen of them.
 */
function bytes(text: string): number {
  return new TextEncoder().encode(text).length;
}

/**
 * The `data:` image payloads, which are the logo and are budgeted separately (§6.5: chrome
 * ≤ 30 KB, logo ~120 KB, total ≤ 150 KB).
 *
 * Replaced with an empty payload rather than deleted so what remains is still the real
 * document — the `<img>` tag, its attributes and the rest of the markup all still count. This
 * is the whole of the split: everything that is not an encoded image is chrome.
 */
const IMAGE_PAYLOAD = /(data:image\/[a-zA-Z0-9.+-]+;base64,)[A-Za-z0-9+/=]*/g;

function chromeBytes(html: string): number {
  return bytes(html.replace(IMAGE_PAYLOAD, "$1"));
}

/** §6.5's chrome line, in the unit §6.5 measures in. */
const CHROME_BUDGET = 30 * 1024;

/**
 * A tripwire under the line, so that *approaching* the budget fails rather than only breaching
 * it.
 *
 * The worst realistic page measures about **24 KB** today, roughly 15 KB of which is vendored
 * SVG — the icon set, not the stylesheet, is what fills this budget. That leaves about 6 KB,
 * which is around thirty more glyphs, and the failure worth catching is not an owner with a
 * long page but a change that quietly spends that headroom.
 *
 * 26 KB is deliberately a number someone has to come and move rather than one that drifts. If
 * a glyph earns its place under §2.4's growth rule and pushes past it, raising this is the
 * right answer and the diff is where that decision gets recorded.
 */
const CHROME_TRIPWIRE = 26 * 1024;

// ---------------------------------------------------------------------------
// §6.5 — the chrome budget
// ---------------------------------------------------------------------------

describe("the chrome budget (§6.5)", () => {
  /**
   * The assertion the issue asks CI for. `MAXIMAL` is the worst *realistic* case — see the
   * reasoning on the fixture — and it is the one that matters, because a budget only tells you
   * anything when it is measured against the biggest page the product actually makes.
   */
  it("fits the worst realistic page in 30 KB of markup and CSS", () => {
    expect(chromeBytes(render(MAXIMAL))).toBeLessThanOrEqual(CHROME_BUDGET);
  });

  it.each(FIXTURES)("fits every fixture in 30 KB (%#)", (project) => {
    expect(chromeBytes(render(project))).toBeLessThanOrEqual(CHROME_BUDGET);
  });

  it("keeps the worst realistic page under the tripwire, with headroom to spare", () => {
    expect(chromeBytes(render(MAXIMAL))).toBeLessThanOrEqual(CHROME_TRIPWIRE);
  });

  /**
   * §6.5 counts **encoded bytes**, and translation is where that stops being pedantry: `月` is
   * one character and three bytes, `จันทร์` is six characters and eighteen. Only the selected
   * language's strings reach the export (`locale.ts`), so the table's own length costs nothing
   * however far it grows — but the *widest* language still has to fit, and this is the
   * assertion that says so rather than assuming it.
   */
  it.each(TRANSLATED)("keeps the worst page under the tripwire in every language ($lang)", (p) => {
    expect(chromeBytes(render(p))).toBeLessThanOrEqual(CHROME_TRIPWIRE);
  });

  /**
   * §6.5 is **a budget, not a gate**, "enforced by bounding the inputs, never by refusing to
   * export" — a hard cap is the worst possible failure for this user, because refusing would
   * strand an owner from their own page. So a project past the budget still renders a complete,
   * correct document; what it does not do is stay silent, and the number is the builder's
   * problem rather than the renderer's.
   */
  it("still exports a page that is over budget, because refusing would be worse", () => {
    const absurd = { ...MAXIMAL, links: Array.from({ length: 400 }, () => MAXIMAL.links![0]!) };
    const html = render(absurd);
    expect(chromeBytes(html)).toBeGreaterThan(CHROME_BUDGET);
    expect(html.trimEnd().endsWith("</html>")).toBe(true);
  });

  /**
   * The logo is not chrome, and this is the assertion that keeps the split honest: grow the
   * encoded image by 100 KB and the file grows by 100 KB while the chrome does not move a byte.
   *
   * It also states where §6.7's determinism stops. The renderer was handed this string; the
   * pipeline that produced it ran once, in the builder, at upload time (§6.6), and the same
   * source image encoded on iOS and on desktop Chrome does not agree. "Same `project.json` →
   * same `index.html`" is the guarantee; "same source logo → same file" is not one this tool
   * offers, and the difference lives entirely inside the payload stripped here.
   */
  it("counts the logo against the image budget and not against this one", () => {
    const huge = {
      ...POPULATED,
      header: {
        ...POPULATED.header,
        logo: { src: `data:image/png;base64,${"A".repeat(100_000)}`, width: 1200, height: 400 },
      },
    } as Project;

    expect(chromeBytes(render(huge))).toBe(chromeBytes(render(POPULATED)));
    expect(bytes(render(huge)) - bytes(render(POPULATED))).toBeGreaterThan(99_000);
  });
});

// ---------------------------------------------------------------------------
// §6.7 — determinism
// ---------------------------------------------------------------------------

describe("determinism (§6.7)", () => {
  /**
   * Render twice, diff. The plainest statement of the guarantee, over every fixture including
   * the damaged one — a file nobody wrote on purpose has to produce the same page twice too,
   * or §4.7's "degrade rather than blank" would be degrading differently each time.
   */
  it.each(FIXTURES)("produces byte-identical output for the same project (%#)", (project) => {
    expect(render(project)).toBe(render(project));
  });

  /**
   * The same *value*, not the same object. Passing one object twice would pass against a
   * renderer that memoised on identity, or one that mutated its argument on the first call and
   * read the mutation on the second; a fresh deep copy would not.
   */
  it.each(FIXTURES)("produces byte-identical output for an equal project (%#)", (project) => {
    expect(render(structuredClone(project))).toBe(render(project));
  });

  /**
   * **No timestamps** — the half of §6.7 that a diff of two adjacent renders cannot see,
   * because two calls a millisecond apart agree about the date.
   *
   * Tested by moving the clock eleven years rather than by scanning the output for something
   * date-shaped. A scan is the obvious version and it is wrong here: `POPULATED`'s tagline says
   * "since 1994", so any pattern strict enough to catch a year would fail on an owner's own
   * words, and any pattern loose enough to spare it would catch nothing.
   */
  it("renders the same bytes on two different days", () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2020-02-29T23:59:59.000Z"));
      const early = FIXTURES.map((project) => render(project));
      vi.setSystemTime(new Date("2031-07-04T00:00:01.000Z"));
      expect(FIXTURES.map((project) => render(project))).toEqual(early);
    } finally {
      vi.useRealTimers();
    }
  });

  /**
   * Where determinism would actually be lost, caught at the source rather than at the output.
   *
   * A clock or a random source reaching the renderer is the only way the guarantee breaks, and
   * it breaks silently: the two renders above would still agree if a `Date.now()` landed in a
   * cache key or a generated element id that happened not to change within a test run. This
   * fails on the *call*, on the day someone writes it.
   *
   * `Intl` reads no clock, so it needs its own guard — see the test below.
   */
  it("reads no clock and no random source", () => {
    const now = vi.spyOn(Date, "now");
    const random = vi.spyOn(Math, "random");
    try {
      for (const project of FIXTURES) render(project);
      expect(now).not.toHaveBeenCalled();
      expect(random).not.toHaveBeenCalled();
    } finally {
      now.mockRestore();
      random.mockRestore();
    }
  });

  /**
   * **The guard #48 is really about.** `Intl` is the near miss the clock spy above cannot
   * catch: it reads no clock and no random source, and it still breaks §6.7 — its output
   * tracks the ICU data compiled into the host, so the same project renders differently on two
   * Node versions and, worse for §5.2, differently in the owner's *browser* than in the
   * exported file. That is the exact drift the `srcdoc` preview exists to make impossible.
   *
   * It is asserted across every language in the table rather than over the fixtures alone,
   * because the shape this would come back in is somebody "improving" `locale.ts` into an
   * `Intl.DateTimeFormat` call for the languages the table does not hold.
   */
  it("constructs no Intl formatter, in any language (#48)", () => {
    const spies = [
      vi.spyOn(Intl, "DateTimeFormat"),
      vi.spyOn(Intl, "NumberFormat"),
      vi.spyOn(Intl, "Collator"),
    ];
    try {
      for (const project of [...FIXTURES, ...TRANSLATED]) render(project);
      for (const spy of spies) expect(spy).not.toHaveBeenCalled();
    } finally {
      for (const spy of spies) spy.mockRestore();
    }
  });

  /**
   * Determinism, restated over the axis this change added. A table is the one place in the
   * renderer where output could start depending on iteration order or on a shared mutable
   * object, and neither of those failures is visible in a single render.
   */
  it.each(TRANSLATED)("renders the same bytes twice in every language ($lang)", (project) => {
    expect(render(structuredClone(project))).toBe(render(project));
  });

  /**
   * The translation table must not leak *between* renders. Rendering every language in turn
   * and then rendering the first one again catches a cached vocabulary, a mutated tuple, or a
   * lookup that remembered its last answer — none of which the pairwise test above can see.
   */
  it("renders a language the same before and after every other language", () => {
    const first = TRANSLATED.map((project) => render(project));
    const again = TRANSLATED.map((project) => render(project));
    expect(again).toEqual(first);
    expect(new Set(first).size).toBeGreaterThan(1);
  });

  /**
   * **No round-trip payload in v1** (§6.7). Embedding `project.json` in the export would double
   * the logo bytes past the budget and serve the owner who never needed it — retrieving a
   * published file is harder than keeping the one you downloaded. It stays addable later
   * without breaking existing exports, which is only true while nothing is embedded now.
   */
  it("embeds no copy of the project data", () => {
    const html = render(MAXIMAL);
    expect(html).not.toContain("application/json");
    expect(html).not.toContain(JSON.stringify(MAXIMAL.links));
    expect(html).not.toContain(JSON.stringify(MAXIMAL.hours));
    // The stored 24-hour times are the tell: the page shows `7:30 AM`, so a `07:30` anywhere in
    // the output would be the file's own values riding along beside the rendered ones.
    expect(html).not.toContain("07:30");
  });
});

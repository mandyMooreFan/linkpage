import { expect, test, type Page } from "@playwright/test";
import { MODES, SHAPES, render, type Mode, type Project, type Shape } from "@linkpage/renderer";
import type { AxeResults } from "axe-core";
import { TAGS, WCAG_TAGS, audit as run, droppedBy, failed } from "../scripts/axe.mjs";

/**
 * `axe-core` over **the exported page**, in CI. `SPEC.md` §7.12, §6.8. Change list item
 * **CL-8** (issue #272), from the tooling study in issue #265.
 *
 * **Why it lives here and not in the renderer.** The renderer's `dependencies` block must stay
 * empty and `invariants.test.ts` asserts it — and invariant 3's `devDependencies` half is an
 * *allowlist*, not a count, so `axe-core` cannot go there either. The page under test is
 * therefore rendered *through the renderer's source* and audited from the builder, which is
 * where Playwright already lives. Nothing about the renderer's manifest moves.
 *
 * **Why it is an `*.e2e.ts` and not a `*.test.ts`.** jsdom computes no styles, so it cannot
 * answer `color-contrast`, and axe's whole subject is what a *browser* exposes. This rides the
 * existing End-to-end job rather than adding a second browser to CI.
 *
 * **What it is allowed to claim.** That the exported page is *checked* against WCAG 2.2 A and AA
 * — never that it is *proven* to meet them. #265 counted **23 of the 55 A+AA criteria** with any
 * axe rule at all; the other 32 have none, and every accessibility defect this project has
 * actually found except contrast sat in those 32. §7.12's second tier is a human walk for
 * exactly this reason. Do not let a green run here grow into a conformance claim.
 *
 * **Why `best-practice` is in the tag set.** The WCAG tags alone silently drop 30 of axe's 105
 * rules, `tabindex` and `heading-order` among them — measured in #265 and re-measured by the
 * controls below, which assert those two rules are *silent* under WCAG-only tags and *loud*
 * under ours. The tag choice is a decision, and §7.12 records it.
 *
 * ---
 *
 * **The rule this file exists to obey: a guard must prove it found something before it can
 * report nothing wrong.** #265 measured an *empty document* reporting **0 violations and 4
 * passes** — a run that never loaded the page reading exactly like a clean pass, with
 * `passes > 0` no help at all. Every green assertion here is therefore paid for by the known-bad
 * controls at the bottom of the file, which run through the same harness and must go red.
 *
 * And #265's own trap, one level up: **two of its mutants were no-ops** — `MAXIMAL` renders no
 * `<img>`, and an `<a>` wrapping an `<svg>` never matched the regex — so they first read as
 * "axe missed this". A control that does not break anything proves nothing. Each control below
 * asserts three things, and it is the three together that make it a proof:
 *
 * 1. the mutation **changed the document** (the string is not the one it went in as);
 * 2. the **unmutated** page reports that rule clean, so the edit is the only difference;
 * 3. the **mutated** page reports that rule as a violation.
 */

/**
 * **The bundle and the tag set come from `scripts/axe.mjs`**, which the builder's hand-run sweep
 * (`scripts/a11y-sweep.mjs`, CL-9) reads too.
 *
 * §7.12 records the tag choice — WCAG 2.2 A + AA **plus** `best-practice` — as a *decision*, and
 * it now answers for two checks rather than one. Two arrays under one sentence would drift in
 * silence, with both checks still green, so there is one array. Everything about *what* is
 * audited stays here: this file renders the exported page, the sweep drives the live builder.
 */

/** Both widths §7.4's appearance ritual uses, so the two rituals see the same two pages. */
const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
] as const;

/**
 * A real 1×1 PNG. It has to be a *decodable* image rather than a truncated signature, because
 * `image-alt` is one of the controls below and a browser that never made an image element into
 * an image would make that control prove less than it says.
 */
const LOGO_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

/**
 * A page with all six sections filled in (§2.1) — a logo, links with and without a glyph, hours
 * with a two-interval day and a closed day, contact, address, and a social platform with no
 * vendored mark.
 *
 * Deliberately the busiest honest page rather than the smallest one: a check that only ever sees
 * `MINIMAL` has never seen an image, a definition list or a link that is an icon plus a word.
 */
function project(shape: Shape, mode: Mode): Project {
  return {
    version: 1,
    lang: "en-GB",
    style: {
      brand: "#c2185b",
      accent: "#2e7d32",
      shape,
      type: "classic",
      corners: 0.6,
      mode,
      advanced: { enabled: false, colors: {} },
    },
    header: {
      name: "Ada's Bakery",
      tagline: "Sourdough & pastries since 1994",
      logo: { src: LOGO_PNG, width: 1, height: 1 },
    },
    links: [
      { label: "See the menu", url: "https://adasbakery.example/menu", icon: "menu" },
      { label: "Order for pickup", url: "https://adasbakery.example/order", icon: "bag" },
      { label: "Book a table", url: "https://adasbakery.example/book" },
    ],
    hours: {
      clock: "12h",
      weekStart: "mon",
      days: {
        mon: [["09:00", "17:00"]],
        fri: [["09:00", "17:00"]],
        sat: [
          ["10:00", "14:00"],
          ["17:00", "21:00"],
        ],
        sun: [],
      },
      note: "Closed bank holidays.",
    },
    contact: { phone: "020 7123 4567", email: "hello@adasbakery.example" },
    address: {
      lines: ["12 Baker Street", "London", "NW1 6XE"],
      directionsUrl: "https://maps.example/?q=12+Baker+Street",
    },
    social: [
      { platform: "instagram", url: "https://instagram.com/adasbakery" },
      { platform: "linkedin", url: "https://www.linkedin.com/company/adasbakery" },
    ],
  };
}

/**
 * Put `html` on the glass and run axe over it.
 *
 * `setContent` rather than a temp file and `file://`: the exported page references nothing
 * outside itself (invariant 2), so the two are the same document, and the one end-to-end that
 * *does* care about `file://` — `download.e2e.ts` — already owns that question.
 */
async function audit(page: Page, html: string, tags: readonly string[]): Promise<AxeResults> {
  await page.setContent(html, { waitUntil: "load" });
  return run(page, { tags });
}

/**
 * One edit to the rendered page, and the assertion that it landed.
 *
 * The return is deliberately not just the mutated string: a control that silently matched
 * nothing is #265's trap, and the caller asserts on `changed` before it trusts anything else.
 */
function mutate(html: string, find: string, replace: string): { html: string; changed: boolean } {
  const at = html.indexOf(find);
  if (at === -1) return { html, changed: false };
  return { html: html.slice(0, at) + replace + html.slice(at + find.length), changed: true };
}

// ---------------------------------------------------------------------------
// The check
// ---------------------------------------------------------------------------

test.describe("the exported page is checked against WCAG 2.2 A and AA", () => {
  for (const shape of SHAPES) {
    for (const mode of MODES) {
      for (const viewport of VIEWPORTS) {
        test(`${shape}, ${mode}, ${viewport.name}`, async ({ page }) => {
          await page.setViewportSize({ width: viewport.width, height: viewport.height });

          const results = await audit(page, render(project(shape, mode)), TAGS);

          expect(failed(results)).toEqual([]);
        });
      }
    }
  }
});

// ---------------------------------------------------------------------------
// What the check can and cannot see
// ---------------------------------------------------------------------------

test.describe("what a green run does and does not mean", () => {
  /**
   * #265's empty-document measurement, re-run here rather than taken on trust — and it came back
   * **different**, which is worth knowing. #265 recorded `violations=0 passes=4` for an empty
   * document; under *this* tag set an empty document is not silent at all, because
   * `page-has-heading-one` and `landmark-one-main` are `best-practice` page-level rules and
   * `html-has-lang` and `document-title` fire on a document that has neither.
   *
   * So the `best-practice` tag buys a second thing beyond the 30 rules: **a run over nothing
   * goes red here instead of green.** That is a happy consequence of the tag choice, not a
   * design, which is exactly why it is pinned by an assertion — narrow the tags and it is gone.
   *
   * **It is still not the liveness check.** `passes > 0` holds on the empty document too, so the
   * `passes` count proves nothing, and neither would a violation count on some *other* empty
   * thing. The known-bad controls below are what make a green run mean something.
   */
  test("an empty document is not silent under this tag set, but its `passes` count still is", async ({
    page,
  }) => {
    const results = await audit(page, "<!doctype html><html><head></head><body></body></html>", [
      ...TAGS,
    ]);

    expect(failed(results)).toContain("html-has-lang");
    expect(failed(results)).toContain("page-has-heading-one");
    // And yet: a document with nothing in it still reports passes.
    expect(results.passes.length).toBeGreaterThan(0);
  });

  /**
   * Why the tag set is a decision rather than a default. Counted from axe's own rule metadata in
   * the browser that will run it, so the numbers cannot drift away from the version in use.
   */
  test("the WCAG tags alone would drop rules this check keeps", async ({ page }) => {
    await page.setContent("<!doctype html><html><head></head><body></body></html>");

    const dropped = await droppedBy(page, WCAG_TAGS, TAGS);

    expect(dropped).toContain("tabindex");
    expect(dropped).toContain("heading-order");
    expect(dropped.length).toBeGreaterThan(20);
  });
});

// ---------------------------------------------------------------------------
// What the tree actually says
// ---------------------------------------------------------------------------

/**
 * Every node of the browser's own accessibility tree, as `role` and `name`.
 *
 * **Read over CDP rather than through a locator**, because the claim being settled is about
 * what *the browser exposes*, which is §7.12's exact bound — and because a `<dl>` has no ARIA
 * role in HTML-AAM, so a role-based locator would be answering a different question from the
 * one that failed. This is #266's instrument, re-run here rather than trusted.
 */
async function axNames(page: Page, html: string): Promise<{ role: string; name: string }[]> {
  await page.setContent(html, { waitUntil: "load" });
  const cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send("Accessibility.enable");
    const { nodes } = await cdp.send("Accessibility.getFullAXTree");
    return nodes.map((node) => ({
      role: String(node.role?.value ?? ""),
      name: String(node.name?.value ?? ""),
    }));
  } finally {
    await cdp.detach();
  }
}

/**
 * **CL-5** (issue #280, decided in #266): the hours panel is named.
 *
 * Before this the tree read `DescriptionList ""` — rows saying `Mon` and a time, and nothing
 * saying what they were times for, because §6.9's clock is `aria-hidden` like every glyph and
 * is not in the tree at all. **No axe rule reaches this**: nothing requires a description list
 * to be named, so the 16-of-16 run above was green over the gap. It is the hand-driven tier of
 * §7.12's promise that catches it, which is the whole reason there are two tiers.
 */
test.describe("the hours panel is named to assistive technology (CL-5)", () => {
  test("the browser reads back a heading and a named list", async ({ page }) => {
    const nodes = await axNames(page, render(project("centred", "light")));

    expect(nodes).toContainEqual({ role: "heading", name: "Opening hours" });
    expect(nodes).toContainEqual({ role: "DescriptionList", name: "Opening hours" });
  });

  /**
   * The control, and it is the same rule the rest of this file obeys: **a guard must prove it
   * found something before it can report nothing wrong.** Take the pointer away and the name
   * must go with it — otherwise the assertion above could be passing on something else in the
   * page entirely, which is exactly how #265's no-op mutants first read as a clean result.
   */
  test("and the name is the heading's, not something else in the page", async ({ page }) => {
    const clean = render(project("centred", "light"));
    const broken = mutate(clean, ` aria-labelledby="lp-h"`, "");

    expect(broken.changed, `nothing in the page matched aria-labelledby="lp-h"`).toBe(true);

    const nodes = await axNames(page, broken.html);
    expect(nodes).toContainEqual({ role: "DescriptionList", name: "" });
    expect(nodes).not.toContainEqual({ role: "DescriptionList", name: "Opening hours" });
    // The heading is still there and still says the word; only the list has lost its name.
    expect(nodes).toContainEqual({ role: "heading", name: "Opening hours" });
  });

  /**
   * The word follows the page's language, like every other word the renderer writes (§2.5, #48)
   * — asserted on the tree rather than on the markup, because a hidden name that a screen
   * reader would pronounce with the wrong phonetics is #48's bug with nothing on screen to
   * reveal it.
   */
  test("in the language the page declares", async ({ page }) => {
    const welsh = { ...project("centred", "light"), lang: "cy" };
    const nodes = await axNames(page, render(welsh));

    expect(nodes).toContainEqual({ role: "DescriptionList", name: "Oriau agor" });
  });
});

/**
 * **CL-6** (issue #281, decided in #266): the address link says what it opens.
 *
 * Before this the tree read `link "12 Baker Street London NW1 6XE"` — a name made entirely of
 * the destination, with nothing saying it was a link to a map. **`link-name` passes on that**,
 * which is why the 16-of-16 run above was green over this gap too: the link does have a name,
 * it is just the wrong one. It is the sharpest small case in #272 of a green checker not being
 * a promise, and the only tier that reaches it is this one.
 */
test.describe("the address link says it opens directions (CL-6)", () => {
  test("the browser reads back the purpose before the address", async ({ page }) => {
    const nodes = await axNames(page, render(project("centred", "light")));

    expect(nodes).toContainEqual({
      role: "link",
      name: "Directions 12 Baker Street London NW1 6XE",
    });
  });

  /**
   * The control. Take the word away and the name must fall back to the address alone —
   * otherwise the assertion above could be reading a name that came from somewhere else, which
   * is exactly how #265's no-op mutants first read as a clean result.
   */
  test("and the name is the hidden word's, not something else in the link", async ({ page }) => {
    const clean = render(project("centred", "light"));
    const broken = mutate(clean, `<span class="lp-sr">Directions</span>`, "");

    expect(broken.changed, `nothing in the page matched the hidden directions word`).toBe(true);

    const nodes = await axNames(page, broken.html);
    expect(nodes).toContainEqual({ role: "link", name: "12 Baker Street London NW1 6XE" });
    expect(nodes).not.toContainEqual({
      role: "link",
      name: "Directions 12 Baker Street London NW1 6XE",
    });
  });

  /**
   * The word follows the page's language (§2.5, #48) — the same reason CL-5 asserts it: a
   * hidden name a Welsh voice pronounces with English phonetics is #48's bug with nothing on
   * screen to reveal it.
   */
  test("in the language the page declares", async ({ page }) => {
    const welsh = { ...project("centred", "light"), lang: "cy" };
    const nodes = await axNames(page, render(welsh));

    expect(nodes).toContainEqual({
      role: "link",
      name: "Cyfarwyddiadau 12 Baker Street London NW1 6XE",
    });
  });

  /**
   * **§6.4's microdata is untouched, asserted in a real DOM rather than against the markup.**
   * This is the one place in the renderer where a hidden string sits inside an element that
   * carries structured data, and §6.9 asked for the assertion rather than the assumption: a
   * word one level too deep would publish `Directions 12 Baker Street …` as the business's
   * postal address. `render.test.ts` reads the property's text out of the markup in all 42
   * languages; this reads it out of the browser that a consumer's parser agrees with.
   */
  test("and it stays outside the published address", async ({ page }) => {
    await page.setContent(render(project("centred", "light")), { waitUntil: "load" });

    const published = await page.evaluate(() =>
      (document.querySelector('[itemprop="address"]')?.textContent ?? "")
        .replace(/\s+/g, " ")
        .trim(),
    );

    expect(published).toBe("12 Baker Street London NW1 6XE");
  });
});

// ---------------------------------------------------------------------------
// The known-bad controls
// ---------------------------------------------------------------------------

/**
 * Each control breaks the *real rendered page* in one place and asserts the check notices.
 *
 * `wcagOnlySilent` marks the two rules `best-practice` is in the tag set for: the control also
 * runs under WCAG-only tags and must come back clean there, which is the measurement behind
 * §7.12's line rather than a claim copied out of #265.
 */
const CONTROLS = [
  {
    what: "the document loses its language",
    rule: "html-has-lang",
    find: ` lang="en-GB"`,
    replace: "",
    wcagOnlySilent: false,
  },
  {
    what: "the logo loses its alt attribute",
    rule: "image-alt",
    find: ` alt=""`,
    replace: "",
    wcagOnlySilent: false,
  },
  {
    what: "a link is given a positive tabindex",
    rule: "tabindex",
    find: `<a class="lp-link"`,
    replace: `<a tabindex="3" class="lp-link"`,
    wcagOnlySilent: true,
  },
  {
    what: "a heading level is skipped",
    rule: "heading-order",
    find: `</h1>`,
    replace: `</h1><h3>Today's specials</h3>`,
    wcagOnlySilent: true,
  },
] as const;

test.describe("the check proves it can find something before it reports nothing", () => {
  for (const control of CONTROLS) {
    test(`${control.what} → ${control.rule}`, async ({ page }) => {
      const clean = render(project("centred", "light"));
      const broken = mutate(clean, control.find, control.replace);

      // 1. The control actually broke something. #265's two no-op mutants first read as
      //    "axe missed this"; a control that matched nothing must fail here, not there.
      expect(broken.changed, `nothing in the page matched ${control.find}`).toBe(true);
      expect(broken.html).not.toBe(clean);

      // 2. The unmutated page is clean on this rule, so the edit is the only difference
      //    between the two documents — which is what makes step 3 attributable to it.
      expect(failed(await audit(page, clean, TAGS))).not.toContain(control.rule);

      // 3. And the check sees it.
      expect(failed(await audit(page, broken.html, TAGS))).toContain(control.rule);

      if (control.wcagOnlySilent) {
        // The whole case for `best-practice`, measured on a real broken page: this defect is
        // invisible to a WCAG-tagged run.
        expect(failed(await audit(page, broken.html, WCAG_TAGS))).not.toContain(control.rule);
      }
    });
  }
});

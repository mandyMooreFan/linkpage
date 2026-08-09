import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { render } from "./render.js";
import type { Project } from "./project.js";

/**
 * The three guards that encode the decisions in issue #4. They are the reason this
 * package exists as a package rather than a folder. Do not weaken them to make a feature
 * fit — if a feature needs a script tag or a network fetch, the feature is wrong for this
 * project.
 *
 * The checks are written as exported-shaped helpers rather than inline assertions so the
 * guards themselves can be tested (see "the guards themselves" below). Both defects
 * recorded in SPEC.md §5.3 were failures *of the guard*, not of the renderer, and a guard
 * with no tests of its own is how they survived.
 */

const sample: Project = { title: "Ada's Bakery" };

/** Every project fixture the invariants are checked against. Grow this as blocks land. */
const fixtures: Project[] = [sample];

// ---------------------------------------------------------------------------
// The checks
// ---------------------------------------------------------------------------

/** `<tag attr="..." ...>`, tolerating quoted `>` inside attribute values. */
const TAG = /<([a-zA-Z][a-zA-Z0-9-]*)((?:[^>"']|"[^"]*"|'[^']*')*)\/?>/g;
/** Double-quoted, single-quoted, unquoted, or valueless. Deliberately permissive. */
const ATTR = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;

const STYLE_BLOCK = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
const STYLE_ATTR = /\sstyle\s*=\s*"([^"]*)"/gi;
const CSS_URL = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^'")]*))\s*\)/gi;

/**
 * Elements whose `href` is *navigation*, not a subresource.
 *
 * This is invariant 2's load-bearing distinction: navigating to another site is the entire
 * point of a link page, so `<a href="https://…">` is fine. What is forbidden is anything
 * the browser must fetch in order to render the page.
 */
const NAVIGATIONAL_HREF = new Set(["a", "area"]);

/** Attributes the browser fetches, on whatever element they appear. */
const FETCHED_ATTRS = new Set(["src", "srcset", "imagesrcset", "poster", "data"]);

interface Ref {
  tag: string;
  attr: string;
  value: string;
}

/**
 * Every attribute on every tag in the document.
 *
 * Structure-aware rather than text-scanning, and that is the whole point. A check written
 * against the raw string cannot tell an attribute from text that merely looks like one —
 * which is how `&lt;img src=x onerror=&quot;…&quot;&gt;`, correctly escaped and entirely
 * inert, used to trip the inline-handler guard.
 */
export function attributes(html: string): Ref[] {
  const attrs: Ref[] = [];
  for (const match of html.matchAll(TAG)) {
    const tag = (match[1] ?? "").toLowerCase();
    for (const m of (match[2] ?? "").matchAll(ATTR)) {
      attrs.push({ tag, attr: (m[1] ?? "").toLowerCase(), value: m[2] ?? m[3] ?? m[4] ?? "" });
    }
  }
  return attrs;
}

/**
 * Every reference in the document that would cause a fetch.
 *
 * Attribute-driven rather than a hardcoded element list. The previous version inspected
 * only `src="…"` and `<link href="…">`, which let SVG's `<image href="…">` through — it
 * uses `href` and is not a `<link>`. Anything that is not `<a>`/`<area>` and carries an
 * `href` is treated as a subresource, so `<use>`, `<image>`, `<link>` and whatever arrives
 * next are all covered without another edit here.
 */
export function subresourceRefs(html: string): Ref[] {
  const refs: Ref[] = [];
  for (const { tag, attr, value } of attributes(html)) {
    const isFetched =
      FETCHED_ATTRS.has(attr) ||
      ((attr === "href" || attr === "xlink:href") && !NAVIGATIONAL_HREF.has(tag));
    if (!isFetched) continue;

    // srcset holds a comma-separated candidate list: "a.png 1x, b.png 2x".
    if (attr === "srcset" || attr === "imagesrcset") {
      for (const candidate of value.split(",")) {
        const url = candidate.trim().split(/\s+/)[0];
        if (url) refs.push({ tag, attr, value: url });
      }
    } else {
      refs.push({ tag, attr, value });
    }
  }
  return refs;
}

/**
 * Only the CSS in the document: `<style>` bodies and `style="…"` attributes.
 *
 * Scoping matters. The previous version scanned the *whole document* for `url(…)`, so an
 * inline `<svg>` using a gradient — `fill="url(#g)"` — yielded `#g`, failed the `data:`
 * assertion, and broke the build on a perfectly ordinary logo.
 */
export function cssText(html: string): string {
  const parts: string[] = [];
  for (const [, body] of html.matchAll(STYLE_BLOCK)) parts.push(body ?? "");
  for (const [, body] of html.matchAll(STYLE_ATTR)) parts.push(body ?? "");
  return parts.join("\n");
}

/** Every `url(…)` target inside the document's CSS. */
export function cssUrls(html: string): string[] {
  const urls: string[] = [];
  for (const match of cssText(html).matchAll(CSS_URL)) {
    urls.push((match[1] ?? match[2] ?? match[3] ?? "").trim());
  }
  return urls;
}

/**
 * A reference the page can satisfy without a network: an inlined `data:` URI, or a
 * same-document fragment such as `url(#gradient)` or `<use href="#icon">`.
 */
function isSelfContained(value: string): boolean {
  return /^data:/i.test(value) || value.startsWith("#");
}

/** `onclick`, `onerror`, … as *attributes*, never as text that happens to spell one. */
export function eventHandlerAttrs(html: string): Ref[] {
  return attributes(html).filter((a) => /^on[a-z]+$/.test(a.attr));
}

function expectNoScript(html: string): void {
  // A literal `<script` in the output is always a real tag: escaping turns the text form
  // into `&lt;script`, so a raw scan is both correct and the strictest available check.
  expect(html).not.toMatch(/<script/i);

  for (const handler of eventHandlerAttrs(html)) {
    expect.fail(`<${handler.tag} ${handler.attr}="…"> is an inline event handler`);
  }

  // `javascript:` only executes from an attribute value or a CSS url(). Inside escaped
  // text it is a string a bakery is entitled to put in its tagline.
  for (const { tag, attr, value } of attributes(html)) {
    expect(/javascript:/i.test(value), `<${tag} ${attr}="${value}"> is a javascript: URL`).toBe(
      false,
    );
  }
  for (const url of cssUrls(html)) {
    expect(/javascript:/i.test(url), `url(${url}) is a javascript: URL`).toBe(false);
  }
}

function expectSelfContained(html: string): void {
  for (const ref of subresourceRefs(html)) {
    expect(
      isSelfContained(ref.value),
      `<${ref.tag} ${ref.attr}="${ref.value}"> must be inlined`,
    ).toBe(true);
  }
  expect(cssText(html)).not.toMatch(/@import/i);
  for (const url of cssUrls(html)) {
    expect(isSelfContained(url), `url(${url}) must be inlined`).toBe(true);
  }
}

// ---------------------------------------------------------------------------
// Invariant 1
// ---------------------------------------------------------------------------

describe("invariant 1: the export ships zero JavaScript", () => {
  it.each(fixtures)("carries no script, handler or javascript: URL (%o)", (project) => {
    expectNoScript(render(project));
  });
});

// ---------------------------------------------------------------------------
// Invariant 2
// ---------------------------------------------------------------------------

describe("invariant 2: the export references nothing outside itself", () => {
  it.each(fixtures)("loads no external or relative subresources (%o)", (project) => {
    expectSelfContained(render(project));
  });
});

// ---------------------------------------------------------------------------
// Invariant 3
// ---------------------------------------------------------------------------

describe("invariant 3: the renderer declares no dependencies", () => {
  it("has an empty dependencies block in package.json", () => {
    const manifestPath = fileURLToPath(new URL("../package.json", import.meta.url));
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      dependencies?: Record<string, string>;
    };
    expect(Object.keys(manifest.dependencies ?? {})).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The guards themselves
// ---------------------------------------------------------------------------

describe("the guards themselves", () => {
  describe("invariant 1 distinguishes attributes from text", () => {
    it("catches a real inline event handler", () => {
      expect(eventHandlerAttrs(`<div onclick="alert(1)">x</div>`)).toHaveLength(1);
      expect(() => expectNoScript(`<div onclick="alert(1)">x</div>`)).toThrow();
    });

    it("catches an unquoted inline handler", () => {
      expect(() => expectNoScript(`<img src=x onerror=alert(1)>`)).toThrow();
    });

    it("permits escaped text that merely mentions a handler", () => {
      // Found by the totality fuzz below: a business name of `<img src=x onerror="…">`
      // renders correctly escaped and entirely inert, but the old text-scanning check
      // read ` onerror=` out of the escaped output and failed the build.
      const html = `<h1>&lt;img src=x onerror=&quot;alert(1)&quot;&gt;</h1>`;
      expect(eventHandlerAttrs(html)).toEqual([]);
      expect(() => expectNoScript(html)).not.toThrow();
    });

    it("catches a javascript: URL in an attribute", () => {
      expect(() => expectNoScript(`<a href="javascript:alert(1)">x</a>`)).toThrow();
    });

    it("permits javascript: as escaped text", () => {
      expect(() => expectNoScript(`<p>javascript:alert(1)</p>`)).not.toThrow();
    });

    it("catches a script tag even when the text around it is escaped", () => {
      expect(() => expectNoScript(`<h1>&lt;b&gt;</h1><script>x</script>`)).toThrow();
    });
  });

  describe("invariant 2 permits same-document and inlined references", () => {
    it("permits an SVG gradient reference (the false positive in SPEC.md §5.3)", () => {
      const html = `<style>.a{fill:url(#g)}</style><svg><rect fill="url(#g)"/></svg>`;
      expect(cssUrls(html)).toEqual(["#g"]);
      expect(() => expectSelfContained(html)).not.toThrow();
    });

    it("permits navigation to another site", () => {
      const html = `<a href="https://example.com/menu">See the menu</a>`;
      expect(subresourceRefs(html)).toEqual([]);
      expect(() => expectSelfContained(html)).not.toThrow();
    });

    it("permits a same-document <use> reference", () => {
      const html = `<svg><use href="#icon-cart"/></svg>`;
      expect(() => expectSelfContained(html)).not.toThrow();
    });

    it("permits an inlined image", () => {
      const html = `<img src="data:image/png;base64,iVBORw0KGgo=" alt="">`;
      expect(() => expectSelfContained(html)).not.toThrow();
    });
  });

  describe("invariant 2 catches every fetching reference", () => {
    it("catches SVG <image href> (the false negative in SPEC.md §5.3)", () => {
      const html = `<svg><image href="https://tracker.example/x.png"/></svg>`;
      expect(subresourceRefs(html)).toEqual([
        { tag: "image", attr: "href", value: "https://tracker.example/x.png" },
      ]);
      expect(() => expectSelfContained(html)).toThrow();
    });

    it("catches legacy xlink:href", () => {
      const html = `<svg><image xlink:href="https://tracker.example/x.png"/></svg>`;
      expect(() => expectSelfContained(html)).toThrow();
    });

    it("catches a stylesheet link", () => {
      const html = `<link rel="stylesheet" href="https://cdn.example/a.css">`;
      expect(() => expectSelfContained(html)).toThrow();
    });

    it("catches a relative image", () => {
      const html = `<img src="./assets/logo.png" alt="">`;
      expect(() => expectSelfContained(html)).toThrow();
    });

    it("catches a srcset candidate", () => {
      const html = `<img src="data:image/png;base64,x" srcset="data:image/png;base64,x 1x, https://cdn.example/2x.png 2x" alt="">`;
      expect(() => expectSelfContained(html)).toThrow();
    });

    it("catches a CSS background and an @import", () => {
      expect(() =>
        expectSelfContained(`<style>body{background:url(https://a/b.png)}</style>`),
      ).toThrow();
      expect(() => expectSelfContained(`<style>@import url(https://a/b.css);</style>`)).toThrow();
      expect(() => expectSelfContained(`<div style="background:url(../x.png)"></div>`)).toThrow();
    });

    it("catches a video poster and an object data", () => {
      expect(() => expectSelfContained(`<video poster="https://a/p.jpg"></video>`)).toThrow();
      expect(() => expectSelfContained(`<object data="https://a/x.swf"></object>`)).toThrow();
    });
  });
});

// ---------------------------------------------------------------------------
// Totality
// ---------------------------------------------------------------------------

/**
 * SPEC.md §4.7: the renderer is **total**. It never throws — every field is treated as
 * optional, a wrong-typed value reads as absent, and it always returns a string.
 *
 * This matters beyond tidiness: the builder's preview *is* `render(project)` in a `srcdoc`
 * iframe (§5.2), so a renderer that threw on a hand-edited `project.json` would blank the
 * preview rather than degrade the page.
 *
 * The generator is seeded rather than random — a fuzz test that fails only on Tuesdays is
 * worse than no fuzz test.
 *
 * **The domain is what the builder can actually hand over:** anything `JSON.parse` can
 * produce, plus `undefined` and `null`. Exotic JS values are deliberately excluded — a
 * property that throws when *read* cannot survive a JSON round trip, so defending against
 * one would mean wrapping every field access in the real renderer against an input that
 * cannot occur. Totality is a promise about hand-edited `project.json` files, not about
 * adversarial JavaScript objects.
 */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HOSTILE: unknown[] = [
  undefined,
  null,
  0,
  -1,
  Number.NaN,
  Number.POSITIVE_INFINITY,
  true,
  false,
  "",
  "   ",
  "Ada's Bakery",
  "<script>alert(1)</script>",
  "</title><script>alert(1)</script>",
  '<img src=x onerror="alert(1)">',
  "javascript:alert(1)",
  `<svg><image href="https://tracker.example/x.png"/></svg>`,
  "<style>@import url(https://cdn.example/a.css);</style>",
  "url(https://cdn.example/a.png)",
  '" onmouseover="alert(1)',
  " [31m",
  "𝔘𝔫𝔦𝔠𝔬𝔡𝔢 😀 ‮",
  "a".repeat(5000),
  [],
  ["a", "b"],
  {},
  { title: { nested: true } },
  Object.create(null) as unknown,
  // Outside the JSON domain, kept as a canary: it passes only while nothing in the
  // renderer stringifies an untrusted value. If this starts throwing, something began
  // calling String() on input instead of type-checking it.
  {
    toString() {
      throw new Error("hostile toString");
    },
  },
];

function pick(rand: () => number): unknown {
  return HOSTILE[Math.floor(rand() * HOSTILE.length)];
}

describe("the renderer is total", () => {
  it.each([1, 7, 42, 1337])("returns a valid document for hostile input (seed %i)", (seed) => {
    const rand = mulberry32(seed);
    for (let i = 0; i < 250; i++) {
      const project = rand() < 0.15 ? pick(rand) : { title: pick(rand), extra: pick(rand) };

      let html: string;
      expect(() => {
        html = render(project as Project);
      }).not.toThrow();

      expect(typeof html!).toBe("string");
      expectNoScript(html!);
      expectSelfContained(html!);
    }
  });

  it("renders the same bytes twice for the same input", () => {
    // SPEC.md §6.6 — same project, byte-identical output, no timestamps.
    expect(render(sample)).toBe(render(sample));
  });
});

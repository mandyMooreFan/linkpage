import { describe, expect, it } from "vitest";
import {
  FALLBACK_ICON,
  ICON_CLASS,
  ICON_NAMES,
  ICONS,
  SOCIAL_MARKS,
  SOCIAL_PLATFORMS,
  glyphSvg,
  iconSvg,
  isIconName,
  isSocialPlatform,
  socialIconSvg,
  socialLabel,
  socialPlatform,
  type Glyph,
  type IconName,
  type SocialPlatform,
} from "./icons.js";
import type { Link, SocialLink } from "./project.js";

/**
 * The vendored icon set: SPEC.md §2.4, plus §4.4's fallback rule and §7.3's coverage
 * obligation.
 *
 * The invariant guards themselves live in `invariants.test.ts` and are run over every
 * glyph's markup there, where they can use the real checks rather than a restatement of
 * them.
 */

const everyGlyph: [string, Glyph][] = [
  ...ICON_NAMES.map((name): [string, Glyph] => [name, ICONS[name]]),
  ...SOCIAL_PLATFORMS.map((name): [string, Glyph] => [name, SOCIAL_MARKS[name]]),
];

// ---------------------------------------------------------------------------
// Coverage: the set is exactly what §7.3 and §4.4 ask for
// ---------------------------------------------------------------------------

/**
 * Every link-button suggestion the presets in SPEC.md §7.3 make, and the glyph it uses.
 *
 * This is the whole justification for the set's membership, written down. It fails in both
 * directions on purpose: a suggestion with no glyph is a gap the owner would feel, and a
 * glyph no suggestion reaches is one we vendored on a hunch — and "a small curated set"
 * (§2.4) is a claim that has to be kept true by something.
 */
const SUGGESTIONS: [suggestion: string, icon: IconName][] = [
  // Food & drink
  ["See the menu", "menu"],
  ["Order for pickup", "bag"],
  ["Book a table", "calendar"],
  // Shop or venue
  ["Shop online", "cart"],
  ["What's on", "calendar"],
  ["Find us", "location"],
  // Appointments
  ["Book an appointment", "calendar"],
  ["Prices", "price"],
  ["Our services", "services"],
  // We come to you
  ["Get a quote", "document"],
  ["Call us", "phone"],
  ["See our work", "portfolio"],
  // Online only
  ["Shop", "shop"],
  ["Subscribe", "mail"],
  ["Get in touch", "message"],
];

describe("the set covers what the spec asks of it", () => {
  it.each(SUGGESTIONS)("%s has a glyph (%s)", (_suggestion, icon) => {
    expect(isIconName(icon)).toBe(true);
  });

  it("vendors no glyph that no suggestion reaches", () => {
    const served = new Set(SUGGESTIONS.map(([, icon]) => icon));
    // Two exceptions, and they are named rather than counted, because the point of this test
    // is that membership is justified one glyph at a time (§2.4).
    //
    // `link` is §4.4's fallback for a platform we have no mark for — a case the owner never
    // deliberately creates. `clock` names the hours panel on the exported page (§6.9), which
    // is the one job a glyph does that no suggestion could. That used to be because §2.5
    // forbade the ninth string a real heading would need; §2.5 has since spent it (#266,
    // CL-5), but on a visually hidden `<h2>`, so on the glass the glyph is still the only
    // thing naming the panel and the exception stands on the same footing it always did.
    served.add(FALLBACK_ICON);
    served.add("clock");
    expect([...ICON_NAMES].filter((name) => !served.has(name))).toEqual([]);
  });

  it("includes the generic link glyph §4.4 requires as the fallback", () => {
    expect(FALLBACK_ICON).toBe("link");
    expect(ICONS[FALLBACK_ICON]).toBeDefined();
  });

  it("names every glyph it holds, and holds every glyph it names", () => {
    expect(Object.keys(ICONS)).toEqual([...ICON_NAMES]);
    expect(Object.keys(SOCIAL_MARKS)).toEqual([...SOCIAL_PLATFORMS]);
  });

  /**
   * The corpus itself, pinned. §5.3's rule, added on #328.
   *
   * `SOCIAL_PLATFORMS` is iterated by loops in this file and in `render.test.ts` that assert
   * nothing at all if it is empty. Emptied at its definition, exactly **one** test in the whole
   * suite went red (#317) — the one above, and only because `SOCIAL_MARKS` still had its keys.
   * That is a corpus defended by another line rather than by the checks that read it, which is
   * `census.mjs`'s warning at suite scale.
   *
   * Named rather than counted, which is #181's *identify, don't count*: a platform quietly
   * swapped for another keeps the length and is a different product.
   */
  it("holds the ten platforms the product offers, by name", () => {
    expect([...SOCIAL_PLATFORMS]).toEqual([
      "instagram",
      "facebook",
      "x",
      "tiktok",
      "youtube",
      "whatsapp",
      "pinterest",
      "threads",
      "bluesky",
      "mastodon",
    ]);
  });

  it("gives every social mark a proper name for its accessible label", () => {
    for (const platform of SOCIAL_PLATFORMS) {
      expect(SOCIAL_MARKS[platform].label, platform).not.toBe("");
      expect(socialLabel(platform)).toBe(SOCIAL_MARKS[platform].label);
    }
    // The identifier is lowercase; the label is the platform's own spelling.
    expect(socialLabel("tiktok")).toBe("TikTok");
    expect(socialLabel("x")).toBe("X");
  });

  it("draws no two glyphs with the same geometry", () => {
    // A copy-paste while vendoring is invisible in review and obvious here.
    const bodies = everyGlyph.map(([, glyph]) => glyph.body);
    expect(new Set(bodies).size).toBe(bodies.length);
  });
});

// ---------------------------------------------------------------------------
// The vendored markup is data, not arbitrary markup
// ---------------------------------------------------------------------------

/**
 * Each glyph stores the body its source ships, which for Lucide means `<circle>` and
 * `<rect>` alongside `<path>` — flattening those to path data by hand would be a silent
 * visual-bug risk for no gain (see `icons.ts`).
 *
 * The cost of storing markup is that "vendored geometry" and "arbitrary HTML in the export"
 * become the same shape, and only a guard tells them apart. This is that guard: an
 * allowlist of elements and attributes tight enough that nothing which could reference the
 * network, run code, or escape the `<svg>` can be added to the table without failing here.
 */
const ALLOWED_ELEMENTS = new Set(["path", "circle", "rect"]);
const ALLOWED_ATTRS = new Set([
  "d",
  "cx",
  "cy",
  "r",
  "x",
  "y",
  "width",
  "height",
  "rx",
  "ry",
  "fill",
]);
const ELEMENT = /<([a-zA-Z][a-zA-Z0-9-]*)((?:[^>"']|"[^"]*")*)\/?>/g;
const ATTRIBUTE = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*"([^"]*)"/g;

describe("the vendored geometry stays geometry", () => {
  it.each(everyGlyph)("%s uses only allowlisted elements and attributes", (name, glyph) => {
    const elements = [...glyph.body.matchAll(ELEMENT)];
    expect(elements.length, `${name} has no elements`).toBeGreaterThan(0);

    for (const [, tag, attrs] of elements) {
      expect(ALLOWED_ELEMENTS.has(tag!.toLowerCase()), `<${tag}> in ${name}`).toBe(true);
      for (const [, attr, value] of (attrs ?? "").matchAll(ATTRIBUTE)) {
        expect(ALLOWED_ATTRS.has(attr!.toLowerCase()), `${attr}= in ${name}`).toBe(true);
        // `fill` is the one attribute that could name something other than a number: a
        // paint server reference, `url(#…)`, is how an SVG points at anything at all.
        if (attr!.toLowerCase() === "fill") {
          expect(["currentColor", "none"], `fill in ${name}`).toContain(value);
        }
      }
    }

    // Belt as well as braces — the element scan above is the real check, but these are the
    // three shapes a mistake would actually take.
    expect(glyph.body).not.toMatch(/<script/i);
    expect(glyph.body).not.toMatch(/\son[a-z]+\s*=/i);
    expect(glyph.body).not.toMatch(/url\(/i);
  });

  it.each(everyGlyph)("%s closes every element it opens", (_name, glyph) => {
    // Anything left open would swallow the markup that follows it in the export.
    expect(glyph.body.replace(ELEMENT, "").trim()).toBe("");
  });
});

// ---------------------------------------------------------------------------
// What gets emitted
// ---------------------------------------------------------------------------

describe("glyphSvg", () => {
  it("paints strokes and fills differently, and both in currentColor", () => {
    const stroke = glyphSvg(ICONS.link);
    expect(stroke).toContain('fill="none"');
    expect(stroke).toContain('stroke="currentColor"');

    const fill = glyphSvg(SOCIAL_MARKS.instagram);
    expect(fill).toContain('fill="currentColor"');
    expect(fill).not.toContain("stroke=");
  });

  it("marks every glyph decorative and unfocusable", () => {
    // The label beside the glyph carries the meaning; a glyph that announced itself would
    // double every link button in a screen reader (SPEC.md §6.8).
    for (const [name, glyph] of everyGlyph) {
      expect(glyphSvg(glyph), name).toContain('aria-hidden="true"');
      expect(glyphSvg(glyph), name).toContain('focusable="false"');
    }
  });

  it("sizes to the text beside it and carries the stylesheet's hook", () => {
    expect(glyphSvg(ICONS.cart)).toContain('width="1em" height="1em"');
    expect(glyphSvg(ICONS.cart)).toContain(`class="${ICON_CLASS}"`);
    expect(glyphSvg(ICONS.cart)).toContain('viewBox="0 0 24 24"');
  });

  it("renders the same bytes twice", () => {
    // SPEC.md §6.7: same project, byte-identical output.
    for (const [name, glyph] of everyGlyph) {
      expect(glyphSvg(glyph), name).toBe(glyphSvg(glyph));
    }
  });

  it("leaves room in the chrome budget", () => {
    // SPEC.md §6.5 caps markup + CSS at 30 KB and the glyphs are the only part of the
    // chrome whose size is decided by how many of them we vendored, so the set needs a
    // ceiling of its own. Emitting one of everything is that ceiling — no page reaches it,
    // since only referenced glyphs are emitted and a real page shows a handful.
    const oneOfEverything =
      ICON_NAMES.reduce((n, name) => n + iconSvg(name).length, 0) +
      SOCIAL_PLATFORMS.reduce((n, p) => n + socialIconSvg(p).length, 0);
    expect(oneOfEverything).toBeLessThan(20_000);

    // No single glyph may dominate. The brand marks are filled silhouettes and run several
    // times the size of a stroked outline, which is the ratio to watch when adding one.
    for (const [name, glyph] of everyGlyph) {
      expect(glyphSvg(glyph).length, name).toBeLessThan(2_500);
    }
  });
});

// ---------------------------------------------------------------------------
// §4.4: preferences fall back, the owner's data is kept
// ---------------------------------------------------------------------------

describe("unknown values (SPEC.md §4.4)", () => {
  it("renders no glyph for an unrecognised link icon", () => {
    // `Link.icon` is a preference with nothing authored behind it, so a link without a
    // glyph is an ordinary, complete link.
    expect(iconSvg("brutalist")).toBe("");
    expect(iconSvg(undefined)).toBe("");
  });

  it("renders the generic glyph for an unrecognised platform, never nothing", () => {
    // `platform` holds the owner's data — behind it is a URL they typed — so the entry is
    // kept and only the decoration falls back.
    expect(socialIconSvg("linkedin")).toBe(glyphSvg(ICONS.link));
    expect(socialIconSvg("my-forum")).not.toBe("");
    expect(socialLabel("my-forum")).toBe("");
  });

  it("still uses the brand mark for a platform it knows", () => {
    expect(socialIconSvg("instagram")).toBe(glyphSvg(SOCIAL_MARKS.instagram));
    expect(socialIconSvg("instagram")).not.toBe(glyphSvg(ICONS.link));
  });
});

describe("the owner's capitalisation, not ours (#89)", () => {
  /**
   * The owner types the platform, and the builder's completion list *displays* `Instagram`
   * while its value is `instagram`. Typing what the list shows used to match nothing, and the
   * failure looked exactly like the legitimate no-mark fallback above — so it read as a
   * decision rather than a fault. Every form below has to reach the same mark.
   */
  it.each([
    ["Instagram", "instagram"],
    ["INSTAGRAM", "instagram"],
    ["TikTok", "tiktok"],
    ["X", "x"],
    ["  Facebook  ", "facebook"],
    ["bLuEsKy", "bluesky"],
  ])("resolves %j to %j", (typed, canonical) => {
    expect(socialPlatform(typed)).toBe(canonical);
    expect(socialIconSvg(typed)).toBe(socialIconSvg(canonical));
    expect(socialLabel(typed)).toBe(SOCIAL_MARKS[canonical as SocialPlatform].label);
  });

  it("gives every platform's own display label back as a match", () => {
    // The exact string the datalist puts in front of the owner. If a future mark's label stops
    // resolving — a space, a dot, an ampersand — this is where it is caught rather than in an
    // export nobody looked at.
    for (const platform of SOCIAL_PLATFORMS) {
      const shown = SOCIAL_MARKS[platform].label;
      expect(socialPlatform(shown)).toBe(platform);
      expect(socialIconSvg(shown)).toBe(glyphSvg(SOCIAL_MARKS[platform]));
    }
  });

  it("still does not invent a mark for a platform we have none for", () => {
    // The fix must not turn the fallback into a guess: LinkedIn is absent on purpose.
    for (const value of ["LinkedIn", "linkedin", "My-Forum", "Threads Local"]) {
      expect(socialPlatform(value)).toBeUndefined();
      expect(socialIconSvg(value)).toBe(glyphSvg(ICONS.link));
      expect(socialLabel(value)).toBe("");
    }
  });

  it("is not fooled by inherited properties, whatever the casing", () => {
    // The `Object.hasOwn` guard has to survive the lowercasing added in front of it.
    for (const value of ["constructor", "Constructor", "__proto__", "toString", "ToString"]) {
      expect(socialPlatform(value)).toBeUndefined();
      expect(socialIconSvg(value)).toBe(glyphSvg(ICONS.link));
    }
  });

  it("stays total for anything that is not a string", () => {
    for (const value of [undefined, null, 42, {}, [], Symbol("x")]) {
      expect(socialPlatform(value)).toBeUndefined();
    }
  });

  it("keeps the strict guard strict", () => {
    // `isSocialPlatform` narrows to `SocialPlatform`, so it must keep answering about the value
    // it was handed rather than the one it could be folded into — otherwise a caller indexes
    // `SOCIAL_MARKS` with a key that is not there.
    expect(isSocialPlatform("Instagram")).toBe(false);
    expect(isSocialPlatform("instagram")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Totality (SPEC.md §4.7)
// ---------------------------------------------------------------------------

const HOSTILE: unknown[] = [
  undefined,
  null,
  0,
  Number.NaN,
  true,
  "",
  "   ",
  "constructor",
  "__proto__",
  "toString",
  "<script>alert(1)</script>",
  '" onmouseover="alert(1)',
  "a".repeat(5000),
  [],
  ["cart"],
  {},
  { icon: "cart" },
  Object.create(null) as unknown,
];

describe("the icon lookups are total", () => {
  it.each(HOSTILE)("never throws on %o", (value) => {
    expect(() => iconSvg(value)).not.toThrow();
    expect(() => socialIconSvg(value)).not.toThrow();
    expect(() => socialLabel(value)).not.toThrow();
    expect(typeof iconSvg(value)).toBe("string");
    expect(socialIconSvg(value)).not.toBe("");
  });

  it("does not mistake an inherited property for a glyph", () => {
    // `"constructor" in ICONS` is true. `Object.hasOwn` is why this passes.
    expect(isIconName("constructor")).toBe(false);
    expect(isIconName("toString")).toBe(false);
    expect(isSocialPlatform("constructor")).toBe(false);
    expect(iconSvg("constructor")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// The types the set now allows (SPEC.md §2.4, §4.4)
// ---------------------------------------------------------------------------

describe("the schema types", () => {
  it("closes Link.icon and leaves SocialLink.platform open", () => {
    // These two assignments are the test: the first compiles only because `icon` is the
    // closed union, the second only because `platform` is not. `tsc` is what runs this —
    // the runtime assertion below is a formality so the case reads as a test.
    const link: Link = { label: "Order online", url: "https://example.com", icon: "cart" };
    // LinkedIn has no vendored mark (Simple Icons removed it at LinkedIn's request) and a
    // typed project still has to be able to hold it. §4.4: kept, not dropped.
    const social: SocialLink = { platform: "linkedin", url: "https://example.com/in/ada" };

    expect(iconSvg(link.icon)).not.toBe("");
    expect(socialIconSvg(social.platform)).toBe(glyphSvg(ICONS.link));
  });
});

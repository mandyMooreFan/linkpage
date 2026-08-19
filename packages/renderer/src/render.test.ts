import { describe, expect, it } from "vitest";
import { escapeHtml, render, safeUrl } from "./render.js";
import { MINIMAL as base, POPULATED as full, POPULATED_DARK as dark } from "./fixtures.js";
import { SHAPES } from "./chrome.js";
import type { Project } from "./project.js";

/**
 * The renderer's own tests. The three invariant guards live in `invariants.test.ts` and are
 * run against these fixtures there; what is checked here is what SPEC.md §5.3 asks for on top
 * of them — **per-section snapshots** — plus the behaviour the snapshots cannot state:
 * the fixed order, the totality rules of §4.7, and the two places owner text is refused rather
 * than escaped.
 *
 * Snapshots cover the `<main>` block rather than the whole document, so a section's diff is a
 * section's diff and not two kilobytes of unchanged stylesheet. One whole-document snapshot
 * pins the skeleton and the CSS.
 */

/** The page itself, without the stylesheet — the unit a section snapshot is about. */
function page(project: Project): string {
  const html = render(project);
  const start = html.indexOf('<main class="lp-page"');
  return html.slice(start, html.indexOf("</main>") + "</main>".length);
}

/** The `:root` token block, which is where the palette reaches the page. */
function tokens(project: Project): string {
  return /:root\{([^}]*)\}/.exec(render(project))?.[1] ?? "";
}

// ---------------------------------------------------------------------------
// The document
// ---------------------------------------------------------------------------

describe("the document skeleton", () => {
  it("returns a complete HTML document", () => {
    const html = render(base);
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html.trimEnd().endsWith("</html>")).toBe(true);
    expect(html).toContain('<meta charset="utf-8">');
    expect(html).toContain('<meta name="viewport" content="width=device-width, initial-scale=1">');
  });

  it("carries the project's lang, which WCAG 2.2 SC 3.1.1 requires", () => {
    expect(render({ ...base, lang: "cy" })).toContain('<html lang="cy" dir="ltr">');
    expect(render({ ...base, lang: "pt-BR" })).toContain('<html lang="pt-BR" dir="ltr">');
  });

  it("falls back to en when lang is not a language tag", () => {
    for (const lang of ["", "  ", "not a tag", 'en" onload="x', "javascript:x"]) {
      expect(render({ ...base, lang } as Project)).toContain('<html lang="en" dir="ltr">');
    }
  });

  /**
   * The other half of #48. A page that declares Arabic and lays itself out left to right has
   * declared a language it does not support — only visibly rather than subtly. `dir` is
   * emitted unconditionally: a document's base direction is a thing to state, not a thing to
   * inherit from whichever default the reader's browser holds.
   */
  it("declares the direction the page reads in, both ways round", () => {
    expect(render({ ...base, lang: "ar" })).toContain('<html lang="ar" dir="rtl">');
    expect(render({ ...base, lang: "he-IL" })).toContain('<html lang="he-IL" dir="rtl">');
    expect(render({ ...base, lang: "ja" })).toContain('<html lang="ja" dir="ltr">');
    // A tag we could not use declares `en`, and `en` reads left to right — the declaration and
    // the layout are never allowed to disagree.
    expect(render({ ...base, lang: "not a tag" } as Project)).toContain('dir="ltr"');
  });

  /**
   * And nothing in the stylesheet pins the page to one side, so `dir` is enough on its own.
   */
  it("names no physical side in the stylesheet, so dir is all the layout needs", () => {
    const html = render(full);
    for (const shape of SHAPES) {
      const styled = render({ ...full, style: { ...full.style, shape } } as Project);
      expect(styled).not.toMatch(/(?:text-align|float|clear):\s*(?:left|right)/);
      expect(styled).not.toMatch(/(?:margin|padding|border)-(?:left|right)\b/);
    }
    expect(html).toContain("text-align:end");
  });

  it("titles the page with the business name, then the tagline, then nothing", () => {
    expect(render(base)).toContain("<title>Ada&#39;s Bakery</title>");
    expect(render({ ...base, header: { tagline: "Sourdough", logo: null } } as Project)).toContain(
      "<title>Sourdough</title>",
    );
    // Never the product's own name: §6.7 rules out a visible credit in any form, and a browser
    // tab is about as visible as it gets.
    expect(render({ ...base, header: { logo: null } } as Project)).toContain("<title></title>");
  });

  it("puts the column cap in rem, not px (§6.2)", () => {
    const html = render(base);
    expect(html).toContain("width:min(100%, 25rem)");
    expect(html).not.toMatch(/max-width:\s*400px/);
  });

  it("takes every colour from the palette and names it as a role", () => {
    expect(tokens(base)).toMatchSnapshot();
    expect(tokens(dark)).toMatchSnapshot();
  });

  it("renders the whole page", () => {
    expect(render(full)).toMatchSnapshot();
  });
});

// ---------------------------------------------------------------------------
// Order
// ---------------------------------------------------------------------------

describe("the six sections are in one fixed order (§2.1)", () => {
  it("renders header, links, hours, contact, address, social", () => {
    const html = page(full);
    const marks = [
      'class="lp-header"',
      'class="lp-links"',
      'class="lp-hours"',
      'class="lp-rows"',
      'class="lp-address"',
      'class="lp-social"',
    ];
    const positions = marks.map((mark) => html.indexOf(mark));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it("is not moved by the order the keys arrive in", () => {
    // There is no `order` field and no reordering control; key order in the file is an
    // accident of whoever wrote it and must not reach the page.
    const reversed = {
      social: full.social,
      address: full.address,
      contact: full.contact,
      hours: full.hours,
      links: full.links,
      header: full.header,
      style: full.style,
      lang: full.lang,
      version: full.version,
    } as Project;
    expect(render(reversed)).toBe(render(full));
  });

  it("omits a missing section rather than leaving a gap for it", () => {
    const html = page(base);
    expect(html).toContain('class="lp-header"');
    for (const mark of ["lp-hours", "lp-rows", "lp-address", "lp-social", "lp-links"]) {
      expect(html).not.toContain(mark);
    }
  });
});

// ---------------------------------------------------------------------------
// Per-section snapshots
// ---------------------------------------------------------------------------

describe("header", () => {
  it("renders name, tagline and logo", () => {
    expect(page({ ...base, header: full.header })).toMatchSnapshot();
  });

  it("renders the name alone", () => {
    expect(page(base)).toMatchSnapshot();
  });

  it("emits the logo's dimensions, and alt='' unconditionally (§6.6)", () => {
    const html = page({ ...base, header: full.header });
    expect(html).toContain('alt="" width="1200" height="400"');
  });

  it("drops a logo whose src is not an inlined image", () => {
    for (const src of ["https://cdn.example/logo.png", "./logo.png", "", "data:text/html,x"]) {
      const header = { ...full.header, logo: { src, width: 10, height: 10 } };
      expect(page({ ...base, header } as Project)).not.toContain("lp-logo");
    }
  });
});

describe("links", () => {
  it("renders a button per link, with and without a glyph", () => {
    expect(page({ ...base, links: full.links })).toMatchSnapshot();
  });

  it("renders no glyph for an unrecognised icon name (§4.4)", () => {
    const links = [
      { label: "Shop", url: "https://x.example", icon: "sparkles" },
    ] as unknown as Project["links"];
    expect(page({ ...base, links })).not.toContain("<svg");
  });

  it("omits a link missing its label or its destination", () => {
    const links = [
      { label: "No url" },
      { url: "https://x.example" },
      { label: "   ", url: "https://x.example" },
      { label: "Fine", url: "https://x.example/ok" },
    ] as Project["links"];
    const html = page({ ...base, links });
    expect(html.match(/lp-link"/g)).toHaveLength(1);
    expect(html).toContain("Fine");
  });
});

describe("hours", () => {
  it("renders a row per specified day, closed days included, plus the note", () => {
    expect(page({ ...base, hours: full.hours })).toMatchSnapshot();
  });

  it("renders the 24-hour clock and a Sunday-first week", () => {
    const hours = { ...full.hours, clock: "24h", weekStart: "sun" } as Project["hours"];
    expect(page({ ...base, hours })).toMatchSnapshot();
  });

  it("renders the note on its own when no day is specified", () => {
    const hours = { clock: "24h", weekStart: "mon", days: {}, note: "By appointment." } as const;
    const html = page({ ...base, hours });
    expect(html).toContain("By appointment.");
    expect(html).not.toContain("lp-hours");
  });

  it("renders a translated, right-to-left week", () => {
    expect(page({ ...base, lang: "ar", hours: full.hours })).toMatchSnapshot();
  });

  /**
   * #48, end to end: the Cardiff bakery. The eight words the renderer writes are the only
   * words on the page that are not the owner's, and they now follow the tag the page declares
   * rather than staying English underneath it.
   */
  it("writes its own eight words in the language the page declares", () => {
    const welsh = render({ ...base, lang: "cy", hours: full.hours });
    expect(welsh).toContain('<html lang="cy" dir="ltr">');
    expect(welsh).toContain(">Llun</dt>");
    expect(welsh).toContain(">Ar gau<");
    for (const english of [">Mon<", ">Sun<", ">Closed<"]) expect(welsh).not.toContain(english);
  });

  it("falls back to English words rather than failing on a language it does not hold", () => {
    // A visible limitation beats a guess: the wrong word in the owner's own language is worse
    // than the honest foreign one (`locale.ts`).
    const html = render({ ...base, lang: "qq-ZZ", hours: full.hours });
    expect(html).toContain('<html lang="qq-ZZ" dir="ltr">');
    expect(html).toContain(">Mon</dt>");
    expect(html).toContain(">Closed<");
  });

  it("leaves the owner's own values alone when it translates its own", () => {
    // The times are formatted by rule from stored `"HH:MM"`, and the note is the owner's
    // prose. Neither is ours to translate, and neither moves.
    const hours = { ...full.hours, clock: "24h" } as Project["hours"];
    const english = page({ ...base, lang: "en", hours });
    const japanese = page({ ...base, lang: "ja", hours });
    expect(japanese).toContain(">月</dt>");
    expect(japanese).toContain(">定休日<");
    for (const times of english.match(/<dd class="lp-times">.*?<\/dd>/g) ?? []) {
      if (!times.includes("Closed")) expect(japanese).toContain(times);
    }
    expect(japanese).toContain(escapeHtml(full.hours!.note!));
  });
});

describe("the derived link target (§2.3)", () => {
  const button = (url: string) => page({ ...base, links: [{ label: "Order online", url }] });
  const hrefIn = (html: string) => /href="([^"]*)"/.exec(html)?.[1];

  it("mends a scheme-less address that looks like a host", () => {
    // The live defect this closes: stored raw, this exported as a relative link that 404s on
    // the owner's own published page.
    expect(hrefIn(button("facebook.com/mybakery"))).toBe("https://facebook.com/mybakery");
    expect(hrefIn(button("mybakery.com"))).toBe("https://mybakery.com");
    expect(hrefIn(button("mybakery.com/menu?x=1#top"))).toBe("https://mybakery.com/menu?x=1#top");
  });

  it("leaves a scheme-bearing address exactly as typed", () => {
    // The escape for an http-only owner, and the reason `https://` can be unconditional.
    expect(hrefIn(button("http://mybakery.com"))).toBe("http://mybakery.com");
    expect(hrefIn(button("https://mybakery.com/"))).toBe("https://mybakery.com/");
  });

  it("does not normalise what it prepends to", () => {
    // A string prepend rather than `new URL`, which would add a trailing slash and
    // percent-encode — rewriting the owner's target, which is the class §6.7 is wariest of.
    expect(hrefIn(button("mybakery.com/Ada Menu"))).toBe("https://mybakery.com/Ada Menu");
    // And no trailing slash invented on a bare domain, which `new URL` would add.
    expect(hrefIn(button("mybakery.com"))).toBe("https://mybakery.com");
  });

  it("refuses a relative path rather than inventing a host from it", () => {
    // The whole reason the gate exists. A naive prepend turns this into `https://menu/` — a
    // confident link to a different site — where today it merely 404s on the owner's own.
    expect(button("/menu")).not.toContain("lp-link");
    expect(button("?page=2")).not.toContain("lp-link");
    expect(button("#top")).not.toContain("lp-link");
  });

  it("refuses a handle, because a handle is not a URL", () => {
    expect(button("@mybakery")).not.toContain("lp-link");
    expect(button("@user@instance.social")).not.toContain("lp-link");
  });

  it("refuses a bare word and a phrase", () => {
    expect(button("menu")).not.toContain("lp-link");
    expect(button("see our menu")).not.toContain("lp-link");
    expect(button("my bakery.com")).not.toContain("lp-link");
  });

  it("mends a domain that does not exist, and that limit is stated rather than hidden", () => {
    // `mybakery.couk` passes every clause the gate can check. Nothing available to us can tell
    // a real TLD from a typo'd one, and a probe is opaque under CORS.
    expect(hrefIn(button("mybakery.couk"))).toBe("https://mybakery.couk");
  });

  it("omits the button rather than rendering one that goes nowhere", () => {
    // Deliberate, and the cost is stated in SPEC.md §2.3: the owner's button disappears from
    // their published page until they fix it. The alternative — a thing carrying `.lp-link`
    // that does not link — puts a lie in front of every visitor, where §7.4 and §7.7 can tell
    // the owner. The owner can be told; the visitor cannot.
    const html = button("/menu");
    expect(html).not.toContain("Order online");
    expect(html).not.toContain("lp-links");
  });

  it("still refuses what invariant 1 forbids", () => {
    // The mend sits beside `safeUrl` and after it, never around it.
    expect(button("javascript:alert(1)")).not.toContain("lp-link");
    expect(button("data:text/html,x")).not.toContain("lp-link");
  });
});

describe("the email floor (§2.3)", () => {
  const mail = (email: string) => page({ ...base, contact: { email } });

  it("accepts a non-ASCII address, which the old shape rejected", () => {
    // `josé@café.fr` is a real address and the previous regex refused it on both sides.
    expect(mail("josé@café.fr")).toContain('href="mailto:josé@café.fr"');
  });

  it("holds the structure it always held", () => {
    expect(mail("hello@mybakery.com")).toContain('href="mailto:hello@mybakery.com"');
    expect(mail("no-at-sign.com")).not.toContain("mailto:");
    expect(mail("@mybakery.com")).not.toContain("mailto:");
    expect(mail("hello@")).not.toContain("mailto:");
    expect(mail("two@at@signs.com")).not.toContain("mailto:");
    expect(mail("hello@nodot")).not.toContain("mailto:");
  });

  it("refuses whitespace and a colon, which is not tidiness", () => {
    // `mailtoHref` never passes through `safeUrl`, so this is the one URL in the document with
    // no scheme check behind it. Both clauses are what stands in for one.
    expect(mail("hello there@mybakery.com")).not.toContain("mailto:");
    expect(mail("javascript:x@mybakery.com")).not.toContain("mailto:");
  });

  it("keeps the owner's text on the page when it refuses", () => {
    expect(mail("hello@nodot")).toContain("hello@nodot");
  });
});

describe("contact", () => {
  it("renders the phone as tel: and the email as mailto:", () => {
    expect(page({ ...base, contact: full.contact })).toMatchSnapshot();
  });

  it("normalises only the href, never the text the owner typed", () => {
    const html = page({ ...base, contact: { phone: "+44 20 7123 4567" } });
    expect(html).toContain('href="tel:+442071234567"');
    expect(html).toContain("+44 20 7123 4567");
    expect(page({ ...base, contact: { phone: "020 7123 4567" } })).toContain(
      'href="tel:02071234567"',
    );
  });

  // §2.3's four clauses. The six notations below are the ones businesses actually print, and
  // four of them were broken before the rule existed — see `telHref`'s comment for what each
  // one used to do.
  describe("the tel: target (§2.3)", () => {
    const tel = (phone: string) => page({ ...base, contact: { phone } });

    it("dials a plain national number, and an international one", () => {
      expect(tel("020 7123 4567")).toContain('href="tel:02071234567"');
      expect(tel("+44 20 7123 4567")).toContain('href="tel:+442071234567"');
    });

    it("drops a parenthesised trunk zero behind a country code", () => {
      // Not a guess: the owner supplied the country, and `(0)` is their own notation for
      // "omit this when calling in". Keeping it dialled a dead number.
      expect(tel("+44 (0)161 496 0000")).toContain('href="tel:+441614960000"');
      expect(tel("+44(0)161 496 0000")).toContain('href="tel:+441614960000"');
    });

    it("leaves a bare parenthesised area code alone", () => {
      // Clause 3 fires only behind a leading `+CC`. A US number has no country code here and
      // its parentheses mean something else entirely.
      expect(tel("(0161) 496 0000")).toContain('href="tel:01614960000"');
    });

    it("refuses a vanity number rather than dialling part of it", () => {
      // The worst of the old behaviour: `0800 CHICKEN` became `tel:0800`, which is not a dead
      // link, it is a *wrong number that connects*.
      const html = tel("0800 CHICKEN");
      expect(html).toContain("0800 CHICKEN");
      expect(html).not.toContain("tel:");
    });

    it("refuses an extension rather than dialling the number without it", () => {
      const html = tel("020 7123 4567 ext 12");
      expect(html).toContain("020 7123 4567 ext 12");
      expect(html).not.toContain("tel:");
    });

    it("refuses two numbers sharing one box", () => {
      // Caught twice over: the separator is out of charset, and the digits exceed 15.
      expect(tel("020 7123 4567 / 020 7123 4568")).not.toContain("tel:");
      expect(tel("020 7123 4567 020 7123 4568")).not.toContain("tel:");
    });

    it("bounds the digits at both ends", () => {
      expect(tel("123")).not.toContain("tel:");
      expect(tel("1234")).toContain('href="tel:1234"');
      expect(tel("123456789012345")).toContain("tel:123456789012345");
      expect(tel("1234567890123456")).not.toContain("tel:");
    });

    it("permits a `+` only at the front", () => {
      expect(tel("020 7123 4567+020 7123 4568")).not.toContain("tel:");
    });

    it("still shows the owner's own text whenever it refuses", () => {
      // The number reads correctly on the page in every case above; only the tap-to-call is
      // withheld. §7.9 is what tells the owner so.
      const html = tel("0800 CHICKEN");
      expect(html).toContain('<span itemprop="telephone">0800 CHICKEN</span>');
    });

    it("does not catch a number that is merely mistyped, and that limit is deliberate", () => {
      // A UK mobile a digit short. Catching this needs the country §2.3 declined to learn.
      expect(tel("07700 90012")).toContain('href="tel:0770090012"');
    });
  });

  it("keeps a value it cannot turn into a link, as text", () => {
    const html = page({ ...base, contact: { phone: "ask at the counter", email: "not an email" } });
    expect(html).toContain("ask at the counter");
    expect(html).toContain("not an email");
    expect(html).not.toContain("href=");
  });

  it("renders nothing when neither detail is there", () => {
    expect(page({ ...base, contact: {} })).not.toContain("lp-rows");
  });
});

describe("address", () => {
  it("renders free-text lines as the directions link", () => {
    expect(page({ ...base, address: full.address })).toMatchSnapshot();
  });

  it("renders the lines alone when there is no directions URL", () => {
    const html = page({ ...base, address: { lines: full.address?.lines ?? [] } });
    expect(html).toContain('<p class="lp-address">');
    expect(html).not.toContain('<a class="lp-address"');
  });

  it("drops blank lines and renders nothing when none survive", () => {
    expect(page({ ...base, address: { lines: ["", "  ", "London"] } })).toContain("London");
    expect(page({ ...base, address: { lines: ["", "  "] } })).not.toContain("lp-address");
    expect(page({ ...base, address: { lines: [] } })).not.toContain("lp-address");
  });
});

describe("social", () => {
  it("renders brand marks, and the generic glyph for a platform without one", () => {
    expect(page({ ...base, social: full.social })).toMatchSnapshot();
  });

  it("names an unrecognised platform by its host rather than by a capitalisation rule", () => {
    const social = [{ platform: "my-forum", url: "https://www.Forum.example/u/ada" }];
    expect(page({ ...base, social })).toContain(
      '<span class="lp-social-name">forum.example</span>',
    );
  });

  it("shows the name of a platform we have no mark for, and hides it for one we do", () => {
    // #45: a row of marks identifies each entry by its mark. An entry with no mark has nothing
    // to identify it, so the name — already computed, already correct — is shown instead of
    // hidden. A marked entry keeps its name for assistive technology only.
    const marked = page({ ...base, social: [{ platform: "instagram", url: "https://i.example" }] });
    expect(marked).toContain('<span class="lp-sr">');
    expect(marked).not.toContain("lp-social-name");

    const unmarked = page({
      ...base,
      social: [{ platform: "linkedin", url: "https://li.example" }],
    });
    expect(unmarked).toContain('<span class="lp-social-name">li.example</span>');
    expect(unmarked).toContain("lp-social-link--named");
  });

  it("tells two unmarked platforms apart — the failure #45 was filed for", () => {
    const html = page({
      ...base,
      social: [
        { platform: "linkedin", url: "https://www.linkedin.com/in/ada" },
        { platform: "my-forum", url: "https://forum.example/u/ada" },
      ],
    });
    // Before this, both were an identical anonymous chain-link glyph with nothing to
    // distinguish them to a sighted reader.
    expect(html).toContain('<span class="lp-social-name">linkedin.com</span>');
    expect(html).toContain('<span class="lp-social-name">forum.example</span>');
  });

  it("falls back to the platform, then to the URL, when there is no host", () => {
    // `mailto:` carries no host, and is a scheme so §2.3's mend leaves it alone.
    expect(
      page({ ...base, social: [{ platform: "carrier pigeon", url: "mailto:ada@example.com" }] }),
    ).toContain("carrier pigeon");
    expect(
      page({ ...base, social: [{ url: "mailto:ada@example.com" }] as Project["social"] }),
    ).toContain('<span class="lp-social-name">mailto:ada@example.com</span>');
  });

  it("has no target for a scheme-less value that does not look like a host", () => {
    // The gate, on the social field. See the `linkHref` block under "links" for the full set.
    expect(page({ ...base, social: [{ platform: "instagram", url: "@mybakery" }] })).not.toContain(
      "lp-social",
    );
  });

  it("omits an entry with no destination, because the link is the point", () => {
    expect(
      page({ ...base, social: [{ platform: "instagram" }] as Project["social"] }),
    ).not.toContain("lp-social");
  });
});

// ---------------------------------------------------------------------------
// Totality (SPEC.md §4.7)
// ---------------------------------------------------------------------------

/** What a hand-edited `project.json` can hold where a section belongs. */
const WRONG: unknown[] = [null, 0, true, "", "text", [], [null], {}, { nested: {} }];

describe("the renderer is total across all six sections", () => {
  const keys = ["header", "links", "hours", "contact", "address", "social", "style"] as const;

  it.each(keys)("treats a wrong-typed %s as absent instead of throwing", (key) => {
    for (const value of WRONG) {
      let html = "";
      expect(
        () => {
          html = render({ ...full, [key]: value } as Project);
        },
        `${key} = ${JSON.stringify(value)}`,
      ).not.toThrow();
      expect(typeof html).toBe("string");
      expect(html.startsWith("<!doctype html>")).toBe(true);
    }
  });

  it("ignores unknown keys entirely (§4.5)", () => {
    const withJunk = { ...full, hourz: { mon: "9-5" }, order: ["social"], preset: "cafe" };
    expect(render(withJunk as Project)).toBe(render(full));
  });

  it("renders a document even when handed nothing at all", () => {
    for (const value of [undefined, null, "", 0, [], {}]) {
      const html = render(value as Project);
      expect(html.startsWith("<!doctype html>")).toBe(true);
      expect(html.trimEnd().endsWith("</html>")).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Escaping and URLs
// ---------------------------------------------------------------------------

describe("escapeHtml", () => {
  it("escapes the five characters that matter", () => {
    expect(escapeHtml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;");
  });

  it("reads a non-string as absent rather than coercing it", () => {
    expect(escapeHtml(undefined as unknown as string)).toBe("");
    expect(escapeHtml(7 as unknown as string)).toBe("");
  });
});

describe("render escapes project text rather than trusting it", () => {
  it("escapes a business name that is markup", () => {
    const header = { ...base.header, name: '<img src=x onerror="alert(1)">' };
    const html = render({ ...base, header });
    expect(html).not.toMatch(/<img src=x/i);
    expect(html).toContain("&lt;img");
  });

  it.each([
    [
      "tagline",
      { header: { name: "A", logo: null, tagline: "</style><script>alert(1)</script>" } },
    ],
    ["link label", { links: [{ label: "</a><script>x</script>", url: "https://x.example" }] }],
    ["hours note", { hours: { clock: "24h", weekStart: "mon", days: {}, note: "<script>x" } }],
    ["phone", { contact: { phone: '"><script>x</script>' } }],
    ["address line", { address: { lines: ["<script>x</script>"] } }],
    ["platform", { social: [{ platform: "<script>x</script>", url: "https://x.example" }] }],
  ])("escapes a %s that is markup", (_what, patch) => {
    expect(render({ ...base, ...patch } as Project)).not.toMatch(/<script/i);
  });
});

describe("safeUrl", () => {
  it("keeps the four schemes a page needs", () => {
    for (const url of [
      "https://example.com/a?b=1&c=2",
      "http://example.com",
      "mailto:ada@example.com",
      "tel:+442071234567",
      "/relative",
      "//example.com/protocol-relative",
    ]) {
      expect(safeUrl(url), url).toBe(url);
    }
  });

  it("refuses a scheme that can execute or embed", () => {
    for (const url of [
      "javascript:alert(1)",
      "JaVaScRiPt:alert(1)",
      "  javascript:alert(1)  ",
      "data:text/html,<script>alert(1)</script>",
      "vbscript:msgbox(1)",
      "file:///etc/passwd",
      "/search?q=javascript:alert(1)",
    ]) {
      expect(safeUrl(url), url).toBeUndefined();
    }
  });

  it("refuses a control character rather than stripping it back into life", () => {
    expect(safeUrl("java\tscript:alert(1)")).toBeUndefined();
    expect(safeUrl("java\nscript:alert(1)")).toBeUndefined();
    expect(safeUrl("https://example.com/\u0000")).toBeUndefined();
    // Surrounding whitespace is trimmed, not refused — it is a typo, not an attack.
    expect(safeUrl("  https://example.com/  ")).toBe("https://example.com/");
  });

  it("reads a wrong-typed URL as absent", () => {
    for (const value of [undefined, null, 1, true, [], {}, "   "]) {
      expect(safeUrl(value)).toBeUndefined();
    }
  });

  it("keeps a refused URL out of the page without taking the page down with it", () => {
    const links = [{ label: "Tap me", url: "javascript:alert(1)" }] as Project["links"];
    const html = render({ ...base, links });
    expect(html).not.toMatch(/javascript:/i);
    expect(html).not.toContain("Tap me");
    expect(html).toContain("Ada&#39;s Bakery");
  });
});

// ---------------------------------------------------------------------------
// Provenance (SPEC.md §6.7)
// ---------------------------------------------------------------------------

/**
 * Determinism and the size budget — the other half of §6.7 and the whole of §6.5 — are
 * measured on the bytes and live in `size.test.ts`.
 */
describe("provenance", () => {
  it("says what made the file, in a comment and a meta tag", () => {
    const html = render(base);
    expect(html).toContain("<!-- Built with linkpage: https://github.com/mandyMooreFan/linkpage");
    expect(html).toContain('<meta name="generator" content="linkpage">');
  });

  it("puts the comment where a reader opening the file will see it", () => {
    // Second line, between the doctype and `<html>` — legal there, and ahead of the charset
    // declaration only by ASCII, so nothing has to be guessed at to read it.
    const lines = render(base).split("\n");
    expect(lines[1]).toMatch(/^<!--/);
    expect(lines[1]).toMatch(/^[\x20-\x7e]*$/);
  });

  it("credits nothing visibly, in any form", () => {
    // §6.7 is absolute about this, so the check is on the whole document with the two
    // permitted mentions taken out rather than on the places a credit is expected.
    const html = render(full)
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<meta name="generator"[^>]*>/g, "");
    expect(html.toLowerCase()).not.toContain("linkpage");
  });

  it("embeds no round-trip payload, which v1 does not offer (§6.7)", () => {
    expect(render(full)).not.toContain(JSON.stringify(full.links));
  });
});

// ---------------------------------------------------------------------------
// Meta (SPEC.md §6.4)
// ---------------------------------------------------------------------------

describe("the head's meta", () => {
  it("describes the page with the owner's tagline, and omits it when there is none", () => {
    expect(render(full)).toContain(
      '<meta name="description" content="Sourdough &amp; pastries since 1994">',
    );
    expect(render(base)).not.toContain('name="description"');
  });

  it("fakes no og:image, and no other og tag either (§6.4)", () => {
    // A scraper needs a fetchable URL and the export is one file, so shared links preview as
    // text, permanently. The remaining og tags would only restate <title> and the description,
    // which every scraper already falls back to.
    const html = render(full);
    expect(html).not.toMatch(/og:/i);
    expect(html).not.toMatch(/twitter:/i);
  });

  it("claims no canonical URL, because it does not know one", () => {
    expect(render(full)).not.toMatch(/rel="canonical"/i);
  });
});

// ---------------------------------------------------------------------------
// Microdata (SPEC.md §6.4)
// ---------------------------------------------------------------------------

describe("LocalBusiness microdata", () => {
  it("scopes the page as a LocalBusiness", () => {
    expect(render(base)).toContain(
      '<main class="lp-page" itemscope itemtype="https://schema.org/LocalBusiness">',
    );
  });

  it("carries name and description from the header", () => {
    const html = page(full);
    expect(html).toContain('<h1 class="lp-name" itemprop="name">');
    expect(html).toContain('<p class="lp-tagline" itemprop="description">');
  });

  it("claims no logo property, because a data: URI is not a logo anyone can fetch", () => {
    // The same sentence §6.4 writes about og:image, arriving in a different attribute:
    // validator.schema.org extracts an https logo and silently drops the identical markup with
    // a data: URI. See `headerSection`.
    expect(page(full)).toContain('<img class="lp-logo" src="data:image/png');
    expect(page(full)).not.toContain('itemprop="logo"');
    expect(page(full)).not.toContain('itemprop="image"');
  });

  it("takes telephone and email from the text, not from the normalised href", () => {
    // On an <a>, microdata reads the href — which would publish `tel:+442071234567`, our
    // normalisation, where schema.org asks for the number the owner wrote.
    const html = page(full);
    expect(html).toContain('<span itemprop="telephone">020 7123 4567</span>');
    expect(html).toContain('<span itemprop="email">hello@adasbakery.example</span>');
    expect(html).not.toContain('<a class="lp-row" itemprop=');
  });

  it("keeps the properties when a detail cannot be turned into a link", () => {
    const project = { ...base, contact: { phone: "call the shop", email: "ask inside" } };
    const html = page(project as Project);
    expect(html).toContain('<span itemprop="telephone">call the shop</span>');
    expect(html).toContain('<span itemprop="email">ask inside</span>');
  });

  it("publishes the address as text and the directions link as hasMap", () => {
    const html = page(full);
    expect(html).toContain('itemprop="hasMap" href="https://maps.example/?q=12+Baker+Street"');
    expect(html).toContain('<span itemprop="address">12 Baker Street<br>\nLondon<br>\nNW1 6XE');
  });

  it("keeps the address property when there is no directions URL", () => {
    const project = { ...base, address: { lines: ["12 Baker Street"] } };
    expect(page(project as Project)).toContain('<span itemprop="address">12 Baker Street</span>');
  });

  it("marks social profiles sameAs and link buttons nothing", () => {
    const html = page(full);
    expect(html).toContain(
      '<a class="lp-social-link" itemprop="sameAs" href="https://instagram.com/adasbakery">',
    );
    expect(html).not.toContain('<a class="lp-link" itemprop=');
  });

  it("emits the same microdata in every shape, because the markup does not know the shape", () => {
    const props = (project: Project): string[] =>
      [...render(project).matchAll(/itemprop="([a-zA-Z]+)"/g)].map((m) => m[1]!);
    const centred = props(full);
    for (const shape of SHAPES) {
      expect(props({ ...full, style: { ...full.style!, shape } })).toEqual(centred);
    }
  });
});

// ---------------------------------------------------------------------------
// Determinism (SPEC.md §6.7 — measured on the bytes in `size.test.ts`)
// ---------------------------------------------------------------------------

describe("determinism", () => {
  it("renders the same bytes twice for the same input", () => {
    expect(render(full)).toBe(render(full));
  });
});

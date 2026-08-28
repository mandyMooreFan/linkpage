import { describe, expect, it, vi } from "vitest";
import {
  VOCABULARIES,
  dayName,
  direction,
  isEnglishFallback,
  languageTag,
  vocabulary,
  type Vocabulary,
} from "./locale.js";
import type { Weekday } from "./project.js";

/**
 * `locale.ts` is a vendored table plus two lookups (#48), so it is tested the way `icons.ts`
 * is: the table has to hold its shape, and the lookups have to degrade rather than fail.
 *
 * The one thing these tests deliberately do **not** do is assert that a translation is
 * correct. Nothing in a test suite can check that — the weekday abbreviations are checkable
 * against a CLDR version and the closed word is only checkable by a speaker, which is exactly
 * what `locale.ts`'s growth rule says and why corrections are welcome and are not a version
 * bump (SPEC.md §4.8).
 */

const WEEK: readonly Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

/** Every string in one entry, so a new word cannot be added without the shape rules seeing it. */
const hand = (words: Vocabulary): readonly string[] => [
  ...words.days,
  words.closed,
  words.hours,
  words.directions,
];

describe("the vendored table", () => {
  const entries = Object.entries(VOCABULARIES);

  it("is keyed by lowercase tags, so the lookup's own lowercasing can find them", () => {
    for (const [key] of entries) expect(key).toBe(key.toLowerCase());
  });

  it("gives every language seven abbreviations and all three hand-written words, none blank", () => {
    for (const [key, words] of entries) {
      expect(words.days, key).toHaveLength(7);
      for (const day of words.days) expect(day.trim(), key).not.toBe("");
      expect(words.closed.trim(), key).not.toBe("");
      expect(words.hours.trim(), key).not.toBe("");
      expect(words.directions.trim(), key).not.toBe("");
    }
  });

  it("holds no leading or trailing whitespace, which would reach the page as-is", () => {
    for (const [key, words] of entries) {
      for (const value of hand(words)) expect(value, key).toBe(value.trim());
    }
  });

  /**
   * The escaping rule is stricter than it looks, and the *opening hours* word is where it bites:
   * the natural French and Catalan phrases carry an apostrophe, and `escapeHtml` would spend
   * five bytes on `&#39;` for each one. The typographic `’` is both the correct character and
   * the cheap one, and this assertion is what keeps the straight quote out.
   *
   * The *directions* word met the same trap and dodged it rather than paying it: French
   * *Itinéraire* and Catalan *Com arribar-hi* are the natural phrasings and neither carries an
   * apostrophe at all, so no entry needed the substitution. **That is a measured outcome, not a
   * rule that stopped applying** — this assertion is what will catch the next drafted word, in
   * whichever language, that reaches for a straight quote.
   */
  it("carries nothing that would have to be escaped into markup", () => {
    for (const [key, words] of entries) {
      for (const value of hand(words)) {
        expect(value, key).not.toMatch(/[<>&"']/);
      }
    }
  });

  it("holds the languages #48 and §2.3 name by example", () => {
    // The Cardiff bakery, the Japanese owner, and the two right-to-left languages that make
    // `direction` load-bearing rather than theoretical.
    for (const tag of ["cy", "ja", "ar", "he"]) expect(VOCABULARIES[tag], tag).toBeDefined();
  });

  it("reads a day out of the Monday-first tuple by name", () => {
    const cy = vocabulary("cy");
    expect(WEEK.map((day) => dayName(cy, day))).toEqual([
      "Llun",
      "Maw",
      "Mer",
      "Iau",
      "Gwe",
      "Sad",
      "Sul",
    ]);
  });
});

describe("vocabulary", () => {
  it("finds an exact tag", () => {
    expect(vocabulary("cy").closed).toBe("Ar gau");
    expect(vocabulary("cy").hours).toBe("Oriau agor");
    expect(vocabulary("cy").directions).toBe("Cyfarwyddiadau");
    expect(vocabulary("fr").days[0]).toBe("lun.");
  });

  it("is case-insensitive, because a tag's case is cosmetic in BCP 47", () => {
    expect(vocabulary("CY")).toBe(vocabulary("cy"));
    expect(vocabulary("zh-Hant")).toBe(vocabulary("zh-hant"));
  });

  /**
   * RFC 4647's "lookup" in miniature — one entry per language serves every region of it,
   * which is the whole reason the table is small enough to read.
   */
  it("truncates subtags until something matches", () => {
    expect(vocabulary("cy-GB")).toBe(vocabulary("cy"));
    expect(vocabulary("pt-BR")).toBe(vocabulary("pt"));
    expect(vocabulary("pt-PT")).toBe(vocabulary("pt"));
    expect(vocabulary("de-AT-1996")).toBe(vocabulary("de"));
    expect(vocabulary("en-US-u-ca-gregory")).toBe(vocabulary("en"));
  });

  it("resolves the tags truncation would get wrong", () => {
    // Traditional-script regions carry no script subtag, so `zh-TW` would truncate to the
    // simplified entry and hand a Taipei reader `周一` instead of `週一`.
    expect(vocabulary("zh-TW")).toBe(vocabulary("zh-hant"));
    expect(vocabulary("zh-HK")).toBe(vocabulary("zh-hant"));
    expect(vocabulary("zh-Hant-TW")).toBe(vocabulary("zh-hant"));
    expect(vocabulary("zh-CN")).toBe(vocabulary("zh"));
    // The Norwegian macrolanguage, which Chrome reports and CLDR resolves to Bokmål.
    expect(vocabulary("no")).toBe(vocabulary("nb"));
  });

  /**
   * §4.7: the renderer is total, and this is the path a hand-edited `project.json` takes.
   * English is a limitation the page wears visibly; a throw would blank the preview and a
   * guess would put the wrong word in the owner's own language.
   */
  it("falls back to English for anything it does not hold", () => {
    const en = vocabulary("en");
    for (const value of ["qq", "klingon", "x-private", "", "   ", undefined, null, 7, {}, []]) {
      expect(vocabulary(value), String(value)).toBe(en);
    }
  });

  it("never runs away on a tag made of hyphens", () => {
    expect(vocabulary("-".repeat(64))).toBe(vocabulary("en"));
    expect(vocabulary("a-b-c-d-e-f-g-h")).toBe(vocabulary("en"));
  });

  /**
   * The guarantee the whole file exists for (§6.7, §5.2). If any of this reached `Intl`, the
   * same project would render differently in the owner's browser than in the export.
   */
  it("consults no Intl formatter", () => {
    const dateTime = vi.spyOn(Intl, "DateTimeFormat");
    try {
      for (const tag of Object.keys(VOCABULARIES)) vocabulary(tag);
      vocabulary("qq");
      expect(dateTime).not.toHaveBeenCalled();
    } finally {
      dateTime.mockRestore();
    }
  });
});

/**
 * **CL-7** (#282, from #266). The question `render.ts` asks before it decides whether one of
 * its own words needs a `lang` of its own.
 *
 * The distinction this makes is the whole item: falling back to English and *being* English
 * produce the identical vocabulary object, and only one of them is a page saying something
 * untrue about the words in it.
 */
describe("isEnglishFallback", () => {
  it("is false for every language the table holds, which is all of them", () => {
    // The measurement CL-7 turns on. CL-5 and CL-6 drafted both new words in all 42 entries,
    // so no entry is missing a word and no page in the table can reach the fallback.
    for (const tag of Object.keys(VOCABULARIES)) {
      expect(isEnglishFallback(tag), tag).toBe(false);
    }
  });

  it("is false for a tag the lookup reaches by truncation, alias or case", () => {
    // These pages get their own language's words; there is nothing to confess about them.
    for (const tag of ["en-GB", "cy-GB", "pt-BR", "CY", "zh-TW", "no", "en-US-u-ca-gregory"]) {
      expect(isEnglishFallback(tag), tag).toBe(false);
    }
  });

  it("is true for a real language the table has no entry for", () => {
    // Swahili and Persian are the honest cases: valid tags, spoken languages, no entry. The
    // page declares one language and writes English words under it.
    for (const tag of ["sw", "fa", "ur", "af-ZA", "qq"]) {
      expect(isEnglishFallback(tag), tag).toBe(true);
    }
  });

  /**
   * §4.7, and the reason this validates its argument rather than trusting it: a `lang` the
   * renderer could not use is not a fallback. `languageTag` refuses it, the page declares
   * `en`, and the words are then in the language the page declares. Marking them would be a
   * page saying `lang="en"` inside `lang="en"`.
   */
  it("is false for anything that is not a usable tag, because such a page declares English", () => {
    for (const value of ["", "   ", "-".repeat(64), undefined, null, 7, {}, []]) {
      expect(isEnglishFallback(value), String(value)).toBe(false);
      expect(languageTag(value), String(value)).toBe("en");
    }
  });

  it("agrees with vocabulary about which entry a page got", () => {
    // The two answers come from one walk of the table and must not drift apart: a page that
    // is *not* a fallback has words that are not the English ones, unless English is what it
    // asked for.
    for (const tag of Object.keys(VOCABULARIES)) {
      if (tag === "en") continue;
      expect(vocabulary(tag), tag).not.toBe(vocabulary("en"));
    }
    expect(vocabulary("sw")).toBe(vocabulary("en"));
    expect(isEnglishFallback("sw")).toBe(true);
    expect(isEnglishFallback("en")).toBe(false);
  });
});

describe("languageTag", () => {
  it("passes a well-formed tag through, which is what SC 3.1.1 asks for (§4.1)", () => {
    for (const tag of ["en", "cy", "pt-BR", "zh-Hant-TW", "de-AT-1996"]) {
      expect(languageTag(tag)).toBe(tag);
    }
  });

  it("falls back to en for anything that is not tag-shaped", () => {
    for (const value of ["", "  ", "not a tag", 'en" onload="x', "javascript:x", "-en", 7, null]) {
      expect(languageTag(value), String(value)).toBe("en");
    }
  });

  it("trims, because a field holding whitespace is a field left blank", () => {
    expect(languageTag("  cy  ")).toBe("cy");
  });
});

describe("direction", () => {
  it("reads left to right by default, including for every language it has never heard of", () => {
    for (const tag of ["en", "cy", "ja", "zh-Hant", "qq", "klingon"]) {
      expect(direction(tag), tag).toBe("ltr");
    }
  });

  it("reads right to left for the languages whose default script does", () => {
    for (const tag of ["ar", "he", "fa", "ur", "ps", "sd", "ug", "yi", "dv", "ckb"]) {
      expect(direction(tag), tag).toBe("rtl");
    }
  });

  it("keeps the region subtag out of it", () => {
    expect(direction("ar-EG")).toBe("rtl");
    expect(direction("he-IL")).toBe("rtl");
    expect(direction("en-GB")).toBe("ltr");
  });

  /**
   * An explicit script is the strongest signal a tag carries and it wins in both directions.
   * `ku-Latn` is the case that matters: Kurdish is written in both scripts, and the language
   * list alone would get one of them wrong whichever way it was written.
   */
  it("lets an explicit script subtag decide, over the language's default", () => {
    expect(direction("az-Arab")).toBe("rtl");
    expect(direction("pa-Arab")).toBe("rtl");
    expect(direction("ku-Latn")).toBe("ltr");
    expect(direction("ks-Deva")).toBe("ltr");
    expect(direction("sr-Cyrl-RS")).toBe("ltr");
    expect(direction("uz-Latn-UZ")).toBe("ltr");
  });

  it("does not mistake a four-character variant or region for a script", () => {
    // A variant subtag short enough to be four characters has to start with a digit, and a
    // region is two letters or three digits — so a bare four-letter subtag is unambiguous.
    expect(direction("de-AT-1996")).toBe("ltr");
    expect(direction("ar-1901")).toBe("rtl");
  });

  it("is case-insensitive", () => {
    expect(direction("AR")).toBe("rtl");
    expect(direction("az-ARAB")).toBe("rtl");
  });
});

/**
 * Everything the renderer knows about the owner's language tag (`SPEC.md` §4.1): the tag the
 * page declares, the direction it reads in, and the eight words the renderer writes that the
 * owner did not.
 *
 * **Why this file exists.** `<html lang>` is not decoration — it is what we tell assistive
 * technology to trust, and WCAG 2.2 SC 3.1.1 asks for it because a screen reader switches
 * voice on it. The page then wrote eight words of its own, in English, on every page whatever
 * the tag said: a Cardiff bakery declaring `lang="cy"` shipped `Mon`, `Tue`, `Closed`, and a
 * Welsh voice pronounced English abbreviations with Welsh phonetics (#48).
 *
 * **The translatable surface is eight strings and that is by design, not by luck.** §2.3 made
 * the address free text, the contact rows are identified by a glyph rather than by the word
 * "Phone", and the address *is* the directions link. Nothing else on the exported page is our
 * prose. A table is a proportionate answer here precisely because that surface cannot grow
 * without someone noticing.
 *
 * **`Intl.DateTimeFormat` is ruled out, and not on taste.** Its output tracks the ICU data
 * compiled into the host, so the same `project.json` renders differently on two Node versions
 * — which costs §6.7's byte-identical guarantee — and, more sharply, the preview runs in the
 * owner's browser while the tests and the export path run in Node. Two ICU versions means the
 * preview and the artifact could differ *in the bytes*, which is the exact drift §5.2's
 * `srcdoc` iframe exists to make structurally impossible. `size.test.ts` fails the build if
 * anything in the renderer so much as constructs an `Intl` formatter.
 *
 * **So the data is vendored, exactly as the icon set is (§2.4)** — and only the selected
 * language's strings reach the export, so the table costs the §6.5 chrome budget nothing
 * however long it gets.
 *
 * ## Where the strings come from, including the part we cannot cite
 *
 * - **The weekday abbreviations are CLDR's**, extracted once from the `format`/`abbreviated`
 *   weekday names in **Unicode CLDR 48** (via the ICU 78.2 built into Node 22.23, which is
 *   what `.nvmrc`'s floor ships) and frozen here. That is a pinned, citable, reproducible
 *   source, and it is the same data `Intl` would have read — the objection above was never to
 *   CLDR, it was to reading CLDR at *render* time from whichever host happened to be running.
 *   Licence and attribution: `NOTICES`.
 * - **`closed` is not a CLDR field.** There is no locale database of the word a shop puts on
 *   its door, so each one here is hand-authored. **That asymmetry is this table's weak point
 *   and it is stated rather than hidden:** the abbreviations can be checked against a version
 *   number, and the closed word can only be checked by someone who speaks the language.
 *
 * **Growth rule.** A language earns a place when both halves are answerable: CLDR ships
 * abbreviated weekday names for it, *and* someone can name the word a business in that
 * language writes on its own opening hours. The set below is the languages this repository
 * could answer both for; it is not a claim about which languages matter.
 *
 * - Adding a language is **additive and never a version bump** (§4.8) — `project.json` does
 *   not change shape, and an older reader of the same file simply renders English.
 * - **A correction is not a version bump either.** A speaker of one of these languages saying
 *   "that is not the word" is the highest-quality evidence this table can receive, and
 *   `CONTRIBUTING.md` asks for exactly that. This is the one part of the renderer that is
 *   explicitly provisional.
 * - **An unknown language degrades to English, never to a failure** — and never to a guess.
 *   English weekday abbreviations on a Welsh page are a visible limitation; the wrong word in
 *   the owner's own language is worse than the honest foreign one.
 *
 * ## Two rules that are easy to get wrong
 *
 * **Lookup truncates, it does not match exactly.** `cy-GB` finds `cy`, `pt-BR` finds `pt`,
 * `en-US-u-ca-gregory` finds `en`. This is RFC 4647's "lookup" in miniature, and it is what
 * lets one entry serve every region of a language.
 *
 * **Truncation alone gets Chinese wrong**, which is why `ALIASES` exists. `zh-TW` truncates to
 * `zh` and would render simplified abbreviations to a traditional-script reader — the tag
 * carries no script subtag to notice. Resolving that properly needs CLDR's likely-subtags
 * data, which is a table an order of magnitude larger than this whole file; three named
 * regions cover the actual population.
 */

import type { Weekday } from "./project.js";
import { asText } from "./values.js";

/** The seven abbreviations, **Monday first**, matching `hours.ts`'s storage order. */
export type DayNames = readonly [string, string, string, string, string, string, string];

/** The eight strings the renderer writes that the owner did not. */
export interface Vocabulary {
  readonly days: DayNames;
  /** What a day with zero intervals says. Not a CLDR field — see the note above. */
  readonly closed: string;
}

/**
 * Where each weekday sits in a `DayNames` tuple.
 *
 * The literal index type is what lets `dayName` return `string` rather than `string |
 * undefined` under `noUncheckedIndexedAccess` — a seven-element tuple indexed by a union of
 * exactly its seven positions cannot miss, and TypeScript knows it.
 */
const DAY_INDEX: Readonly<Record<Weekday, 0 | 1 | 2 | 3 | 4 | 5 | 6>> = {
  mon: 0,
  tue: 1,
  wed: 2,
  thu: 3,
  fri: 4,
  sat: 5,
  sun: 6,
};

/** One day's abbreviation out of a vocabulary. */
export function dayName(words: Vocabulary, day: Weekday): string {
  return words.days[DAY_INDEX[day]];
}

/**
 * The vendored table, keyed by a lowercased BCP 47 tag.
 *
 * Ordered by family rather than alphabetically, because the thing a reviewer needs to do with
 * this block is check a language they speak against its neighbours.
 *
 * `en` is first and is the fallback every unknown tag lands on.
 */
export const VOCABULARIES: Readonly<Record<string, Vocabulary>> = {
  en: { days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], closed: "Closed" },

  // Celtic. `cy` is #48's own example: the Cardiff bakery this table exists for.
  cy: { days: ["Llun", "Maw", "Mer", "Iau", "Gwe", "Sad", "Sul"], closed: "Ar gau" },
  ga: { days: ["Luan", "Máirt", "Céad", "Déar", "Aoine", "Sath", "Domh"], closed: "Dúnta" },
  gd: { days: ["DiL", "DiM", "DiC", "Dia", "Dih", "DiS", "DiD"], closed: "Dùinte" },

  // Germanic.
  de: { days: ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"], closed: "Geschlossen" },
  nl: { days: ["ma", "di", "wo", "do", "vr", "za", "zo"], closed: "Gesloten" },
  da: { days: ["man.", "tirs.", "ons.", "tors.", "fre.", "lør.", "søn."], closed: "Lukket" },
  sv: { days: ["mån", "tis", "ons", "tors", "fre", "lör", "sön"], closed: "Stängt" },
  nb: { days: ["man.", "tir.", "ons.", "tor.", "fre.", "lør.", "søn."], closed: "Stengt" },
  is: { days: ["mán.", "þri.", "mið.", "fim.", "fös.", "lau.", "sun."], closed: "Lokað" },

  // Romance.
  fr: { days: ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."], closed: "Fermé" },
  es: { days: ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"], closed: "Cerrado" },
  ca: { days: ["dl.", "dt.", "dc.", "dj.", "dv.", "ds.", "dg."], closed: "Tancat" },
  pt: { days: ["seg.", "ter.", "qua.", "qui.", "sex.", "sáb.", "dom."], closed: "Fechado" },
  it: { days: ["lun", "mar", "mer", "gio", "ven", "sab", "dom"], closed: "Chiuso" },
  ro: { days: ["lun.", "mar.", "mie.", "joi", "vin.", "sâm.", "dum."], closed: "Închis" },

  // Slavic.
  pl: { days: ["pon.", "wt.", "śr.", "czw.", "pt.", "sob.", "niedz."], closed: "Zamknięte" },
  cs: { days: ["po", "út", "st", "čt", "pá", "so", "ne"], closed: "Zavřeno" },
  sk: { days: ["po", "ut", "st", "št", "pi", "so", "ne"], closed: "Zatvorené" },
  sl: { days: ["pon.", "tor.", "sre.", "čet.", "pet.", "sob.", "ned."], closed: "Zaprto" },
  hr: { days: ["pon", "uto", "sri", "čet", "pet", "sub", "ned"], closed: "Zatvoreno" },
  bg: { days: ["пн", "вт", "ср", "чт", "пт", "сб", "нд"], closed: "Затворено" },
  uk: { days: ["пн", "вт", "ср", "чт", "пт", "сб", "нд"], closed: "Зачинено" },
  ru: { days: ["пн", "вт", "ср", "чт", "пт", "сб", "вс"], closed: "Закрыто" },

  // Baltic, Finnic, and the rest of Europe.
  fi: { days: ["ma", "ti", "ke", "to", "pe", "la", "su"], closed: "Suljettu" },
  et: { days: ["E", "T", "K", "N", "R", "L", "P"], closed: "Suletud" },
  lv: {
    days: ["Pirmd.", "Otrd.", "Trešd.", "Ceturtd.", "Piektd.", "Sestd.", "Svētd."],
    closed: "Slēgts",
  },
  lt: { days: ["pr", "an", "tr", "kt", "pn", "št", "sk"], closed: "Uždaryta" },
  hu: { days: ["H", "K", "Sze", "Cs", "P", "Szo", "V"], closed: "Zárva" },
  el: { days: ["Δευ", "Τρί", "Τετ", "Πέμ", "Παρ", "Σάβ", "Κυρ"], closed: "Κλειστά" },
  tr: { days: ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"], closed: "Kapalı" },

  // Right to left. These are the languages that make `direction` below load-bearing rather
  // than theoretical: without it the abbreviations below render left to right, which is
  // visibly wrong rather than subtly wrong.
  he: {
    days: ["יום ב׳", "יום ג׳", "יום ד׳", "יום ה׳", "יום ו׳", "שבת", "יום א׳"],
    closed: "סגור",
  },
  ar: {
    days: ["الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"],
    closed: "مغلق",
  },

  // South and South-East Asia.
  hi: { days: ["सोम", "मंगल", "बुध", "गुरु", "शुक्र", "शनि", "रवि"], closed: "बंद" },
  th: { days: ["จันทร์", "อังคาร", "พุธ", "พฤหัส", "ศุกร์", "เสาร์", "อาทิตย์"], closed: "ปิด" },
  vi: { days: ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "CN"], closed: "Đóng cửa" },
  id: { days: ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"], closed: "Tutup" },
  ms: { days: ["Isn", "Sel", "Rab", "Kha", "Jum", "Sab", "Ahd"], closed: "Tutup" },

  // East Asia. `ja` is the owner §2.3 illustrates the free-text address with.
  ja: { days: ["月", "火", "水", "木", "金", "土", "日"], closed: "定休日" },
  ko: { days: ["월", "화", "수", "목", "금", "토", "일"], closed: "휴무" },
  zh: { days: ["周一", "周二", "周三", "周四", "周五", "周六", "周日"], closed: "休息" },
  "zh-hant": { days: ["週一", "週二", "週三", "週四", "週五", "週六", "週日"], closed: "休息" },
};

/**
 * Tags that truncation would resolve to the wrong entry, and the entry they mean.
 *
 * Deliberately tiny. Each one is a tag a real browser hands out — `navigator.language` is where
 * `lang` comes from at first run (§4.1) — that would otherwise land somewhere subtly wrong.
 */
const ALIASES: Readonly<Record<string, string>> = {
  /** The Norwegian macrolanguage. Chrome reports it; CLDR resolves it to Bokmål. */
  no: "nb",
  /** Traditional-script regions, which carry no script subtag of their own. */
  "zh-tw": "zh-hant",
  "zh-hk": "zh-hant",
  "zh-mo": "zh-hant",
};

/** The fallback every unrecognised tag lands on, and the only entry guaranteed to exist. */
const ENGLISH: Vocabulary = VOCABULARIES.en!;

/**
 * The eight words for a language tag, falling back to English.
 *
 * Total, like everything the renderer calls (§4.7): the argument is `unknown` because a
 * hand-edited `project.json` can put anything in `lang`, and every path returns a usable
 * vocabulary. The loop terminates because each pass removes a hyphen.
 */
export function vocabulary(value: unknown): Vocabulary {
  const tag = asText(value);
  if (tag === undefined) return ENGLISH;

  let key = tag.toLowerCase();
  for (;;) {
    const found = VOCABULARIES[ALIASES[key] ?? key];
    if (found !== undefined) return found;

    const cut = key.lastIndexOf("-");
    if (cut < 0) return ENGLISH;
    key = key.slice(0, cut);
  }
}

// ---------------------------------------------------------------------------
// The tag itself, and the direction it reads in
// ---------------------------------------------------------------------------

/** A BCP 47 tag's shape: subtags of one to eight alphanumerics, joined by hyphens. */
const LANGUAGE_TAG = /^[A-Za-z]{1,8}(-[A-Za-z0-9]{1,8})*$/;

/**
 * The `lang` attribute WCAG 2.2 SC 3.1.1 requires (§4.1), or `"en"`.
 *
 * Shape-checked rather than passed through, for the same reason every other value in the
 * renderer is: an arbitrary string in an attribute is how a hand-edited file would reach the
 * one place the page's markup is not the owner's content. Anything that is not tag-shaped is
 * absent (§4.7) — and because `vocabulary` and `direction` are given the *result* of this
 * function, a page that had to fall back to `"en"` renders English and reads left to right.
 * The declaration and the words always agree.
 */
export function languageTag(value: unknown): string {
  const tag = asText(value);
  return tag !== undefined && LANGUAGE_TAG.test(tag) ? tag : "en";
}

/**
 * ISO 15924 codes for right-to-left scripts, lowercased.
 *
 * An explicit script subtag is the strongest signal a tag can carry and it wins outright, in
 * both directions: `az-Arab` reads right to left and `ku-Latn` reads left to right, whatever
 * the language lists below say.
 */
const RTL_SCRIPTS = new Set([
  "adlm",
  "arab",
  "aran",
  "hebr",
  "mand",
  "nkoo",
  "rohg",
  "samr",
  "syrc",
  "thaa",
  "yezi",
]);

/**
 * Primary subtags whose **default** script is right to left — the ones CLDR's likely-subtags
 * data would expand to one of the scripts above.
 *
 * Only consulted when the tag names no script itself, which is the common case: an owner's
 * browser reports `ar`, `he-IL` or `fa`, not `ar-Arab-EG`.
 */
const RTL_LANGUAGES = new Set([
  "ar",
  "arc",
  "ckb",
  "dv",
  "fa",
  "he",
  "ks",
  "mzn",
  "nqo",
  "prs",
  "ps",
  "sd",
  "syr",
  "ug",
  "ur",
  "yi",
]);

/**
 * Which way the page reads, for `<html dir>`.
 *
 * **This is the other half of #48 and it is the same bug.** A page that declares `lang="ar"`
 * and lays itself out left to right has declared a language it does not actually support —
 * only here the damage is visible rather than subtle. It is emitted unconditionally, including
 * `dir="ltr"`, because the base direction of a document is a thing to state rather than a
 * thing to inherit from whatever default the reader's browser happens to hold, and it is ten
 * bytes against §6.5's budget.
 *
 * The stylesheet needs nothing else: `.lp-hours` is a grid, the rows are flex, and both follow
 * the inline axis on their own. The one physical property that existed — `text-align:right` on
 * the times column — is `end` in `stylesheet.ts` for exactly this reason, and `chrome.ts`'s
 * `ruledLeft` shape was already written with logical properties in anticipation of this.
 *
 * **A script subtag decides on its own; otherwise the primary subtag does.** In BCP 47 a
 * script is the four-letter subtag right after the language (or after an extlang, hence the
 * second position too), and nothing else in a tag is four letters — a variant that short must
 * start with a digit. So this can be read positionally without a subtag registry.
 */
export function direction(tag: string): "ltr" | "rtl" {
  const subtags = tag.toLowerCase().split("-");

  for (const subtag of subtags.slice(1, 3)) {
    if (/^[a-z]{4}$/.test(subtag)) return RTL_SCRIPTS.has(subtag) ? "rtl" : "ltr";
  }

  return RTL_LANGUAGES.has(subtags[0] ?? "") ? "rtl" : "ltr";
}

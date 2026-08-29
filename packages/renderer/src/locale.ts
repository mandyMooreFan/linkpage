/**
 * Everything the renderer knows about the owner's language tag (`SPEC.md` §4.1): the tag the
 * page declares, the direction it reads in, and the ten words the renderer writes that the
 * owner did not.
 *
 * **Why this file exists.** `<html lang>` is not decoration — it is what we tell assistive
 * technology to trust, and WCAG 2.2 SC 3.1.1 asks for it because a screen reader switches
 * voice on it. The page then wrote its own words in English, on every page whatever the tag
 * said: a Cardiff bakery declaring `lang="cy"` shipped `Mon`, `Tue`, `Closed`, and a Welsh
 * voice pronounced English abbreviations with Welsh phonetics (#48).
 *
 * **The translatable surface is ten strings and that is by design, not by luck.** §2.3 made
 * the address free text, and the contact rows are identified by a glyph rather than by the
 * word "Phone" — a phone number and an email address say what they are. Nothing else on the
 * exported page is our prose. A table is a proportionate answer here precisely because that
 * surface cannot grow without someone noticing, and an eleventh string is a change to §2.5.
 *
 * **Two of the ten were bought rather than found, and the price is why.** For most of this
 * project the count was eight, and §6.9 refused a ninth on the ground that a hidden word is
 * still a word the renderer writes — **a refusal priced by analogy to a glyph**. A word carries
 * no `<svg>` wrapper: no viewBox, no paint attributes, no `aria-hidden`, nothing ahead of the
 * characters themselves. *A glyph is never as cheap as its drawing. A word is.* So `hours` and
 * `directions` are in (#266, CL-5, CL-6), and what the decision actually cost is translation,
 * not bytes — both are hand-authored, and the un-citable half of this table more than doubled.
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
 * - **`closed`, `hours` and `directions` are not CLDR fields.** There is no locale database of
 *   the word a shop puts on its door, nor of the phrase it heads its opening times with, nor of
 *   what it writes above the link to its own map, so each one here is hand-authored. **That
 *   asymmetry is this table's weak point and it is stated rather than hidden:** the
 *   abbreviations can be checked against a version number, and these three can only be checked
 *   by someone who speaks the language. **They are drafted, not vouched for** — and `hours` and
 *   `directions` are the newer and thinner two, written in one pass by one author who does not
 *   speak most of these languages, so a correction is expected rather than merely welcomed.
 *   §2.5 records the price this bought: the un-citable half of the table is now the larger one,
 *   at 126 hand-written strings against 294 citable ones.
 *
 * **Growth rule.** A language earns a place when every part of an entry is answerable: CLDR
 * ships abbreviated weekday names for it, *and* someone can name the words a business in that
 * language writes on its own door, above its own opening hours, and above its own map link.
 * The set below is the languages this repository could answer all of those for; it is not a
 * claim about which languages matter.
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

/** The ten strings the renderer writes that the owner did not. */
export interface Vocabulary {
  readonly days: DayNames;
  /** What a day with zero intervals says. Not a CLDR field — see the note above. */
  readonly closed: string;
  /**
   * What names the hours panel to assistive technology (§6.9): the text of the visually hidden
   * `<h2>` the `<dl>` points at. Not a CLDR field either, and provisional in exactly the same
   * way `closed` is — see the note above.
   */
  readonly hours: string;
  /**
   * What says the address link opens a map (§6.9): the text of the visually hidden `<span>`
   * that goes first inside the `<a>`, so the link is named *directions* and then the address.
   * Not a CLDR field either, and provisional in exactly the way `hours` is — see the note
   * above.
   *
   * **A verb phrase, not a noun, wherever the language prefers one.** English *Directions*
   * reads as a label; several of these languages say the equivalent of *how to get here*
   * instead, because that is what a business writes above its own map link. The drafts follow
   * the language rather than the English shape.
   */
  readonly directions: string;
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
  en: {
    days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    closed: "Closed",
    hours: "Opening hours",
    directions: "Directions",
  },

  // Celtic. `cy` is #48's own example: the Cardiff bakery this table exists for.
  cy: {
    days: ["Llun", "Maw", "Mer", "Iau", "Gwe", "Sad", "Sul"],
    closed: "Ar gau",
    hours: "Oriau agor",
    directions: "Cyfarwyddiadau",
  },
  ga: {
    days: ["Luan", "Máirt", "Céad", "Déar", "Aoine", "Sath", "Domh"],
    closed: "Dúnta",
    hours: "Uaireanta oscailte",
    directions: "Treoracha",
  },
  gd: {
    days: ["DiL", "DiM", "DiC", "Dia", "Dih", "DiS", "DiD"],
    closed: "Dùinte",
    hours: "Uairean fosglaidh",
    directions: "Stiùireadh",
  },

  // Germanic.
  de: {
    days: ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"],
    closed: "Geschlossen",
    hours: "Öffnungszeiten",
    directions: "Wegbeschreibung",
  },
  nl: {
    days: ["ma", "di", "wo", "do", "vr", "za", "zo"],
    closed: "Gesloten",
    hours: "Openingstijden",
    directions: "Routebeschrijving",
  },
  da: {
    days: ["man.", "tirs.", "ons.", "tors.", "fre.", "lør.", "søn."],
    closed: "Lukket",
    hours: "Åbningstider",
    directions: "Rutevejledning",
  },
  sv: {
    days: ["mån", "tis", "ons", "tors", "fre", "lör", "sön"],
    closed: "Stängt",
    hours: "Öppettider",
    directions: "Vägbeskrivning",
  },
  nb: {
    days: ["man.", "tir.", "ons.", "tor.", "fre.", "lør.", "søn."],
    closed: "Stengt",
    hours: "Åpningstider",
    directions: "Veibeskrivelse",
  },
  is: {
    days: ["mán.", "þri.", "mið.", "fim.", "fös.", "lau.", "sun."],
    closed: "Lokað",
    hours: "Opnunartími",
    directions: "Leiðarlýsing",
  },

  // Romance.
  fr: {
    days: ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."],
    closed: "Fermé",
    hours: "Horaires d’ouverture",
    directions: "Itinéraire",
  },
  es: {
    days: ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"],
    closed: "Cerrado",
    hours: "Horario de apertura",
    directions: "Cómo llegar",
  },
  ca: {
    days: ["dl.", "dt.", "dc.", "dj.", "dv.", "ds.", "dg."],
    closed: "Tancat",
    hours: "Horari d’obertura",
    directions: "Com arribar-hi",
  },
  pt: {
    days: ["seg.", "ter.", "qua.", "qui.", "sex.", "sáb.", "dom."],
    closed: "Fechado",
    hours: "Horário de funcionamento",
    directions: "Como chegar",
  },
  it: {
    days: ["lun", "mar", "mer", "gio", "ven", "sab", "dom"],
    closed: "Chiuso",
    hours: "Orari di apertura",
    directions: "Indicazioni stradali",
  },
  ro: {
    days: ["lun.", "mar.", "mie.", "joi", "vin.", "sâm.", "dum."],
    closed: "Închis",
    hours: "Program de funcționare",
    directions: "Indicații rutiere",
  },

  // Slavic.
  pl: {
    days: ["pon.", "wt.", "śr.", "czw.", "pt.", "sob.", "niedz."],
    closed: "Zamknięte",
    hours: "Godziny otwarcia",
    directions: "Dojazd",
  },
  cs: {
    days: ["po", "út", "st", "čt", "pá", "so", "ne"],
    closed: "Zavřeno",
    hours: "Otevírací doba",
    directions: "Trasa",
  },
  sk: {
    days: ["po", "ut", "st", "št", "pi", "so", "ne"],
    closed: "Zatvorené",
    hours: "Otváracie hodiny",
    directions: "Trasa",
  },
  sl: {
    days: ["pon.", "tor.", "sre.", "čet.", "pet.", "sob.", "ned."],
    closed: "Zaprto",
    hours: "Odpiralni čas",
    directions: "Kako do nas",
  },
  hr: {
    days: ["pon", "uto", "sri", "čet", "pet", "sub", "ned"],
    closed: "Zatvoreno",
    hours: "Radno vrijeme",
    directions: "Upute za dolazak",
  },
  bg: {
    days: ["пн", "вт", "ср", "чт", "пт", "сб", "нд"],
    closed: "Затворено",
    hours: "Работно време",
    directions: "Как да стигнете",
  },
  uk: {
    days: ["пн", "вт", "ср", "чт", "пт", "сб", "нд"],
    closed: "Зачинено",
    hours: "Години роботи",
    directions: "Як дістатися",
  },
  ru: {
    days: ["пн", "вт", "ср", "чт", "пт", "сб", "вс"],
    closed: "Закрыто",
    hours: "Часы работы",
    directions: "Как добраться",
  },

  // Baltic, Finnic, and the rest of Europe.
  fi: {
    days: ["ma", "ti", "ke", "to", "pe", "la", "su"],
    closed: "Suljettu",
    hours: "Aukioloajat",
    directions: "Ajo-ohjeet",
  },
  et: {
    days: ["E", "T", "K", "N", "R", "L", "P"],
    closed: "Suletud",
    hours: "Lahtiolekuajad",
    directions: "Teejuhised",
  },
  lv: {
    days: ["Pirmd.", "Otrd.", "Trešd.", "Ceturtd.", "Piektd.", "Sestd.", "Svētd."],
    closed: "Slēgts",
    hours: "Darba laiks",
    directions: "Norādes",
  },
  lt: {
    days: ["pr", "an", "tr", "kt", "pn", "št", "sk"],
    closed: "Uždaryta",
    hours: "Darbo laikas",
    directions: "Maršrutas",
  },
  hu: {
    days: ["H", "K", "Sze", "Cs", "P", "Szo", "V"],
    closed: "Zárva",
    hours: "Nyitvatartás",
    directions: "Útvonal",
  },
  el: {
    days: ["Δευ", "Τρί", "Τετ", "Πέμ", "Παρ", "Σάβ", "Κυρ"],
    closed: "Κλειστά",
    hours: "Ώρες λειτουργίας",
    directions: "Οδηγίες",
  },
  tr: {
    days: ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"],
    closed: "Kapalı",
    hours: "Çalışma saatleri",
    directions: "Yol tarifi",
  },

  // Right to left. These are the languages that make `direction` below load-bearing rather
  // than theoretical: without it the abbreviations below render left to right, which is
  // visibly wrong rather than subtly wrong.
  he: {
    days: ["יום ב׳", "יום ג׳", "יום ד׳", "יום ה׳", "יום ו׳", "שבת", "יום א׳"],
    closed: "סגור",
    hours: "שעות פתיחה",
    directions: "הוראות הגעה",
  },
  ar: {
    days: ["الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"],
    closed: "مغلق",
    hours: "ساعات العمل",
    directions: "الاتجاهات",
  },

  // South and South-East Asia.
  hi: {
    days: ["सोम", "मंगल", "बुध", "गुरु", "शुक्र", "शनि", "रवि"],
    closed: "बंद",
    hours: "खुलने का समय",
    directions: "दिशा-निर्देश",
  },
  th: {
    days: ["จันทร์", "อังคาร", "พุธ", "พฤหัส", "ศุกร์", "เสาร์", "อาทิตย์"],
    closed: "ปิด",
    hours: "เวลาทำการ",
    directions: "เส้นทาง",
  },
  vi: {
    days: ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "CN"],
    closed: "Đóng cửa",
    hours: "Giờ mở cửa",
    directions: "Chỉ đường",
  },
  id: {
    days: ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"],
    closed: "Tutup",
    hours: "Jam buka",
    directions: "Petunjuk arah",
  },
  ms: {
    days: ["Isn", "Sel", "Rab", "Kha", "Jum", "Sab", "Ahd"],
    closed: "Tutup",
    hours: "Waktu buka",
    directions: "Arah perjalanan",
  },

  // East Asia. `ja` is the owner §2.3 illustrates the free-text address with.
  ja: {
    days: ["月", "火", "水", "木", "金", "土", "日"],
    closed: "定休日",
    hours: "営業時間",
    directions: "道順",
  },
  ko: {
    days: ["월", "화", "수", "목", "금", "토", "일"],
    closed: "휴무",
    hours: "영업시간",
    directions: "길찾기",
  },
  zh: {
    days: ["周一", "周二", "周三", "周四", "周五", "周六", "周日"],
    closed: "休息",
    hours: "营业时间",
    directions: "路线",
  },
  "zh-hant": {
    days: ["週一", "週二", "週三", "週四", "週五", "週六", "週日"],
    closed: "休息",
    hours: "營業時間",
    directions: "路線",
  },
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
 * The entry a tag actually **matches**, or `undefined` when the table holds nothing for it.
 *
 * The two exported questions below both need this walk, and they must never disagree about it:
 * one asks which words to write, the other asks whether those words are the page's own
 * language. Written once so that a change to the matching rules cannot answer the first and
 * quietly stop answering the second.
 *
 * The loop terminates because each pass removes a hyphen.
 */
function lookup(value: unknown): Vocabulary | undefined {
  const tag = asText(value);
  if (tag === undefined) return undefined;

  let key = tag.toLowerCase();
  for (;;) {
    const found = VOCABULARIES[ALIASES[key] ?? key];
    if (found !== undefined) return found;

    const cut = key.lastIndexOf("-");
    if (cut < 0) return undefined;
    key = key.slice(0, cut);
  }
}

/**
 * The ten words for a language tag, falling back to English.
 *
 * Total, like everything the renderer calls (§4.7): the argument is `unknown` because a
 * hand-edited `project.json` can put anything in `lang`, and every path returns a usable
 * vocabulary.
 */
export function vocabulary(value: unknown): Vocabulary {
  return lookup(value) ?? ENGLISH;
}

/**
 * Whether those words are English **standing in** for a language this table has no entry for —
 * which is the one thing the page has to say out loud about them (§2.5, CL-7, #266).
 *
 * **This is not "is the vocabulary the English one".** A page declaring `en-GB` gets the
 * English entry by matching it, and its words are in the language it declares. A page declaring
 * `sw` gets the very same object because there is no Swahili entry, and its words are not.
 * Comparing the returned entry against `ENGLISH` cannot tell those apart; asking the lookup
 * whether it *matched* can, which is why `lookup` returns `undefined` rather than a fallback.
 *
 * **It answers about the tag the page will actually declare**, not about the raw value: a
 * `lang` that is not tag-shaped is refused by `languageTag` and the page declares `en`, so
 * there is no fallback to confess. Running the same validation here is what keeps this answer
 * and `<html lang>` from ever contradicting each other, whichever of the two a caller reaches
 * for first.
 *
 * §2.5's *degrade to English, never to a guess* rule is **kept, not replaced** — the fallback
 * still happens, and it is still better than a word invented in the owner's own language. What
 * changed is that two of the words are now invisible (§6.9), so the limitation no longer shows
 * itself and the page has to state it. Which elements carry the marking is `render.ts`'s
 * decision, and it is only the hidden pair: the weekday abbreviations and the closed word are
 * on the glass, where §2.5's original argument still holds.
 */
export function isEnglishFallback(value: unknown): boolean {
  return lookup(languageTag(value)) === undefined;
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

import { isEnglishFallback, languageTag, vocabulary } from "@linkpage/renderer";

/**
 * What each language the renderer can write is called **in that language** (`SPEC.md` §7.4).
 *
 * The review row used to ask a bakery owner for a BCP 47 tag — *"A language code, like `en` or
 * `fr-CA`"* — on a product whose standing tiebreaker is that the owner is not a developer. The
 * picker replaces that, and **it demonstrates its consequence instead of describing it**: each
 * entry shows the day abbreviations and the closed word that choosing it produces.
 *
 * **These are builder chrome and are never translated.** The builder has no localisation layer;
 * `lang` is a property of the *exported page*. An endonym sits with *Corner softness*, not with
 * §2.5's ten words, and it never reaches `project.json`.
 *
 * **Hand-authored, and provisional in exactly the sense §2.5's closed words are.** No database
 * holds what a language calls itself in a form a shopkeeper would recognise, so each one can only
 * be checked by someone who speaks it — `CONTRIBUTING.md` asks for that by name. A wrong endonym
 * is a worse failure than a wrong closed word, because it is the thing the owner reads *in order
 * to choose*.
 *
 * The keys are the renderer's own vocabulary keys, and a test holds the two lists to each other in
 * both directions: a vocabulary with no name here would be unreachable from the picker, and a name
 * here with no vocabulary would offer a language the page cannot write.
 */
export const LANGUAGE_NAMES: Readonly<Record<string, string>> = {
  en: "English",

  // Celtic
  cy: "Cymraeg",
  ga: "Gaeilge",
  gd: "Gàidhlig",

  // Germanic
  de: "Deutsch",
  nl: "Nederlands",
  da: "Dansk",
  sv: "Svenska",
  nb: "Norsk bokmål",
  is: "Íslenska",

  // Romance
  fr: "Français",
  es: "Español",
  ca: "Català",
  pt: "Português",
  it: "Italiano",
  ro: "Română",

  // Slavic
  pl: "Polski",
  cs: "Čeština",
  sk: "Slovenčina",
  sl: "Slovenščina",
  hr: "Hrvatski",
  bg: "Български",
  uk: "Українська",
  ru: "Русский",

  // Baltic and Finnic
  fi: "Suomi",
  et: "Eesti",
  lv: "Latviešu",
  lt: "Lietuvių",

  // Other European
  hu: "Magyar",
  el: "Ελληνικά",
  tr: "Türkçe",

  // Right to left
  he: "עברית",
  ar: "العربية",

  // South and South-East Asian
  hi: "हिन्दी",
  th: "ไทย",
  vi: "Tiếng Việt",
  id: "Bahasa Indonesia",
  ms: "Bahasa Melayu",

  // East Asian
  ja: "日本語",
  ko: "한국어",
  // Two vocabularies, so two rows: the renderer keys them apart because truncation alone gets
  // Chinese wrong — `zh-TW` would otherwise render simplified abbreviations to a traditional
  // reader. A picker that offered one "中文" would put that decision back out of reach.
  zh: "简体中文",
  "zh-hant": "繁體中文",
};

/**
 * Which row a stored tag *is*, or `undefined` when it is none of them (§7.4, §4.5; #379).
 *
 * **The collapsed row and the open picker both ask this**, so they cannot disagree: the row that
 * says *English* for `en-US` is the row the picker marks. Region and script subtags resolve the
 * way the renderer resolves them — `en-US` is English, `zh-TW` is 繁體中文 — because the answer
 * is about which words reach the page, and that is the renderer's to give.
 *
 * **A tag the page cannot write is no row**, even though the page's words for it are English.
 * `vocabulary("sw")` returns the English entry as a fallback, and comparing entries would have
 * called `sw` English — which is how the picker used to light the English row for a hand-edited
 * `sw` and fold the typed field away with the value in it. §4.5 says that value is preserved and
 * *displayed*; `isEnglishFallback` is the renderer's own word for "these are stand-in words", and
 * a value that is not tag-shaped at all is the same case one step earlier: the page declares
 * `en` for it (§4.7), but nothing about the stored value is English.
 */
export function listedKey(tag: string | undefined): string | undefined {
  if (tag === undefined || tag === "") return undefined;
  if (languageTag(tag) !== tag || isEnglishFallback(tag)) return undefined;
  const words = vocabulary(tag);
  return Object.keys(LANGUAGE_NAMES).find((key) => vocabulary(key) === words);
}

/**
 * What the collapsed row says: the language's name in its own language, or the tag as typed
 * when the page cannot write it (§7.4: *a collapsed row says what is there*).
 */
export function languageLabel(tag: string | undefined): string {
  const key = listedKey(tag);
  return (key === undefined ? tag : LANGUAGE_NAMES[key]) ?? "";
}

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
 * §2.5's eight words, and it never reaches `project.json`.
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

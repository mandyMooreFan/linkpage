import { glyphSvg, ICONS, iconSvg, socialIconSvg, socialLabel } from "./icons.js";
import { hoursView, type HoursRow } from "./hours.js";
import { direction, languageTag, vocabulary, type Vocabulary } from "./locale.js";
import { derivePalette } from "./palette.js";
import { resolveChrome } from "./chrome.js";
import { stylesheet } from "./stylesheet.js";
import type { Project, Style } from "./project.js";
import { asArray, asPositiveInt, asRecord, asText } from "./values.js";

/**
 * Render a project to the complete text of a self-contained `index.html`.
 *
 * This function *is* the export format. Everything the visitor receives — markup, CSS,
 * images — is in the string it returns, and the builder previews by putting that same string
 * into a `srcdoc` iframe (§5.2), so the preview is the export rather than a simulation of it.
 *
 * **Six sections, in one fixed order** (§2.1): `header → links → hours → contact → address →
 * social`. The page is not an arrangeable block list, there is no reordering control and no
 * `order` field, which is what lets this be a straight-line function.
 *
 * **It is total and never throws** (§4.7). Every field is read through `values.ts`: missing,
 * wrong-typed and unrecognised all come back as absent, an absent section is omitted, and
 * unknown keys are simply never looked at. A data problem has to degrade the page, because a
 * throw would blank the preview instead.
 *
 * **It never trusts text.** Everything the owner typed goes through `escapeHtml` on its way
 * into element content, and every URL goes through `safeUrl` on its way into an `href`.
 *
 * **It writes almost no words of its own.** The section markup carries no headings and no
 * labels: what identifies a phone number is the phone glyph beside it, not the English word
 * "Phone". That is not minimalism for its own sake — invented copy is copy in *our* language
 * on a page carrying the owner's `lang`, and §7.3's rule that the tool never asserts a fact
 * about the business points the same way. The two unavoidable exceptions are the weekday
 * abbreviations and "closed", and they are **translated rather than English** (§2.3, #48):
 * `lang` is resolved once here and the same answer drives `<html lang>`, `<html dir>` and
 * every word in the hours section, so the page cannot declare one language and speak another.
 * `locale.ts` holds the table and the reasoning.
 *
 * **The markup does not know which shape it is in.** The four shapes, the three type pairings
 * and the corner slider (§3.1) reach the page entirely through the stylesheet — see
 * `chrome.ts` — so all twelve combinations emit byte-identical `<main>` content. That is not a
 * coincidence to be preserved by luck: it is what keeps a shape a *presentation* choice, and
 * it is why §6.4's microdata below is written once and holds for all twelve.
 *
 * **It is deterministic** (§6.7). The only input is the argument: nothing here reads a clock,
 * a random source, an environment variable or a file, so the same `project.json` produces a
 * byte-identical `index.html`. `size.test.ts` renders twice and diffs, and pins the chrome
 * against §6.5's 30 KB. The guarantee is the renderer's, not the pipeline's — the logo was
 * encoded once in the builder and arrives here as a string.
 */
export function render(project: Project): string {
  // `project` is typed, but types are a compile-time promise and this function has to survive
  // a hand-edited `project.json` at runtime — so it is read as `unknown` from here down.
  const root = asRecord(project);

  const style = asRecord(root?.style);
  // The two halves of §3.1's controls, resolved separately because they are separate things:
  // `derivePalette` owns every colour on the page (§3.2), and `resolveChrome` owns the shape,
  // the type pairing and the corner slider — which carry structure and never a palette.
  // `derivePalette` is itself total (§4.7) and reads its argument defensively; the cast hands
  // it the raw record rather than pretending we validated one.
  const palette = derivePalette(style as Style | undefined);
  const chrome = resolveChrome(style);

  // The page's language, decided once. `lang` is validated first and everything downstream
  // reads the *validated* tag, so a file whose `lang` we could not use declares `en`, renders
  // English and reads left to right — three answers that agree rather than three lookups that
  // might not.
  const tag = languageTag(root?.lang);
  const words = vocabulary(tag);

  const sections = [
    headerSection(root?.header),
    linksSection(root?.links),
    hoursSection(root?.hours, words),
    contactSection(root?.contact),
    addressSection(root?.address),
    socialSection(root?.social),
  ].filter((section) => section !== "");

  return [
    "<!doctype html>",
    PROVENANCE,
    `<html lang="${escapeHtml(tag)}" dir="${direction(tag)}">`,
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escapeHtml(documentTitle(root?.header))}</title>`,
    ...metaTags(root?.header),
    `<style>${stylesheet(palette, chrome)}</style>`,
    "</head>",
    "<body>",
    `<main class="lp-page" itemscope itemtype="${LOCAL_BUSINESS}">`,
    ...sections,
    "</main>",
    "</body>",
    "</html>",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// The document
// ---------------------------------------------------------------------------

/**
 * The `LocalBusiness` type the page describes itself as, and the whole of §6.4's structured
 * data mechanism.
 *
 * **Microdata attributes, never JSON-LD.** JSON-LD is the shape everyone reaches for and it
 * requires a `<script type="application/ld+json">` tag, which invariant 1 (§5.3) forbids
 * absolutely — the export ships zero JavaScript, and the guard does not read `type` before
 * failing. Microdata carries the same graph as `itemscope` / `itemtype` / `itemprop`
 * attributes on the elements that are already here, so the whole thing costs a few hundred
 * bytes, adds no element, and cannot restate the page wrongly: every value a consumer reads is
 * text a visitor can also see.
 *
 * That last property is why there is **no `openingHours`, no `geo` and no `priceRange`**.
 * Those would need `<meta itemprop content="…">` elements — invisible content, in a format
 * (`Mo-Fr 09:00-17:00`) that is ours rather than the owner's, restating rows the page already
 * shows in the owner's chosen clock. §6.4 asks for attributes, and an attribute has to hang on
 * something the owner wrote.
 *
 * `address` is the plain-text one and that is not a compromise: schema.org accepts `Text` for
 * it, so §2.3's decision to keep the address free text — the decision that spares a UK florist
 * from a "state" field — costs nothing here.
 *
 * **The whole graph, as `validator.schema.org` extracts it from `POPULATED`:** one
 * `LocalBusiness`, zero errors and zero warnings, carrying `name`, `description`, `telephone`,
 * `email`, one `sameAs` per social profile, and an `address` promoted to a `PostalAddress`
 * whose `name` is the owner's lines. `hasMap` is emitted, valid, and not surfaced by that
 * particular tool — see `addressSection`. `logo` was tried and removed — see `headerSection`.
 */
const LOCAL_BUSINESS = "https://schema.org/LocalBusiness";

/**
 * §6.7's provenance, in the two forms it permits and no third one.
 *
 * **No visible credit in any form.** Not a footer, not a link, not the browser tab (see
 * `documentTitle`), not a comment the CSS reveals. A person who wonders what made this file
 * opens it and reads line two; a machine reads the `generator` meta. Both are inert.
 *
 * Kept to ASCII deliberately: the comment sits ahead of `<meta charset>`, and bytes before the
 * declaration are bytes a browser has to guess at.
 */
const PROVENANCE = "<!-- Built with linkpage: https://github.com/mandyMooreFan/linkpage -->";
const GENERATOR = '<meta name="generator" content="linkpage">';

/**
 * The `<head>` meta beyond charset and viewport: a description when the owner wrote one, and
 * the generator tag.
 *
 * **`og:image` is structurally impossible and is not faked** (§6.4). A scraper needs a URL it
 * can fetch, the export is one file, and there is no second file to point at — a `data:` URI
 * in `og:image` is rejected by every scraper that matters, so emitting one would be a promise
 * we know does not hold. **Shared links preview as text, permanently**, and the builder owes
 * the owner that sentence rather than a tag that looks like it worked.
 *
 * **`og:title` and `og:description` are left out too**, for a different reason: they are not
 * impossible, they are inert. Every scraper falls back to `<title>` and `<meta
 * name="description">` when the `og:` block is absent, so the pair buys no better preview than
 * the two tags above it — and a partial `og:` block reads, to the next person editing this
 * file, like an image tag someone forgot.
 *
 * **No `canonical`** either. The whole point of the export is that the owner drops it wherever
 * they like (§8), so this renderer does not know the page's URL and any value would be a guess
 * that outranks the real one.
 *
 * The description is the tagline and only the tagline. Falling back to the business name would
 * put the title in the snippet twice, and there is nothing else on the page the owner offered
 * as a description of themselves.
 */
function metaTags(value: unknown): string[] {
  const tagline = asText(asRecord(value)?.tagline);
  const description =
    tagline === undefined ? [] : [`<meta name="description" content="${escapeHtml(tagline)}">`];
  return [...description, GENERATOR];
}

/**
 * What the browser tab says: the business name, falling back to the tagline.
 *
 * When a hand-edited file has neither, the element is emitted empty rather than filled with a
 * name we made up — and specifically not with the product's own name, since §6.7 rules out a
 * visible credit "in any form" and a browser tab is about as visible as it gets.
 */
function documentTitle(value: unknown): string {
  const header = asRecord(value);
  return asText(header?.name) ?? asText(header?.tagline) ?? "";
}

// ---------------------------------------------------------------------------
// 1. Header
// ---------------------------------------------------------------------------

/** A `data:` image URI and nothing else — invariant 2 (§5.3), checked rather than assumed. */
const DATA_IMAGE = /^data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/]+={0,2}$/;

/**
 * Business name, optional tagline, optional logo (§2.3).
 *
 * **`alt=""`, unconditionally** (§6.6): `header.name` is required and rendered as text beside
 * the logo, which makes the logo decorative in W3C's sense — everything it conveys is already
 * available as text. `width` and `height` are emitted because the builder knows both at
 * normalisation time and they prevent layout shift while the data URI decodes.
 *
 * §6.4's `name` and `description` hang on the two elements that were here already.
 *
 * > **There is deliberately no `itemprop="logo"` on the `<img>`, and it was tried.** Microdata
 * > would take the property's value from `src`, which is a `data:` URI — and put through
 * > `validator.schema.org`, an `https:` logo is extracted while the identical markup with a
 * > `data:` URI is silently dropped, no error and no warning. That is §6.4's `og:image`
 * > sentence arriving in a different attribute: a consumer wants a logo it can fetch and
 * > display somewhere else, and there is no second file to point it at. Emitting a property
 * > the tooling discards would buy nothing and would teach the next reader that image URLs
 * > work here, which is how someone eventually "fixes" `og:image` with a data URI.
 *
 * > The dependency §6.6 asks to be preserved: `alt=""` is correct only while `name` is
 * > required and rendered. A hand-edited file with a logo and no name is the one case where it
 * > is not, and it is left as-is — inventing alt text for an image we have never seen would be
 * > worse than the empty string, and the builder collects the missing name through the flow.
 */
function headerSection(value: unknown): string {
  const header = asRecord(value);
  const name = asText(header?.name);
  const tagline = asText(header?.tagline);
  const logo = logoImage(header?.logo);

  const parts = [
    logo,
    name === undefined ? "" : `<h1 class="lp-name" itemprop="name">${escapeHtml(name)}</h1>`,
    tagline === undefined
      ? ""
      : `<p class="lp-tagline" itemprop="description">${escapeHtml(tagline)}</p>`,
  ].filter((part) => part !== "");

  if (parts.length === 0) return "";
  return `<header class="lp-header">\n${parts.join("\n")}\n</header>`;
}

function logoImage(value: unknown): string {
  const logo = asRecord(value);
  const src = asText(logo?.src);
  if (src === undefined || !DATA_IMAGE.test(src)) return "";

  const width = asPositiveInt(logo?.width);
  const height = asPositiveInt(logo?.height);
  const size =
    width !== undefined && height !== undefined ? ` width="${width}" height="${height}"` : "";

  return `<img class="lp-logo" src="${escapeHtml(src)}" alt=""${size}>`;
}

// ---------------------------------------------------------------------------
// 2. Links
// ---------------------------------------------------------------------------

/**
 * The link buttons: a label, a URL, and optionally an icon — nothing else (§2.3).
 *
 * **There is no "featured" treatment**, because the owner controls list order and position is
 * the emphasis mechanism; a second way to signal importance invites a page where everything is
 * featured. So this is a plain list rendered in file order.
 *
 * A link needs both a label and a usable URL. One without the other is not a quieter link, it
 * is a button that goes nowhere or a destination with no name, so it is omitted — the value
 * still survives in `project.json` (§4.5) and the builder collects it.
 */
function linksSection(value: unknown): string {
  const items = asArray(value)
    .map((entry) => linkButton(entry))
    .filter((markup) => markup !== "");

  if (items.length === 0) return "";
  return `<ul class="lp-links">\n${items.join("\n")}\n</ul>`;
}

function linkButton(value: unknown): string {
  const link = asRecord(value);
  const label = asText(link?.label);
  const href = linkHref(link?.url);
  if (label === undefined || href === undefined) return "";

  // An unrecognised icon name renders no glyph rather than failing: `Link.icon` is a
  // preference with no authored content behind it, so §4.4's fallback rule applies and a link
  // without a glyph is an ordinary, complete link.
  return (
    `<li><a class="lp-link" href="${escapeHtml(href)}">${iconSvg(link?.icon)}` +
    `<span>${escapeHtml(label)}</span></a></li>`
  );
}

// ---------------------------------------------------------------------------
// 3. Hours
// ---------------------------------------------------------------------------

/**
 * Opening hours as a description list: one row per *specified* day, plus the free-text note.
 *
 * A day absent from the file is unspecified and gets no row; a day present with no intervals
 * is explicitly closed and gets one that says so. `hours.ts` holds that distinction, the time
 * formatting, the week rotation, and the reasoning about collapsed runs.
 *
 * This is the only section that carries a word of ours, so it is the only one that needs the
 * page's vocabulary; `hoursView` returns the row labels and the closed text already resolved.
 */
/**
 * The id the hours heading and the `<dl>` meet on — the only id the exported page carries.
 *
 * Four characters because it is spent twice, in the `id` and again in the `aria-labelledby`,
 * and §6.5's live headroom is measured in tens of bytes rather than hundreds. There is no
 * collision to guard against: the page is one self-contained file (invariant 2) and the owner's
 * content never reaches an `id`.
 */
const HOURS_NAME_ID = "lp-h";

function hoursSection(value: unknown, words: Vocabulary): string {
  const hours = hoursView(value, words);
  if (!hours) return "";

  const parts: string[] = [];
  if (hours.rows.length > 0) {
    // Two things name this panel, one for each kind of reader, and neither can do the other's
    // job. §6.9's clock names it to a sighted reader; `glyphSvg` marks every glyph
    // `aria-hidden`, so to assistive technology the clock is not there at all and the `<dl>`
    // read back as `DescriptionList ""` — rows saying `Mon` and a time, with nothing saying
    // what they were times *for*.
    //
    // That gap was left open on a byte cost, and **the cost was priced by analogy to a glyph**
    // — by the very `<svg>` wrapper §6.9 had just overrun its own estimate on. A word carries
    // no wrapper: no viewBox, no paint attributes, no `aria-hidden`, no `focusable`, nothing
    // ahead of the characters. Measured rather than estimated, in the tightest of the 42
    // languages, the whole mechanism is 84 B. **A glyph is never as cheap as its drawing. A
    // word is.** §2.5 now writes ten words; §6.9 records the reversal (#266, CL-5).
    //
    // Real text rather than an `aria-label`, on the same argument `socialLink` makes below: a
    // visually hidden span is text a translator and a "find in page" can both see. And a
    // heading rather than a span, because it costs the same and buys somewhere to jump to on a
    // page that otherwise has only its `<h1>`.
    parts.push(`<h2 class="lp-sr" id="${HOURS_NAME_ID}">${escapeHtml(words.hours)}</h2>`);
    parts.push(`<span class="lp-hours-mark">${glyphSvg(ICONS.clock)}</span>`);
    const rows = hours.rows.map((row) => hoursRow(row, hours.closed));
    parts.push(
      `<dl class="lp-hours" aria-labelledby="${HOURS_NAME_ID}">\n${rows.join("\n")}\n</dl>`,
    );
  }
  if (hours.note !== undefined) {
    parts.push(`<p class="lp-note">${escapeHtml(hours.note)}</p>`);
  }
  return `<section class="lp-panel">\n${parts.join("\n")}\n</section>`;
}

function hoursRow(row: HoursRow, closed: string): string {
  const times =
    row.intervals.length === 0
      ? `<span>${escapeHtml(closed)}</span>`
      : row.intervals.map((interval) => `<span>${escapeHtml(interval)}</span>`).join("");

  return `<dt class="lp-day">${escapeHtml(row.label)}</dt><dd class="lp-times">${times}</dd>`;
}

// ---------------------------------------------------------------------------
// 4. Contact
// ---------------------------------------------------------------------------

/** Everything that is not a digit. The `tel:` href is built from a filter, not from text. */
const NOT_A_DIGIT = /[^0-9]/g;
/**
 * The charset a dialable number may be written in: digits, and the punctuation businesses
 * actually print. `+` is permitted at the front only, because a `+` anywhere else is not a
 * country code — it is a second number, or a note.
 */
const DIALABLE = /^\+?[0-9 ().-]+$/;
/**
 * A parenthesised trunk `0` sitting directly behind a leading country code, as in
 * `+44 (0)161 496 0000`. Reading it is not guessing: the owner supplied the country
 * themselves, and the parentheses are their own notation for *omit this when calling in*.
 */
const PARENTHESISED_TRUNK = /^(\+[0-9]{1,3})[ .-]*\(0\)/;
/** §2.3's bounds. E.164 caps a number at 15 digits; below four there is nothing to dial. */
const FEWEST_DIGITS = 4;
const MOST_DIGITS = 15;
/**
 * §2.3's email floor: one `@`, non-empty either side, no whitespace, no control characters, and
 * at least one dot after the `@`.
 *
 * **Recorded as a floor, so that the next reader does not tighten it toward RFC 5322.** The
 * previous shape was ASCII-only on both sides and therefore **rejected real addresses** —
 * `josé@café.fr` is one. This is looser in charset and identical in structure.
 *
 * **Two clauses are load-bearing rather than tidy, because `mailtoHref` never passes through
 * `safeUrl`** — this is the one URL in the document with no scheme check behind it. Whitespace
 * is refused because a `mailto:` target carrying it is not an address. A `:` is refused because
 * it is the only way a second scheme could reach an `href` from here, which is what the old
 * regex was buying by being ASCII-only, and is worth keeping on purpose rather than losing as a
 * side effect of loosening the charset.
 */
function isEmailish(raw: string): boolean {
  if (hasControlChar(raw) || /[\s:]/.test(raw)) return false;
  const at = raw.indexOf("@");
  if (at <= 0 || raw.indexOf("@", at + 1) !== -1) return false;
  return raw.slice(at + 1).includes(".");
}

/**
 * Phone and email, rendered as `tel:` and `mailto:` links (§2.3).
 *
 * **The displayed text is always what the owner typed; only the `href` is normalised.** A
 * number is written the way a local reader expects to see it — `020 7123 4567` — and a dialler
 * wants `+442071234567`; showing our normalisation would be showing our results rather than
 * the owner's intent.
 *
 * A value we cannot turn into a URL still renders, as text rather than as a link. Contact
 * details are content the owner typed, so §4.4's rule that owner data is kept rather than
 * dropped applies: an extension written in prose is worth showing even when it cannot be
 * dialled by tapping.
 *
 * §6.4's `telephone` and `email` sit on the `<span>` rather than on the `<a>`, and that is the
 * one place the choice matters: microdata takes an `<a>`'s value from its `href`, which would
 * publish `tel:+442071234567` — our normalisation — where schema.org asks for the number.
 * On the span the property is the text the owner typed, which is also the text on the page, and
 * it still works for a detail we could not turn into a link at all.
 */
function contactSection(value: unknown): string {
  const contact = asRecord(value);
  if (!contact) return "";

  const rows = [
    contactRow(asText(contact.phone), telHref(contact.phone), glyphSvg(ICONS.phone), "telephone"),
    contactRow(asText(contact.email), mailtoHref(contact.email), glyphSvg(ICONS.mail), "email"),
  ].filter((row) => row !== "");

  if (rows.length === 0) return "";
  return `<section class="lp-panel">\n<ul class="lp-rows">\n${rows.join("\n")}\n</ul>\n</section>`;
}

function contactRow(
  text: string | undefined,
  href: string | undefined,
  icon: string,
  itemprop: string,
): string {
  if (text === undefined) return "";
  const body = `${icon}<span itemprop="${itemprop}">${escapeHtml(text)}</span>`;
  return href === undefined
    ? `<li class="lp-row">${body}</li>`
    : `<li><a class="lp-row" href="${escapeHtml(href)}">${body}</a></li>`;
}

/**
 * A `tel:` URL, or `undefined` when nothing in there can be dialled (`SPEC.md` §2.3).
 *
 * **The four clauses are the whole rule, and no country is ever learned, inferred or asked
 * for.** `lang` carries a region, but §4.1 establishes that a wrong region is *harmless*
 * today — so reading the phone off it would make a wrong region **harmful**, and a Manchester
 * baker on a US-configured laptop would be dialled as `+1`.
 *
 * **Returning `undefined` is a real answer, not a failure.** `contactRow` renders the text
 * without a link, the owner's number still reads correctly on the page, and §7.9 marks it in
 * the builder. An extension, a vanity number or two numbers in one box are all deliberate and
 * correct; they simply do not dial.
 *
 * **What the old filter-everything approach did**, and why four of the six notations
 * businesses print were broken: `+44 (0)161 496 0000` kept the trunk `0` inside a `+44`
 * number and dialled nothing; `020 7123 4567 ext 12` and two numbers in one box dialled
 * *wrong* numbers; and `0800 CHICKEN` became `tel:0800` — a **dialable wrong number** rather
 * than a visibly dead one. The stated caution against guessing at trunk prefixes produced
 * exactly the outcome it was avoiding.
 *
 * **The limit, stated rather than buried:** nothing merely mistyped is caught. `07700 90012`,
 * a digit short, still links. Catching that needs the country §2.3 declined.
 *
 * Exported because the builder has to ask this exact question — §7.4's row mark and §7.7's
 * line are *"could a target be derived?"*, and asking anything else would let the builder and
 * the page disagree.
 */
export function telHref(value: unknown): string | undefined {
  const raw = asText(value);
  if (raw === undefined) return undefined;
  // Clauses 1 and 2: an out-of-charset character means no target at all, rather than a target
  // built from whatever survived a filter.
  if (!DIALABLE.test(raw)) return undefined;
  // Clause 3.
  const trimmed = raw.replace(PARENTHESISED_TRUNK, "$1");
  const digits = trimmed.replace(NOT_A_DIGIT, "");
  // Clause 4. The upper bound is what catches two whole numbers sharing one box.
  if (digits.length < FEWEST_DIGITS || digits.length > MOST_DIGITS) return undefined;
  return `tel:${trimmed.startsWith("+") ? "+" : ""}${digits}`;
}

export function mailtoHref(value: unknown): string | undefined {
  const raw = asText(value);
  return raw !== undefined && isEmailish(raw) ? `mailto:${raw}` : undefined;
}

/**
 * §7.9 decision 4 (#142): a mend is shown, not said — these two are what the builder stores
 * and shows, so the owner meets the correction where they typed rather than on the exported
 * page.
 *
 * They live beside their href siblings for the same reason those are exported at all: the
 * builder and the page must not disagree about what a value becomes. A value that cannot be
 * mended comes back as the owner typed it (trimmed), so §7.9's mark still has the raw text to
 * point at, and nothing is ever invented.
 *
 * Phone is deliberately absent: §7.9 names only a web address and an email, and a phone
 * number's normalisation stays in the href, where showing it would be showing our results
 * rather than the owner's intent.
 */
export function mendUrl(value: string): string {
  const raw = value.trim();
  if (raw === "") return raw;
  return linkHref(raw) ?? raw;
}

export function mendEmail(value: string): string {
  // The one mend an email has: spaces stripped. The floor refuses whitespace outright, so
  // `hello @mysite.com` was a marked row; compacted, it is an address.
  const compact = value.replace(/\s+/g, "");
  return isEmailish(compact) ? compact : value.trim();
}

// ---------------------------------------------------------------------------
// 5. Address
// ---------------------------------------------------------------------------

/**
 * Free-text lines, written the way the owner would write them on an envelope (§2.3), plus an
 * optional directions link.
 *
 * Not structured street/city/region/postcode: that is what a developer reaches for and it is a
 * localisation trap — a UK florist filling in "state", a Japanese owner facing "street
 * address". Nothing in this project reads the address as data, so structure buys nothing.
 *
 * **When there is a `directionsUrl`, the address itself becomes the link.** An embedded map is
 * a subresource and invariant 2 forbids it, so a link out is the only answer to "where are
 * you" — and making the address the link text means the link needs no invented label and its
 * accessible name is the address, which is exactly what it goes to.
 *
 * **The two §6.4 properties here split across the two elements the section already had.**
 * `hasMap` goes on the `<a>`, where microdata reads the `href` and a map URL is exactly what
 * the property wants. `address` goes on the inner `<span>`, where it reads the text — the
 * free-text form schema.org accepts as `Text`, which is why §2.3's decision costs nothing. Put
 * through `validator.schema.org` the address is promoted to a `PostalAddress` whose `name` is
 * the owner's lines, with no error and no warning.
 *
 * > `hasMap` is a `Place` property, it validates, and that same tool does not list it in the
 * > graph it extracts — measured, not assumed. It is kept anyway: it is seventeen bytes, it is
 * > true, and a generic microdata reader takes it. That is a different situation from the logo
 * > in `headerSection`, which is dropped because the value cannot be fetched at all.
 *
 * The line break carries a newline as well as a `<br>` so that text is *readable* when read as
 * a property: `textContent` ignores the `<br>`, and without the newline a consumer would be
 * handed `12 Baker StreetLondonNW1 6XE` rather than `12 Baker Street London NW1 6XE`.
 * Whitespace after a forced break is dropped when the page is laid out, so nothing about how it
 * looks changes.
 */
function addressSection(value: unknown): string {
  const address = asRecord(value);
  if (!address) return "";

  const lines = asArray(address.lines)
    .map((line) => asText(line))
    .filter((line): line is string => line !== undefined);
  if (lines.length === 0) return "";

  const icon = glyphSvg(ICONS.location);
  // §6.9: each line gets a span so the underline can sit on the street line alone. Three
  // underlines read as three links, and the one under a postcode collides with its descenders.
  //
  // **The spans add no text**, which is the load-bearing part: this element carries
  // `itemprop="address"`, so §6.4's microdata still reads the lines joined by whitespace
  // exactly as before. A test asserts that rather than trusting it.
  const text = lines
    .map((line) => `<span class="lp-line">${escapeHtml(line)}</span>`)
    .join("<br>\n");
  const body = `${icon}<span itemprop="address">${text}</span>`;
  const href = linkHref(address.directionsUrl);

  const block =
    href === undefined
      ? `<p class="lp-address">${body}</p>`
      : `<a class="lp-address" itemprop="hasMap" href="${escapeHtml(href)}">${body}</a>`;

  return `<section class="lp-panel">\n${block}\n</section>`;
}

// ---------------------------------------------------------------------------
// 6. Social
// ---------------------------------------------------------------------------

/**
 * A row of brand marks (§2.3), each linking to the owner's profile.
 *
 * **An unrecognised platform is kept, not dropped** (§4.4): behind that string is a URL the
 * owner typed, so the entry renders with the generic `link` glyph. LinkedIn is the live
 * example — Simple Icons removed the mark at LinkedIn's request (§2.4), so a LinkedIn profile
 * travels the same path every unnamed platform takes.
 *
 * **And an unrecognised platform shows its name, where a recognised one does not.** A row of
 * marks identifies each entry by its mark; an entry with no mark has nothing to identify it,
 * and *two* of them are two identical chain-links side by side with nothing to tell them apart.
 * A screen reader was always fine here — the name below is real text either way — so this is
 * the sighted reader getting what assistive technology already had.
 *
 * The name costs nothing to show. It is already computed, already correct, and a platform name
 * is a proper noun, so unlike §2.5's vocabulary it needs no translation. The asymmetry is
 * information rather than untidiness: a labelled entry is one we have no mark for, which is
 * exactly what the owner is looking at.
 *
 * **The accessible name is real text, not an `aria-label`.** A link whose only visible content
 * is an `aria-hidden` mark still needs a name, and a visually-hidden span is text a translator
 * and a "find in page" can both see. The name is the platform's own spelling where we have one
 * — no rule capitalises `tiktok` into `TikTok` — then the URL's host, which is better material
 * than a capitalisation rule applied to `"my-forum"`.
 *
 * **`sameAs` is the last of §6.4's properties**, and the one microdata gets for free: on an
 * `<a>` the property's value is the `href`, so a row of profile links is already the list of
 * other places this business is, in the exact form schema.org asks for. The link buttons above
 * deliberately get nothing — a link to a booking system is not a claim about identity, and
 * there is no property that fits it without inventing one.
 */
function socialSection(value: unknown): string {
  const items = asArray(value)
    .map((entry) => socialLink(entry))
    .filter((markup) => markup !== "");

  if (items.length === 0) return "";
  return `<ul class="lp-social">\n${items.join("\n")}\n</ul>`;
}

function socialLink(value: unknown): string {
  const entry = asRecord(value);
  const href = linkHref(entry?.url);
  if (href === undefined) return "";

  const platform = entry?.platform;
  const marked = socialLabel(platform) !== "";
  const name = socialLabel(platform) || hostOf(href) || asText(platform) || href;

  // Marked: the mark identifies it and the name is for assistive technology only. Unmarked:
  // the glyph identifies nothing, so the name is shown and needs no second copy.
  const nameSpan = marked
    ? `<span class="lp-sr">${escapeHtml(name)}</span>`
    : `<span class="lp-social-name">${escapeHtml(name)}</span>`;
  const linkClass = marked ? "lp-social-link" : "lp-social-link lp-social-link--named";

  return (
    `<li><a class="${linkClass}" itemprop="sameAs" href="${escapeHtml(href)}">` +
    `${socialIconSvg(platform)}` +
    `${nameSpan}</a></li>`
  );
}

/** A URL's host, lowercased and without `www.` — the fallback accessible name (§2.4). */
function hostOf(url: string): string | undefined {
  const authority = /^[A-Za-z][A-Za-z0-9+.-]*:\/\/([^/?#]+)/.exec(url)?.[1];
  if (authority === undefined) return undefined;
  const host = (authority.split("@").pop() ?? "").replace(/:\d+$/, "").replace(/^www\./i, "");
  return host === "" ? undefined : host.toLowerCase();
}

// ---------------------------------------------------------------------------
// Escaping and URLs
// ---------------------------------------------------------------------------

/**
 * Escape text for interpolation into HTML element content or a double-quoted attribute.
 *
 * The parameter is typed `string` because that is the contract callers should write to. The
 * runtime guard exists anyway: the renderer is **total** (SPEC.md §4.7) and must not throw on
 * a wrong-typed value, because a data problem that throws would blank the builder's `srcdoc`
 * preview rather than degrading the page. A non-string reads as absent.
 */
export function escapeHtml(value: string): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** The schemes an `href` in this document may carry. */
const SAFE_SCHEMES = new Set(["http", "https", "mailto", "tel"]);
/** A leading scheme, if there is one. */
const SCHEME = /^([A-Za-z][A-Za-z0-9+.-]*):/;
/**
 * Whether the string carries a C0 control character or DEL.
 *
 * Browsers strip some of these mid-scheme; we refuse the whole value instead. Written as a
 * scan rather than as a character class on purpose: the regex would be the one place in this
 * package where `no-control-regex` has to be suppressed, and a suppression sitting next to a
 * security check is a bad place to teach a reader that suppressions are routine.
 */
function hasControlChar(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

/**
 * A URL safe to put in an `href`, or `undefined`.
 *
 * **Invariant 1 forbids a `javascript:` URL in the export** (§5.3) and that is absolute, so
 * this is the one place owner content is refused outright rather than merely escaped.
 *
 * A scheme-bearing URL must carry one of the four schemes above. A scheme-less one is allowed
 * through: it is *navigation*, which invariant 2 explicitly permits — "navigating to another
 * site is the entire point of a link page" — and it cannot cause a fetch. Control characters
 * are refused rather than stripped, because stripping them is how `java&#9;script:` becomes
 * live again, and a value carrying one is not a URL the owner typed on purpose.
 */
export function safeUrl(value: unknown): string | undefined {
  const url = asText(value);
  if (url === undefined || hasControlChar(url)) return undefined;

  const scheme = SCHEME.exec(url)?.[1];
  if (scheme !== undefined && !SAFE_SCHEMES.has(scheme.toLowerCase())) return undefined;

  // Belt as well as braces: a scheme-less URL can still spell `javascript:` further in — as a
  // query parameter, say — and invariant 1's guard reads any attribute value that does.
  if (/javascript:/i.test(url)) return undefined;

  return url;
}

/** Where the host part of a scheme-less URL stops. */
const AUTHORITY_END = /[/?#]/;

/**
 * The target for one of §2.3's three URL fields — a link button, `directionsUrl`, or a social
 * link — or `undefined` when we cannot derive one.
 *
 * **One rule for all three, and it lives beside `safeUrl` rather than inside it.** That name is
 * exported and promises *safe*, not *mended*; a caller asking whether a URL is safe to put in
 * an `href` must keep getting an answer to that question and not to this one.
 *
 * **A scheme-less value gets `https://` — but only after it has proved it looks like a host,
 * and the gate is the whole rule.** Testing the reflex is what put it there: a naive prepend
 * does not produce dead links, it produces confident links to the *wrong host*. `/menu` would
 * become `https://menu/`, inventing a hostname out of a real relative path, and `@mybakery`
 * would become `https://mybakery/`. Today `/menu` at least 404s on the owner's own site; a
 * naive mend sends the visitor somewhere else entirely.
 *
 * **`https://` unconditionally, because we cannot tell.** A builder-side probe is opaque under
 * CORS, and `https://` is what a browser itself tries on a bare domain. The escape is that this
 * fires *only* where there is no scheme, so an http-only owner types `http://` and is left
 * alone.
 *
 * **A string prepend, not `new URL`.** `new URL` normalises — a trailing slash, percent-encoding
 * — which rewrites the owner's target, and that is the class §6.7 is wariest of.
 *
 * **No host-specific exceptions and no handles.** Matching known social hosts to turn a handle
 * into a URL fires hardest on correctly-pasted addresses, and *handle* is not one concept:
 * Mastodon is federated so `@user@instance.social` has no derivable host, WhatsApp's URL takes
 * a phone number, Bluesky handles are themselves domains, and X's host changed from
 * `twitter.com`. A template table would go stale silently, and stale means a 404.
 *
 * **The limit, stated rather than buried:** `mybakery.couk` mends into a confident link to a
 * domain that does not exist, and nothing available to us can tell.
 *
 * Exported for the same reason as `telHref`: §7.4's row mark and §7.7's line have to ask this
 * exact question, or the builder and the page will disagree.
 */
/*
 * A note on what `undefined` costs here, because it is not the same as for `telHref`.
 *
 * `contactRow` renders text without a link, so a refused phone number still reads on the page.
 * A link button and a social entry are **omitted entirely** — §7.3's *a button exists only once
 * it has a URL*, reaching a case it did not previously have, since before this rule "no href"
 * only ever meant "no URL at all". Both are pure affordance: a labelled thing whose only
 * content is that it goes somewhere, and one that goes nowhere is a lie on the owner's page.
 *
 * The cost is real and §2.3 states it: the owner's button disappears until they fix it. What
 * makes that the right way round is that the disappearance is never silent *to the owner*
 * (§7.4, §7.7), whereas a dead button is silent to every visitor who taps it.
 */
export function linkHref(value: unknown): string | undefined {
  const url = safeUrl(value);
  if (url === undefined) return undefined;
  if (SCHEME.test(url)) return url;

  const authority = url.split(AUTHORITY_END, 1)[0] ?? "";
  // Non-empty, a dot in it, no `@`, no whitespace. Anything else is not a host we are willing
  // to invent, so there is no target and the owner's text stands.
  if (authority === "" || !authority.includes(".")) return undefined;
  if (authority.includes("@") || /\s/.test(authority)) return undefined;

  return `https://${url}`;
}

import { glyphSvg, ICONS, iconSvg, socialIconSvg, socialLabel } from "./icons.js";
import { hoursView, CLOSED_LABEL, type HoursRow } from "./hours.js";
import { derivePalette } from "./palette.js";
import { stylesheet } from "./stylesheet.js";
import type { Mode, Project, Style } from "./project.js";
import { asArray, asEnum, asPositiveInt, asRecord, asText } from "./values.js";

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
 * abbreviations and "Closed"; see `hours.ts`.
 *
 * Two things deliberately left out, because they belong to the issues that own them:
 * the four shapes, three type pairings and corner softness (#27), and the export's structural
 * guarantees — microdata, provenance, the size assertion (#28).
 */
export function render(project: Project): string {
  // `project` is typed, but types are a compile-time promise and this function has to survive
  // a hand-edited `project.json` at runtime — so it is read as `unknown` from here down.
  const root = asRecord(project);

  const style = asRecord(root?.style);
  const mode = asEnum(style?.mode, MODES, "light");
  // `derivePalette` is itself total (§4.7) and reads its argument defensively; the cast hands
  // it the raw record rather than pretending we validated one.
  const palette = derivePalette(style as Style | undefined);

  const sections = [
    headerSection(root?.header),
    linksSection(root?.links),
    hoursSection(root?.hours),
    contactSection(root?.contact),
    addressSection(root?.address),
    socialSection(root?.social),
  ].filter((section) => section !== "");

  return [
    "<!doctype html>",
    `<html lang="${escapeHtml(language(root?.lang))}">`,
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escapeHtml(documentTitle(root?.header))}</title>`,
    `<style>${stylesheet(palette, mode)}</style>`,
    "</head>",
    "<body>",
    '<main class="lp-page">',
    ...sections,
    "</main>",
    "</body>",
    "</html>",
  ].join("\n");
}

const MODES: readonly Mode[] = ["light", "dark"];

// ---------------------------------------------------------------------------
// The document
// ---------------------------------------------------------------------------

/** A BCP 47 tag's shape: subtags of one to eight alphanumerics, joined by hyphens. */
const LANGUAGE_TAG = /^[A-Za-z]{1,8}(-[A-Za-z0-9]{1,8})*$/;

/**
 * The `lang` attribute WCAG 2.2 SC 3.1.1 requires (§4.1), or `"en"`.
 *
 * Shape-checked rather than passed through, for the same reason every other value here is: an
 * arbitrary string in an attribute is how a hand-edited file would reach the one place the
 * page's markup is not the owner's content. Anything that is not tag-shaped is absent (§4.7).
 * #28 owns the rest of the export's structural guarantees.
 */
function language(value: unknown): string {
  const tag = asText(value);
  return tag !== undefined && LANGUAGE_TAG.test(tag) ? tag : "en";
}

/**
 * What the browser tab says: the business name, falling back to the tagline.
 *
 * When a hand-edited file has neither, the element is emitted empty rather than filled with a
 * name we made up — and specifically not with the product's own name, since §6.6 rules out a
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
 * **`alt=""`, unconditionally** (§6.5): `header.name` is required and rendered as text beside
 * the logo, which makes the logo decorative in W3C's sense — everything it conveys is already
 * available as text. `width` and `height` are emitted because the builder knows both at
 * normalisation time and they prevent layout shift while the data URI decodes.
 *
 * > The dependency §6.5 asks to be preserved: `alt=""` is correct only while `name` is
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
    name === undefined ? "" : `<h1 class="lp-name">${escapeHtml(name)}</h1>`,
    tagline === undefined ? "" : `<p class="lp-tagline">${escapeHtml(tagline)}</p>`,
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
  const href = safeUrl(link?.url);
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
 */
function hoursSection(value: unknown): string {
  const hours = hoursView(value);
  if (!hours) return "";

  const parts: string[] = [];
  if (hours.rows.length > 0) {
    parts.push(`<dl class="lp-hours">\n${hours.rows.map(hoursRow).join("\n")}\n</dl>`);
  }
  if (hours.note !== undefined) {
    parts.push(`<p class="lp-note">${escapeHtml(hours.note)}</p>`);
  }
  return `<section class="lp-panel">\n${parts.join("\n")}\n</section>`;
}

function hoursRow(row: HoursRow): string {
  const times =
    row.intervals.length === 0
      ? `<span>${escapeHtml(CLOSED_LABEL)}</span>`
      : row.intervals.map((interval) => `<span>${escapeHtml(interval)}</span>`).join("");

  return `<dt class="lp-day">${escapeHtml(row.label)}</dt><dd class="lp-times">${times}</dd>`;
}

// ---------------------------------------------------------------------------
// 4. Contact
// ---------------------------------------------------------------------------

/** Everything that is not a digit. The `tel:` href is built from a filter, not from text. */
const NOT_A_DIGIT = /[^0-9]/g;
/** A conservative address shape. Notably no `:`, so a scheme can never appear inside one. */
const EMAIL = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~.-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/;

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
 */
function contactSection(value: unknown): string {
  const contact = asRecord(value);
  if (!contact) return "";

  const rows = [
    contactRow(asText(contact.phone), telHref(contact.phone), glyphSvg(ICONS.phone)),
    contactRow(asText(contact.email), mailtoHref(contact.email), glyphSvg(ICONS.mail)),
  ].filter((row) => row !== "");

  if (rows.length === 0) return "";
  return `<section class="lp-panel">\n<ul class="lp-rows">\n${rows.join("\n")}\n</ul>\n</section>`;
}

function contactRow(text: string | undefined, href: string | undefined, icon: string): string {
  if (text === undefined) return "";
  const body = `${icon}<span>${escapeHtml(text)}</span>`;
  return href === undefined
    ? `<li class="lp-row">${body}</li>`
    : `<li><a class="lp-row" href="${escapeHtml(href)}">${body}</a></li>`;
}

/**
 * A `tel:` URL, or `undefined` when there is no number in there to dial.
 *
 * Digits, and a `+` only where the owner put one at the front — which is the whole of what a
 * dialler needs and, more to the point, a charset a `javascript:` URL cannot be spelled in.
 * Nothing here tries to be clever about national conventions: the `(0)` in `+44 (0)20 …` is
 * kept as a digit because guessing at trunk prefixes is how a tool dials the wrong number, and
 * the text beside the link is still exactly what the owner wrote.
 */
function telHref(value: unknown): string | undefined {
  const raw = asText(value);
  if (raw === undefined) return undefined;
  const digits = raw.replace(NOT_A_DIGIT, "");
  if (digits === "") return undefined;
  return `tel:${raw.startsWith("+") ? "+" : ""}${digits}`;
}

function mailtoHref(value: unknown): string | undefined {
  const raw = asText(value);
  return raw !== undefined && EMAIL.test(raw) ? `mailto:${raw}` : undefined;
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
 */
function addressSection(value: unknown): string {
  const address = asRecord(value);
  if (!address) return "";

  const lines = asArray(address.lines)
    .map((line) => asText(line))
    .filter((line): line is string => line !== undefined);
  if (lines.length === 0) return "";

  const icon = glyphSvg(ICONS.location);
  const body = `${icon}<span>${lines.map((line) => escapeHtml(line)).join("<br>")}</span>`;
  const href = safeUrl(address.directionsUrl);

  const block =
    href === undefined
      ? `<p class="lp-address">${body}</p>`
      : `<a class="lp-address" href="${escapeHtml(href)}">${body}</a>`;

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
 * **The accessible name is real text, not an `aria-label`.** A link whose only visible content
 * is an `aria-hidden` mark still needs a name, and a visually-hidden span is text a translator
 * and a "find in page" can both see. The name is the platform's own spelling where we have one
 * — no rule capitalises `tiktok` into `TikTok` — then the URL's host, which is better material
 * than a capitalisation rule applied to `"my-forum"`.
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
  const href = safeUrl(entry?.url);
  if (href === undefined) return "";

  const platform = entry?.platform;
  const name = socialLabel(platform) || hostOf(href) || asText(platform) || href;

  return (
    `<li><a class="lp-social-link" href="${escapeHtml(href)}">${socialIconSvg(platform)}` +
    `<span class="lp-sr">${escapeHtml(name)}</span></a></li>`
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

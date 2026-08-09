import type {
  Address,
  Contact,
  Hours,
  Interval,
  Link,
  SocialLink,
  Weekday,
} from "@linkpage/renderer";
import type { Draft } from "../project/index.js";

/**
 * What the flow can ask about, whether the owner has covered it, and **the one door through
 * which an answer reaches the project**. `SPEC.md` §7.1, §7.2, §7.3.
 *
 * > **A ticked-but-empty section is not a state that exists.**
 *
 * That is the failure §7.1 built the whole two-screens rule to prevent — a half-filled
 * _Opening hours_ row sitting on the list for a month because ticking a box and filling it in
 * were two separate acts the owner had to connect for themselves. A UI can promise not to
 * produce it. This module makes it unrepresentable instead:
 *
 * - `answerSection` is the only function in the builder that puts a section on a draft, and it
 *   **returns the draft untouched when the answer has no content in it**. There is no argument
 *   that makes it write an empty section, so no screen, no keyboard path and no future edit to
 *   `Flow.tsx` can produce one.
 * - `addLink` is the same door for a link button, with the same shape: **a button exists only
 *   once it has a URL** (§7.3), so a pick with no destination is a no-op rather than a row.
 * - `hasContent` is the predicate behind both, and it is the *same* predicate the flow uses to
 *   decide whether to ask (§7.2, "the flow asks for each thing the owner has not covered").
 *   One definition of "covered" means the flow cannot both skip a section and leave it empty.
 *
 * Normalising is part of the door rather than a step before it. A day the owner opened and
 * left blank, a social row with a platform and no URL, an address of empty lines — each is
 * stripped here, so "has content" is asked of what would actually be written rather than of
 * what the form happened to be holding.
 */

/** The four optional sections, which are the four steps a preset chooses between (§7.3). */
export type Section = "hours" | "contact" | "address" | "social";

/**
 * A thing the flow can walk the owner through, and the list can hand back to it.
 *
 * Wider than the four a preset chooses between, because §7.1's rule is wider: _the flow
 * re-enters for anything new_, and a tagline the owner has not written is as much uncovered
 * territory as opening hours they have not given. What a preset selects is still only the four
 * (§7.3); `tagline`, `logo` and `links` are asked of everybody, because nothing about a
 * business type makes them more or less likely.
 *
 * The two required fields are absent on purpose. A required question is not a topic: it cannot
 * be declined, cannot be re-entered for, and is planned from the draft rather than requested.
 */
export type Topic = "tagline" | "logo" | "links" | Section;

/** Every topic, in the order the flow asks — the page's own order, top to bottom (§2.1). */
export const TOPICS: readonly Topic[] = [
  "tagline",
  "logo",
  "links",
  "hours",
  "contact",
  "address",
  "social",
];

/** In page order (§2.1), which is the order the flow asks in. */
export const SECTIONS: readonly Section[] = ["hours", "contact", "address", "social"];

/**
 * What each topic is called when the list offers to walk the owner into it (§7.1, §7.4).
 *
 * Named as the thing rather than as the act — _Opening hours_, not _Add opening hours_ — so
 * the list reads as an inventory of the page and the tick is what turns one on. It is the
 * ticking that re-enters the flow, and the flow that does the filling in; the owner never has
 * to connect those two for themselves, which is the failure §7.1 was built against.
 */
export const TOPIC_LABELS: Readonly<Record<Topic, string>> = {
  tagline: "A line about what you do",
  logo: "Logo",
  links: "Link buttons",
  hours: "Opening hours",
  contact: "Phone and email",
  address: "Address",
  social: "Social accounts",
};

/** The days, in the order the hours question shows them under `weekStart: "mon"`. */
export const WEEKDAYS: readonly Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

/** An answer to one of the four optional section steps, before it has been through the door. */
export type SectionAnswer =
  | { readonly section: "hours"; readonly value: Hours }
  | { readonly section: "contact"; readonly value: Contact }
  | { readonly section: "address"; readonly value: Address }
  | { readonly section: "social"; readonly value: SocialLink[] };

// ---------------------------------------------------------------------------
// Normalising
// ---------------------------------------------------------------------------

const blank = (value: string | undefined): boolean => (value ?? "").trim() === "";

/**
 * A day's intervals, with the half-typed ones dropped.
 *
 * An empty array survives, and that is the whole subtlety of §2.3: absent means _unspecified_
 * and empty means _explicitly closed_, so an owner who ticked "closed on Sunday" has said
 * something and an owner who opened Sunday and typed nothing has not.
 */
function cleanIntervals(intervals: readonly Interval[]): Interval[] {
  return intervals
    .filter(([open, close]) => !blank(open) && !blank(close))
    .map(([open, close]) => [open.trim(), close.trim()] as Interval);
}

function cleanHours(value: Hours): Hours {
  const days: Partial<Record<Weekday, Interval[]>> = {};
  for (const day of WEEKDAYS) {
    const intervals = value.days[day];
    if (intervals === undefined) continue;
    const cleaned = cleanIntervals(intervals);
    // Present-and-empty is "closed" and is kept; present-with-only-junk is a form the owner
    // opened and abandoned, and is dropped back to unspecified.
    if (intervals.length > 0 && cleaned.length === 0) continue;
    days[day] = cleaned;
  }
  const note = value.note?.trim();
  return { clock: value.clock, weekStart: value.weekStart, days, ...(blank(note) ? {} : { note }) };
}

function cleanContact(value: Contact): Contact {
  const phone = value.phone?.trim();
  const email = value.email?.trim();
  return { ...(blank(phone) ? {} : { phone }), ...(blank(email) ? {} : { email }) };
}

function cleanAddress(value: Address): Address {
  const url = value.directionsUrl?.trim();
  return {
    lines: value.lines.map((line) => line.trim()).filter((line) => line !== ""),
    ...(blank(url) ? {} : { directionsUrl: url }),
  };
}

/** A social row is its URL; the platform only decides which mark it wears (§2.4, §4.4). */
function cleanSocial(value: readonly SocialLink[]): SocialLink[] {
  return value
    .map((entry) => ({ platform: entry.platform.trim(), url: entry.url.trim() }))
    .filter((entry) => entry.url !== "" && entry.platform !== "");
}

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

function hoursHasContent(value: Hours | undefined): boolean {
  if (value === undefined) return false;
  const cleaned = cleanHours(value);
  return Object.keys(cleaned.days).length > 0 || !blank(cleaned.note);
}

function contactHasContent(value: Contact | undefined): boolean {
  if (value === undefined) return false;
  const cleaned = cleanContact(value);
  return !blank(cleaned.phone) || !blank(cleaned.email);
}

function addressHasContent(value: Address | undefined): boolean {
  if (value === undefined) return false;
  const cleaned = cleanAddress(value);
  return cleaned.lines.length > 0 || !blank(cleaned.directionsUrl);
}

function socialHasContent(value: readonly SocialLink[] | undefined): boolean {
  return value !== undefined && cleanSocial(value).length > 0;
}

/** A link is its destination (§7.3), so a list of labels with no URLs holds nothing. */
function linksHaveContent(value: readonly Link[] | undefined): boolean {
  return value !== undefined && value.some((entry) => !blank(entry.url));
}

/**
 * Whether the owner has covered this topic.
 *
 * Used twice and deliberately not written twice: the flow asks this to decide whether to run a
 * step, and the door below asks it to decide whether to write one. If the two ever disagreed,
 * a ticked-but-empty section is exactly what would appear in the gap.
 */
export function hasContent(draft: Draft, topic: Topic): boolean {
  switch (topic) {
    case "tagline":
      return !blank(draft.header.tagline);
    case "logo":
      return draft.header.logo !== null;
    case "links":
      return linksHaveContent(draft.links);
    case "hours":
      return hoursHasContent(draft.hours);
    case "contact":
      return contactHasContent(draft.contact);
    case "address":
      return addressHasContent(draft.address);
    case "social":
      return socialHasContent(draft.social);
  }
}

// ---------------------------------------------------------------------------
// The door
// ---------------------------------------------------------------------------

/**
 * Put a section on the draft — or, if the answer is empty, don't.
 *
 * The escape on every step (§7.2) and this function are the same decision seen from two
 * sides: _"not for us"_ never calls it, and calling it with nothing does nothing. Both roads
 * lead to a project with no such key, which is what makes "skip it and you don't have it" a
 * fact about the file rather than a promise about the UI.
 */
export function answerSection(draft: Draft, answer: SectionAnswer): Draft {
  switch (answer.section) {
    case "hours": {
      const value = cleanHours(answer.value);
      return hoursHasContent(value) ? { ...draft, hours: value } : draft;
    }
    case "contact": {
      const value = cleanContact(answer.value);
      return contactHasContent(value) ? { ...draft, contact: value } : draft;
    }
    case "address": {
      const value = cleanAddress(answer.value);
      return addressHasContent(value) ? { ...draft, address: value } : draft;
    }
    case "social": {
      const value = cleanSocial(answer.value);
      return socialHasContent(value) ? { ...draft, social: value } : draft;
    }
  }
}

/**
 * Append a link button — or, without a URL, don't (§7.3).
 *
 * This is why the link step is a pick-list and not a set of pre-created rows: tapping _Book a
 * table_ records an intention, and nothing reaches `links` until the next screen has a
 * destination for it. Nothing without one reaches the list, the file, or the page.
 */
export function addLink(draft: Draft, link: Link): Draft {
  const url = link.url.trim();
  if (url === "") return draft;
  const label = link.label.trim();
  return {
    ...draft,
    links: [
      ...draft.links,
      { label, url, ...(link.icon === undefined ? {} : { icon: link.icon }) },
    ],
  };
}

/** The business name (§2.3). Required, so a blank one is not an answer. */
export function answerName(draft: Draft, name: string): Draft {
  const value = name.trim();
  if (value === "") return draft;
  return { ...draft, header: { ...draft.header, name: value } };
}

/**
 * The tagline (§2.3). Optional, so a blank one is the escape by another route.
 *
 * The door stands here for the same reason it stands in front of a section: an empty string in
 * `header.tagline` is a key in the file that says the owner answered and said nothing, and the
 * renderer would emit an empty element for it. Declining is absence, not emptiness.
 */
export function answerTagline(draft: Draft, tagline: string): Draft {
  const value = tagline.trim();
  if (value === "") return draft;
  return { ...draft, header: { ...draft.header, tagline: value } };
}

/** The brand colour (§3.1). Required, and honoured exactly as typed (§3.3). */
export function answerBrand(draft: Draft, brand: string): Draft {
  const value = brand.trim();
  if (value === "") return draft;
  return { ...draft, style: { ...draft.style, brand: value } };
}

/**
 * The page's language — the one required field that is not a question (§4.1).
 *
 * WCAG 2.2 SC 3.1.1 wants `<html lang>` and the honest answer is the browser's, not `"en"`:
 * the page's content is the owner's own words, and hardcoding a language would mislead screen
 * readers and translation tools about them. So it is answered by the environment, silently,
 * the way §4.3 upgrades any other absent field — never by a screen.
 */
export function answerLang(draft: Draft, lang: string): Draft {
  if (draft.lang !== undefined) return draft;
  const value = lang.trim();
  return value === "" ? draft : { ...draft, lang: value };
}

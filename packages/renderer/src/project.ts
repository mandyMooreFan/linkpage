/**
 * The `project.json` schema for v1. Specified in full in `SPEC.md` §4.
 *
 * **The file stores the owner's intent, not our results.** `project.json` holds what the
 * owner chose; `index.html` holds what we made of it. Two consequences show up as absences
 * below and are deliberate:
 *
 * - **No derived colours.** Text, ground, surfaces, rules and button text are computed at
 *   render time from `style.brand` and `style.accent` and are never stored (§3.2). Storing
 *   both would invent a consistency question — if a hand-edited file's palette disagrees
 *   with its brand colour, which wins? — and that is a bug class this project does not have.
 * - **No `preset` field.** A preset is an action, not a property (§7.3). Two owners who
 *   reach the same page have byte-identical files whether one took a preset or ticked boxes
 *   by hand.
 *
 * **These types are the compile-time contract, not a runtime guarantee.** They describe a
 * well-formed v1 project — what the builder writes. What the renderer *accepts* is wider:
 * it is total, treats every field as optional, and reads a wrong-typed value as absent
 * (§4.7). Validation lives in the builder (§4.7), and the rules for unknown enum values and
 * unknown keys are §4.4 and §4.5.
 */

import type { IconName, SocialPlatform } from "./icons.js";

/** The only `version` v1 writes. A bump means a breaking change — see `SPEC.md` §4.2. */
export const SCHEMA_VERSION = 1;

/** Layout and emphasis. Carries structure only, never a palette (§3.2). */
export type Shape = "centred" | "colourBlock" | "floatingCard" | "ruledLeft";

/** Resolves to a system font stack; the export ships no webfonts (§6.2). */
export type TypePairing = "classic" | "modern" | "friendly";

export type Mode = "light" | "dark";

/** Display preference only — never changes what is stored (§2.3). */
export type Clock = "12h" | "24h";

/** Display preference only. */
export type WeekStart = "mon" | "sun";

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

/** A 24-hour `"HH:MM"` time. Storage is always 24-hour; `Clock` decides display. */
export type TimeOfDay = string;

/** One opening interval. A day holds zero or more; zero means closed (§2.3). */
export type Interval = [open: TimeOfDay, close: TimeOfDay];

/**
 * Hand-set colours from the advanced panel, keyed by the derived role they override.
 *
 * The role names belong to the derivation (§3.2) and are not enumerated here, so this stays
 * open. Note the object is **persisted even when `enabled` is false** (§3.4): switching the
 * panel off must not destroy the owner's manual work, and switching it back on must return
 * it intact.
 */
export type ColorOverrides = Record<string, string>;

/**
 * The advanced tier: a separate, losslessly reversible override layer (§3.4).
 *
 * Opening it is the owner's acknowledgement that the readability guarantee no longer
 * applies — which is why the guarantee is "AA **by default**", not "always" (§6.7).
 */
export interface Advanced {
  enabled: boolean;
  colors: ColorOverrides;
}

/**
 * The six controls, and only the six (§3.1).
 *
 * `brand` is required and is the one thing the owner must give — which is why the builder's
 * flow cannot open on a blank page, and why a missing `brand` in an imported file is
 * collected by the flow rather than defaulted (§4.6).
 */
export interface Style {
  brand: string;
  accent?: string;
  shape: Shape;
  type: TypePairing;
  /** 0 = sharp … 1 = rounded. */
  corners: number;
  mode: Mode;
  advanced: Advanced;
}

/**
 * The logo, after the builder's intake pipeline has run (§6.5).
 *
 * This is the one place the file stores a *result* rather than an intent, unavoidably: the
 * renderer cannot decode or resize anything, and keeping a 4 MB original is not an option.
 * It is still the owner's content rather than our derivation of their preference, which is
 * what keeps the principle above intact.
 *
 * `width` and `height` are stored rather than derived because the renderer receives an
 * opaque string and cannot measure it — and emitting them on the `<img>` prevents layout
 * shift while the data URI decodes.
 */
export interface Logo {
  /** A `data:` URI. Never an external or relative reference — invariant 2 (§5.3). */
  src: string;
  width: number;
  height: number;
}

export interface Header {
  name: string;
  tagline?: string;
  logo: Logo | null;
}

/**
 * A label, a URL, and optionally an icon — nothing else (§2.3).
 *
 * There is no "featured" flag: the owner controls list order, so **position is the emphasis
 * mechanism**, and a second way to signal importance invites a page where everything is
 * featured. The editor marks the top slot to make that mechanism visible (§7.5).
 */
export interface Link {
  label: string;
  url: string;
  /**
   * A name from the curated, vendored icon set — `IconName`, enumerated in `icons.ts` and
   * in `SPEC.md` §2.4.
   *
   * **Closed, unlike `SocialLink.platform` below, and the asymmetry is the point.** There is
   * no authored content behind an icon name: the owner picked it from a short list of
   * glyphs we drew, so it is a *preference* in §4.4's sense. Preferences fall back for
   * rendering — an unrecognised name renders no glyph rather than failing — and the original
   * value is preserved in `project.json` by the builder's raw-object merge (§4.5), so a
   * newer version restores the choice intact. Nothing the owner typed can be lost by
   * closing this.
   */
  icon?: IconName;
}

/**
 * Opening hours. Days absent from `days` are unspecified; a day present with an empty array
 * is explicitly closed.
 *
 * Intervals rather than a single open/close pair because a single pair would be wrong on day
 * one for a large slice of the target users — restaurants open 11–2 and 5–9, salons that
 * close for lunch. Everything structure should not model goes in `note`: bank holidays, "by
 * appointment", seasonal changes (§2.3).
 */
export interface Hours {
  clock: Clock;
  weekStart: WeekStart;
  days: Partial<Record<Weekday, Interval[]>>;
  note?: string;
}

export interface Contact {
  phone?: string;
  email?: string;
}

/**
 * Free-text lines, written the way the owner would write them on an envelope (§2.3).
 *
 * Not structured street/city/region/postcode: that is what a developer reaches for and it is
 * a localisation trap — a UK florist filling in "state", a Japanese owner facing "street
 * address". Nothing in this project reads the address as data, so structure buys nothing.
 *
 * `directionsUrl` matters because an embedded map is a subresource and invariant 2 forbids
 * it — a link out is the only remaining answer to "where are you".
 */
export interface Address {
  lines: string[];
  directionsUrl?: string;
}

/**
 * A platform identifier: any string, with the ten that have a vendored brand mark
 * (`SocialPlatform`, enumerated in `icons.ts` and in `SPEC.md` §2.4) offered as completions.
 *
 * **Deliberately open, and it stays open now that the list exists.** §4.4 requires an
 * unrecognised platform to be *kept, not dropped*, because behind that string is a URL the
 * owner typed — so a closed union would be a type that lies about what a valid `project.json`
 * may contain, and every consumer would need a cast or a drop to get past it. The list of
 * marks we happen to have drawn is not the list of places a business can be.
 *
 * The `string & Record<never, never>` half is the usual trick for keeping literal completions
 * alive alongside `string`: on its own, `SocialPlatform | string` collapses to `string` and
 * the editor stops suggesting anything.
 */
export type PlatformId = SocialPlatform | (string & Record<never, never>);

export interface SocialLink {
  /**
   * The platform whose brand mark is shown, when we have one.
   *
   * Unrecognised values are **kept, not dropped** (§4.4): the entry renders with the generic
   * `link` glyph and the value is preserved verbatim. The link is the point; the icon is
   * decoration. `LinkedIn` is the live example — Simple Icons removed the mark at LinkedIn's
   * request, so a LinkedIn profile travels this path rather than a special one.
   */
  platform: PlatformId;
  url: string;
}

/**
 * A complete v1 project.
 *
 * Section order is fixed and not stored — `header → links → hours → contact → address →
 * social` (§2.1). `header` and `links` always render; the four business sections are each
 * optional. There is no reordering control and no `order` field, though adding one later
 * would be purely additive.
 */
export interface Project {
  version: typeof SCHEMA_VERSION;
  /** BCP 47. Renders as `<html lang>`, which WCAG 2.2 SC 3.1.1 requires (§4.1). */
  lang: string;
  style: Style;
  header: Header;
  links: Link[];
  hours?: Hours;
  contact?: Contact;
  address?: Address;
  social?: SocialLink[];
}

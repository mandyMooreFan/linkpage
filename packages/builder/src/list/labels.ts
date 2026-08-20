import type { Clock, Mode, Shape, TypePairing, WeekStart } from "@linkpage/renderer";

/**
 * The words the review list uses for things `project.json` stores as identifiers.
 * `SPEC.md` §3.1, §3.4, §2.3.
 *
 * A file says `"colourBlock"` and an owner says "colour block"; a file says `"inkMuted"` and an
 * owner says "quieter text". Keeping the translation in one table rather than beside each
 * control is what stops the same enum reading two ways in two places — the _How it looks_
 * controls, the row summaries and the advanced panel's readout all name the same value with the
 * same word.
 *
 * Nothing here is a claim about a business (§7.3), so unlike the preset table these strings are
 * safe to put in front of an owner without asking first.
 */

export const SHAPE_LABELS: Readonly<Record<Shape, string>> = {
  centred: "Centred",
  colourBlock: "Colour block",
  floatingCard: "Floating card",
  ruledLeft: "Ruled left",
};

export const TYPE_LABELS: Readonly<Record<TypePairing, string>> = {
  classic: "Classic",
  modern: "Modern",
  friendly: "Friendly",
};

export const MODE_LABELS: Readonly<Record<Mode, string>> = {
  light: "Light",
  dark: "Dark",
};

export const CLOCK_LABELS: Readonly<Record<Clock, string>> = {
  "12h": "9:00am",
  "24h": "09:00",
};

export const WEEK_START_LABELS: Readonly<Record<WeekStart, string>> = {
  mon: "Monday",
  sun: "Sunday",
};

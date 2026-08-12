/**
 * PROTOTYPE — throwaway. Ticket #84.
 *
 * One bakery, so the three variants are judged against the same words. The content is what this
 * map has already decided rather than what ships today — named swatches and `● Raspberry` from
 * [#93](https://github.com/mandyMooreFan/linkpage/issues/93), the typed time box from
 * [#101](https://github.com/mandyMooreFan/linkpage/issues/101), the arrival line from
 * [#94](https://github.com/mandyMooreFan/linkpage/issues/94) — so the redesign is drawn around
 * the product as it is going to be, not as it was.
 */

export interface Swatch {
  readonly hex: string;
  readonly name: string;
}

/** #93's twelve, named. */
export const SWATCHES: readonly Swatch[] = [
  { hex: "#b0122f", name: "Crimson" },
  { hex: "#c2185b", name: "Raspberry" },
  { hex: "#7b1fa2", name: "Grape" },
  { hex: "#4527a0", name: "Violet" },
  { hex: "#1565c0", name: "Cobalt" },
  { hex: "#00695c", name: "Teal" },
  { hex: "#2e7d32", name: "Forest" },
  { hex: "#556b2f", name: "Olive" },
  { hex: "#a05a00", name: "Amber" },
  { hex: "#bf360c", name: "Rust" },
  { hex: "#5d4037", name: "Cocoa" },
  { hex: "#37474f", name: "Slate" },
];

export interface Row {
  readonly label: string;
  readonly summary: string;
}

/** The review list, mid-project: enough rows to show density, one of them long. */
export const ROWS: readonly Row[] = [
  { label: "Business name", summary: "Ada & Sons Bakery" },
  { label: "How it looks", summary: "Raspberry · Centred · Light" },
  { label: "Link buttons", summary: "See the menu · Order for pickup · Book a table" },
  { label: "Opening hours", summary: "Mon–Fri 9:00 AM – 5:00 PM · Sat 10:00 AM – 4:00 PM" },
  { label: "Contact", summary: "0161 496 0000 · hello@adabakery.co.uk" },
  { label: "Where you are", summary: "14 Tib Street, Manchester M1 1JQ" },
  { label: "Page language", summary: "English" },
];

/** The topics not yet covered — the list's "Anything else?" (§7.4). */
export const UNCOVERED: readonly string[] = ["Tagline", "Logo", "Social accounts"];

export const BUSINESS = "Ada & Sons Bakery";

/** #94's arrival line, shown once on landing from a run. */
export const ARRIVAL = "Your page is ready. Look it over, then download it.";

/**
 * Project fixtures shared by the renderer's tests.
 *
 * They live in their own module rather than in one test file because two suites need the same
 * pages: `render.test.ts` snapshots them and `invariants.test.ts` runs the three guards over
 * them. A guard that only ever sees the minimal project is a guard that has never seen an
 * icon, a data URI or an owner's apostrophe.
 *
 * **Test support, not shipped code** — `tsconfig.build.json` excludes it alongside the tests.
 */

import { SCHEMA_VERSION, type Project, type Style } from "./project.js";

const style: Style = {
  brand: "#c2185b",
  accent: "#2e7d32",
  shape: "centred",
  type: "classic",
  corners: 0.6,
  mode: "light",
  advanced: { enabled: false, colors: {} },
};

/**
 * The two required inputs — brand colour and business name — plus the fields the schema does
 * not make optional. Exactly what a first run produces before the owner answers anything else
 * (§7.2), and the shape every "missing section" assertion is written against.
 */
export const MINIMAL: Project = {
  version: SCHEMA_VERSION,
  lang: "en",
  style,
  header: { name: "Ada's Bakery", logo: null },
  links: [],
};

/**
 * All six sections filled in — a page the tool is actually for.
 *
 * Deliberately not tidy: a link with no glyph, a day with two intervals, a day that is closed,
 * days that are unspecified, and a social platform with no vendored mark are each here because
 * each is a branch, and the whole-page snapshot is where they are seen together.
 */
export const POPULATED: Project = {
  ...MINIMAL,
  lang: "en-GB",
  header: {
    name: "Ada's Bakery",
    tagline: "Sourdough & pastries since 1994",
    logo: { src: "data:image/png;base64,iVBORw0KGgo=", width: 1200, height: 400 },
  },
  links: [
    { label: "See the menu", url: "https://adasbakery.example/menu", icon: "menu" },
    { label: "Order for pickup", url: "https://adasbakery.example/order", icon: "bag" },
    { label: "Book a table", url: "https://adasbakery.example/book" },
  ],
  hours: {
    clock: "12h",
    weekStart: "mon",
    days: {
      mon: [["09:00", "17:00"]],
      fri: [["09:00", "17:00"]],
      sat: [
        ["10:00", "14:00"],
        ["17:00", "21:00"],
      ],
      sun: [],
    },
    note: "Closed bank holidays.",
  },
  contact: { phone: "020 7123 4567", email: "hello@adasbakery.example" },
  address: {
    lines: ["12 Baker Street", "London", "NW1 6XE"],
    directionsUrl: "https://maps.example/?q=12+Baker+Street",
  },
  social: [
    { platform: "instagram", url: "https://instagram.com/adasbakery" },
    { platform: "whatsapp", url: "https://wa.me/442071234567" },
    // LinkedIn has no vendored mark (§2.4) and is the live proof of §4.4's fallback path.
    { platform: "linkedin", url: "https://www.linkedin.com/company/adasbakery" },
  ],
};

/** The same page in dark mode: the palette changes, the markup does not. */
export const POPULATED_DARK: Project = {
  ...POPULATED,
  style: { ...style, mode: "dark" },
};

/**
 * A file nobody wrote on purpose: every section present and every one of them the wrong shape,
 * with a business name that is markup and a link that wants to run code.
 *
 * The invariants have to hold here too — this is what §4.7 means by a data problem degrading
 * the page rather than blanking the preview.
 */
export const DAMAGED = {
  version: "one",
  lang: 'en" onload="alert(1)',
  style: { brand: "not a colour", mode: "brutalist", advanced: { enabled: true, colors: 7 } },
  header: { name: '<img src=x onerror="alert(1)">', tagline: null, logo: { src: "/logo.png" } },
  links: [{ label: "Tap", url: "javascript:alert(1)" }, "not a link", null],
  hours: { clock: 12, weekStart: "thursday", days: { mon: "9-5", sun: [] }, note: 0 },
  contact: { phone: [], email: "javascript:alert(1)" },
  address: { lines: "12 Baker Street", directionsUrl: "data:text/html,<script>x</script>" },
  social: [{ platform: 0, url: "//example.com" }, { url: null }],
  hourz: { mon: "9-5" },
} as unknown as Project;

/** Every project fixture the invariant guards are checked against. */
export const FIXTURES: Project[] = [MINIMAL, POPULATED, POPULATED_DARK, DAMAGED];

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

import { ICON_NAMES, SOCIAL_PLATFORMS } from "./icons.js";
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

/**
 * The worst realistic case for §6.4's chrome budget: as much page as a real business plausibly
 * builds, in the combination of controls that emits the most CSS.
 *
 * **Realistic, not adversarial.** A hand-edited file can hold ten thousand links and no budget
 * survives that, which is why §6.4 is "a budget, not a gate" and is "enforced by bounding the
 * inputs, never by refusing to export" — a hard cap would strand an owner from their own page.
 * What this fixture claims is the upper end of what the builder's flow produces: every field
 * filled, every list long enough that the next entry is a rounding error.
 *
 * Every number here is chosen against something:
 *
 * - **Twelve links**, because §7.5 argues drag-and-drop only beats arrows at "moving item 12 to
 *   position 3" and calls that a length this list never reaches. Twelve is that ceiling, with
 *   labels at the length where a button starts wrapping.
 * - **Every day open twice**, on the 12-hour clock — seven rows of two intervals is the most
 *   `hours.ts` can produce, and `9:00 AM – 5:00 PM` is longer than `09:00 – 17:00`.
 * - **Every vendored mark plus one without**, which is both the longest social row available
 *   and the most inline SVG the page can carry. This is where the page's bytes actually are:
 *   twenty-six glyphs are about 15 KB of the 24 KB `size.test.ts` measures, against 3.4 KB of
 *   stylesheet. **The icon set is the chrome budget**, and §2.4's growth rule is what keeps it
 *   in range.
 * - **`ruledLeft` and `classic`**, measured rather than assumed to be the expensive pair.
 *   `ruledLeft` is the longest of the three shape deltas, and `classic` is the only pairing
 *   that names two font stacks — `friendly` has the longer single stack and still comes out
 *   smaller. All four shapes and all three pairings land within 400 bytes of each other, which
 *   is `chrome.ts`'s "base + tokens + at most one delta" showing up in the measurement.
 * - **No logo**, because the logo is not chrome: §6.4 budgets it separately at ~120 KB, and
 *   `size.test.ts` measures the two apart for exactly that reason.
 */
export const MAXIMAL: Project = {
  version: SCHEMA_VERSION,
  lang: "en-GB",
  style: { ...style, shape: "ruledLeft", type: "classic", corners: 0.7 },
  header: {
    name: "The Hebden Bridge Bakehouse & Coffee Room",
    tagline: "Sourdough, pastries and very good coffee, baked fresh every morning since 1994",
    logo: null,
  },
  links: ICON_NAMES.slice(0, 12).map((icon, i) => ({
    label: `Order ${icon} online for collection or delivery`,
    url: `https://hebdenbridgebakehouse.example/order/${i}`,
    icon,
  })),
  hours: {
    clock: "12h",
    weekStart: "mon",
    days: {
      mon: [
        ["07:30", "11:45"],
        ["12:30", "17:15"],
      ],
      tue: [
        ["07:30", "11:45"],
        ["12:30", "17:15"],
      ],
      wed: [
        ["07:30", "11:45"],
        ["12:30", "17:15"],
      ],
      thu: [
        ["07:30", "11:45"],
        ["12:30", "17:15"],
      ],
      fri: [
        ["07:30", "11:45"],
        ["12:30", "17:15"],
      ],
      sat: [
        ["08:00", "12:00"],
        ["13:00", "20:30"],
      ],
      sun: [
        ["09:00", "12:00"],
        ["13:00", "16:00"],
      ],
    },
    note: "Bank holidays vary — we post the week's hours on Instagram every Sunday evening.",
  },
  contact: {
    phone: "+44 (0)1422 555 0199",
    email: "hello@hebdenbridgebakehouse.example",
  },
  address: {
    lines: [
      "The Old Weaving Shed",
      "12 Bridge Street",
      "Hebden Bridge",
      "West Yorkshire",
      "HX7 8AA",
    ],
    directionsUrl:
      "https://maps.example/?q=The+Old+Weaving+Shed%2C+12+Bridge+Street%2C+Hebden+Bridge%2C+HX7+8AA",
  },
  social: [
    ...SOCIAL_PLATFORMS.map((platform) => ({
      platform,
      url: `https://${platform}.example/hebdenbridgebakehouse`,
    })),
    { platform: "linkedin", url: "https://www.linkedin.com/company/hebdenbridgebakehouse" },
  ],
};

/** Every project fixture the invariant guards are checked against. */
export const FIXTURES: Project[] = [MINIMAL, POPULATED, POPULATED_DARK, MAXIMAL, DAMAGED];

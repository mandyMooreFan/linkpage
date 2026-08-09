import { SCHEMA_VERSION, type Project } from "@linkpage/renderer";

/**
 * A project fixture shared by the builder's tests.
 *
 * The renderer has its own (`packages/renderer/src/fixtures.ts`) but does not export it — its
 * package entry is the barrel, and test support has no business in a barrel. This one is
 * deliberately not a copy: what the builder's tests need from a project is that its rendered
 * page contains the characters that make a string hard to carry intact. `&` and `<` in the
 * business name, a `"` in the tagline, an apostrophe, and a `data:` URI with base64 padding
 * are all here so that "the iframe holds byte-for-byte what Download writes" is a claim about
 * a page that would notice being escaped, re-encoded or normalised on the way in.
 *
 * **Test support, not shipped code.**
 */
export const POPULATED: Project = {
  version: SCHEMA_VERSION,
  lang: "en-GB",
  style: {
    brand: "#c2185b",
    accent: "#2e7d32",
    shape: "centred",
    type: "classic",
    corners: 0.6,
    mode: "light",
    advanced: { enabled: false, colors: {} },
  },
  header: {
    name: "Ada & Sons <Bakers>",
    tagline: 'Sourdough, pastries, and "the best" cheese scone in town',
    logo: { src: "data:image/png;base64,iVBORw0KGgo=", width: 1200, height: 400 },
  },
  links: [
    { label: "See the menu", url: "https://adasbakery.example/menu", icon: "menu" },
    { label: "Order for pickup", url: "https://adasbakery.example/order?ref=a&b=c", icon: "bag" },
  ],
  hours: {
    clock: "12h",
    weekStart: "mon",
    days: { mon: [["07:00", "14:00"]], sat: [], sun: [] },
    note: "Closed bank holidays",
  },
  contact: { phone: "+44 20 7946 0100", email: "hello@adasbakery.example" },
  address: { lines: ["12 Mill Lane", "Hebden Bridge", "HX7 8AA"] },
  social: [{ platform: "instagram", url: "https://instagram.com/adasbakery" }],
};

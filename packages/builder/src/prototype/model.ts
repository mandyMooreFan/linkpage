/**
 * PROTOTYPE — throwaway. Issue #5, the builder editing screen.
 *
 * A local, prototype-only copy of the `project.json` shape settled in issue #3, plus the two
 * sample projects the variants are judged against. Nothing here is the real schema: the real
 * one lands in `packages/renderer` when someone implements the spec. Section on/off is
 * modelled as an `on` record rather than absent keys purely so toggling a section in the UI
 * doesn't destroy what was typed into it — a prototype convenience, not a schema proposal.
 */

export type Shape = "centred" | "colourBlock" | "floatingCard" | "ruledLeft";
export type TypePairing = "classic" | "modern" | "friendly";
export type Mode = "light" | "dark";
export type Day = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export const DAYS: Day[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
export const DAY_LABEL: Record<Day, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

export interface Link {
  label: string;
  url: string;
  icon: string;
}

export interface Social {
  platform: string;
  url: string;
}

export interface Project {
  lang: string;
  style: {
    brand: string;
    accent: string | null;
    shape: Shape;
    type: TypePairing;
    corners: number;
    mode: Mode;
    advanced: {
      enabled: boolean;
      colors: { ground?: string; text?: string; surface?: string; buttonText?: string };
    };
  };
  header: { name: string; tagline: string };
  links: Link[];
  hours: { clock: "12h" | "24h"; days: Record<Day, [string, string][]>; note: string };
  contact: { phone: string; email: string };
  address: { lines: string[]; directionsUrl: string };
  social: Social[];
  /** Which of the four optional sections are switched on. Header and links always render. */
  on: { hours: boolean; contact: boolean; address: boolean; social: boolean };
}

/** The four style controls a preset could also set, and the ones every project starts with. */
export const DEFAULT_STYLE: Project["style"] = {
  brand: "",
  accent: null,
  shape: "centred",
  type: "classic",
  corners: 0.6,
  mode: "light",
  advanced: { enabled: false, colors: {} },
};

const NO_HOURS: Record<Day, [string, string][]> = {
  mon: [],
  tue: [],
  wed: [],
  thu: [],
  fri: [],
  sat: [],
  sun: [],
};

/** A brand-new project: the two required fields blank, everything else defaulted or off. */
export function emptyProject(): Project {
  return {
    lang: "en",
    style: { ...DEFAULT_STYLE, advanced: { enabled: false, colors: {} } },
    header: { name: "", tagline: "" },
    links: [],
    hours: { clock: "12h", days: { ...NO_HOURS }, note: "" },
    contact: { phone: "", email: "" },
    address: { lines: [], directionsUrl: "" },
    social: [],
    on: { hours: false, contact: false, address: false, social: false },
  };
}

/** A finished page, for judging the editor at the density it will actually be used at. */
export function sampleProject(): Project {
  return {
    lang: "en",
    style: {
      brand: "#c2185b",
      accent: "#00695c",
      shape: "centred",
      type: "classic",
      corners: 0.6,
      mode: "light",
      advanced: { enabled: false, colors: {} },
    },
    header: { name: "Ada's Bakery", tagline: "Sourdough, pastries and very good coffee" },
    links: [
      { label: "Order for collection", url: "https://order.example.com", icon: "cart" },
      { label: "See this week's menu", url: "https://example.com/menu", icon: "menu" },
      { label: "Book the back room", url: "https://example.com/book", icon: "calendar" },
      { label: "Gift cards", url: "https://example.com/gifts", icon: "gift" },
    ],
    hours: {
      clock: "12h",
      days: {
        mon: [],
        tue: [["07:30", "15:00"]],
        wed: [["07:30", "15:00"]],
        thu: [["07:30", "15:00"]],
        fri: [["07:30", "17:00"]],
        sat: [
          ["08:00", "12:30"],
          ["13:30", "17:00"],
        ],
        sun: [["09:00", "14:00"]],
      },
      note: "Closed bank holidays. Christmas hours posted in the window.",
    },
    contact: { phone: "+44 1422 555 0134", email: "hello@adasbakery.example" },
    address: {
      lines: ["12 Bridge Street", "Hebden Bridge", "HX7 8AA"],
      directionsUrl: "https://maps.example.com/?q=12+Bridge+Street",
    },
    social: [
      { platform: "instagram", url: "https://instagram.com/example" },
      { platform: "facebook", url: "https://facebook.com/example" },
    ],
    on: { hours: true, contact: true, address: true, social: true },
  };
}

/** Swatches for the constrained colour field — each checked to carry a button on both grounds. */
export const COLOUR_FIELD: { hex: string; name: string }[] = [
  { hex: "#b3261e", name: "Postbox red" },
  { hex: "#c2185b", name: "Raspberry" },
  { hex: "#7b1fa2", name: "Plum" },
  { hex: "#4527a0", name: "Ink" },
  { hex: "#1565c0", name: "Signwriter blue" },
  { hex: "#00695c", name: "Deep teal" },
  { hex: "#2e7d32", name: "Bottle green" },
  { hex: "#6d4c1e", name: "Chestnut" },
  { hex: "#a34700", name: "Burnt orange" },
  { hex: "#8d6e00", name: "Mustard" },
  { hex: "#37474f", name: "Slate" },
  { hex: "#212121", name: "Near black" },
];

export const SHAPES: { id: Shape; label: string; blurb: string }[] = [
  { id: "centred", label: "Centred", blurb: "Everything down the middle" },
  { id: "colourBlock", label: "Colour block", blurb: "Your colour across the top" },
  { id: "floatingCard", label: "Floating card", blurb: "The page sits on a tinted ground" },
  { id: "ruledLeft", label: "Left aligned", blurb: "Lined up left, ruled sections" },
];

export const TYPE_PAIRINGS: { id: TypePairing; label: string; blurb: string }[] = [
  { id: "classic", label: "Classic", blurb: "Serif headings, plain body" },
  { id: "modern", label: "Modern", blurb: "One sans, tight and quiet" },
  { id: "friendly", label: "Friendly", blurb: "Rounder, a little wider" },
];

export const SOCIAL_PLATFORMS = [
  "instagram",
  "facebook",
  "tiktok",
  "x",
  "youtube",
  "linkedin",
  "whatsapp",
] as const;

export const LINK_ICONS = [
  "link",
  "cart",
  "menu",
  "calendar",
  "gift",
  "phone",
  "mail",
  "map-pin",
  "star",
] as const;

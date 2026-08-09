import type { IconName } from "@linkpage/renderer";
import type { Section } from "./topics.js";

/**
 * The preset question, which is step one of the flow. `SPEC.md` §7.3.
 *
 * **A preset selects which of the four optional section steps the flow runs, and which
 * suggestions appear on the link step. That is the whole mechanism** — and this file is the
 * whole of it, which is the point of keeping it a table rather than a set of branches.
 *
 * Three absences here are load-bearing, and each is asserted by a test rather than left to
 * this comment:
 *
 * - **No `style` field, not one.** The style controls already carry a default, so presetting
 *   them saves zero clicks while spending the entire homogeneity cost. _The preset knows about
 *   your business; "How it looks" knows about your brand._
 * - **No word that is a claim about the business.** No tagline placeholder, no sample address,
 *   and specifically **no default opening hours**. A suggestion is a question — _do you have
 *   one of these?_ — and stays a question until the owner gives it a URL. A wrong fact the
 *   owner never notices we asserted is worse than an absent one.
 * - **Nothing that reaches the file.** There is no `preset` field (§4.1) and there must not be
 *   one: a preset is an action, not a property, so two owners who reach the same page have
 *   byte-identical files whether one took a preset and the other ticked boxes by hand. The
 *   only way to keep that true mechanically is for the chosen preset to live in component
 *   state and never be handed to the store — see `Flow.tsx`.
 *
 * **The subtitles are load-bearing, not decoration** (§7.3's growth rule). A new entry earns
 * its place only by running a different set of steps _or_ suggesting a different set of
 * buttons; otherwise it belongs as an example in an existing row's subtitle.
 */

export type PresetId = "food" | "shop" | "appointments" | "mobile" | "online" | "other";

/**
 * One suggestion on the link step: a label the owner recognises and the glyph it wears.
 *
 * `SPEC.md` §2.4 makes this table the membership rule for the icon set — a suggestion with no
 * glyph and a glyph no suggestion reaches both fail the renderer's build. `presets.test.ts`
 * checks this half of it: every icon named here is one the renderer knows.
 */
export interface Suggestion {
  readonly label: string;
  readonly icon: IconName;
}

export interface Preset {
  readonly id: PresetId;
  /** The answer as the owner reads it. */
  readonly label: string;
  /** The examples that tell them whether it is them. Empty only for _Something else_. */
  readonly examples: string;
  /** Which of the four optional section steps the flow runs. */
  readonly sections: readonly Section[];
  /** What the link step offers. Empty for _Something else_, which suggests nothing. */
  readonly suggestions: readonly Suggestion[];
}

/** All four optional sections, in page order (§2.1). Spelled out so the table reads flat. */
const ALL: readonly Section[] = ["hours", "contact", "address", "social"];

/**
 * §7.3's table, in its order.
 *
 * **"We come to you" never asks for an address**, so a sole trader working from home does not
 * publish their home address because the flow asked and they answered. That is a decision an
 * owner can plausibly get _wrong_ unaided, and it is the one place a preset does something
 * better than a well-labelled checkbox rather than merely faster. Its cost is accepted: an
 * owner on this preset who does have a shop front adds the address from the list afterwards.
 */
/**
 * The last row, named because it is also the fallback.
 *
 * _Something else_ is the answer that assumes least about a business — all four questions,
 * asked with their escapes, and no suggested buttons — which makes it the only safe thing to
 * fall back to when an id arrives that this table does not have.
 */
const OTHER: Preset = {
  id: "other",
  label: "Something else",
  examples: "",
  // All four, because we know nothing about them — the escape on each step is what makes
  // asking cheap enough to ask four times.
  sections: ALL,
  suggestions: [],
};

export const PRESETS: readonly Preset[] = [
  {
    id: "food",
    label: "Food & drink",
    examples: "café, restaurant, takeaway, bar",
    sections: ALL,
    suggestions: [
      { label: "See the menu", icon: "menu" },
      { label: "Order for pickup", icon: "bag" },
      { label: "Book a table", icon: "calendar" },
    ],
  },
  {
    id: "shop",
    label: "Shop or venue",
    examples: "retail, gallery, gym, studio",
    sections: ALL,
    suggestions: [
      { label: "Shop online", icon: "cart" },
      { label: "What's on", icon: "calendar" },
      { label: "Find us", icon: "location" },
    ],
  },
  {
    id: "appointments",
    label: "Appointments",
    examples: "salon, barber, clinic, therapist",
    sections: ALL,
    suggestions: [
      { label: "Book an appointment", icon: "calendar" },
      { label: "Prices", icon: "price" },
      { label: "Our services", icon: "services" },
    ],
  },
  {
    id: "mobile",
    label: "We come to you",
    examples: "plumber, electrician, gardener, cleaner",
    sections: ["contact", "social"],
    suggestions: [
      { label: "Get a quote", icon: "document" },
      { label: "Call us", icon: "phone" },
      { label: "See our work", icon: "portfolio" },
    ],
  },
  {
    id: "online",
    label: "Online only",
    examples: "maker, creator, consultant",
    sections: ["social"],
    suggestions: [
      { label: "Shop", icon: "shop" },
      { label: "Subscribe", icon: "mail" },
      { label: "Get in touch", icon: "message" },
    ],
  },
  OTHER,
];

/** Unreachable through the UI — the id comes from this table — but total anyway. */
export function findPreset(id: PresetId): Preset {
  return PRESETS.find((entry) => entry.id === id) ?? OTHER;
}

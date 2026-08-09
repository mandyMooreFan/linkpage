import { isIconName } from "@linkpage/renderer";
import { describe, expect, it } from "vitest";
import { findPreset, PRESETS, type PresetId } from "./presets.js";
import { SECTIONS } from "./topics.js";

/**
 * §7.3's table, and the three things a preset must never be.
 *
 * The table itself is checked entry by entry because it *is* the mechanism — "a preset selects
 * which of the four optional section steps the flow runs, and which suggestions appear on the
 * link step" is not a description of some code, it is a description of this data. A wrong row
 * is a wrong product.
 */

/** §7.3's table, transcribed from the spec rather than from `presets.ts`. */
const TABLE: [PresetId, string, string[], string[]][] = [
  [
    "food",
    "Food & drink",
    ["hours", "contact", "address", "social"],
    ["See the menu", "Order for pickup", "Book a table"],
  ],
  [
    "shop",
    "Shop or venue",
    ["hours", "contact", "address", "social"],
    ["Shop online", "What's on", "Find us"],
  ],
  [
    "appointments",
    "Appointments",
    ["hours", "contact", "address", "social"],
    ["Book an appointment", "Prices", "Our services"],
  ],
  ["mobile", "We come to you", ["contact", "social"], ["Get a quote", "Call us", "See our work"]],
  ["online", "Online only", ["social"], ["Shop", "Subscribe", "Get in touch"]],
  ["other", "Something else", ["hours", "contact", "address", "social"], []],
];

describe("the table is §7.3's table", () => {
  it("holds six entries, in the spec's order", () => {
    expect(PRESETS.map((preset) => preset.id)).toEqual(TABLE.map(([id]) => id));
  });

  it.each(TABLE)(
    "%s runs the right steps and suggests the right buttons",
    (id, label, sections, suggestions) => {
      const preset = findPreset(id);

      expect(preset.label).toBe(label);
      expect([...preset.sections]).toEqual(sections);
      expect(preset.suggestions.map((entry) => entry.label)).toEqual(suggestions);
    },
  );

  it("never asks 'we come to you' for an address", () => {
    // The one place a preset does something better than a well-labelled checkbox rather than
    // merely faster: a sole trader working from home does not publish their home address
    // because the flow asked and they answered.
    expect(findPreset("mobile").sections).not.toContain("address");
  });

  it("gives every entry but 'something else' the examples that make it recognisable", () => {
    // Load-bearing, not decoration (§7.3's growth rule): a candidate entry that runs the same
    // steps and suggests the same buttons belongs in an existing row's subtitle.
    for (const preset of PRESETS) {
      expect([preset.id, preset.examples !== ""]).toEqual([preset.id, preset.id !== "other"]);
    }
  });

  it("earns each entry by a different set of steps or a different set of buttons", () => {
    const shapes = PRESETS.map(
      (preset) =>
        `${preset.sections.join(",")}|${preset.suggestions.map((entry) => entry.label).join(",")}`,
    );
    expect(new Set(shapes).size).toBe(PRESETS.length);
  });

  it("suggests only sections that exist", () => {
    for (const preset of PRESETS) {
      for (const section of preset.sections) expect(SECTIONS).toContain(section);
    }
  });

  it("names only glyphs the renderer has (§2.4)", () => {
    // The renderer's own test asserts the other direction — that it vendors no glyph no
    // suggestion reaches — so between them the set is exactly what §7.3 asks for.
    for (const preset of PRESETS) {
      for (const suggestion of preset.suggestions) {
        expect([suggestion.label, isIconName(suggestion.icon)]).toEqual([suggestion.label, true]);
      }
    }
  });
});

describe("what a preset never touches", () => {
  it("carries no style field, not one (§7.3)", () => {
    // "The preset knows about your business; 'How it looks' knows about your brand." The style
    // controls already carry a default, so presetting them saves zero clicks while spending
    // the entire homogeneity cost.
    const table = JSON.stringify(PRESETS);
    for (const field of ["brand", "accent", "shape", "type", "corners", "mode", "advanced"]) {
      expect(table).not.toContain(`"${field}"`);
    }
  });

  it("carries no word that is a claim about the business", () => {
    // No tagline placeholder, no sample address, and specifically no default opening hours: a
    // wrong fact the owner never notices we asserted is worse than an absent one. Every string
    // in the table is either a category, an example of one, or a question about a button.
    const table = JSON.stringify(PRESETS).toLowerCase();
    for (const claim of ["09:", "9am", "mon", "tue", "monday", "street", "@", "tel:", "http"]) {
      expect(table).not.toContain(claim);
    }
  });

  it("has an entry shape with nowhere to put a project field", () => {
    for (const preset of PRESETS) {
      expect(Object.keys(preset).sort()).toEqual([
        "examples",
        "id",
        "label",
        "sections",
        "suggestions",
      ]);
    }
  });
});

describe("findPreset", () => {
  it("falls back to the entry that assumes least", () => {
    expect(findPreset("nonsense" as PresetId).id).toBe("other");
  });
});

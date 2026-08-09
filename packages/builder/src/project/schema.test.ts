import { SCHEMA_VERSION, type Project } from "@linkpage/renderer";
import { describe, expect, it } from "vitest";
import type { ProjectDocument } from "./document.js";
import {
  emptyDraft,
  isComplete,
  missingRequired,
  readDraft,
  writeDraft,
  type Draft,
} from "./schema.js";

/**
 * §4.4 and §4.5: what the typed view does with a value it does not recognise, and what the
 * file keeps regardless. The two halves are tested together on purpose — each rule here is a
 * claim about *both*, and testing only the reader would pass while the writer threw the
 * evidence away.
 */

/** Open a document and save it with no edits — the round trip both guarantees are about. */
function reopened(document: ProjectDocument): ProjectDocument {
  return writeDraft(readDraft(document), document);
}

const complete: Project = {
  version: SCHEMA_VERSION,
  lang: "en-GB",
  style: {
    brand: "#c2185b",
    accent: "#00695c",
    shape: "floatingCard",
    type: "modern",
    corners: 0.6,
    mode: "light",
    advanced: { enabled: true, colors: { ink: "#111111" } },
  },
  header: {
    name: "Ada's Bakery",
    tagline: "Sourdough and very good coffee",
    logo: { src: "data:image/png;base64,AAAA", width: 1200, height: 1200 },
  },
  links: [{ label: "Order online", url: "https://example.com/order", icon: "cart" }],
  hours: {
    clock: "12h",
    weekStart: "mon",
    days: {
      mon: [["09:00", "17:00"]],
      wed: [],
      thu: [
        ["11:00", "14:00"],
        ["17:00", "21:00"],
      ],
    },
    note: "Bank holidays vary",
  },
  contact: { phone: "+44 1422 000000", email: "hello@example.com" },
  address: {
    lines: ["12 Bridge Street", "Hebden Bridge", "HX7 8AA"],
    directionsUrl: "https://maps.example.com/ada",
  },
  social: [{ platform: "instagram", url: "https://instagram.example.com/ada" }],
};

describe("the typed view", () => {
  it("survives a document written from a project unchanged", () => {
    expect(readDraft(writeDraft(complete))).toEqual(complete);
  });

  it("defaults a project with nothing in it, and asks for nothing it can default", () => {
    expect(readDraft({})).toEqual({
      version: SCHEMA_VERSION,
      style: {
        shape: "centred",
        type: "classic",
        corners: 0.6,
        mode: "light",
        // Persisted even when disabled (§3.4).
        advanced: { enabled: false, colors: {} },
      },
      header: { logo: null },
      links: [],
    });
  });

  it("never invents the two things the flow asks for", () => {
    // §4.6: no error, no repair dialog, no invented default.
    const draft = readDraft({ lang: "en" });
    expect(draft.style.brand).toBeUndefined();
    expect(draft.header.name).toBeUndefined();
    expect(missingRequired(draft)).toEqual(["style.brand", "header.name"]);
    expect(isComplete(draft)).toBe(false);
    expect(isComplete(complete)).toBe(true);
  });

  it("counts a language it was never given as something to fill in", () => {
    // Filled from the browser rather than asked for (§4.1) — but still missing until it is.
    expect(missingRequired(readDraft({}))).toContain("lang");
    expect(missingRequired(emptyDraft("cy"))).toEqual(["style.brand", "header.name"]);
    expect(emptyDraft("cy").lang).toBe("cy");
  });
});

describe("unknown enum values (§4.4)", () => {
  it("falls back on a preference for rendering and keeps the word in the file", () => {
    const document = {
      style: { brand: "#c2185b", shape: "brutalist", type: "gothic", mode: "sepia" },
    };
    const draft = readDraft(document);
    expect(draft.style.shape).toBe("centred");
    expect(draft.style.type).toBe("classic");
    expect(draft.style.mode).toBe("light");

    expect(reopened(document)["style"]).toMatchObject({
      shape: "brutalist",
      type: "gothic",
      mode: "sepia",
    });
  });

  it("overwrites the original once the owner touches the control", () => {
    // The accepted cost, stated in §4.4.
    const document = { style: { shape: "brutalist" } };
    const draft = readDraft(document);
    const edited: Draft = { ...draft, style: { ...draft.style, shape: "ruledLeft" } };
    expect(writeDraft(edited, document)["style"]).toMatchObject({ shape: "ruledLeft" });
  });

  it("keeps anything the owner typed, verbatim, in the view as well as the file", () => {
    // `platform` is data, not a preference: behind it is a URL they typed (§4.4).
    const document = { social: [{ platform: "myspace", url: "https://myspace.example/ada" }] };
    expect(readDraft(document).social).toEqual([
      { platform: "myspace", url: "https://myspace.example/ada" },
    ]);
    expect(reopened(document)["social"]).toEqual(document.social);
  });

  it("keeps an icon name it does not recognise, without drawing something else", () => {
    // An icon is a preference with no default (§4.4): the link renders with no glyph, and the
    // name waits in the file for a builder that knows it.
    const document = { links: [{ label: "Menu", url: "https://x.example", icon: "hovercraft" }] };
    expect(readDraft(document).links).toEqual([{ label: "Menu", url: "https://x.example" }]);
    expect(reopened(document)["links"]).toEqual(document.links);
  });

  it("keeps an icon name it does recognise", () => {
    const document = { links: [{ label: "Menu", url: "https://x.example", icon: "menu" }] };
    expect(readDraft(document).links).toEqual(document.links);
    expect(reopened(document)["links"]).toEqual(document.links);
  });
});

describe("wrong-typed values (§4.6)", () => {
  it("reads them as absent and leaves them in the file", () => {
    const document = {
      version: 1,
      lang: 42,
      style: { brand: "#c2185b", corners: "big", advanced: "yes" },
      header: { name: "Ada", tagline: 7, logo: { src: 3 } },
      links: "not a list",
      hours: 12,
      social: { platform: "instagram" },
    };
    const draft = readDraft(document);
    expect(draft.lang).toBeUndefined();
    expect(draft.style.corners).toBe(0.6);
    expect(draft.style.advanced).toEqual({ enabled: false, colors: {} });
    expect(draft.header.tagline).toBeUndefined();
    expect(draft.header.logo).toBeNull();
    expect(draft.links).toEqual([]);
    expect(draft.hours).toBeUndefined();
    expect(draft.social).toBeUndefined();

    expect(reopened(document)).toEqual(document);
  });

  it("clamps a number out of range for the editor without correcting the file", () => {
    const document = { style: { corners: 7 } };
    expect(readDraft(document).style.corners).toBe(1);
    expect(reopened(document)["style"]).toMatchObject({ corners: 7 });
  });

  it("drops a list entry that is not an object, having nothing to keep", () => {
    expect(readDraft({ links: [42, { label: "a", url: "https://a.example" }] }).links).toEqual([
      { label: "a", url: "https://a.example" },
    ]);
  });

  it("shows a link missing a label as an empty box rather than dropping the URL", () => {
    // The URL is the owner's; an empty label is a blank field in the editor, and §4.6 says a
    // file missing fields is loaded for what it has.
    const document = { links: [{ url: "https://a.example" }] };
    expect(readDraft(document).links).toEqual([{ label: "", url: "https://a.example" }]);
    // And nothing is written back until the owner types something.
    expect(reopened(document)["links"]).toEqual([{ url: "https://a.example" }]);
  });
});

describe("unknown keys (§4.5)", () => {
  it("keeps them at every level, in place", () => {
    const document = {
      version: 1,
      hourz: { mon: "9-5" },
      style: { brand: "#c2185b", texture: "linen", advanced: { enabled: false, colors: {} } },
      header: { name: "Ada", motto: "rise" },
      links: [{ label: "a", url: "https://a.example", tint: "gold" }],
      hours: { clock: "12h", weekStart: "mon", days: { mon: [], funday: [["09:00", "17:00"]] } },
    };
    expect(reopened(document)).toEqual(document);
  });

  it("keeps an unknown key's position, so a file we wrote comes back the same", () => {
    const document = { style: { texture: "linen", brand: "#c2185b" } };
    expect(Object.keys(reopened(document)["style"] as ProjectDocument).slice(0, 2)).toEqual([
      "texture",
      "brand",
    ]);
  });

  it("keeps them through an edit to the object holding them", () => {
    const document = {
      style: { brand: "#c2185b", texture: "linen" },
      links: [{ label: "a", url: "https://a.example", tint: "gold" }],
    };
    const draft = readDraft(document);
    const edited: Draft = {
      ...draft,
      style: { ...draft.style, brand: "#00695c" },
      links: draft.links.map((link) => ({ ...link, label: "Order" })),
    };
    const next = writeDraft(edited, document);
    // The edit fills in the defaults that section was missing (§4.3) and leaves `texture`
    // exactly where it was — an unknown key is not collateral of an edit next door.
    expect(next["style"]).toMatchObject({ brand: "#00695c", texture: "linen", shape: "centred" });
    expect(next["links"]).toEqual([{ label: "Order", url: "https://a.example", tint: "gold" }]);
  });

  it("keeps hand-set colours whose role names we do not enumerate", () => {
    const document = {
      style: { advanced: { enabled: false, colors: { ink: "#111", "rule-2": "#222" } } },
    };
    expect(readDraft(document).style.advanced.colors).toEqual({ ink: "#111", "rule-2": "#222" });
    expect(reopened(document)["style"]).toEqual(document.style);
  });
});

describe("writing", () => {
  it("adds what is absent, so a saved file is complete", () => {
    // §4.3: the upgrade is non-destructive by construction — it only ever adds defaults for
    // things that were absent.
    const document = writeDraft(readDraft({ style: { brand: "#c2185b" } }));
    expect(document).toEqual({
      version: SCHEMA_VERSION,
      style: {
        brand: "#c2185b",
        shape: "centred",
        type: "classic",
        corners: 0.6,
        mode: "light",
        advanced: { enabled: false, colors: {} },
      },
      header: { logo: null },
      links: [],
    });
  });

  it("writes the sections in the order §4.1 lists them", () => {
    expect(Object.keys(writeDraft(complete))).toEqual([
      "version",
      "lang",
      "style",
      "header",
      "links",
      "hours",
      "contact",
      "address",
      "social",
    ]);
  });

  it("removes a section the owner turned off", () => {
    const document = writeDraft(complete);
    const without: Draft = { ...readDraft(document), hours: undefined, social: undefined };
    const next = writeDraft(without, document);
    expect("hours" in next).toBe(false);
    expect("social" in next).toBe(false);
    expect(next["contact"]).toEqual(complete.contact);
  });

  it("keeps a day that is explicitly closed distinct from one nobody mentioned", () => {
    const document = { hours: { clock: "12h", weekStart: "mon", days: { wed: [] } } };
    const draft = readDraft(document);
    expect(draft.hours?.days.wed).toEqual([]);
    expect("mon" in (draft.hours?.days ?? {})).toBe(false);
    expect(reopened(document)["hours"]).toEqual(document.hours);
  });

  it("leaves the document it was given alone", () => {
    const document = { style: { brand: "#c2185b" } };
    const before = JSON.stringify(document);
    writeDraft(emptyDraft("en"), document);
    expect(JSON.stringify(document)).toBe(before);
  });
});

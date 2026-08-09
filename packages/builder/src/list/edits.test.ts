import { describe, expect, it } from "vitest";
import { POPULATED } from "../fixtures.js";
import { uncoveredTopics } from "../flow/plan.js";
import { hasContent, TOPICS } from "../flow/topics.js";
import type { Draft } from "../project/index.js";
import {
  clearAccent,
  moved,
  removeTopic,
  setAdvancedEnabled,
  setLang,
  setLinks,
  setOverride,
  setStyle,
  withoutAt,
} from "./edits.js";

/**
 * The writes only the list makes. `SPEC.md` §7.4, §7.5, §7.1, §3.4.
 *
 * The claim worth holding here is the one that joins this module to `topics.ts`:
 *
 * > **Removing a section and never having had one are the same state.**
 *
 * The door in the flow only ever adds, so an owner editing their phone number away needs a
 * different verb — and if that verb left anything behind, the list would show a row the flow
 * thought was empty, or offer a tick-on for a section that was still in the file.
 */

describe("taking something off the page", () => {
  it("leaves every topic in the state it was in before it was ever answered", () => {
    for (const topic of TOPICS) {
      const after = removeTopic(POPULATED, topic);

      expect(hasContent(POPULATED, topic)).toBe(true);
      expect(hasContent(after, topic)).toBe(false);
      // And therefore back among the things the flow can be re-entered for (§7.1).
      expect(uncoveredTopics(after)).toContain(topic);
    }
  });

  it("touches nothing else", () => {
    for (const topic of TOPICS) {
      const after = removeTopic(POPULATED, topic);
      for (const other of TOPICS) {
        if (other === topic) continue;
        expect(hasContent(after, other)).toBe(true);
      }
      expect(after.header.name).toBe(POPULATED.header.name);
      expect(after.style).toEqual(POPULATED.style);
    }
  });

  it("removes the key rather than emptying it, so the document loses it too", () => {
    expect("hours" in removeTopic(POPULATED, "hours")).toBe(false);
    expect("tagline" in removeTopic(POPULATED, "tagline").header).toBe(false);
    // Except `links`, which §4.1 always has: the section renders, with nothing in it.
    expect(removeTopic(POPULATED, "links").links).toEqual([]);
  });
});

describe("the link buttons (§7.5)", () => {
  const labels = (draft: Draft): string[] => draft.links.map((link) => link.label);

  it("reorders with the arrows and nothing else changes", () => {
    const before = POPULATED.links;
    expect(moved(before, 1, 0).map((link) => link.label)).toEqual([
      "Order for pickup",
      "See the menu",
    ]);
    expect(moved(before, 0, 1)).toHaveLength(before.length);
  });

  it("is a no-op past either end rather than a wrap", () => {
    const before = POPULATED.links;
    expect(moved(before, 0, -1)).toBe(before);
    expect(moved(before, before.length - 1, before.length)).toBe(before);
    expect(moved(before, 1, 1)).toBe(before);
  });

  it("drops one and leaves the order of the rest alone", () => {
    expect(withoutAt(POPULATED.links, 0).map((link) => link.label)).toEqual(["Order for pickup"]);
    expect(withoutAt(POPULATED.links, 9)).toBe(POPULATED.links);
  });

  it("keeps the flow's rule: a button exists only once it has a URL (§7.3)", () => {
    const half = [...POPULATED.links, { label: "Book a table", url: "  " }];
    expect(labels(setLinks(POPULATED, half))).toEqual(["See the menu", "Order for pickup"]);
  });

  it("writes the order it is given", () => {
    const swapped = moved(POPULATED.links, 1, 0);
    expect(labels(setLinks(POPULATED, swapped))).toEqual(["Order for pickup", "See the menu"]);
  });
});

describe("the style controls", () => {
  it("writes one control without disturbing the others", () => {
    const after = setStyle(POPULATED, { mode: "dark" });
    expect(after.style.mode).toBe("dark");
    expect(after.style.brand).toBe(POPULATED.style.brand);
    expect(after.style.advanced).toBe(POPULATED.style.advanced);
  });

  it("drops the second colour rather than emptying it", () => {
    expect("accent" in clearAccent(POPULATED).style).toBe(false);
  });

  it("keeps the advanced colours when the switch goes off (§3.4)", () => {
    const painted = setOverride(setAdvancedEnabled(POPULATED, true), "ink", "#123456");
    const off = setAdvancedEnabled(painted, false);

    expect(off.style.advanced.enabled).toBe(false);
    // Persisted even when disabled: switching off and saving must not destroy the owner's
    // manual work, and switching back on must return it intact.
    expect(off.style.advanced.colors).toEqual({ ink: "#123456" });
    expect(setAdvancedEnabled(off, true).style.advanced.colors).toEqual({ ink: "#123456" });
  });

  it("clears one hand-set colour by emptying its box", () => {
    const painted = setOverride(POPULATED, "ink", "#123456");
    expect(setOverride(painted, "ink", "  ").style.advanced.colors).toEqual({});
  });
});

describe("the page's language (§4.1)", () => {
  it("trims what it is given and refuses a blank one", () => {
    expect(setLang(POPULATED, "  fr-CA ").lang).toBe("fr-CA");
    expect(setLang(POPULATED, "   ")).toBe(POPULATED);
  });
});

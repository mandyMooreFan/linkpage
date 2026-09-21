import { describe, expect, it } from "vitest";
import { one, undecidedLines, undecidedReason } from "./undecided.mjs";

/**
 * **A check on the instrument, never on the design** — the line `census.test.mjs`,
 * `port.test.mjs` and `stability.test.mjs` all draw. Nothing here says anything about a colour.
 *
 * What it holds is the sentence #421 was filed for: **an undecided reading has to arrive with
 * the reason axe gave for it.** The report used to print `color-contrast — on 55 of 76` and
 * stop, while holding the element and axe's own `messageKey` for every one of those nodes —
 * which is why #318's *"nobody has looked at why"* stood for a month, and how the count went
 * from 11 to 55 unseen. A count with no reason beside it is the failure being tested against.
 */

/** One axe incomplete node, shaped as axe 4.13 hands it over. */
const node = (target, messageKey, where = "any") => ({
  target: [target],
  html: `<p>${target}</p>`,
  [where]: [{ id: "color-contrast", data: messageKey === null ? {} : { messageKey } }],
});

describe("axe's reason for giving up (#421)", () => {
  it("reads the messageKey off the check that ran", () => {
    expect(undecidedReason(node("h1", "bgOverlap"))).toBe("bgOverlap");
  });

  /**
   * `color-contrast` puts it in `any`, and other rules do not. Guessing the first array is how a
   * reason goes missing on exactly the rules nobody has looked at yet — which is this ticket.
   */
  it.each(["any", "all", "none"])("finds it in %s", (where) => {
    expect(undecidedReason(node("h1", "pseudoContent", where))).toBe("pseudoContent");
  });

  it("falls back to the check's id rather than printing nothing", () => {
    expect(undecidedReason(node("iframe", null))).toBe("color-contrast");
  });

  it("says so plainly when there is nothing to say", () => {
    expect(undecidedReason({ target: ["iframe"], html: "<iframe>" })).toBe("no reason given");
  });
});

describe("the undecided report (#421)", () => {
  const screens = new Map();
  const seen = (n, screen) => (screens.set(n, screen), n);

  it("groups by reason, commonest first, and names a screen to go and look at", () => {
    const a = seen(node(".one", "pseudoContent"), "desktop/02-name");
    const b = seen(node(".two", "pseudoContent"), "desktop/03-colour");
    const c = seen(node("h1", "bgOverlap"), "desktop/61-menu");

    expect(undecidedLines([c, a, b], screens)).toEqual([
      "      pseudoContent — 2 elements, e.g. desktop/02-name",
      "        .one",
      "        .two",
      "      bgOverlap — 1 element, e.g. desktop/61-menu",
      "        h1",
    ]);
  });

  /**
   * The language list alone is 101 nodes. Printed in full it is the wall `nodeLines` already
   * refuses to print, and a wall nobody reads is the same failure as printing nothing.
   */
  it("caps the elements it names and says how many it did not", () => {
    const nodes = Array.from({ length: 12 }, (_, i) =>
      seen(node(`.row-${i}`, "elmPartiallyObscured"), "desktop/52-08-lang"),
    );
    const lines = undecidedLines(nodes, screens, 3);

    expect(lines[0]).toBe("      elmPartiallyObscured — 12 elements, e.g. desktop/52-08-lang");
    expect(lines.slice(1, 4)).toEqual(["        .row-0", "        .row-1", "        .row-2"]);
    expect(lines[4]).toBe("        … and 9 more elements");
    expect(lines).toHaveLength(5);
  });

  /** The same element undecided on twenty screens is one thing to go and look at, not twenty. */
  it("names an element once however many screens it is on", () => {
    const nodes = Array.from({ length: 5 }, () =>
      seen(node("button[data-escape]", "pseudoContent"), "desktop/02-name"),
    );
    const lines = undecidedLines(nodes, screens);

    expect(lines[0]).toBe("      pseudoContent — 5 elements, e.g. desktop/02-name");
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe("        button[data-escape]");
  });
});

describe("one()", () => {
  it("pluralises", () => {
    expect(one(1, "element")).toBe("1 element");
    expect(one(0, "element")).toBe("0 elements");
    expect(one(2, "element")).toBe("2 elements");
  });
});

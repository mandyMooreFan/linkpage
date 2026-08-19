import { describe, expect, it } from "vitest";
import { readDraft } from "./schema.js";
import {
  SEEDED_HOURS_PREFERENCES,
  browserClock,
  browserWeekStart,
  clockFromHourCycle,
  weekStartFromFirstDay,
} from "./environment.js";

/**
 * **What is tested here is the mapping, not what a locale resolves to.**
 *
 * `SPEC.md` §4.1 records the probe that made this distinction load-bearing: `cy-GB` resolves to a
 * 12-hour cycle in Chromium and a 24-hour one in Node. A test asserting "`en-GB` is 24-hour" would
 * therefore be asserting CLDR's answer through whichever runtime CI happened to pick, and would go
 * red on a Node bump for a reason that has nothing to do with this code. The mapping from a cycle
 * to §2.3's `clock` is ours; the cycle is not.
 */
describe("clockFromHourCycle", () => {
  it("reads the two 24-hour cycles as 24-hour", () => {
    expect(clockFromHourCycle("h23")).toBe("24h");
    expect(clockFromHourCycle("h24")).toBe("24h");
  });

  it("reads the two 12-hour cycles as 12-hour", () => {
    expect(clockFromHourCycle("h11")).toBe("12h");
    expect(clockFromHourCycle("h12")).toBe("12h");
  });

  it("falls back to 12-hour on anything it does not know", () => {
    // Never worse than the value this used to be hardcoded to.
    expect(clockFromHourCycle(undefined)).toBe("12h");
    expect(clockFromHourCycle("h25")).toBe("12h");
  });
});

describe("weekStartFromFirstDay", () => {
  it("reads Sunday as Sunday", () => {
    expect(weekStartFromFirstDay(7)).toBe("sun");
  });

  it("reads Monday as Monday", () => {
    expect(weekStartFromFirstDay(1)).toBe("mon");
  });

  it("rounds an unrepresentable first day to Monday", () => {
    // `ar-EG` reports Saturday. `WeekStart` cannot express it, so it lands exactly where it lands
    // today — §4.1 rejected widening the type as a §4.8 schema change for one rounding.
    expect(weekStartFromFirstDay(6)).toBe("mon");
    expect(weekStartFromFirstDay(undefined)).toBe("mon");
  });
});

describe("reading the environment", () => {
  it("always answers with a value the schema accepts", () => {
    // Totality rather than a specific answer, for the reason above.
    expect(["12h", "24h"]).toContain(browserClock());
    expect(["mon", "sun"]).toContain(browserWeekStart());
    expect(["12h", "24h"]).toContain(SEEDED_HOURS_PREFERENCES.clock);
    expect(["mon", "sun"]).toContain(SEEDED_HOURS_PREFERENCES.weekStart);
  });

  it("answers rather than throwing on a tag no runtime can parse", () => {
    // The whole point of the guards: a bad tag costs the seeding, never the builder.
    expect(browserWeekStart("not a language tag")).toBe("mon");
    expect(browserClock("not a language tag")).toBe("12h");
  });

  it("agrees with the readers it was built from", () => {
    // The seed is resolved once at module load. This is what pins it to the same environment the
    // readers see, rather than to whatever a second call might return later.
    expect(SEEDED_HOURS_PREFERENCES.clock).toBe(browserClock());
    expect(SEEDED_HOURS_PREFERENCES.weekStart).toBe(browserWeekStart());
  });
});

describe("what the seed does and does not override (SPEC.md §4.1, §4.4)", () => {
  const withHours = (hours: unknown) =>
    readDraft({ version: 1, style: { brand: "#c2185b" }, header: { name: "Ada" }, hours });

  it("a stored preference always wins, because the seed is only a fallback", () => {
    // The seed is what an *absent* value falls back to. A file that says what it wants keeps
    // saying it, whatever machine opens it — which is the whole reason §4.1 stores rather than
    // re-derives.
    const opposite = SEEDED_HOURS_PREFERENCES.clock === "12h" ? "24h" : "12h";
    expect(withHours({ clock: opposite, weekStart: "mon", days: {} })?.hours?.clock).toBe(opposite);

    const otherWeek = SEEDED_HOURS_PREFERENCES.weekStart === "mon" ? "sun" : "mon";
    expect(withHours({ clock: "12h", weekStart: otherWeek, days: {} })?.hours?.weekStart).toBe(
      otherWeek,
    );
  });

  it("an absent preference takes the seed rather than a hardcoded 12h/mon", () => {
    const read = withHours({ days: {} });
    expect(read?.hours?.clock).toBe(SEEDED_HOURS_PREFERENCES.clock);
    expect(read?.hours?.weekStart).toBe(SEEDED_HOURS_PREFERENCES.weekStart);
  });

  it("an unreadable preference takes the seed too, per §4.4", () => {
    const read = withHours({ clock: "banana", weekStart: 7, days: {} });
    expect(read?.hours?.clock).toBe(SEEDED_HOURS_PREFERENCES.clock);
    expect(read?.hours?.weekStart).toBe(SEEDED_HOURS_PREFERENCES.weekStart);
  });
});

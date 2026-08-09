import { describe, expect, it } from "vitest";
import { CLOSED_LABEL, formatTime, hoursView } from "./hours.js";

/**
 * `hours.ts` is the only section with real logic in it, so it is tested as logic — on the rows
 * it produces rather than on the markup `render.ts` wraps them in. The distinction the tests
 * care most about is SPEC.md §2.3's: **a day absent is unspecified, a day present with an
 * empty array is closed**, and those must not collapse into each other.
 */

describe("formatTime", () => {
  it("pads the 24-hour form so a column of times aligns", () => {
    expect(formatTime("09:00", "24h")).toBe("09:00");
    expect(formatTime("9:00", "24h")).toBe("09:00");
    expect(formatTime("17:30", "24h")).toBe("17:30");
  });

  it("does not pad the 12-hour form, because nobody writes 09:00 AM", () => {
    expect(formatTime("09:00", "12h")).toBe("9:00 AM");
    expect(formatTime("17:30", "12h")).toBe("5:30 PM");
  });

  it("gets midnight and noon right", () => {
    expect(formatTime("00:00", "12h")).toBe("12:00 AM");
    expect(formatTime("00:45", "12h")).toBe("12:45 AM");
    expect(formatTime("12:00", "12h")).toBe("12:00 PM");
    expect(formatTime("12:30", "12h")).toBe("12:30 PM");
    expect(formatTime("23:59", "12h")).toBe("11:59 PM");
  });

  it("reads anything that is not a time as absent rather than inventing an hour", () => {
    for (const value of ["24:00", "12:60", "9", "9:0", "noon", "", "  ", "9:00 AM", "-1:00"]) {
      expect(formatTime(value, "24h"), value).toBeUndefined();
    }
  });

  it("survives a wrong-typed value", () => {
    for (const value of [undefined, null, 900, true, [], {}, ["09:00"]]) {
      expect(formatTime(value, "24h")).toBeUndefined();
    }
  });
});

describe("hoursView", () => {
  it("leaves an unspecified day out and gives a closed day a row", () => {
    const view = hoursView({
      clock: "24h",
      weekStart: "mon",
      days: { mon: [["09:00", "17:00"]], sun: [] },
    });

    expect(view?.rows).toEqual([
      { day: "mon", label: "Mon", intervals: ["09:00 – 17:00"] },
      { day: "sun", label: "Sun", intervals: [] },
    ]);
  });

  it("keeps every interval a day holds, in file order", () => {
    const view = hoursView({
      clock: "24h",
      days: {
        sat: [
          ["11:00", "14:00"],
          ["17:00", "21:00"],
        ],
      },
    });

    expect(view?.rows[0]?.intervals).toEqual(["11:00 – 14:00", "17:00 – 21:00"]);
  });

  it("rotates the week for weekStart without changing what is stored", () => {
    const days = { mon: [], sun: [], wed: [] };
    expect(hoursView({ weekStart: "mon", days })?.rows.map((r) => r.day)).toEqual([
      "mon",
      "wed",
      "sun",
    ]);
    expect(hoursView({ weekStart: "sun", days })?.rows.map((r) => r.day)).toEqual([
      "sun",
      "mon",
      "wed",
    ]);
  });

  it("falls back to the default for an unrecognised clock or weekStart (§4.4)", () => {
    const view = hoursView({
      clock: "sundial",
      weekStart: "thursday",
      days: { mon: [["13:00", "14:00"]], sun: [] },
    });

    expect(view?.rows.map((r) => r.day)).toEqual(["mon", "sun"]);
    expect(view?.rows[0]?.intervals).toEqual(["13:00 – 14:00"]);
  });

  it("drops a half-readable interval rather than showing an open end", () => {
    const view = hoursView({
      days: {
        mon: [
          ["09:00", "wheneverish"],
          ["13:00", "17:00"],
        ],
      },
    });
    expect(view?.rows[0]?.intervals).toEqual(["13:00 – 17:00"]);
  });

  it("reads a wrong-typed day as unspecified, never as closed", () => {
    // Claiming a business is shut is a claim. `"closed"` where an array belongs is damage,
    // and damage must not be able to make that claim.
    const view = hoursView({ days: { mon: "closed", tue: 0, wed: null, thu: [] } });
    expect(view?.rows.map((r) => r.day)).toEqual(["thu"]);
  });

  it("carries the free-text note", () => {
    expect(hoursView({ days: {}, note: "  By appointment on Mondays.  " })).toEqual({
      rows: [],
      note: "By appointment on Mondays.",
    });
  });

  it("is nothing at all when there is neither a day nor a note", () => {
    for (const value of [undefined, null, {}, { days: {} }, { days: "x", note: "   " }, [], 7]) {
      expect(hoursView(value)).toBeUndefined();
    }
  });

  it("names the label a closed day is rendered with", () => {
    expect(CLOSED_LABEL).toBe("Closed");
  });
});

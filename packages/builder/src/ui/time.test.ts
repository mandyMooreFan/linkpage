import { describe, expect, it } from "vitest";
import { displayTime, parseTime } from "./time.js";

/**
 * The parser `SPEC.md` §7.10 decided we would own.
 *
 * What is tested here is the vocabulary and its edges. The *cost* of owning it is stated in §7.10
 * and is not something a test can hold: we lose the free accessibility and free localisation of
 * the entry convention, and iOS loses its drum-roll picker — the biggest thing given up, and the
 * one still unjudged on a real phone (§11).
 */
describe("what the box accepts (§7.10)", () => {
  it.each([
    ["9", "09:00"],
    ["17", "17:00"],
    ["0", "00:00"],
    ["23", "23:00"],
    ["930", "09:30"],
    ["1700", "17:00"],
    ["9:30", "09:30"],
    ["9.30", "09:30"],
    ["17:00", "17:00"],
    ["9am", "09:00"],
    ["9 am", "09:00"],
    ["9AM", "09:00"],
    ["9:30 pm", "21:30"],
    ["12am", "00:00"],
    ["12pm", "12:00"],
    ["12:30am", "00:30"],
    ["  9am  ", "09:00"],
  ])("reads %s as %s", (typed, stored) => {
    expect(parseTime(typed)).toBe(stored);
  });

  it.each([
    ["noon"],
    ["midnight"],
    ["lunchtime"],
    ["24"],
    ["25:00"],
    ["9:60"],
    ["13pm"],
    ["0am"],
    ["9pm-5am"],
    ["nine"],
    [""],
    ["  "],
    ["-9"],
  ])("refuses %s", (typed) => {
    expect(parseTime(typed)).toBeUndefined();
  });

  it("refuses noon and midnight on purpose, not by oversight", () => {
    // The box's vocabulary is the page's vocabulary (§7.10). The page will never print either
    // word back (§2.5), so they would be a kindness only English speakers can reach.
    expect(parseTime("noon")).toBeUndefined();
    expect(parseTime("midnight")).toBeUndefined();
  });

  it("takes a meridiem as a claim about the hour, so 13pm is not a time", () => {
    expect(parseTime("13pm")).toBeUndefined();
    expect(parseTime("13")).toBe("13:00");
  });
});

describe("what the box reads back (§7.10)", () => {
  it("echoes the page's convention rather than the stored value", () => {
    expect(displayTime("09:00", "12h")).toBe("9:00 AM");
    expect(displayTime("09:00", "24h")).toBe("09:00");
    expect(displayTime("17:30", "12h")).toBe("5:30 PM");
    expect(displayTime("17:30", "24h")).toBe("17:30");
  });

  it("uses the renderer's own formatter, so entry and page cannot disagree", () => {
    // A second implementation here would be exactly the drift §5.2 makes impossible on the page,
    // arriving through the entry screen instead.
    expect(displayTime("00:00", "12h")).toBe("12:00 AM");
    expect(displayTime("12:00", "12h")).toBe("12:00 PM");
  });

  it("shows nothing for a day with no time yet", () => {
    expect(displayTime("", "12h")).toBe("");
  });

  it("round-trips everything it accepts", () => {
    // The property that matters: what the owner types, we store, and read back as a time they
    // would recognise — and typing that back in stores the same thing again.
    for (const typed of ["9am", "930", "17:00", "12pm", "5.45pm"]) {
      const stored = parseTime(typed) as string;
      expect(parseTime(displayTime(stored, "12h"))).toBe(stored);
      expect(parseTime(displayTime(stored, "24h"))).toBe(stored);
    }
  });
});

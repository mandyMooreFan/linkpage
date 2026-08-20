// @vitest-environment jsdom

import { cleanup, fireEvent, render as mount, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Hours } from "@linkpage/renderer";
import { HoursQuestion } from "./HoursQuestion.js";

afterEach(cleanup);

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const state = (day: string, label: string): HTMLElement =>
  within(screen.getByRole("radiogroup", { name: day })).getByRole("radio", { name: label });

const setState = (day: string, label: string): void => {
  fireEvent.click(state(day, label));
};

/**
 * Typing a time and leaving the field, which is when §7.10's box commits (§7.9 decision 2).
 *
 * The blur is the interaction, not a testing detail: pressing `Continue` blurs the box on its way
 * to the button, so this is the same path the owner takes.
 */
const typeTimes = (day: string, open: string, close: string): void => {
  const from = screen.getByLabelText(`${day} opens`);
  fireEvent.change(from, { target: { value: open } });
  fireEvent.blur(from);
  const to = screen.getByLabelText(`${day} closes`);
  fireEvent.change(to, { target: { value: close } });
  fireEvent.blur(to);
};

/** What a box reads back — the page's convention, not the stored value (§7.10). */
const shows = (label: string): string => (screen.getByLabelText(label) as HTMLInputElement).value;

const carriedLine = (): string | undefined =>
  document.querySelector("[data-carried]")?.textContent ?? undefined;

const open = (initial?: Hours): ReturnType<typeof vi.fn> => {
  const onAnswer = vi.fn();
  mount(<HoursQuestion initial={initial} onAnswer={onAnswer} onSkip={vi.fn()} />);
  return onAnswer;
};

const save = (): void => {
  fireEvent.click(document.querySelector('button[type="submit"]') as Element);
};

describe("all three states, on one line, without opening anything (§7.10)", () => {
  it("shows every day and every state at once", () => {
    open();
    for (const day of DAYS) {
      for (const label of ["Open", "Closed", "Not shown"]) {
        expect(state(day, label)).toBeTruthy();
      }
    }
  });

  it("opens with nothing asserted, which is §7.3 by construction", () => {
    open();
    for (const day of DAYS) {
      expect((state(day, "Not shown") as HTMLInputElement).checked).toBe(true);
    }
    expect(screen.queryByLabelText(/opens$/)).toBeNull();
  });

  it("keeps the difference between closed and not shown, because §2.3 does", () => {
    // A page that omits Sunday and a page that says *Sunday: closed* answer a visitor's question
    // differently. `Not shown` names the consequence: the day leaves the page entirely.
    const onAnswer = open();
    setState("Sunday", "Closed");
    save();
    expect(onAnswer.mock.calls[0]?.[0].days).toEqual({ sun: [] });
  });
});

describe("the times carry down, wearing where they came from (§7.10)", () => {
  it("carries nothing until the owner has typed a first time", () => {
    // The §7.3 guarantee, and it holds by construction rather than by care: there is nothing to
    // carry, so the first day of the week is always typed by hand.
    open();
    setState("Monday", "Open");
    expect(carriedLine()).toBeUndefined();
    expect(shows("Monday opens")).toBe("");
  });

  it("carries the last times typed into the next day opened, and says so", () => {
    open();
    setState("Monday", "Open");
    typeTimes("Monday", "09:00", "17:00");
    setState("Tuesday", "Open");

    expect(shows("Tuesday opens")).toBe("9:00 AM");
    expect(carriedLine()).toBe("Same as Mon — change it below if it isn’t.");
  });

  it("drops the line the moment the owner touches the times", () => {
    // Touching them makes the answer theirs again, so the claim has nothing left to say.
    open();
    setState("Monday", "Open");
    typeTimes("Monday", "09:00", "17:00");
    setState("Tuesday", "Open");
    expect(carriedLine()).toBeDefined();

    const box = screen.getByLabelText("Tuesday opens");
    fireEvent.change(box, { target: { value: "10:00" } });
    fireEvent.blur(box);
    expect(carriedLine()).toBeUndefined();
  });

  it("never overwrites times a day already holds", () => {
    // Reopening is not a reason to discard an answer.
    open({ clock: "12h", weekStart: "mon", days: { tue: [["11:00", "14:00"]] } });
    setState("Tuesday", "Closed");
    setState("Tuesday", "Open");
    expect(shows("Tuesday opens")).toBe("11:00 AM");
    expect(carriedLine()).toBeUndefined();
  });

  it("carries what was typed most recently, not what was typed first", () => {
    open();
    setState("Monday", "Open");
    typeTimes("Monday", "09:00", "17:00");
    setState("Friday", "Open");
    typeTimes("Friday", "09:00", "21:00");
    setState("Saturday", "Open");

    expect(shows("Saturday closes")).toBe("9:00 PM");
    expect(carriedLine()).toBe("Same as Fri — change it below if it isn’t.");
  });

  it("is a claim the owner can see before it is published (§7.3)", () => {
    // The failure the line exists for: tap *Open* on the way to *Closed*, tap away, and a silent
    // carry has published 9–5 on a day the business meant to shut.
    const onAnswer = open();
    setState("Monday", "Open");
    typeTimes("Monday", "09:00", "17:00");
    setState("Thursday", "Open");
    expect(carriedLine()).toBeDefined();
    setState("Thursday", "Closed");
    save();
    expect(onAnswer.mock.calls[0]?.[0].days.thu).toEqual([]);
  });
});

describe("copy is the deliberate path beside the implicit one (§7.10)", () => {
  it("offers copying only from a day that actually holds times", () => {
    open();
    setState("Monday", "Open");
    expect(screen.queryByRole("button", { name: "to weekdays" })).toBeNull();
    typeTimes("Monday", "09:00", "17:00");
    expect(screen.getByRole("button", { name: "to weekdays" })).toBeTruthy();
  });

  it("offers it once, not under every open day", () => {
    // Three controls per day is the noise this screen exists to remove — the walk's complaint
    // was that *Add another time* already repeats under every open day.
    open();
    setState("Monday", "Open");
    typeTimes("Monday", "09:00", "17:00");
    fireEvent.click(screen.getByRole("button", { name: "to every day" }));
    expect(screen.getAllByRole("button", { name: "to weekdays" })).toHaveLength(1);
  });

  it("offers it from the day the owner most recently typed on", () => {
    open();
    setState("Monday", "Open");
    typeTimes("Monday", "09:00", "17:00");
    setState("Saturday", "Open");
    typeTimes("Saturday", "10:00", "16:00");

    // The source moved, so the control did: copying now means copying Saturday's times.
    const rows = screen.getAllByRole("radiogroup");
    expect(rows).toHaveLength(7);
    fireEvent.click(screen.getByRole("button", { name: "to every day" }));
    fireEvent.click(document.querySelector('button[type="submit"]') as Element);
  });

  it("copies to the weekdays and leaves the weekend alone", () => {
    const onAnswer = open();
    setState("Monday", "Open");
    typeTimes("Monday", "09:00", "17:00");
    fireEvent.click(screen.getByRole("button", { name: "to weekdays" }));
    save();

    const days = onAnswer.mock.calls[0]?.[0].days;
    expect(Object.keys(days)).toEqual(["mon", "tue", "wed", "thu", "fri"]);
    expect(days.fri).toEqual([["09:00", "17:00"]]);
  });

  it("copies to every day when asked to", () => {
    const onAnswer = open();
    setState("Monday", "Open");
    typeTimes("Monday", "09:00", "17:00");
    fireEvent.click(screen.getByRole("button", { name: "to every day" }));
    save();
    expect(Object.keys(onAnswer.mock.calls[0]?.[0].days)).toHaveLength(7);
  });

  it("marks what it copied, for the same reason the carry is marked", () => {
    open();
    setState("Monday", "Open");
    typeTimes("Monday", "09:00", "17:00");
    fireEvent.click(screen.getByRole("button", { name: "to weekdays" }));
    expect(document.querySelectorAll("[data-carried]")).toHaveLength(4);
  });
});

describe("what this screen deliberately does not do", () => {
  it("says nothing about hours past midnight", () => {
    // `20:00–02:00` is enterable and renders literally, so a control would only add a name for
    // something that already works — vocabulary the owner must learn in order to dismiss.
    const onAnswer = open();
    setState("Monday", "Open");
    typeTimes("Monday", "20:00", "02:00");
    save();
    expect(onAnswer.mock.calls[0]?.[0].days.mon).toEqual([["20:00", "02:00"]]);
    expect(screen.queryByText(/midnight|overnight/i)).toBeNull();
  });

  it("still takes more than one interval a day, because §2.3 does", () => {
    const onAnswer = open();
    setState("Monday", "Open");
    typeTimes("Monday", "11:00", "14:00");
    fireEvent.click(screen.getByRole("button", { name: "Add another time" }));
    const opens = screen.getAllByLabelText("Monday opens");
    fireEvent.change(opens[1] as Element, { target: { value: "17:00" } });
    fireEvent.blur(opens[1] as Element);
    const closes = screen.getAllByLabelText("Monday closes");
    fireEvent.change(closes[1] as Element, { target: { value: "21:00" } });
    fireEvent.blur(closes[1] as Element);
    save();
    expect(onAnswer.mock.calls[0]?.[0].days.mon).toEqual([
      ["11:00", "14:00"],
      ["17:00", "21:00"],
    ]);
  });
});

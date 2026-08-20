// @vitest-environment jsdom

import { cleanup, fireEvent, render as mount, screen } from "@testing-library/react";
import { useState, type JSX } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Clock } from "@linkpage/renderer";
import { TimeBox } from "./TimeBox.js";

afterEach(cleanup);

/** A box wired to state, which is how the hours screen holds it. */
function Harness({ clock = "12h", start = "" }: { clock?: Clock; start?: string }): JSX.Element {
  const [value, setValue] = useState(start);
  return (
    <>
      <TimeBox label="Monday opens" value={value} clock={clock} onChange={setValue} />
      <output>{value === "" ? "(nothing stored)" : value}</output>
    </>
  );
}

const box = (): HTMLInputElement => screen.getByLabelText("Monday opens") as HTMLInputElement;
const type = (text: string): void => {
  fireEvent.change(box(), { target: { value: text } });
  fireEvent.blur(box());
};

describe("the box rewrites what was typed (§7.10)", () => {
  it("reads back in the page's convention", () => {
    mount(<Harness />);
    type("9am");
    expect(box().value).toBe("9:00 AM");
  });

  it("reads back 24-hour when that is what the page says", () => {
    mount(<Harness clock="24h" />);
    type("9am");
    expect(box().value).toBe("09:00");
  });

  it("says nothing when it succeeds", () => {
    // §7.9 decision 4: a successful mend is silent. A rewritten box is not an announcement.
    mount(<Harness />);
    type("930");
    expect(document.querySelector("[data-message]")).toBeNull();
  });

  it("is a view of the stored time, so a later clock change moves it", () => {
    // The intended relationship rather than a side effect: flipping *How times read* changes
    // these boxes with it, because the box is not a field of its own.
    const { rerender } = mount(<TimeBox label="t" value="17:30" clock="12h" onChange={vi.fn()} />);
    expect((screen.getByLabelText("t") as HTMLInputElement).value).toBe("5:30 PM");
    rerender(<TimeBox label="t" value="17:30" clock="24h" onChange={vi.fn()} />);
    expect((screen.getByLabelText("t") as HTMLInputElement).value).toBe("17:30");
  });
});

describe("an unreadable time is said and dropped (§7.9, §7.10)", () => {
  it("speaks on leaving the field, in §7.9's shape", () => {
    mount(<Harness />);
    type("lunchtime");
    const message = document.querySelector("[data-message]");
    expect(message?.textContent).toBe("This time won't reach your page — try 5:30pm");
    // Consequence then fix, and none of §7.9's banned words.
    for (const banned of ["invalid", "format", "valid"]) {
      expect(message?.textContent?.toLowerCase()).not.toContain(banned);
    }
  });

  it("describes the control, so the message is announced with it", () => {
    mount(<Harness />);
    type("lunchtime");
    const id = box().getAttribute("aria-describedby");
    expect(id).not.toBeNull();
    expect(document.getElementById(id as string)?.textContent).toContain("won't reach your page");
  });

  it("stores nothing, rather than storing something that is not a time", () => {
    mount(<Harness start="09:00" />);
    expect(screen.getByText("09:00")).toBeTruthy();
    type("lunchtime");
    expect(screen.getByText("(nothing stored)")).toBeTruthy();
  });

  it("blocks nothing — there is no disabled state here at all", () => {
    mount(<Harness />);
    type("lunchtime");
    expect(box().disabled).toBe(false);
  });

  it("stops speaking the moment the value becomes usable", () => {
    // Late to speak, quick to stop (§7.9 decision 2).
    mount(<Harness />);
    type("lunchtime");
    expect(document.querySelector("[data-message]")).not.toBeNull();
    type("9am");
    expect(document.querySelector("[data-message]")).toBeNull();
  });

  it("is silent while the owner is still typing", () => {
    mount(<Harness />);
    fireEvent.change(box(), { target: { value: "9" } });
    expect(document.querySelector("[data-message]")).toBeNull();
  });

  it("clearing the box is not a complaint", () => {
    mount(<Harness start="09:00" />);
    type("");
    expect(document.querySelector("[data-message]")).toBeNull();
    expect(screen.getByText("(nothing stored)")).toBeTruthy();
  });
});

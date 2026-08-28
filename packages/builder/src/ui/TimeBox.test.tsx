// @vitest-environment jsdom

import { cleanup, fireEvent, render as mount, screen } from "@testing-library/react";
import { useState, type JSX } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Clock } from "@linkpage/renderer";
import { Question } from "../flow/questions/Question.js";
import { TimeBox } from "./TimeBox.js";

afterEach(cleanup);

/**
 * A box wired to state inside the real shell, which is how the hours screen holds it — the
 * shell matters now, because §7.9's judgement (#142) belongs to `Continue`, and `Continue` is
 * the shell's.
 */
function harness({ clock = "12h", start = "" }: { clock?: Clock; start?: string } = {}) {
  const submitted = vi.fn();

  function Harness(): JSX.Element {
    const [value, setValue] = useState(start);
    return (
      <Question title="t" onSubmit={submitted}>
        <TimeBox
          label="Monday opens"
          name="time-test"
          value={value}
          clock={clock}
          onChange={setValue}
        />
        <output>{value === "" ? "(nothing stored)" : value}</output>
      </Question>
    );
  }

  mount(<Harness />);
  return { submitted };
}

const box = (): HTMLInputElement => screen.getByLabelText("Monday opens") as HTMLInputElement;
const type = (text: string): void => {
  fireEvent.change(box(), { target: { value: text } });
  fireEvent.blur(box());
};
const pressContinue = (): void => {
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
};
const message = (): Element | null => document.querySelector("[data-message]");

describe("the box rewrites what was typed (§7.10)", () => {
  it("reads back in the page's convention", () => {
    harness();
    type("9am");
    expect(box().value).toBe("9:00 AM");
  });

  it("reads back 24-hour when that is what the page says", () => {
    harness({ clock: "24h" });
    type("9am");
    expect(box().value).toBe("09:00");
  });

  it("says nothing when it succeeds", () => {
    // §7.9 decision 4: a successful mend is silent. A rewritten box is not an announcement.
    harness();
    type("930");
    expect(message()).toBeNull();
  });

  it("is a view of the stored time, so a later clock change moves it", () => {
    // The intended relationship rather than a side effect: flipping *How times read* changes
    // these boxes with it, because the box is not a field of its own.
    const shell = (clock: Clock): JSX.Element => (
      <Question title="t">
        <TimeBox label="t" name="time-test" value="17:30" clock={clock} onChange={vi.fn()} />
      </Question>
    );
    const { rerender } = mount(shell("12h"));
    expect((screen.getByLabelText("t") as HTMLInputElement).value).toBe("5:30 PM");
    rerender(shell("24h"));
    expect((screen.getByLabelText("t") as HTMLInputElement).value).toBe("17:30");
  });
});

describe("an unreadable time is judged on Continue (§7.9 decision 2, #142)", () => {
  it("is silent on leaving the field — nothing judges an answer still being given", () => {
    harness();
    type("lunchtime");
    expect(message()).toBeNull();
  });

  it("speaks on Continue, in §7.9's shape, and the screen stays", () => {
    const { submitted } = harness();
    type("lunchtime");
    pressContinue();

    expect(message()?.textContent).toBe("This time won't reach your page — try 5:30pm");
    expect(submitted).not.toHaveBeenCalled();
    // Consequence then fix, and none of §7.9's banned words.
    for (const banned of ["invalid", "format", "valid"]) {
      expect(message()?.textContent?.toLowerCase()).not.toContain(banned);
    }
  });

  it("describes the control, so the message is announced with it", () => {
    harness();
    type("lunchtime");
    pressContinue();
    const id = box().getAttribute("aria-describedby");
    expect(id).not.toBeNull();
    expect(document.getElementById(id as string)?.textContent).toContain("won't reach your page");
  });

  it("stores nothing, rather than storing something that is not a time", () => {
    harness({ start: "09:00" });
    expect(screen.getByText("09:00")).toBeTruthy();
    type("lunchtime");
    expect(screen.getByText("(nothing stored)")).toBeTruthy();
    // And the owner's text stays on screen for the sentence to point at.
    expect(box().value).toBe("lunchtime");
  });

  it("blocks nothing — there is no disabled state here at all", () => {
    harness();
    type("lunchtime");
    expect(box().disabled).toBe(false);
    expect((screen.getByRole("button", { name: "Continue" }) as HTMLButtonElement).disabled).toBe(
      false,
    );
  });

  it("stops speaking the moment the value becomes usable", () => {
    // Late to speak, quick to stop (§7.9 decision 2).
    harness();
    type("lunchtime");
    pressContinue();
    expect(message()).not.toBeNull();
    fireEvent.change(box(), { target: { value: "9am" } });
    expect(message()).toBeNull();
  });

  it("lets the answer continue once cleared or fixed", () => {
    const { submitted } = harness();
    type("lunchtime");
    pressContinue();
    expect(submitted).not.toHaveBeenCalled();

    type("9am");
    pressContinue();
    expect(submitted).toHaveBeenCalledTimes(1);
  });

  it("is silent while the owner is still typing", () => {
    harness();
    fireEvent.change(box(), { target: { value: "9" } });
    expect(message()).toBeNull();
  });

  it("clearing the box is not a complaint", () => {
    harness({ start: "09:00" });
    type("");
    pressContinue();
    expect(message()).toBeNull();
    expect(screen.getByText("(nothing stored)")).toBeTruthy();
  });
});

/**
 * **One manner for §7.9's message, everywhere it appears** (#294, fallout from CL-1).
 *
 * CL-1 gave `Field` the manner: the control carries `aria-invalid` for exactly as long as the
 * sentence stands, and the sentence **is** the `role="alert"` §7.9 already owns for a refused
 * file — one mechanism, not a visible sentence and a hidden announcer beside it. This box does
 * not go through `Field`, so it had kept the old `role="status"` and no `aria-invalid` at all,
 * and the builder said *this will not work* in two manners.
 *
 * **`alert` is right here for the same reason it is right in `Field`**: §7.9 decision 2 governs
 * *when*, and this box already obeys it — the sentence answers a `Continue` the owner has just
 * pressed, never a blur. The describe above is the proof of that, and it is what licenses the
 * manner below. A polite region can wait behind whatever else is speaking, which is the wrong
 * answer to a press.
 */
describe("and says it in the one manner §7.9 owns (#294, CL-1 fallout)", () => {
  it("marks the box it is about", () => {
    // A description says *there is a sentence here*; `aria-invalid` says *this is the field it
    // is about*. `Field` has said both since CL-1; this box said neither.
    harness();
    type("lunchtime");
    expect(box().getAttribute("aria-invalid")).toBeNull();
    pressContinue();
    expect(box().getAttribute("aria-invalid")).toBe("true");
  });

  it("unmarks the box the moment the sentence goes", () => {
    // `aria-invalid` is a claim about *this value*, so it arrives and leaves with the message
    // rather than being written once and left on.
    harness();
    type("lunchtime");
    pressContinue();
    fireEvent.change(box(), { target: { value: "9am" } });
    expect(message()).toBeNull();
    expect(box().getAttribute("aria-invalid")).toBeNull();
  });

  it('speaks through §7.9\'s own `role="alert"`, not a second region', () => {
    harness();
    type("lunchtime");
    pressContinue();
    expect(screen.getByRole("alert").textContent).toBe(
      "This time won't reach your page — try 5:30pm",
    );
    // The visible sentence *is* the live region. A hidden announcer beside it would read twice.
    expect(document.querySelectorAll("[data-message]")).toHaveLength(1);
    expect(screen.getByRole("alert").getAttribute("data-message")).not.toBeNull();
  });

  it("has nothing to announce while there is nothing wrong", () => {
    harness();
    type("9am");
    pressContinue();
    expect(screen.queryAllByRole("alert")).toEqual([]);
    expect(box().getAttribute("aria-invalid")).toBeNull();
  });
});

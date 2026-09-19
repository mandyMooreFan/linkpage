// @vitest-environment jsdom
import { cleanup, fireEvent, render as mount, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useState, type JSX } from "react";
import { Question } from "../flow/questions/Question.js";
import { TextField } from "./TextField.js";
import { TEXTAREA_CLASS, WRAP_CLASS } from "./TextInput.js";

afterEach(cleanup);

/**
 * **The line that wraps** (`SPEC.md` §7.2; #382, spec-pass finding 11).
 *
 * A single-line box shows a long tagline up to its right edge and hides the rest, with nothing
 * on screen to say more exists — while the page beside it and the review row both show the
 * whole line. So the tagline's line is one row tall and grows to its words. How tall it grows
 * is a browser's answer (`layout.e2e.ts`); what is held here is the shape of the control and
 * the two ways it has to keep behaving like the one-line box it replaces: `Enter` still goes
 * on, and a line break is never part of the answer.
 */

const describedText = (control: HTMLElement): string =>
  (control.getAttribute("aria-describedby") ?? "")
    .split(" ")
    .filter((id) => id !== "")
    .map((id) => document.getElementById(id)?.textContent ?? "")
    .join(" ");

function Harness({
  wraps,
  onSubmit,
  onValueChange,
}: {
  readonly wraps?: boolean;
  readonly onSubmit?: () => void;
  readonly onValueChange?: (next: string) => void;
}): JSX.Element {
  const [value, setValue] = useState("");
  return (
    <Question title="One line about what you do?" onSubmit={() => onSubmit?.()}>
      <TextField
        label="Tagline"
        hint="It sits under your name."
        value={value}
        onValueChange={(next) => {
          onValueChange?.(next);
          setValue(next);
        }}
        wraps={wraps}
      />
    </Question>
  );
}

describe("a line that wraps (#382)", () => {
  it("is the ruled line at one row, grown to its words rather than scrolled", () => {
    mount(<Harness wraps />);
    const box = screen.getByLabelText("Tagline");
    expect(box.tagName).toBe("TEXTAREA");
    expect(box.getAttribute("rows")).toBe("1");
    expect(box.className).toContain(TEXTAREA_CLASS);
    expect(box.className).toContain(WRAP_CLASS);
    expect(box.hasAttribute("data-wraps"), "named for the browser measurement").toBe(true);
  });

  it("leaves the plain line an input", () => {
    mount(<Harness />);
    const box = screen.getByLabelText("Tagline");
    expect(box.tagName).toBe("INPUT");
    expect(box.hasAttribute("data-wraps")).toBe(false);
  });

  it("keeps its label and its hint the way the one-line box had them", () => {
    mount(<Harness wraps />);
    const box = screen.getByRole("textbox", { name: "Tagline" });
    expect(describedText(box)).toBe("It sits under your name.");
  });

  it("goes on when Enter is pressed, instead of starting a second line", () => {
    const onSubmit = vi.fn();
    mount(<Harness wraps onSubmit={onSubmit} />);
    const box = screen.getByLabelText("Tagline");
    fireEvent.change(box, { target: { value: "Sourdough since 1902" } });
    fireEvent.keyDown(box, { key: "Enter" });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(box).toHaveProperty("value", "Sourdough since 1902");
  });

  it("does not go on for an Enter that is finishing a composed character", () => {
    const onSubmit = vi.fn();
    mount(<Harness wraps onSubmit={onSubmit} />);
    fireEvent.keyDown(screen.getByLabelText("Tagline"), { key: "Enter", isComposing: true });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("turns a pasted line break into a space, so the answer stays one line", () => {
    const onValueChange = vi.fn();
    mount(<Harness wraps onValueChange={onValueChange} />);
    fireEvent.change(screen.getByLabelText("Tagline"), {
      target: { value: "Sourdough,\r\npastries\nand coffee" },
    });
    expect(onValueChange).toHaveBeenLastCalledWith("Sourdough, pastries and coffee");
  });
});

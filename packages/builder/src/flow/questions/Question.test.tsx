// @vitest-environment jsdom

import { cleanup, render as mount, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Field } from "./Question.js";

/**
 * `Field`: a label, an optional hint, and a control. Issue #91.
 *
 * **A hint is a description, and the whole of this file is about keeping it one.** The accessible
 * name of a control inside a `<label>` is built from everything in that label, so a hint sitting
 * there was read out as part of the name — the colour box announced as *"Or type your exact colour
 * Like #c2185b."*, one run-on string. A description is the thing assistive technology presents
 * separately and lets you skip; a name is the thing it identifies the control by, and it should be
 * the same words a sighted user would use to ask about it.
 *
 * The two shapes are tested separately because they are genuinely different markup, and the
 * unhinted one carries composites — an input and a button in one row — that the hinted one may not.
 */

afterEach(cleanup);

const describedText = (control: HTMLElement): string => {
  const id = control.getAttribute("aria-describedby");
  if (id === null) return "";
  return document.getElementById(id)?.textContent ?? "";
};

describe("a hinted field", () => {
  const openHinted = (): void => {
    mount(
      <Field label="Or type your exact colour" hint="Like #c2185b.">
        <input type="text" className="input" defaultValue="" />
      </Field>,
    );
  };

  it("names the control with the label alone", () => {
    openHinted();
    // The regression: this used to resolve to "Or type your exact colour Like #c2185b."
    expect(screen.getByRole("textbox", { name: "Or type your exact colour" })).toBeDefined();
  });

  it("does not let the hint into the name", () => {
    openHinted();
    const control = screen.getByRole("textbox");
    const labelId = control.getAttribute("aria-labelledby");
    expect(document.getElementById(labelId ?? "")?.textContent).toBe("Or type your exact colour");
    expect(document.getElementById(labelId ?? "")?.textContent).not.toContain("#c2185b");
  });

  it("carries the hint as a description instead", () => {
    openHinted();
    // Still announced — moved, not dropped. That is the whole point: a description is skippable,
    // a name is not.
    expect(describedText(screen.getByRole("textbox"))).toBe("Like #c2185b.");
  });

  it("keeps the hint visible, between the label and the control", () => {
    openHinted();
    const field = document.querySelector(".field");
    const order = [...(field?.children ?? [])].map((el) => el.className || el.tagName);
    // Sighted users lose nothing: the visual order is what it always was.
    expect(order).toEqual(["field__label", "field__hint", "input"]);
  });

  it("keeps the hint out of the label's subtree, which is what caused it", () => {
    openHinted();
    const label = document.querySelector(".field__label");
    expect(label?.textContent).toBe("Or type your exact colour");
    expect(document.querySelector("label .field__hint")).toBeNull();
  });
});

describe("an unhinted field is left as it was", () => {
  it("labels its control implicitly, with no ids to plumb", () => {
    mount(
      <Field label="Business name">
        <input type="text" className="input" defaultValue="" />
      </Field>,
    );

    const control = screen.getByRole("textbox", { name: "Business name" });
    // No association attributes at all: the control is inside the label, which is enough.
    expect(control.getAttribute("aria-labelledby")).toBeNull();
    expect(control.getAttribute("aria-describedby")).toBeNull();
    expect(document.querySelector("label.field")).not.toBeNull();
  });

  it("still handles a composite of more than one control", () => {
    // The *Something else* row: an input and an Add button in one span. This shape is why the
    // unhinted branch does not reach for "the control" — there are two, and it must not guess.
    mount(
      <Field label="Something else">
        <span className="row">
          <input type="text" className="input" defaultValue="" />
          <button type="button">Add</button>
        </span>
      </Field>,
    );

    // Pinned as it is rather than as it should be: the input's name comes out
    // "Something elseAdd", because an implicit label names from everything inside it and the Add
    // button is inside it. Same family as #91 and a different cause — the button, not a hint — so
    // it is filed separately rather than smuggled into this fix. If that changes, this assertion
    // is where it will be noticed.
    expect(screen.getByRole("textbox", { name: "Something elseAdd" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Add" })).toBeDefined();
  });
});

describe("the hinted field does not damage what it is handed", () => {
  it("associates a select as readily as an input", () => {
    mount(
      <Field label="Monday" hint="Leave a day alone if you'd rather not say.">
        <select className="input" defaultValue="unset">
          <option value="unset">Don’t say</option>
        </select>
      </Field>,
    );

    const control = screen.getByRole("combobox", { name: "Monday" });
    expect(describedText(control)).toBe("Leave a day alone if you'd rather not say.");
  });

  it("survives a child that is not a single element", () => {
    // Not a shape any caller uses today, and the association cannot be made without one control
    // to make it to — but it must render, and the name must still be clean.
    mount(
      <Field label="Two things" hint="A hint.">
        <>
          <input type="text" className="input" defaultValue="" />
          <input type="text" className="input" defaultValue="" />
        </>
      </Field>,
    );

    expect(document.querySelector(".field__hint")?.textContent).toBe("A hint.");
    expect(document.querySelectorAll("input")).toHaveLength(2);
  });
});

// @vitest-environment jsdom

import { cleanup, render as mount, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Field } from "./Question.js";
import { LADDER } from "../../ui/ladder.js";
import { TextField } from "../../ui/TextField.js";
import { TextArea } from "../../ui/TextInput.js";

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
 *
 * **What the bare host elements below stand for, checked rather than assumed (#213).** #187 wrote
 * that "no screen in the builder" hands `Field` a bare host element, and that was the finding
 * that mattered — every *text* field goes through `TextInput`. It is not the whole truth about
 * this file, and the sweep is where the difference gets written down:
 *
 * - **`<input>` — one live caller, and it is not a text box.** `StyleStep`'s *Corner softness*
 *   slider is a raw `<input type="range">` inside a `Field`, and it is the only host control the
 *   builder still puts there. So the host branch is product surface and these fixtures guard it;
 *   what they must never again be read as is a picture of a *text* field, which is the reading
 *   that hid #91 for two releases. `list.test.tsx` mounts the slider itself.
 * - **`<select>` — no caller at all.** The hours screen had one and #192 replaced it with the
 *   segmented control. The test below is kept as a claim about `Field` — that it associates any
 *   labelable element, not only the one shape the product happens to hold today — and is named
 *   here as such rather than left looking like a screen.
 * - **The composite row** is a `<span>` of two controls, which is exactly the product's *Something
 *   else* row; there the two are a `TextInput` and a `Button`. Neither is labelable-by-guess, so
 *   `Field` takes the same branch either way, and swapping the fixture would move no guarantee.
 *   What holds the real row is `flow.test.tsx`, which reaches it by its label.
 *
 * The section at the foot of the file is the one that mounts what a text field actually is.
 */

afterEach(cleanup);

/**
 * Everything `aria-describedby` points at, in order.
 *
 * A list rather than one id, because §7.9's message **joins** the hint rather than replacing it —
 * which is the whole reason a hint can survive the moment it is most useful.
 */
const describedText = (control: HTMLElement): string =>
  (control.getAttribute("aria-describedby") ?? "")
    .split(" ")
    .filter((id) => id !== "")
    .map((id) => document.getElementById(id)?.textContent ?? "")
    .join(" ");

describe("a hinted field", () => {
  const openHinted = (): void => {
    mount(
      <Field label="Or type your exact colour" hint="Like #c2185b.">
        <input type="text" defaultValue="" />
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
    const label = document.querySelector<HTMLLabelElement>("[data-field] label");
    expect(label?.htmlFor).toBe(control.id);
    expect(label?.textContent).toBe("Or type your exact colour");
    expect(label?.textContent).not.toContain("#c2185b");
  });

  it("labels with a real <label>, so the words are a click target (#98)", () => {
    openHinted();
    // #91 used `aria-labelledby`, which names correctly and silently costs this: clicking the
    // words stopped focusing the control, because only a real label association does that.
    const label = document.querySelector<HTMLLabelElement>("[data-field] label");
    expect(label?.tagName).toBe("LABEL");
    expect(label?.htmlFor).not.toBe("");
    expect(document.getElementById(label?.htmlFor ?? "")).toBe(screen.getByRole("textbox"));
  });

  it("carries the hint as a description instead", () => {
    openHinted();
    // Still announced — moved, not dropped. That is the whole point: a description is skippable,
    // a name is not.
    expect(describedText(screen.getByRole("textbox"))).toBe("Like #c2185b.");
  });

  it("keeps the hint visible, below the control", () => {
    openHinted();
    const field = document.querySelector("[data-field]");
    // Asserted by shape rather than by class name: what matters is that a field reads **name,
    // box, explanation** — never explanation first (#187) — and a class list is a styling detail
    // that would make this test edit itself every time the presentation moves.
    const order = [...(field?.children ?? [])].map((el) => el.tagName);
    expect(order).toEqual(["LABEL", "INPUT", "SPAN"]);
    expect(field?.querySelector("[data-hint]")?.textContent).toBe("Like #c2185b.");
  });

  it("holds the label and its control apart, which is the whole complaint", () => {
    // The gap was **zero** — only the input's own padding stood between a label and its box, and
    // between the box and the hint. It is a class list rather than a measurement because jsdom
    // has no layout; the rendered distance was measured on the real page, and the ladder these
    // classes come from is asserted in `ladder.test.ts`.
    openHinted();
    expect(document.querySelector("[data-field]")?.className).toContain(
      LADDER.withinField.className,
    );
  });

  it("keeps the hint out of the label's subtree, which is what caused it", () => {
    openHinted();
    const label = document.querySelector("[data-field] label");
    expect(label?.textContent).toBe("Or type your exact colour");
    expect(document.querySelector("label .field__hint")).toBeNull();
  });
});

describe("an unhinted field", () => {
  it("still points a real label at its control", () => {
    mount(
      <Field label="Business name">
        <input type="text" defaultValue="" />
      </Field>,
    );

    const control = screen.getByRole("textbox", { name: "Business name" });
    // Named by a real label, and described by nothing, because there is no hint.
    expect(control.getAttribute("aria-describedby")).toBeNull();
    const label = document.querySelector<HTMLLabelElement>("[data-field] label");
    expect(label?.htmlFor).toBe(control.id);
  });

  it("still handles a composite of more than one control", () => {
    // The *Something else* row: an input and an Add button in one span. This shape is why the
    // unhinted branch does not reach for "the control" — there are two, and it must not guess.
    mount(
      <Field label="Something else">
        <span className="row">
          <input type="text" defaultValue="" />
          <button type="button">Add</button>
        </span>
      </Field>,
    );

    // Without `htmlFor` there is nothing to point at, so this falls back to wrapping — the shape
    // that produced #98's "Something elseAdd". No caller is in this state; the assertion records
    // that the fallback is imprecise rather than broken.
    expect(screen.getByRole("textbox", { name: "Something elseAdd" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Add" })).toBeDefined();
  });

  it("names only the control a composite points at (#98)", () => {
    mount(
      <Field label="Something else" htmlFor="typed">
        <span className="row">
          <input id="typed" type="text" defaultValue="" />
          <button type="button">Add</button>
        </span>
      </Field>,
    );

    // The whole of #98: the Add button no longer joins the input's name.
    expect(screen.getByRole("textbox", { name: "Something else" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Add" })).toBeDefined();
    expect(document.querySelector<HTMLLabelElement>("[data-field] label")?.htmlFor).toBe("typed");
  });

  it("leaves a caller's own id alone", () => {
    mount(
      <Field label="Where">
        <input id="mine" type="text" defaultValue="" />
      </Field>,
    );

    // An id the caller set may already be referenced by something else — a datalist, a test.
    expect(screen.getByRole("textbox", { name: "Where" }).id).toBe("mine");
  });
});

describe("the hinted field does not damage what it is handed", () => {
  it("associates a select as readily as an input", () => {
    mount(
      <Field label="Monday" hint="Leave a day alone if you'd rather not say.">
        <select defaultValue="unset">
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
          <input type="text" defaultValue="" />
          <input type="text" defaultValue="" />
        </>
      </Field>,
    );

    expect(document.querySelector("[data-hint]")?.textContent).toBe("A hint.");
    expect(document.querySelectorAll("input")).toHaveLength(2);
  });
});

/**
 * §7.9's message slot, which this component now owns.
 *
 * Nothing passes `message` in the product yet — the per-field rules that produce one are #109 and
 * #112 to #114. It is tested here because the slot is the contract those tickets build against,
 * and an untested slot is one they would each have to rediscover the shape of.
 */
describe("a field with something the tool cannot use (§7.9)", () => {
  const openWithMessage = (): void => {
    mount(
      <Field
        label="Where does it go?"
        hint="Copy it from your browser."
        message="This button won't work — paste the address from your browser."
      >
        <input type="text" defaultValue="" />
      </Field>,
    );
  };

  it("sits below the control, where the eye already is", () => {
    openWithMessage();
    const order = [...(document.querySelector("[data-field]")?.children ?? [])].map(
      (el) => el.tagName,
    );
    expect(order).toEqual(["LABEL", "INPUT", "SPAN", "SPAN"]);
    // And below the hint rather than above it, so the two do not swap places when one appears.
    const spans = [...document.querySelectorAll("[data-field] > span")];
    expect(spans.map((el) => el.getAttribute("data-hint") !== null)).toEqual([true, false]);
  });

  it("joins the hint rather than replacing it", () => {
    // The hint is frequently *the fix*, so deleting it at the moment of complaint is the worst
    // possible timing. `aria-describedby` takes a list, which is what makes this possible.
    openWithMessage();
    expect(describedText(screen.getByRole("textbox"))).toBe(
      "Copy it from your browser. This button won't work — paste the address from your browser.",
    );
  });

  it("names the control with the label alone, still", () => {
    openWithMessage();
    expect(screen.getByRole("textbox", { name: "Where does it go?" })).toBeDefined();
  });

  it("reserves no layout when there is nothing wrong", () => {
    // §7.7's constraint reaching the field: a screen with nothing wrong is the calm screen it was
    // designed as, with no empty slot held open against a message that never comes.
    mount(
      <Field label="Where does it go?" hint="Copy it from your browser.">
        <input type="text" defaultValue="" />
      </Field>,
    );
    expect(document.querySelector("[data-message]")).toBeNull();
    expect(describedText(screen.getByRole("textbox"))).toBe("Copy it from your browser.");
  });
});

/**
 * The same guarantees, through the control the product actually uses.
 *
 * **Every test above this point hands `Field` a bare `<input>`, and no *text field* in the builder
 * does.** They all pass `TextInput`, and that difference silently turned the association off:
 * `labelableControl` only recognised host elements, so a component fell through to the wrapping
 * `<label>` branch, where the hint is back inside the accessible name — the exact bug (#91) this
 * file was written to prevent. It went unnoticed through #183, which introduced the wrapper and
 * changed no markup, because nothing here rendered one.
 *
 * So these mount what ships. A test whose fixture is simpler than the product is a test that can
 * be true about nothing.
 */
describe("a field built from the tool's own controls", () => {
  const openField = (): void => {
    mount(
      <TextField
        label="Or type your exact colour"
        hint="From a designer or a brand guide."
        value=""
        onValueChange={() => undefined}
      />,
    );
  };

  it("names the control with the label alone", () => {
    openField();
    expect(screen.getByRole("textbox", { name: "Or type your exact colour" })).toBeDefined();
  });

  it("keeps the hint a description, and keeps it wired", () => {
    openField();
    expect(describedText(screen.getByRole("textbox"))).toBe("From a designer or a brand guide.");
  });

  it("points a real label at it, so the words are a click target", () => {
    openField();
    const label = document.querySelector<HTMLLabelElement>("[data-field] label");
    const input = screen.getByRole("textbox");
    expect(label?.htmlFor).not.toBe("");
    expect(label?.htmlFor).toBe(input.id);
    // A real `<label for>` is what makes clicking the words focus the box; `aria-labelledby`
    // names correctly and silently costs that.
    expect(label?.textContent).toBe("Or type your exact colour");
  });

  it("reads name, box, explanation", () => {
    openField();
    const order = [...(document.querySelector("[data-field]")?.children ?? [])].map(
      (el) => el.tagName,
    );
    expect(order).toEqual(["LABEL", "INPUT", "SPAN"]);
  });

  it("does the same for the several-line answer", () => {
    // `TextArea` is the same control at a second height (§7.4), so it has to be associable the
    // same way — the address is the one field in the builder that uses it.
    mount(
      <Field label="Address" hint="Write it the way you'd write it on an envelope.">
        <TextArea rows={4} defaultValue="" />
      </Field>,
    );
    const box = screen.getByRole("textbox");
    expect(box.tagName).toBe("TEXTAREA");
    expect(describedText(box)).toBe("Write it the way you'd write it on an envelope.");
    expect(screen.getByRole("textbox", { name: "Address" })).toBeDefined();
  });
});

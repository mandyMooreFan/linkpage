// @vitest-environment jsdom

import { cleanup, fireEvent, render as mount, screen } from "@testing-library/react";
import { useState, type JSX } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UrlField } from "./TextField.js";

/**
 * The permanent `https://` prefix, mounted (design change 10, finding B-55).
 *
 * **The real components, not a stand-in.** #187 found that every fixture in `Question.test.tsx`
 * handed `Field` a bare `<input>`, which no screen in the builder does, and that the whole
 * builder had lost its label/description association behind that simplification. A prefixed
 * field is a `<span>` holding two things, which is precisely the shape the association is
 * fragile on, so it is tested through `UrlField` — the thing the four screens actually render.
 */

afterEach(cleanup);

/** Everything `aria-describedby` points at, in order. */
const describedText = (control: HTMLElement): string =>
  (control.getAttribute("aria-describedby") ?? "")
    .split(" ")
    .filter((id) => id !== "")
    .map((id) => document.getElementById(id)?.textContent ?? "")
    .join(" ");

const box = (): HTMLInputElement => screen.getByLabelText("Web address") as HTMLInputElement;
const line = (): string => document.querySelector("[data-url-field]")?.textContent ?? "";
const scheme = (): string => document.querySelector("[data-url-scheme]")?.textContent ?? "";

/** The field, driven the way a question drives it: it owns the value, this re-renders it. */
function open(initial = "", onCommit?: (value: string) => void): { latest: () => string } {
  let latest = initial;
  const Harness = (): JSX.Element => {
    const [value, setValue] = useState(initial);
    latest = value;
    return (
      <UrlField
        label="Web address"
        hint="Copy it from your browser."
        value={value}
        onValueChange={setValue}
        onCommit={onCommit}
      />
    );
  };
  mount(<Harness />);
  return { latest: () => latest };
}

describe("what is on the line", () => {
  it("writes the scheme before the box, permanently", () => {
    // The defect: it was a placeholder, so it vanished the moment the owner typed.
    open("https://mysite.com/menu");
    expect(scheme()).toBe("https://");
    expect(box().value).toBe("mysite.com/menu");
    fireEvent.change(box(), { target: { value: "mysite.com/other" } });
    expect(scheme()).toBe("https://");
  });

  it("is empty and still says so", () => {
    open();
    expect(scheme()).toBe("https://");
    expect(box().value).toBe("");
  });

  it("shows the scheme an existing project actually stored", () => {
    open("http://legacy.example");
    expect(scheme()).toBe("http://");
    expect(box().value).toBe("legacy.example");
    expect(line()).toBe("http://");
  });

  it("has no placeholder left to lose", () => {
    open();
    expect(box().getAttribute("placeholder")).toBeNull();
  });
});

describe("what assistive technology is told", () => {
  it("names the box with the label alone, through a real label", () => {
    open("https://mysite.com");
    const label = document.querySelector<HTMLLabelElement>("[data-field] label");
    expect(label?.tagName).toBe("LABEL");
    expect(label?.textContent).toBe("Web address");
    expect(document.getElementById(label?.htmlFor ?? "")).toBe(box());
  });

  it("describes it with the scheme, and keeps the hint alongside", () => {
    // The placeholder used to carry this, and a placeholder is announced only while the field is
    // empty — so making the prefix visual-only would have deepened the defect it fixes.
    open("https://mysite.com");
    expect(describedText(box())).toBe("https:// Copy it from your browser.");
  });

  it("still describes it when the field has no hint at all", () => {
    mount(<UrlField label="Where it goes" value="" onValueChange={() => {}} />);
    const control = screen.getByLabelText("Where it goes");
    expect(describedText(control)).toBe("https://");
  });

  it("keeps the prefix out of the name", () => {
    // #98's defect in a new place: anything inside a wrapping `<label>` joins the name.
    open("https://mysite.com");
    expect(screen.getByRole("textbox", { name: "Web address" })).toBe(box());
  });
});

describe("what typing does to the answer", () => {
  it("keeps the scheme in the value the project stores", () => {
    // The prefix is a picture of the value, never a replacement for part of it: `project.json`
    // holds whole addresses and the renderer builds every href from that string.
    const { latest } = open();
    fireEvent.change(box(), { target: { value: "mysite.com/menu" } });
    expect(latest()).toBe("https://mysite.com/menu");
    expect(box().value).toBe("mysite.com/menu");
  });

  it("absorbs a pasted address instead of doubling its scheme", () => {
    // Paste what you copied from the browser — which is what every hint on these screens says.
    const { latest } = open();
    fireEvent.change(box(), { target: { value: "https://mysite.com/menu" } });
    expect(latest()).toBe("https://mysite.com/menu");
    expect(line() + box().value).toBe("https://mysite.com/menu");
  });

  it("empties the answer when the box is emptied", () => {
    const { latest } = open("https://mysite.com");
    fireEvent.change(box(), { target: { value: "" } });
    expect(latest()).toBe("");
  });

  it("invents no host for something that is not one", () => {
    const { latest } = open();
    fireEvent.change(box(), { target: { value: "@mybakery" } });
    expect(latest()).toBe("@mybakery");
  });

  it("hands the whole address to the mend on leaving the box", () => {
    // `event.target.value` would be the box, which is no longer the address — hence `onCommit`.
    const onCommit = vi.fn();
    open("https://mysite.com", onCommit);
    fireEvent.blur(box());
    expect(onCommit).toHaveBeenCalledWith("https://mysite.com");
  });
});

describe("the line is still one thing to press", () => {
  it("focuses the box when the prefix is pressed", () => {
    // The line used to be the input edge to edge, so anywhere on it took focus. Without this the
    // leading centimetre of every web-address field would quietly stop working.
    open("https://mysite.com");
    fireEvent.pointerDown(document.querySelector("[data-url-scheme]") as Element);
    expect(document.activeElement).toBe(box());
  });
});

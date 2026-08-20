// @vitest-environment jsdom

import { derivePalette, parseHex } from "@linkpage/renderer";
import { cleanup, fireEvent, render as mount, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BRAND_SWATCHES, ColourQuestion } from "./ColourQuestion.js";

/**
 * The one required colour question. `SPEC.md` §3.1, §3.3.
 *
 * **Readability is guaranteed by a constrained colour field rather than by warnings.** The
 * swatches are that field, so the property worth holding is not "the derivation copes" — it
 * copes with anything — but that a colour taken from the field **carries the page as given**.
 * An owner who picks from the swatches never has their colour quietly stepped back into a
 * quieter role, which is what makes "you are never told off for picking one" true rather than
 * merely unenforced.
 */

afterEach(cleanup);

const swatches = (): NodeListOf<HTMLButtonElement> => document.querySelectorAll("[data-swatch]");
const submit = (): HTMLButtonElement =>
  document.querySelector('button[type="submit"]') as HTMLButtonElement;

describe("the constrained field (§3.3)", () => {
  it.each(BRAND_SWATCHES)("$name is a colour", ({ hex }) => {
    expect(parseHex(hex)).not.toBeNull();
  });

  it.each(BRAND_SWATCHES)("$name carries the page as given, in the default mode", ({ hex }) => {
    const palette = derivePalette({
      brand: hex,
      shape: "centred",
      type: "classic",
      corners: 0.6,
      mode: "light",
      advanced: { enabled: false, colors: {} },
    });

    expect(palette.brandSteppedBack).toBe(false);
    expect(palette.buttonFill).toBe(hex);
  });

  it("offers a spread rather than a shade of one thing", () => {
    expect(new Set(BRAND_SWATCHES.map((swatch) => swatch.hex)).size).toBe(BRAND_SWATCHES.length);
  });

  it("names each one exactly once", () => {
    // The names are hand-authored and can only be checked by a person looking (§3.1), which is
    // what `CONTRIBUTING.md` asks for. What a test *can* hold is that no two swatches share a
    // name — the failure an automated pass produced, and the one a reader would not spot.
    expect(new Set(BRAND_SWATCHES.map((swatch) => swatch.name)).size).toBe(BRAND_SWATCHES.length);
    for (const swatch of BRAND_SWATCHES) expect(swatch.name.trim()).not.toBe("");
  });

  it("stores hexes, never names", () => {
    // Names are builder vocabulary and never reach `project.json` (§3.1), which is why changing
    // one is not a schema change.
    for (const swatch of BRAND_SWATCHES) expect(swatch.hex).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe("the question", () => {
  it("cannot be declined — it is the one thing the owner must give (§3.1)", () => {
    mount(<ColourQuestion initial={undefined} onAnswer={vi.fn()} />);

    expect(document.querySelector("[data-escape]")).toBeNull();
    expect(submit().disabled).toBe(true);
  });

  it("answers with the swatch the owner pressed", () => {
    const onAnswer = vi.fn();
    mount(<ColourQuestion initial={undefined} onAnswer={onAnswer} />);

    fireEvent.click(swatches()[3] as Element);
    fireEvent.click(submit());

    expect(onAnswer).toHaveBeenCalledWith(BRAND_SWATCHES[3]?.hex);
  });

  it("honours a hand-typed hex exactly, over the swatch beside it (§3.3)", () => {
    const onAnswer = vi.fn();
    mount(<ColourQuestion initial={undefined} onAnswer={onAnswer} />);

    fireEvent.click(swatches()[0] as Element);
    fireEvent.change(screen.getByLabelText(/exact colour/), { target: { value: "#8A2BE2" } });
    fireEvent.click(submit());

    expect(onAnswer).toHaveBeenCalledWith("#8A2BE2");
  });

  it("says what it cannot use, and blocks nothing (§7.9)", () => {
    // This screen used to be the only one that blocked on the *shape* of an answer: a swatch
    // plus junk in the box killed `Continue` even though a perfectly good answer was selected,
    // with nothing to say the two facts were related. §7.9 decision 1 removed that — our rules
    // go stale and the owner's colour does not.
    const onAnswer = vi.fn();
    mount(<ColourQuestion initial={undefined} onAnswer={onAnswer} />);

    fireEvent.click(swatches()[0] as Element);
    fireEvent.change(screen.getByLabelText(/exact colour/), { target: { value: "#8A2B" } });

    expect(submit().disabled).toBe(false);
    expect(document.querySelector("[data-message]")?.textContent).toContain(
      "This won't change your colour",
    );

    // The swatch stands, which is what the message is explaining.
    fireEvent.click(submit());
    expect(onAnswer).toHaveBeenCalledWith(BRAND_SWATCHES[0]?.hex);
  });

  it("still waits when junk is the only thing there", () => {
    // Not a shape judgement: there is simply no answer yet, which is `Continue`'s one meaning.
    mount(<ColourQuestion initial={undefined} onAnswer={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/exact colour/), { target: { value: "banana" } });
    expect(submit().disabled).toBe(true);
  });

  it("names the colour it has, under the grid (§3.1)", () => {
    mount(<ColourQuestion initial={undefined} onAnswer={vi.fn()} />);
    expect(screen.queryByText(/Your colour:/)).toBeNull();

    fireEvent.click(swatches()[1] as Element);
    expect(screen.getByText(/Your colour:/).textContent).toBe("Your colour: Raspberry");
  });

  it("quotes a typed colour back rather than telling the owner what it is called", () => {
    // Naming our palette is a claim we can check; naming theirs is asserting something about
    // their brand, which is §7.3 at its sharpest (§3.1).
    mount(<ColourQuestion initial={undefined} onAnswer={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/exact colour/), { target: { value: "#7a5c3e" } });
    expect(screen.getByText(/Your colour:/).textContent).toBe("Your colour: #7a5c3e");
  });

  it("names a typed colour that happens to be one of ours", () => {
    // §3.1: naming is a property of the colour, not of how it arrived. Nothing is stored about
    // whether a hex was picked or typed, and calling a typed `#c2185b` *Raspberry* is still a
    // claim about our own twelve — which is exactly the claim we can check.
    mount(<ColourQuestion initial={undefined} onAnswer={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/exact colour/), { target: { value: "#c2185b" } });
    expect(screen.getByText(/Your colour:/).textContent).toBe("Your colour: Raspberry");
  });

  it("names each swatch to a screen reader, rather than reading out a code", () => {
    mount(<ColourQuestion initial={undefined} onAnswer={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Raspberry" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cocoa" })).toBeTruthy();
  });

  it("stops teaching notation in the hint, and names who the field is for", () => {
    mount(<ColourQuestion initial={undefined} onAnswer={vi.fn()} />);
    const box = screen.getByLabelText(/exact colour/) as HTMLInputElement;
    expect(box.placeholder).toBe("#c2185b");
    expect(document.querySelector("[data-hint]")?.textContent).toBe(
      "From a designer or a brand guide.",
    );
  });

  it("comes back holding the colour a file already had (§4.4)", () => {
    mount(<ColourQuestion initial="#123456" onAnswer={vi.fn()} />);

    expect((screen.getByLabelText(/exact colour/) as HTMLInputElement).value).toBe("#123456");
    expect(submit().disabled).toBe(false);
  });
});

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
  it.each(BRAND_SWATCHES)("%s is a colour", (colour) => {
    expect(parseHex(colour)).not.toBeNull();
  });

  it.each(BRAND_SWATCHES)("%s carries the page as given, in the default mode", (brand) => {
    const palette = derivePalette({
      brand,
      shape: "centred",
      type: "classic",
      corners: 0.6,
      mode: "light",
      advanced: { enabled: false, colors: {} },
    });

    expect(palette.brandSteppedBack).toBe(false);
    expect(palette.buttonFill).toBe(brand);
  });

  it("offers a spread rather than a shade of one thing", () => {
    expect(new Set(BRAND_SWATCHES).size).toBe(BRAND_SWATCHES.length);
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

    expect(onAnswer).toHaveBeenCalledWith(BRAND_SWATCHES[3]);
  });

  it("honours a hand-typed hex exactly, over the swatch beside it (§3.3)", () => {
    const onAnswer = vi.fn();
    mount(<ColourQuestion initial={undefined} onAnswer={onAnswer} />);

    fireEvent.click(swatches()[0] as Element);
    fireEvent.change(screen.getByLabelText(/exact colour/), { target: { value: "#8A2BE2" } });
    fireEvent.click(submit());

    expect(onAnswer).toHaveBeenCalledWith("#8A2BE2");
  });

  it("waits rather than writing the swatch under a half-typed hex", () => {
    mount(<ColourQuestion initial={undefined} onAnswer={vi.fn()} />);

    fireEvent.click(swatches()[0] as Element);
    fireEvent.change(screen.getByLabelText(/exact colour/), { target: { value: "#8A2B" } });
    expect(submit().disabled).toBe(true);
    // A format hint, not a judgement about the colour: §3.3's promise is about contrast.
    expect(screen.getByText(/A colour looks like/)).toBeTruthy();
  });

  it("comes back holding the colour a file already had (§4.4)", () => {
    mount(<ColourQuestion initial="#123456" onAnswer={vi.fn()} />);

    expect((screen.getByLabelText(/exact colour/) as HTMLInputElement).value).toBe("#123456");
    expect(submit().disabled).toBe(false);
  });
});

import { safeUrl } from "@linkpage/renderer";
import { describe, expect, it } from "vitest";
import { EXPECTED_SCHEME, splitWebAddress, typedWebAddress } from "./webAddress.js";

/**
 * What the permanent `https://` prefix means for the *value* (design change 10, finding B-55).
 *
 * A prefix that only changed the picture would leave the paste case exactly as broken as it was:
 * the owner pastes `https://mysite.com` into a field already showing `https://` and gets a
 * doubled scheme. So the prefix is not decoration — it is one half of the value, and this file
 * is the whole of that half.
 *
 * The three rules it holds:
 *
 * 1. **An empty box is an empty answer.** Never a bare `https://`, which would sail past every
 *    `url.trim() === ""` gate in the flow and put a link to nothing on the page.
 * 2. **A scheme in the box is absorbed by the prefix**, whichever of §5.3's four it is, so
 *    `https://https://` cannot be produced by pasting and `http://` cannot be quietly upgraded.
 * 3. **Nothing is invented.** A value without a scheme is only given one where the renderer's own
 *    `linkHref` would give it one — the host gate — so `@handle` and `/menu` stay exactly as the
 *    owner typed them and §7.9's mark still has their text to point at.
 */

describe("what the line reads", () => {
  it("shows the scheme the field expects when the value carries none", () => {
    expect(splitWebAddress("")).toEqual({ scheme: "https://", rest: "" });
    expect(splitWebAddress("mysite.com/menu")).toEqual({
      scheme: "https://",
      rest: "mysite.com/menu",
    });
  });

  it("takes the scheme out of the box when the value carries one", () => {
    // This is the whole point: an existing project's addresses are stored mended (§7.9
    // decision 4), so every one of them arrives with `https://` already on the front.
    expect(splitWebAddress("https://mysite.com/menu")).toEqual({
      scheme: "https://",
      rest: "mysite.com/menu",
    });
  });

  it("shows the scheme the value actually has, never the one we would have preferred", () => {
    // `linkHref` leaves an http-only owner alone on purpose. A prefix hard-coded to `https://`
    // would read `https://http://legacy.example` on that owner's screen.
    expect(splitWebAddress("http://legacy.example")).toEqual({
      scheme: "http://",
      rest: "legacy.example",
    });
    expect(splitWebAddress("mailto:hello@mysite.com")).toEqual({
      scheme: "mailto:",
      rest: "hello@mysite.com",
    });
    expect(splitWebAddress("tel:+441234567890")).toEqual({
      scheme: "tel:",
      rest: "+441234567890",
    });
  });

  it("leaves a scheme the export would refuse in the box, where it can be seen", () => {
    // Hiding it behind the prefix would be the one place this component could help a value
    // through that invariant 1 exists to refuse.
    expect(splitWebAddress("javascript:alert(1)")).toEqual({
      scheme: EXPECTED_SCHEME,
      rest: "javascript:alert(1)",
    });
  });

  it("only ever shows a scheme the exported page can use", () => {
    // The list is written here rather than imported because the renderer keeps its own private;
    // this is the assertion that stops the two drifting apart unnoticed.
    for (const value of [
      "https://mysite.com",
      "http://mysite.com",
      "mailto:hello@mysite.com",
      "tel:+441234567890",
    ]) {
      expect(safeUrl(value), `${value} must survive the export's own gate`).toBe(value);
      // Shown, rather than left in the box: the value really does start with what the line reads.
      expect(value.startsWith(splitWebAddress(value).scheme)).toBe(true);
    }
  });

  it("is not fooled by a colon further into the address", () => {
    expect(splitWebAddress("https://mysite.com/a:b")).toEqual({
      scheme: "https://",
      rest: "mysite.com/a:b",
    });
  });
});

describe("what typing in the box means for the value", () => {
  it("mends a bare domain on the way in, invisibly, because the prefix already said so", () => {
    // The mend §7.9 decision 4 shows is now shown *in advance*: the line read
    // `https://mysite.com/menu` from the first keystroke, so nothing jumps afterwards.
    expect(typedWebAddress("", "mysite.com/menu")).toBe("https://mysite.com/menu");
  });

  it("invents nothing for text that is not a host", () => {
    // `linkHref`'s rule, and the reason this delegates to it rather than prepending: a naive
    // prepend does not produce dead links, it produces confident links to the wrong host.
    expect(typedWebAddress("", "@mybakery")).toBe("@mybakery");
    expect(typedWebAddress("", "/menu")).toBe("/menu");
    expect(typedWebAddress("", "mysite")).toBe("mysite");
  });

  it("absorbs a pasted scheme instead of doubling it", () => {
    // The defect the change list names: paste the address you copied from your browser.
    expect(typedWebAddress("", "https://mysite.com/menu")).toBe("https://mysite.com/menu");
    expect(splitWebAddress(typedWebAddress("", "https://mysite.com/menu")).rest).toBe(
      "mysite.com/menu",
    );
    expect(typedWebAddress("https://old.example", "https://mysite.com")).toBe("https://mysite.com");
  });

  it("absorbs a scheme the owner types out, character by character", () => {
    // Half-typed, the scheme is just text; complete, it belongs to the prefix and the box empties.
    expect(typedWebAddress("", "https:/")).toBe("https:/");
    expect(typedWebAddress("https:/", "https://")).toBe("");
    expect(typedWebAddress("", "http://legacy.example")).toBe("http://legacy.example");
  });

  it("keeps the scheme the value already carried while the box still looks like a host", () => {
    // Editing the path of an http-only address must not silently upgrade it.
    expect(typedWebAddress("http://legacy.example", "legacy.example/menu")).toBe(
      "http://legacy.example/menu",
    );
    expect(typedWebAddress("https://mysite.com", "mysite.com/menu")).toBe(
      "https://mysite.com/menu",
    );
  });

  it("does not carry a scheme onto text that is not a host", () => {
    // Otherwise replacing a real address with a handle produces `https://@mybakery` — a confident
    // link to a host that does not exist, which is exactly what the host gate exists to refuse.
    expect(typedWebAddress("https://mysite.com", "@mybakery")).toBe("@mybakery");
  });

  it("keeps a mailto or tel prefix without asking whether the rest is a host", () => {
    // An email address is not a host and never will be; the gate is about the two web schemes.
    expect(typedWebAddress("mailto:hello@mysite.com", "orders@mysite.com")).toBe(
      "mailto:orders@mysite.com",
    );
    expect(typedWebAddress("tel:+44123", "+441234567890")).toBe("tel:+441234567890");
  });

  it("empties the answer when the box is emptied", () => {
    // A bare `https://` would pass `url.trim() === ""` — the gate that keeps Continue unavailable
    // and keeps a button off the page — and then link the visitor nowhere.
    expect(typedWebAddress("https://mysite.com", "")).toBe("");
    expect(typedWebAddress("mailto:hello@mysite.com", "")).toBe("");
    expect(typedWebAddress("", "https://")).toBe("");
  });

  it("leaves a typed space alone, so an address can still be edited through one", () => {
    // `linkHref` trims; this must not, or the space the owner is in the middle of typing is
    // eaten as they type it. The trim belongs to the mend on leaving the box, where it always
    // was — so the scheme goes on the front and the space survives until then.
    expect(typedWebAddress("", "mysite.com ")).toBe("https://mysite.com ");
    expect(splitWebAddress(typedWebAddress("", "mysite.com ")).rest).toBe("mysite.com ");
    expect(typedWebAddress("", "my site.com")).toBe("my site.com");
  });

  it("round-trips: what the line reads is what the value is", () => {
    for (const value of [
      "https://mysite.com/menu",
      "http://legacy.example",
      "mailto:hello@mysite.com",
      "@mybakery",
      "",
    ]) {
      const { rest } = splitWebAddress(value);
      expect(
        typedWebAddress(value, rest),
        `${value} must survive being re-typed as it stands`,
      ).toBe(value);
    }
  });
});

// @vitest-environment jsdom

import { cleanup, fireEvent, render as mount, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "./App.js";
import { PROJECT_STORAGE_KEY, type StorageLike } from "./project/index.js";

/**
 * The seam, end to end. `SPEC.md` §7.1.
 *
 * > **The flow is the empty state; the review list is the editing screen. They are the same
 * > product at two moments.**
 *
 * Everything below is one claim: which screen the owner gets is decided by what is in the
 * project, and nothing else. There is no "have they seen the wizard" flag, no first-run
 * marker, and nothing to keep in step — which is why coming back a month later opens the list
 * and ticking a section opens the flow, without either being a case anybody wrote.
 */

afterEach(cleanup);

/**
 * The one project, somewhere the test owns.
 *
 * Handed to `App` rather than reached for as a global: Node 26 ships a `localStorage` of its
 * own that shadows jsdom's and answers `undefined`, so the ambient one is a different object
 * depending on which runtime CI picked. This is also what makes "a month later" expressible —
 * the storage outlives the mount, which is the whole of what a second visit is.
 */
function memory(): StorageLike {
  const entries = new Map<string, string>();
  return {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => void entries.set(key, value),
    removeItem: (key) => void entries.delete(key),
  };
}

let storage: StorageLike;
beforeEach(() => {
  storage = memory();
});

const title = (): string => screen.getByRole("heading", { level: 1 }).textContent ?? "";
const submit = (): Element => document.querySelector(".question__submit") as Element;
const escapeButton = (): Element | null => document.querySelector(".question__escape");

/** Walk a first run, declining everything optional. */
function firstRun(name = "Ada's Bakery"): void {
  fireEvent.click(screen.getByRole("button", { name: /Food & drink/ }));
  fireEvent.change(screen.getByLabelText(/Business name/), { target: { value: name } });
  fireEvent.click(submit());
  for (let guard = 0; guard < 20; guard += 1) {
    if (title() === "What's your colour?") {
      fireEvent.click(document.querySelectorAll(".swatches__swatch")[0] as Element);
      fireEvent.click(submit());
      continue;
    }
    const escape = escapeButton();
    if (escape === null) break;
    fireEvent.click(escape);
  }
}

describe("which screen the owner gets", () => {
  it("opens on the preset question when there is nothing stored (§7.8)", () => {
    mount(<App storage={storage} />);

    expect(title()).toBe("What kind of business is this?");
    expect(screen.getByText(/Already have a project file/)).toBeTruthy();
  });

  it("lands on the list when the questions run out, and stays there on the next visit", () => {
    mount(<App storage={storage} />);
    firstRun();
    expect(title()).toBe("Ada's Bakery");

    // A month later. The project came back from storage, so the list opens — not the flow.
    cleanup();
    mount(<App storage={storage} />);
    expect(title()).toBe("Ada's Bakery");
    expect(screen.queryByText(/Already have a project file/)).toBeNull();
  });

  it("re-enters the flow for a section ticked on the list, and returns to it (§7.1)", () => {
    mount(<App storage={storage} />);
    firstRun();

    // "An owner who skipped opening hours and comes back to add them ticks the box, and the
    // flow picks them up and walks them through hours, then puts them back on the list."
    fireEvent.click(screen.getByRole("button", { name: "Opening hours" }));
    expect(title()).toBe("When are you open?");
    expect(screen.queryByText("What kind of business is this?")).toBeNull();

    fireEvent.change(screen.getByLabelText("Monday"), { target: { value: "closed" } });
    fireEvent.click(submit());

    expect(title()).toBe("Ada's Bakery");
    // Answered, so it is no longer territory the owner has not covered.
    expect(screen.queryByRole("button", { name: "Opening hours" })).toBeNull();
  });

  it("leaves the list unchanged when the owner declines the thing they ticked", () => {
    mount(<App storage={storage} />);
    firstRun();
    const before = storage.getItem(PROJECT_STORAGE_KEY);

    fireEvent.click(screen.getByRole("button", { name: "Address" }));
    fireEvent.click(escapeButton() as Element);

    expect(title()).toBe("Ada's Bakery");
    expect(storage.getItem(PROJECT_STORAGE_KEY)).toBe(before);
    // Still on offer, because a declined section is not a section (§7.1).
    expect(screen.getByRole("button", { name: "Address" })).toBeTruthy();
  });

  it("collects what an imported file is missing instead of reporting it (§4.6)", () => {
    // A hand-written file with no colour: exactly the territory the flow exists for.
    storage.setItem(
      PROJECT_STORAGE_KEY,
      JSON.stringify({ version: 1, lang: "en-GB", header: { name: "Ada's Bakery" } }),
    );
    mount(<App storage={storage} />);

    expect(title()).toBe("What's your colour?");
    expect(document.querySelector(".quiet-line__error")).toBeNull();

    fireEvent.click(document.querySelectorAll(".swatches__swatch")[0] as Element);
    fireEvent.click(submit());
    expect(title()).toBe("Ada's Bakery");
  });

  it("shows what a file arrived without as ordinary rows (§4.3)", () => {
    // A hand-written file with the two required answers and nothing else: `lang` comes from
    // the browser (§4.1) and the five structural style controls take their defaults. Neither
    // is announced — but §4.3's rule is that a field defaulted on load is on the list, so the
    // way to find out is the product's normal surface rather than a dialog that fires once.
    storage.setItem(
      PROJECT_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        header: { name: "Ada's Bakery" },
        style: { brand: "#c2185b" },
      }),
    );
    mount(<App storage={storage} />);

    expect(title()).toBe("Ada's Bakery");
    expect(screen.getByRole("button", { name: /^How it looks/ }).textContent).toContain("Centred");

    const language = screen.getByRole("button", { name: /^Page language/ });
    expect(language.textContent).toContain(navigator.language);
    // Silently, and permanently the moment the file opens — which is safe because the upgrade
    // only ever adds defaults for things that were absent.
    expect(JSON.parse(storage.getItem(PROJECT_STORAGE_KEY) ?? "{}")).toMatchObject({
      lang: navigator.language,
    });
  });

  it("re-enters the flow for another link button, and lands back on the list (§7.1)", () => {
    mount(<App storage={storage} />);
    firstRun();

    fireEvent.click(screen.getByRole("button", { name: "Link buttons" }));
    expect(title()).toBe("Which of these do you have?");

    fireEvent.change(screen.getByLabelText("Something else"), { target: { value: "Our menu" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    fireEvent.click(submit());
    fireEvent.change(screen.getByLabelText("Web address"), {
      target: { value: "https://ada.example/menu" },
    });
    fireEvent.click(submit());

    expect(title()).toBe("Ada's Bakery");
    // And it is a row now, with the answer in it, rather than a tick-on.
    expect(screen.getByRole("button", { name: /^Link buttons\s*Our menu/ })).toBeTruthy();
  });

  it("autosaves each answer as it is given, not at the end", () => {
    mount(<App storage={storage} />);
    fireEvent.click(screen.getByRole("button", { name: /Food & drink/ }));

    // A preset is not an answer about the business, so nothing has been stored yet (§7.3).
    expect(storage.getItem(PROJECT_STORAGE_KEY)).toBeNull();

    fireEvent.change(screen.getByLabelText(/Business name/), { target: { value: "Ada's" } });
    fireEvent.click(submit());

    expect(JSON.parse(storage.getItem(PROJECT_STORAGE_KEY) ?? "{}")).toMatchObject({
      header: { name: "Ada's" },
    });
  });
});

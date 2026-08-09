// @vitest-environment jsdom

import { act, cleanup, fireEvent, render as mount, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "./App.js";
import { installDownloads, type FakeDownloads } from "./download/downloads.testing.js";
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

/**
 * Download, from the button on the list to the bytes the browser is handed. `SPEC.md` §7.7.
 *
 * The sheet's own copy and order are held in `download/download.test.tsx`. What is worth
 * asserting *here* is the only part neither of those files can see on its own: that the button
 * §7.4 puts on the list is connected to the sheet, and that pressing the sheet's page button
 * produces the page **this owner just built** — not a fixture, and not a second rendering of it.
 */
describe("download, end to end (§7.7)", () => {
  let downloads: FakeDownloads;
  beforeEach(() => {
    downloads = installDownloads();
  });
  afterEach(() => downloads.restore());

  it("writes the owner's own page from the list's Download button", async () => {
    mount(<App storage={storage} />);
    firstRun("Ada & Sons <Bakers>");

    fireEvent.click(screen.getByRole("button", { name: "Download" }));

    // The sheet, in §7.7's order: the page, then the project file.
    expect(screen.getAllByRole("heading", { level: 3 }).map((node) => node.textContent)).toEqual([
      "Put your page online",
      "Keep a copy of your work",
    ]);

    fireEvent.click(screen.getByRole("button", { name: "Download index.html" }));

    expect(downloads.written).toHaveLength(1);
    expect(downloads.written[0]?.filename).toBe("index.html");
    // The owner's name, escaped the way the export escapes it — so this is the file they built
    // and not a page assembled a second time on the way to disk (§5.2).
    const text = (await downloads.written[0]?.blob?.text()) ?? "";
    expect(text.startsWith("<!doctype html>")).toBe(true);
    expect(text).toContain("Ada &amp; Sons &lt;Bakers&gt;");
  });

  it("leaves the list where it was when the sheet is closed", () => {
    mount(<App storage={storage} />);
    firstRun();

    fireEvent.click(screen.getByRole("button", { name: "Download" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(title()).toBe("Ada's Bakery");
  });

  it("writes the owner's project file under §7.7's name for it", async () => {
    mount(<App storage={storage} />);
    firstRun("Ada's Bakery");
    fireEvent.click(screen.getByRole("button", { name: "Download" }));

    // The consequence sentence is the point of section two, and the name is what the owner has
    // to recognise a month later in a folder where `index.html` is anonymous.
    expect(document.body.textContent).toContain(
      "if you lose it, you’d have to build your page again from scratch",
    );
    fireEvent.click(screen.getByRole("button", { name: "Download adas-bakery.linkpage.json" }));

    expect(downloads.written).toHaveLength(1);
    expect(downloads.written[0]?.filename).toBe("adas-bakery.linkpage.json");
    expect(downloads.written[0]?.blob?.type).toBe("application/json");
    // The exact bytes in storage — so what the owner keeps is what a reload would read, and
    // opening it again is a no-op rather than a re-formatting (§4.5).
    expect(await downloads.written[0]?.blob?.text()).toBe(storage.getItem(PROJECT_STORAGE_KEY));
  });
});

/**
 * Opening a project you already have, from both doorways. `SPEC.md` §7.8, §7.9, §4.6.
 *
 * > **Import always replaces. It never merges.**
 *
 * The pieces are held apart in `open/open.test.tsx` — what the confirmation says, what the escape
 * writes, what a refusal shows. What only exists here is the wiring, and the two claims that are
 * about the whole application rather than about any component in it:
 *
 * 1. **Which branch of §7.8 a picked file takes is decided by the project, not by the control.**
 *    The quiet line always opens immediately because the screen carrying it is the screen with
 *    nothing to lose; the menu always confirms because the list only exists once there is a
 *    project. Neither is a rule anybody wrote down twice.
 * 2. **A refusal leaves the existing project exactly where it was** — asserted against the bytes
 *    in storage, because "untouched" is a claim about the file and not about the screen.
 */
describe("opening a project you already have (§7.8, §7.9)", () => {
  let downloads: FakeDownloads;
  beforeEach(() => {
    downloads = installDownloads();
  });
  afterEach(() => downloads.restore());

  /** A project file as we write them, so seeding storage and picking a file agree on the bytes. */
  const projectJson = (project: object): string => `${JSON.stringify(project, null, 2)}\n`;

  const ADAS = {
    version: 1,
    lang: "en-GB",
    style: { brand: "#c2185b" },
    header: { name: "Ada's Bakery" },
    hours: { days: { mon: [["07:00", "14:00"]] } },
  };

  const BOS = {
    version: 1,
    lang: "en-GB",
    style: { brand: "#1a3ea8" },
    header: { name: "Bo's Books" },
  };

  /** Hand the OS picker's answer to whichever screen is showing. */
  async function pick(text: string, filename = "project.json"): Promise<void> {
    const input = screen.getByLabelText("Open a project file");
    await act(async () => {
      fireEvent.change(input, {
        target: { files: [new File([text], filename, { type: "application/json" })] },
      });
    });
  }

  /** Open the list's menu and reach for a file, as the owner does. */
  function openTheMenu(): void {
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Open a project file…" }));
  }

  const confirmation = (): string => document.querySelector(".replace")?.textContent ?? "";

  describe("the quiet line, with nothing to lose", () => {
    it("opens the file immediately, with no confirmation (§7.8)", async () => {
      mount(<App storage={storage} />);
      expect(title()).toBe("What kind of business is this?");

      await pick(projectJson(ADAS));

      // The majority path: a second device, an empty browser, an owner holding a file. Nothing
      // is at risk, so nothing is asked.
      expect(title()).toBe("Ada's Bakery");
      expect(confirmation()).toBe("");
      expect(JSON.parse(storage.getItem(PROJECT_STORAGE_KEY) ?? "{}")).toMatchObject({
        header: { name: "Ada's Bakery" },
      });
    });

    it("opens a file whose name says nothing about it (§7.7)", async () => {
      mount(<App storage={storage} />);

      // Import validates by content, not by filename. A renamed file still opens.
      await pick(projectJson(ADAS), "backup (3).txt");
      expect(title()).toBe("Ada's Bakery");
    });

    it("refuses in place, with the preset question above it untouched (§7.9)", async () => {
      mount(<App storage={storage} />);

      await pick("{ this is not a file");

      const message = document.querySelector(".quiet-line__error")?.textContent ?? "";
      expect(message).toContain("This file appears to be damaged.");
      // Never a modal, never a navigation: the next action is pick again, and in place makes
      // that one press rather than dismiss → re-find the control → re-open the picker.
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(title()).toBe("What kind of business is this?");
      expect(screen.getByRole("button", { name: /Food & drink/ })).toBeTruthy();
      expect(storage.getItem(PROJECT_STORAGE_KEY)).toBeNull();
    });

    it("clears the message by picking again, which is the whole recovery (§7.9)", async () => {
      mount(<App storage={storage} />);

      await pick("[1, 2, 3]");
      expect(document.querySelector(".quiet-line__error")?.textContent).toContain(
        "This doesn't look like a linkpage file.",
      );

      await pick(projectJson(ADAS));
      expect(title()).toBe("Ada's Bakery");
      expect(document.querySelector(".quiet-line__error")).toBeNull();
    });

    it("says nothing at all about a file that is only missing things (§4.6)", async () => {
      mount(<App storage={storage} />);

      // No `style.brand`: exactly the territory the flow exists for. No error, no repair dialog,
      // no invented default — the owner is walked through the colour question instead.
      await pick(projectJson({ version: 1, lang: "en", header: { name: "Ada's Bakery" } }));

      expect(title()).toBe("What's your colour?");
      expect(document.querySelector(".quiet-line__error")).toBeNull();
      expect(document.querySelector(".refusal")).toBeNull();
    });
  });

  describe("the list's menu, with a project to lose", () => {
    beforeEach(() => {
      storage.setItem(PROJECT_STORAGE_KEY, projectJson(ADAS));
      mount(<App storage={storage} />);
    });

    it("confirms by name, and changes nothing until it is answered (§7.8)", async () => {
      const before = storage.getItem(PROJECT_STORAGE_KEY);
      openTheMenu();

      await pick(projectJson(BOS));

      expect(confirmation()).toContain(
        "You’re working on Ada's Bakery. Opening this file will replace it.",
      );
      expect(title()).toBe("Ada's Bakery");
      expect(storage.getItem(PROJECT_STORAGE_KEY)).toBe(before);
    });

    it("replaces on the press that says so, and never merges (§7.8)", async () => {
      openTheMenu();
      await pick(projectJson(BOS));
      fireEvent.click(screen.getByRole("button", { name: "Open the file" }));

      expect(title()).toBe("Bo's Books");
      // Ada's opening hours are gone rather than carried across: whose name wins and which hours
      // are real have no answer behind a one-page file, so there is no merge to get wrong.
      expect(screen.getByRole("button", { name: "Opening hours" })).toBeTruthy();
      expect(JSON.parse(storage.getItem(PROJECT_STORAGE_KEY) ?? "{}")).not.toHaveProperty("hours");
    });

    it("offers to download the outgoing project first — both paths safe (§7.8)", async () => {
      const before = storage.getItem(PROJECT_STORAGE_KEY);
      openTheMenu();
      await pick(projectJson(BOS));

      fireEvent.click(screen.getByRole("button", { name: "Download my work first" }));

      // §7.7's name for it, and the outgoing bytes — not the incoming ones.
      expect(downloads.written[0]?.filename).toBe("adas-bakery.linkpage.json");
      expect(await downloads.written[0]?.blob?.text()).toBe(before);
      // And it has not opened anything: the escape and the replacement are two presses.
      expect(title()).toBe("Ada's Bakery");

      fireEvent.click(screen.getByRole("button", { name: "Open the file" }));
      expect(title()).toBe("Bo's Books");
    });

    it("keeps what is there when the confirmation is cancelled, and downloads nothing", async () => {
      const before = storage.getItem(PROJECT_STORAGE_KEY);
      openTheMenu();
      await pick(projectJson(BOS));

      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

      expect(confirmation()).toBe("");
      expect(title()).toBe("Ada's Bakery");
      expect(storage.getItem(PROJECT_STORAGE_KEY)).toBe(before);
      // No silent auto-download either: the same preservation without consent (§7.8).
      expect(downloads.written).toEqual([]);
    });

    it("leaves the existing project untouched when a file is refused (§4.6, §7.9)", async () => {
      const before = storage.getItem(PROJECT_STORAGE_KEY);
      openTheMenu();

      await pick("<!doctype html>\n<html>…", "index.html");

      // The most likely mistake in the room: they grabbed `index.html` instead of the project
      // file. Nothing was parsed far enough to touch anything, so there is nothing to restore.
      expect(storage.getItem(PROJECT_STORAGE_KEY)).toBe(before);
      expect(title()).toBe("Ada's Bakery");
      expect(confirmation()).toBe("");
      // Ada's hours are still hers: the row is a row, not a tick-on offering to add them.
      expect(screen.queryByRole("button", { name: "Opening hours" })).toBeNull();
    });

    it("puts the refusal in the menu's own surface, not in a modal (§7.9)", async () => {
      openTheMenu();
      await pick("{ this is not a file");

      const panel = document.querySelector(".list__menu-panel");
      expect(panel?.textContent).toContain("This file appears to be damaged.");
      expect((panel as HTMLElement).hidden).toBe(false);
      expect(screen.queryByRole("dialog")).toBeNull();
      // The project is intact behind it — the list, its rows and the preview are all still there.
      expect(title()).toBe("Ada's Bakery");
      expect(document.querySelectorAll(".list__row").length).toBeGreaterThan(0);
    });

    it("puts the technical half behind a disclosure, closed (§4.6)", async () => {
      openTheMenu();
      await pick('{"version": 99}');

      expect(document.querySelector(".refusal__message")?.textContent).toContain(
        "This page was made with a newer version of linkpage",
      );
      const disclosure = document.querySelector(".refusal__detail") as HTMLDetailsElement;
      expect(disclosure.open).toBe(false);
      expect(disclosure.textContent).toContain("Technical detail");
    });

    it("recovers by picking again, straight from the refusal (§7.9)", async () => {
      openTheMenu();
      await pick("{ this is not a file");
      expect(document.querySelector(".refusal")).not.toBeNull();

      await pick(projectJson(BOS));

      // The message is gone and the confirmation has taken its place: pick again, and the fork
      // is where it always was.
      expect(document.querySelector(".refusal")).toBeNull();
      expect(confirmation()).toContain("Opening this file will replace it.");
    });
  });
});

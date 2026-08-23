// @vitest-environment jsdom

import { cleanup, fireEvent, render as mount, screen } from "@testing-library/react";
import { useState, type JSX, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { POPULATED } from "../fixtures.js";
import type { Topic } from "../flow/topics.js";
import type { Draft } from "../project/index.js";
import { List } from "./List.js";

/**
 * The review list, driven by pressing things. `SPEC.md` §7.4, §7.5, §7.1, §3.4, §7.7.
 *
 * What is worth a DOM here is what only exists once somebody is using it: that every answer is
 * reachable as a row, that the arrows reorder and the top slot says why it matters, that the
 * advanced readout reports without stopping anything, and that a row's escape takes the section
 * off the page rather than leaving an empty one. The partition behind the rows is held without
 * a DOM in `rows.test.ts`, and the writes in `edits.test.ts`.
 */

afterEach(cleanup);

/** The list with a draft that moves, which is what makes a round trip expressible. */
function editing(
  initial: Draft = POPULATED,
  props: {
    onAdd?: (topic: Topic) => void;
    onDownload?: () => void;
    onImport?: () => void;
    importConfirm?: ReactNode;
    importError?: ReactNode;
  } = {},
) {
  const seen: Draft[] = [];

  function Harness(): JSX.Element {
    const [draft, setDraft] = useState<Draft>(initial);
    return (
      <List
        draft={draft}
        onChange={(next) => {
          seen.push(next);
          setDraft(next);
        }}
        onAdd={props.onAdd ?? (() => {})}
        {...(props.onDownload === undefined ? {} : { onDownload: props.onDownload })}
        {...(props.onImport === undefined ? {} : { onImport: props.onImport })}
        {...(props.importConfirm === undefined ? {} : { importConfirm: props.importConfirm })}
        {...(props.importError === undefined ? {} : { importError: props.importError })}
      />
    );
  }

  mount(<Harness />);
  return { seen, latest: (): Draft | undefined => seen[seen.length - 1] };
}

const rowIds = (): string[] =>
  [...document.querySelectorAll("[data-row]")].map((row) => row.getAttribute("data-row") ?? "");

const openRow = (name: RegExp): void => {
  fireEvent.click(screen.getByRole("button", { name, expanded: false }));
};

describe("every answer is a row (§7.4)", () => {
  it("renders every section the page has, with the page beside it", () => {
    editing();

    expect(rowIds()).toEqual([
      "businessName",
      "tagline",
      "logo",
      "links",
      "hours",
      "contact",
      "address",
      "social",
      "style",
      "lang",
    ]);
    // #32's drawer, not a second one — and on the list it lands open (§7.6, #147), so the one
    // control reads as the way into editing rather than the way to the page.
    expect(screen.getByRole("button", { name: "Edit your page" })).toBeTruthy();
  });

  it("shows the answer in the row, not just its name", () => {
    editing();
    expect(screen.getByRole("button", { name: /^Address\s*12 Mill Lane/ })).toBeTruthy();
  });

  it("opens the flow's own question rather than a second form for the same section", () => {
    editing();
    openRow(/^Opening hours/);

    // The hours question, as the flow asks it — an `<h2>` under the list's own title, and a
    // button that says Save rather than Continue.
    expect(screen.getByRole("heading", { level: 2, name: "When are you open?" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Ada & Sons <Bakers>");
    expect(screen.getByRole("button", { name: "Save" })).toBeTruthy();
  });

  it("takes a section off the page when its escape is used, and offers it again (§7.1)", () => {
    const { latest } = editing();
    openRow(/^Phone and email/);

    fireEvent.click(screen.getByRole("button", { name: "Not on my page" }));

    expect(latest()?.contact).toBeUndefined();
    expect(rowIds()).not.toContain("contact");
    // Removing and never having are one state: it is back among the tick-ons.
    expect(screen.getByRole("button", { name: "Phone and email" })).toBeTruthy();
  });

  it("hands a ticked topic to the flow rather than parking an empty row (§7.1)", () => {
    const onAdd = vi.fn();
    const { seen } = editing({ ...POPULATED, social: [] }, { onAdd });

    fireEvent.click(screen.getByRole("button", { name: "Social accounts" }));

    expect(onAdd).toHaveBeenCalledWith("social");
    // Nothing was written: the flow is what fills a section in.
    expect(seen).toEqual([]);
  });

  it("saves an edited answer through the flow's own door", () => {
    const { latest } = editing();
    openRow(/^A line about what you do/);

    fireEvent.change(screen.getByLabelText("Tagline"), { target: { value: "Very good coffee" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(latest()?.header.tagline).toBe("Very good coffee");
    expect(screen.getByRole("button", { name: /Very good coffee/ })).toBeTruthy();
  });
});

describe("the link buttons (§7.5)", () => {
  it("marks the first as the one most people will tap", () => {
    editing();
    openRow(/^Link buttons/);

    const marks = document.querySelectorAll("[data-mark]");
    expect(marks).toHaveLength(1);
    expect(document.querySelectorAll("[data-button-row]")[0]?.contains(marks[0] ?? null)).toBe(
      true,
    );
    expect(marks[0]?.textContent).toMatch(/most people will tap/i);
  });

  it("reorders with up and down arrows, and offers no drag at all", () => {
    const { latest } = editing();
    openRow(/^Link buttons/);

    fireEvent.click(screen.getByRole("button", { name: "Move Order for pickup up" }));

    expect(latest()?.links.map((link) => link.label)).toEqual(["Order for pickup", "See the menu"]);
    // The mark follows the top slot, because the mark *is* the top slot (§2.3).
    expect(document.querySelectorAll("[data-button-row]")[0]?.textContent).toContain(
      "Most people will tap this one",
    );
    expect(document.querySelectorAll("[draggable='true']")).toHaveLength(0);
  });

  it("gives the ends no arrow to press", () => {
    editing();
    openRow(/^Link buttons/);

    expect(screen.getByRole("button", { name: "Move See the menu up" })).toHaveProperty(
      "disabled",
      true,
    );
    expect(screen.getByRole("button", { name: "Move Order for pickup down" })).toHaveProperty(
      "disabled",
      true,
    );
  });

  it("mends a web address on leaving the box, shown where it was typed (§7.9, #142)", () => {
    // This editor has no Continue — leaving the box is "done answering" on it. Mid-typing is
    // untouched: mending under the owner's fingers is the told-off feeling #142 removes.
    const { latest } = editing();
    openRow(/^Link buttons/);

    const url = screen.getAllByLabelText("Where it goes")[0] as HTMLInputElement;
    fireEvent.change(url, { target: { value: "mysite.com/menu" } });
    expect(url.value).toBe("mysite.com/menu");

    fireEvent.blur(url);
    expect(url.value).toBe("https://mysite.com/menu");
    expect(latest()?.links[0]?.url).toBe("https://mysite.com/menu");
  });

  it("keeps a button out of the page until it has a URL (§7.3)", () => {
    const { latest } = editing();
    openRow(/^Link buttons/);

    const urls = screen.getAllByLabelText("Where it goes");
    fireEvent.change(urls[1] as Element, { target: { value: "" } });

    expect(latest()?.links.map((link) => link.label)).toEqual(["See the menu"]);

    fireEvent.change(urls[1] as Element, { target: { value: "https://ada.example/order" } });
    expect(latest()?.links.map((link) => link.label)).toEqual(["See the menu", "Order for pickup"]);
  });

  it("sends a new button back through the flow rather than adding a blank row (§7.1)", () => {
    const onAdd = vi.fn();
    editing(POPULATED, { onAdd });
    openRow(/^Link buttons/);

    fireEvent.click(screen.getByRole("button", { name: "Add another button" }));
    expect(onAdd).toHaveBeenCalledWith("links");
  });
});

describe("how it looks (§3.1, §3.4)", () => {
  it("carries the six controls, and the advanced disclosure at the foot of them", () => {
    editing();
    openRow(/^How it looks/);

    for (const legend of ["Shape", "Lettering", "Light or dark"]) {
      expect(screen.getByRole("group", { name: legend })).toBeTruthy();
    }
    expect(screen.getByLabelText(/Corner softness/)).toBeTruthy();

    // Last, so the owner meets the six controls before they meet the exit from them (§7.4).
    const step = document.querySelector("[data-style-step]");
    expect(step?.lastElementChild?.hasAttribute("data-advanced")).toBe(true);
  });

  it("writes a control straight through, because the page is the feedback", () => {
    const { latest } = editing();
    openRow(/^How it looks/);

    fireEvent.click(screen.getByRole("radio", { name: "Dark" }));
    expect(latest()?.style.mode).toBe("dark");
  });

  it("keeps the readout collapsed until it is asked for", () => {
    editing();
    openRow(/^How it looks/);

    const readout = { name: "What the numbers say" };
    expect(screen.queryByRole("heading", readout)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Advanced colours" }));
    expect(screen.getByRole("heading", readout)).toBeTruthy();
  });

  it("states its numbers and does nothing else (§3.4)", () => {
    editing(POPULATED, { onDownload: () => {} });
    openRow(/^How it looks/);
    fireEvent.click(screen.getByRole("button", { name: "Advanced colours" }));

    fireEvent.click(screen.getByRole("checkbox", { name: "Set the colours by hand" }));
    // White text on a white page: the worst thing the panel can be told.
    fireEvent.change(screen.getByLabelText("Body text"), { target: { value: "#ffffff" } });
    fireEvent.change(screen.getByLabelText("Page background"), { target: { value: "#ffffff" } });

    expect(document.querySelector("[data-readings]")?.textContent).toContain("1.0:1");
    // No refusal, no auto-correction, no export gate.
    expect(screen.getByRole("button", { name: "Download" })).toHaveProperty("disabled", false);
    expect(screen.queryAllByRole("alert")).toEqual([]);
    expect(document.body.textContent).not.toMatch(/fail|too low|not allowed|fix/i);
  });

  it("keeps the hand-set colours when the switch goes off (§3.4)", () => {
    const { latest } = editing();
    openRow(/^How it looks/);
    fireEvent.click(screen.getByRole("button", { name: "Advanced colours" }));

    const toggle = screen.getByRole("checkbox", { name: "Set the colours by hand" });
    fireEvent.click(toggle);
    fireEvent.change(screen.getByLabelText("Body text"), { target: { value: "#123456" } });
    fireEvent.click(toggle);

    expect(latest()?.style.advanced).toEqual({ enabled: false, colors: { ink: "#123456" } });
  });
});

describe("what leaves, and what arrives (§7.7, §7.8)", () => {
  it("carries Download on the list and Import in the menu", () => {
    const onDownload = vi.fn();
    const onImport = vi.fn();
    editing(POPULATED, { onDownload, onImport });

    fireEvent.click(screen.getByRole("button", { name: "Download" }));
    expect(onDownload).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Open a project file…" }));
    expect(onImport).toHaveBeenCalled();
  });

  it("gives §7.8's confirmation and §7.9's message the menu's own surface", () => {
    editing(POPULATED, {
      onImport: () => {},
      importConfirm: <p>Opening this file will replace it.</p>,
    });

    // The OS picker takes the screen while it is up and the menu can be dismissed underneath it,
    // which would leave the confirmation correct and invisible. So the surface opens itself.
    const panel = document.querySelector("[data-menu-panel]") as HTMLElement;
    expect(panel.hidden).toBe(false);
    expect(panel.textContent).toContain("Opening this file will replace it.");
    // In place, with the project intact behind it — never a modal (§7.9).
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Ada & Sons <Bakers>");
  });

  it("does not track downloaded versus changed since (§7.7)", () => {
    const onDownload = vi.fn();
    const { latest } = editing(POPULATED, { onDownload });

    const before = document.body.textContent ?? "";
    fireEvent.click(screen.getByRole("button", { name: "Download" }));
    openRow(/^A line about what you do/);
    fireEvent.change(screen.getByLabelText("Tagline"), { target: { value: "Changed" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(latest()?.header.tagline).toBe("Changed");
    // The screen said nothing about the export before, and says nothing about it after: no
    // badge, no "unsaved", nothing that would nag a screen this design keeps calm.
    expect(before).not.toMatch(/unsaved|not downloaded|since you/i);
    expect(document.body.textContent).not.toMatch(/unsaved|not downloaded|since you/i);
  });
});

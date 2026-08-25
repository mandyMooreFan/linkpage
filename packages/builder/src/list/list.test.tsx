// @vitest-environment jsdom

import { cleanup, fireEvent, render as mount, screen } from "@testing-library/react";
import { useState, type JSX, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { POPULATED } from "../fixtures.js";
import type { Topic } from "../flow/topics.js";
import type { Draft } from "../project/index.js";
import { ROW_OPEN } from "../ui/row.js";
import { List, MENU_PANEL } from "./List.js";

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

/**
 * A window with room for the page beside the list.
 *
 * jsdom has no `matchMedia` at all, which the preview reads as the narrow layout — the phone,
 * and the size every test here otherwise wants. One test needs the other size, and it needs it
 * to be visibly a stub rather than an ambient default, so this goes in and comes straight back
 * out again. The drawer's own two-size behaviour is `Preview.test.tsx`'s.
 */
function laptop(): { restore: () => void } {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: () => ({
      matches: true,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  });
  return {
    restore: () => {
      Reflect.deleteProperty(window, "matchMedia");
    },
  };
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

/**
 * The screen's own ladder, and which half of a row is emphasised. `SPEC.md` §7.4, §1, §2;
 * design change 4 (#191), findings B-41, B-42, B-44, B-62, B-63.
 *
 * **These read class names, which the suite otherwise avoids on purpose.** The rule here *is* a
 * set of authored numbers — 32 / 8 / 24 / 24, and 48px under an open row — and the defect was that
 * they had drifted to be all the same. A test that renders the component and looks at nothing
 * cannot fail when they drift again, and the alternative instrument (a screenshot diff) is the
 * flaky one §7.4 refuses. The hooks are `data-*` for the same reason §7.4 gives: a utility may
 * change with the design, so the test names the thing rather than the class that styles it.
 */
describe("the list's ladder and emphasis (§1, §2)", () => {
  const row = (id: string): HTMLElement =>
    document.querySelector(`[data-row="${id}"]`) as HTMLElement;

  it("groups the arrival line with the title it belongs to, not with the bar above it", () => {
    mount(<List draft={POPULATED} arrived onChange={() => {}} onAdd={() => {}} />);

    const line = document.querySelector("[data-arrival]") as HTMLElement;
    const title = screen.getByRole("heading", { level: 1 });
    const block = line.parentElement as HTMLElement;

    // One block, 8px apart inside it — the line describes the title, not the buttons.
    expect(block.contains(title)).toBe(true);
    expect(block.className).toContain("gap-2");
    // …and 32px from the bar, which is the biggest break on the screen. It sits on the block so
    // that a list arrived at without the line gets the same break.
    expect(block.className).toContain("mt-8");
    expect(line.className).not.toMatch(/\bmt-\d/);
    expect(title.className).not.toMatch(/\bmt-\d/);
  });

  it("keeps the bar-to-title break when there is no arrival line", () => {
    mount(<List draft={POPULATED} onChange={() => {}} onAdd={() => {}} />);

    const title = screen.getByRole("heading", { level: 1 });
    expect(document.querySelector("[data-arrival]")).toBeNull();
    expect((title.parentElement as HTMLElement).className).toContain("mt-8");
  });

  it("separates an open row with space rather than with a heavier line (B-41, B-42)", () => {
    editing();
    openRow(/^A line about what you do/);

    const body = row("tagline").querySelector("[data-row-body]") as HTMLElement;
    // The same hairline as between two collapsed rows — the line is not what changed.
    expect(body.className).toContain("border-t border-rule");
    expect(body.className).not.toMatch(/border-t-[2-9]/);
    // 32px above and 48px below: the widest gap on the screen, and wider than any rung inside
    // the form it closes. `controls.test.ts` holds those numbers against the ladder itself.
    expect(body.className).toContain(ROW_OPEN.className);
  });

  it("owns the open row's top offset once, so no editor brings its own (B-42)", () => {
    editing();

    for (const [name, hook] of [
      [/^How it looks/, "[data-style-step]"],
      [/^Link buttons/, "[data-button-row]"],
    ] as const) {
      openRow(name);
      const editor = document.querySelector(hook)?.closest("[data-row-body] > *");
      expect(editor, `${hook} must be inside an open row's body`).toBeTruthy();
      expect(editor?.className).toEqual(expect.not.stringMatching(/\bmt-\d/));
      fireEvent.click(screen.getByRole("button", { name, expanded: true }));
    }
  });

  it("prints the owner's answer in ink and our field name in the quiet colour (B-62)", () => {
    editing();

    const label = row("address").querySelector("[data-row-label]") as HTMLElement;
    const answer = row("address").querySelector("[data-row-summary]") as HTMLElement;

    expect(answer.textContent).toContain("12 Mill Lane");
    expect(answer.className).toContain("text-ink");
    expect(answer.className).not.toContain("text-ink-quiet");
    expect(label.className).toContain("text-ink-quiet");
  });

  it("stops showing the summary while the row is open, so the value appears once (B-63)", () => {
    editing();
    const tagline = POPULATED.header.tagline ?? "";

    expect(row("tagline").querySelector("[data-row-summary]")?.textContent).toBe(tagline);

    openRow(/^A line about what you do/);

    expect(row("tagline").querySelector("[data-row-summary]")).toBeNull();
    // Once, and in the field that can change it.
    expect(screen.getByLabelText("Tagline")).toHaveProperty("value", tagline);
    expect(row("tagline").textContent).not.toContain(tagline);
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

  it("mends a web address where it was typed, and now says so in advance (§7.9, #142, #197)", () => {
    // This editor has no Continue — leaving the box is "done answering" on it. Mid-typing is
    // untouched: mending under the owner's fingers is the told-off feeling #142 removes.
    const { latest } = editing();
    openRow(/^Link buttons/);

    const url = screen.getAllByLabelText("Where it goes")[0] as HTMLInputElement;
    const line = url.closest("[data-url-field]") as HTMLElement;

    // The scheme is on the line rather than in the box (#197), so the mend the owner used to
    // watch happen on blur was already on the screen before they typed a character of it.
    fireEvent.change(url, { target: { value: "mysite.com/menu" } });
    expect(line.textContent + url.value).toBe("https://mysite.com/menu");
    expect(latest()?.links[0]?.url).toBe("https://mysite.com/menu");

    // What is left for the mend on leaving the box is the trim, and that is still shown here.
    fireEvent.change(url, { target: { value: "mysite.com/menu " } });
    expect(url.value).toBe("mysite.com/menu ");
    fireEvent.blur(url);
    expect(url.value).toBe("mysite.com/menu");
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

  /**
   * #186: the phone hid the button it told you to press.
   *
   * On the list the drawer defaults open (§7.6, #147) and on a phone it is an opaque
   * `fixed inset-0` surface — so the first screen after a run carried *"To share it, download the
   * file and put it online"* while the Download it names sat underneath it, with an outline
   * button as the only control on screen. The landing itself is deliberate and stays; what moves
   * is the button.
   *
   * jsdom has no `matchMedia`, which the drawer reads as "no room beside the question" — the
   * phone, and the case this is about. The laptop is stubbed in explicitly below.
   */
  describe("the page-first landing keeps the button it names (#186)", () => {
    const downloads = () => screen.getAllByRole("button", { name: "Download" });
    const drawer = () => document.querySelector("[data-open]") as HTMLElement;

    it("carries Download onto the page the phone lands on, and presses it", () => {
      const onDownload = vi.fn();
      editing(POPULATED, { onDownload });

      const [button, ...rest] = downloads();
      // Exactly one, and it is on the surface the owner can actually see. Two copies with one
      // hidden by a media query would be read out twice on the size that needs it least.
      expect(rest).toEqual([]);
      expect(drawer().contains(button!)).toBe(true);
      expect(drawer().textContent).toContain("download the file and put it online");

      fireEvent.click(button!);
      expect(onDownload).toHaveBeenCalled();
    });

    it("hands it back to the bar as soon as the page is put away", () => {
      editing(POPULATED, { onDownload: () => {} });

      fireEvent.click(screen.getByRole("button", { name: "Edit your page" }));

      const [button, ...rest] = downloads();
      expect(rest).toEqual([]);
      // §7.4's place for it, and where the arrival line points: back in the bar above the rows.
      expect(drawer().contains(button!)).toBe(false);
    });

    it("says it is unavailable in the drawer too, until there is a sheet behind it", () => {
      editing(POPULATED);

      const [button] = downloads();
      expect(drawer().contains(button!)).toBe(true);
      expect(button).toHaveProperty("disabled", true);
    });

    it("leaves the bar alone where the page has room to sit beside it", () => {
      const roomy = laptop();
      editing(POPULATED, { onDownload: () => {} });

      const [button, ...rest] = downloads();
      expect(rest).toEqual([]);
      // The drawer is open here too — it just is not covering anything, so nothing moves.
      expect(screen.getByRole("button", { name: "Edit your page" })).toBeTruthy();
      expect(drawer().contains(button!)).toBe(false);
      roomy.restore();
    });
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

  /**
   * The menu's surface holds §7.8's fork, so it has to be wide enough for it (#196, B-53/B-67).
   *
   * The panel is `absolute` inside a shrink-wrapped `relative`, so its shrink-to-fit width
   * resolves against the Menu button and not against what it holds: a `min-width` there is not a
   * floor, it is the width, and the content has no way to ask for more. At 256px that left
   * "Download my work first" exactly 0px of slack at both of §7.6's sizes.
   */
  it("lets the panel grow to what it is holding, within a cap (#196)", () => {
    editing(POPULATED, {
      onImport: () => {},
      importConfirm: <p>Opening this file will replace it.</p>,
    });

    const panel = document.querySelector("[data-menu-panel]") as HTMLElement;
    expect(panel.className).toContain(MENU_PANEL.className);
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

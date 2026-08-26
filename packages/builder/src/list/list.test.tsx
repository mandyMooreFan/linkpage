// @vitest-environment jsdom

import { cleanup, fireEvent, render as mount, screen } from "@testing-library/react";
import { useState, type JSX, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FileDownload } from "../download/index.js";
import { POPULATED } from "../fixtures.js";
import type { Topic } from "../flow/topics.js";
import { ReplaceConfirm } from "../open/index.js";
import type { Draft } from "../project/index.js";
import { ROW_OPEN } from "../ui/row.js";
import { WEIGHT } from "../ui/Button.js";
import { filledLabels, quietButtons, textClasses, widthDisagreements } from "../ui/fill.testing.js";
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

/** The preview drawer's own root, which carries its open state as a hook. */
const drawerRoot = (): HTMLElement => document.querySelector("[data-open]") as HTMLElement;

const rowIds = (): string[] =>
  [...document.querySelectorAll("[data-row]")].map((row) => row.getAttribute("data-row") ?? "");

const openRow = (name: RegExp): void => {
  fireEvent.click(screen.getByRole("button", { name, expanded: false }));
};

/**
 * §7.8's confirmation, the real component (#228).
 *
 * **Used wherever the claim is about the confirmation itself**, which since #213's sweep is one
 * test more than #228 left it. Where the claim is about the fill it is obvious: a stand-in has no
 * fill, so a test built on one would go green against a screen that never had the defect (#187),
 * and would go on being green if `Open the file` lost its `primary` tomorrow. The subtler one is
 * *never a modal* — a bare `<p>` has no role to be the wrong one, so that assertion held whatever
 * the real component did.
 *
 * A bare `<p>` still stands in for it in the width test below, and deliberately: that claim is
 * about the *surface* — a shrink-wrapped panel that has to be allowed to grow — and jsdom lays
 * nothing out, so what is asserted is the class that buys the growth. Nothing about the content
 * enters into it, and the widest string the panel must hold is measured in `controls.test.ts`.
 *
 * `outgoing` is the only thing it needs from outside — a filename and a `save` nothing here
 * presses. What the fork *does* on either branch is `App.test.tsx`'s, end to end.
 */
const outgoing: FileDownload = { filename: "adas-bakery.linkpage.json", save: () => {} };
const confirmation = (
  <ReplaceConfirm name="Ada's Bakery" outgoing={outgoing} onOpen={() => {}} onCancel={() => {}} />
);

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

  /**
   * One ink for every small text-only button (finding B-21, #234).
   *
   * `Remove` is the other half of the pair the decision was argued over: `Back` is navigation and
   * `Remove` acts on the owner's own work, and the rejected alternative had them at two different
   * inks for exactly that reason. The owner chose one rule, so this asserts the same two classes
   * `flow.test.tsx` asserts on `Back` — the point being that they *are* the same two.
   */
  it("gives Remove the same quiet ink Back takes (B-21)", () => {
    editing();
    openRow(/^Link buttons/);

    const remove = screen.getByRole("button", { name: "Remove See the menu" });
    expect(quietButtons(), "Remove is a quiet button").toContain(remove);
    expect(textClasses(remove)).toEqual(["text-base", "text-ink-quiet"]);
  });

  /**
   * One width for every button (finding B-72, #230).
   *
   * **Three of the five `primary` sites are on this screen** — the bar's Download, an open row's
   * Save and the language row's own — and two of the three arrived in columns that had to write
   * `items-start` to stop them stretching, and then `w-full` on every child that was not a button
   * to put the default back. The weights say `w-fit` now, so those columns are ordinary columns
   * again; this is what says the buttons in them did not start stretching when the props came off.
   */
  it("gives every button on the list the width its weight names (B-72)", () => {
    editing(POPULATED);
    expect(widthDisagreements(), "the bar, with the page up").toEqual([]);

    openRow(/^Link buttons/);
    expect(widthDisagreements(), "a row open, with its own Save and its Removes").toEqual([]);

    fireEvent.click(screen.getByRole("button", { name: /^Link buttons/, expanded: true }));
    openRow(/^Page language/);
    expect(widthDisagreements(), "the language row, which owns its own Save").toEqual([]);
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
    const drawer = drawerRoot;

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

  /**
   * One filled button per screen (§4, §6; design change 3, findings B-18/B-51).
   *
   * The list used to show two at once: the pinned Download and, the moment a row was opened, the
   * form's own Save — the same solid ink, a few centimetres apart, disagreeing about what the
   * owner is in the middle of. §4 gives the one filled object on a screen to the one action, so
   * one of them has to step down, and it is **Download**, because while a row is open the thing
   * the owner is doing is finishing that answer.
   *
   * **§7.8's replace confirmation is the same defect from a fourth direction** (#228). Its *Open
   * the file* is filled — the errand the owner arrived on, #200 — and it renders in the menu's own
   * panel, a couple of centimetres from Download in this same bar. #190 found it, judged it
   * outside change 3's three named sites, and put it to the owner, who asked for it. It is one
   * more term in the same expression rather than a mechanism of its own, so it is tested here
   * beside the other three and not somewhere new.
   *
   * **The weight follows the screen's mode, never the pointer.** Nothing that changes the mode is
   * Download itself: rows open from their own header and close on Save or on the escape inside
   * them, and the confirmation arrives with a file from the OS picker and leaves on one of its own
   * three buttons — so the fill never leaves a button under a press. And the step is to
   * `secondary` rather than `quiet` — the same box, the same padding, radius and type, one
   * hairline instead of the fill (`controls.test.ts`, *differs from Continue only in fill*).
   * Download does not move, resize or leave; what the eye sees is the fill travelling.
   *
   * **The screen is what is on the glass.** On a phone the open drawer is an opaque
   * `fixed inset-0` surface with the list behind it (#186), so an open row — *and the menu panel
   * holding the confirmation* — is not on the screen at all, and the drawer keeps the fill,
   * because taking it away there is exactly the defect #186 was raised to fix. jsdom has no
   * `matchMedia`, which the drawer reads as the phone, so that is the default here and the laptop
   * is stubbed in where a test wants the other size.
   *
   * **The ritual can photograph one of these four and not the others.**
   * `63-menu-replace-confirm` (#209) is a *viewport* shot taken from the top of the list with the
   * page put away, so the bar and its Download are in the frame behind the panel — the
   * confirmation case moves a real picture. The row cases still move none: `pnpm shots` opens
   * every row, but a row shot is an *element* shot of the row alone, so the bar is outside the
   * frame, and `51-list-rows` is taken with every row closed. #190's before-and-after came out of
   * a patched copy of the script, taken once and thrown away. Worth knowing before reading a
   * byte-identical pair as "the change did nothing", which is exactly the misreading #208 was
   * raised to stop.
   */
  describe("one filled button per screen (design change 3)", () => {
    /**
     * Which surface the owner is actually looking at, **read off the rendered DOM**.
     *
     * The obvious spelling is to re-derive the drawer's own `open && !roomy` here from
     * `data-open` and the absence of `matchMedia`. That is a test that mirrors the code it is
     * checking — the shape #184 and #213 both caught late — and it fails quietly: a stub that
     * one day reports the narrow size would make this say "not covering", scope every assertion
     * below to the whole document, and go green having looked at the wrong thing.
     *
     * So ask the screen instead. #186 puts the single Download **in the bar or in the drawer's
     * header, never both**, so whichever surface is holding it is the surface that is on the
     * glass — and `getByRole` throwing on none or two is that guarantee re-asserted on the way
     * past.
     */
    const onGlass = (): ParentNode =>
      drawerRoot().contains(screen.getByRole("button", { name: "Download" }))
        ? drawerRoot()
        : document;

    const putThePageAway = (): void => {
      fireEvent.click(screen.getByRole("button", { name: "Edit your page" }));
    };

    it("gives the fill to Download while the list is a list", () => {
      editing(POPULATED, { onDownload: () => {} });
      putThePageAway();

      expect(filledLabels(onGlass())).toEqual(["Download"]);
    });

    it("hands it to Save while a row is open, and leaves Download a real action", () => {
      editing(POPULATED, { onDownload: () => {} });
      putThePageAway();
      openRow(/^Opening hours/);

      expect(filledLabels(onGlass())).toEqual(["Save"]);

      // Stepped down, not stepped out: still there, still pressable, still §4's secondary — a
      // hairline outline rather than the footnote `quiet` would make of it (#189).
      const download = screen.getByRole("button", { name: "Download" });
      expect(download).toHaveProperty("disabled", false);
      expect(download.className).toContain(WEIGHT.secondary);
    });

    it("hands it straight back the moment the row closes", () => {
      editing(POPULATED, { onDownload: () => {} });
      putThePageAway();
      openRow(/^A line about what you do/);
      fireEvent.click(screen.getByRole("button", { name: "Save" }));

      expect(filledLabels(onGlass())).toEqual(["Download"]);
    });

    it("keeps it on Download where the page covers the row it belongs to (#186)", () => {
      editing(POPULATED, { onDownload: () => {} });
      putThePageAway();
      openRow(/^Opening hours/);
      // Back onto the page, with the row still open underneath it.
      fireEvent.click(screen.getByRole("button", { name: "See the page" }));

      expect(onGlass(), "the drawer should be the screen here").toBe(drawerRoot());
      // The drawer is the screen, and its one action is Download. A screen whose only control is
      // an outline is B-48 all over again.
      expect(filledLabels(onGlass())).toEqual(["Download"]);
    });

    it("holds at the size where the page sits beside the list", () => {
      const roomy = laptop();
      editing(POPULATED, { onDownload: () => {} });

      // The page is beside the list, not over it, so the bar is the screen and stays it — with
      // the drawer sitting open the whole time, which is what makes this the other size.
      expect(onGlass(), "the bar should be the screen at this size").toBe(document);
      expect(drawerRoot().dataset.open).toBe("true");

      expect(filledLabels(onGlass())).toEqual(["Download"]);
      openRow(/^Opening hours/);
      expect(filledLabels(onGlass())).toEqual(["Save"]);
      roomy.restore();
    });

    it("hands the fill to the errand while §7.8's confirmation is up (#228)", () => {
      editing(POPULATED, { onDownload: () => {}, onImport: () => {}, importConfirm: confirmation });
      putThePageAway();

      // One filled object, and it is the errand the owner arrived on (#200) — not two, a couple
      // of centimetres apart in the same bar. **Identified, never counted**: a screen whose one
      // fill has wandered onto Menu or onto the escape passes any count and fails this.
      expect(filledLabels(onGlass())).toEqual(["Open the file"]);

      // Stepped down, not stepped out — as for an open row: still there, still pressable, still a
      // hairline outline rather than the footnote `quiet` would make of it (#189).
      const download = screen.getByRole("button", { name: "Download" });
      expect(download).toHaveProperty("disabled", false);
      expect(download.className).toContain(WEIGHT.secondary);
    });

    it("keeps it on Download where the page covers the confirmation as well (#186)", () => {
      editing(POPULATED, { onDownload: () => {}, onImport: () => {}, importConfirm: confirmation });

      // No press needed: on a phone the list lands page-first, so the drawer is already the
      // screen and the menu panel — confirmation, filled *Open the file* and all — is underneath
      // it. `covered` outranks the confirmation for the same reason it outranks an open row, and
      // it has to: a drawer whose only control was an outline is B-48 all over again.
      expect(onGlass(), "the drawer should be the screen here").toBe(drawerRoot());
      expect(filledLabels(onGlass())).toEqual(["Download"]);
    });
  });

  /**
   * **The real confirmation here too, and for a second reason (#213).** The surface half of this
   * — that the panel opens itself and holds the words — a `<p>` can carry. The last two lines
   * cannot: *never a modal* is a claim about **what §7.8's confirmation is**, and a bare `<p>`
   * has no role to be the wrong one, so the assertion was true of the fixture whatever the real
   * component did. Verified on `main`: giving `ReplaceConfirm` `role="dialog"` and
   * `aria-modal="true"` passed the whole suite. It renders `role="group"`, and that is the
   * decision this line exists to hold.
   */
  it("gives §7.8's confirmation and §7.9's message the menu's own surface", () => {
    editing(POPULATED, { onImport: () => {}, importConfirm: confirmation });

    // The OS picker takes the screen while it is up and the menu can be dismissed underneath it,
    // which would leave the confirmation correct and invisible. So the surface opens itself.
    const panel = document.querySelector("[data-menu-panel]") as HTMLElement;
    expect(panel.hidden).toBe(false);
    expect(panel.textContent).toContain("Opening this file will replace it.");
    // In place, with the project intact behind it — never a modal (§7.9).
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.querySelector("[data-replace]")?.getAttribute("role")).toBe("group");
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

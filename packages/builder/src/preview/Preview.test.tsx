// @vitest-environment jsdom

import { act, cleanup, fireEvent, render as mount, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POPULATED } from "../fixtures.js";
import { pageHtml } from "../page.js";
import { Preview, SIDE_BY_SIDE } from "./Preview.js";

/**
 * The drawer, at both sizes, and the guarantee underneath it.
 *
 * Two things are being held here and they are not the same thing. One is §5.2: what the owner
 * looks at is the file, character for character. The other is §7.6: one drawer, one control,
 * two placements — asserted as *the absence of a second design*, since that is the failure that
 * would actually happen.
 */

/**
 * A `matchMedia` jsdom does not have.
 *
 * The width is a single boolean the test sets, and `viewport.resize` fires the same `change`
 * event a real browser fires when a window crosses the breakpoint or a phone is rotated. The
 * component may only ask about `SIDE_BY_SIDE`; anything else is a second query nobody agreed to
 * and the stub refuses it rather than quietly answering `false`.
 */
function installViewport() {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  let roomy = false;

  const list = {
    get matches() {
      return roomy;
    },
    media: SIDE_BY_SIDE,
    addEventListener: (_: "change", listener: (event: MediaQueryListEvent) => void) =>
      void listeners.add(listener),
    removeEventListener: (_: "change", listener: (event: MediaQueryListEvent) => void) =>
      void listeners.delete(listener),
  };

  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => {
      if (query !== SIDE_BY_SIDE) throw new Error(`unexpected media query: ${query}`);
      return list as unknown as MediaQueryList;
    },
  });

  return {
    /** Before mounting: the size the owner starts at. */
    set(next: boolean) {
      roomy = next;
    },
    /** After mounting: the window is resized, or the phone is turned. */
    resize(next: boolean) {
      act(() => {
        roomy = next;
        for (const listener of [...listeners]) {
          listener({ matches: next, media: SIDE_BY_SIDE } as MediaQueryListEvent);
        }
      });
    },
  };
}

let viewport: ReturnType<typeof installViewport>;

beforeEach(() => {
  viewport = installViewport();
});

afterEach(cleanup);

const toggle = () => screen.getByRole("button");
const frame = () => document.querySelector("iframe");

describe("the preview is the export", () => {
  it("puts the renderer's output in the iframe with nothing added and nothing lost", () => {
    viewport.set(true);
    mount(<Preview project={POPULATED} />);

    // Read back off the DOM rather than off the props, so React's own attribute handling is
    // inside the assertion. The fixture's `&`, `<` and `"` are what make that worth doing.
    expect(frame()?.getAttribute("srcdoc")).toBe(pageHtml(POPULATED));
  });

  it("holds the same bytes Download will write to disk", async () => {
    viewport.set(true);
    mount(<Preview project={POPULATED} />);

    // The file, built the way §7.7's Download builds it. As close to §5.3's end-to-end claim as
    // a DOM test reaches: same string, through the browser's file machinery, byte for byte.
    const file = new Blob([pageHtml(POPULATED)], { type: "text/html" });
    expect(await file.text()).toBe(frame()?.getAttribute("srcdoc"));
  });

  it("grants the frame nothing, because the export runs nothing", () => {
    viewport.set(true);
    mount(<Preview project={POPULATED} />);

    // Not `allow-scripts`: the page ships zero JavaScript (§5.3, invariant 1). Not
    // `allow-same-origin`: the preview has no business on the builder's origin.
    expect(frame()?.getAttribute("sandbox")).toBe("");
  });

  it("re-reads the page when the project changes", () => {
    viewport.set(true);
    const view = mount(<Preview project={POPULATED} />);

    const renamed = { ...POPULATED, header: { ...POPULATED.header, name: "Bea's Bakery" } };
    view.rerender(<Preview project={renamed} />);

    expect(frame()?.getAttribute("srcdoc")).toBe(pageHtml(renamed));
    expect(frame()?.getAttribute("srcdoc")).toContain("Bea&#39;s Bakery");
  });
});

describe("stepping in and out", () => {
  it("starts closed on a phone, and the page is not there until asked for", () => {
    viewport.set(false);
    mount(<Preview project={POPULATED} />);

    expect(toggle().getAttribute("aria-expanded")).toBe("false");
    expect(frame()).toBeNull();
  });

  it("brings the page up on a tap and puts it away on the next one", () => {
    viewport.set(false);
    mount(<Preview project={POPULATED} />);

    fireEvent.click(toggle());
    expect(toggle().getAttribute("aria-expanded")).toBe("true");
    expect(frame()?.getAttribute("srcdoc")).toBe(pageHtml(POPULATED));

    fireEvent.click(toggle());
    expect(toggle().getAttribute("aria-expanded")).toBe("false");
    expect(frame()).toBeNull();
  });

  it("sits open where there is room beside the question", () => {
    viewport.set(true);
    mount(<Preview project={POPULATED} />);

    expect(toggle().getAttribute("aria-expanded")).toBe("true");
    expect(frame()).not.toBeNull();
  });

  it("closes on Escape at either size", () => {
    for (const roomy of [false, true]) {
      viewport = installViewport();
      viewport.set(roomy);
      mount(<Preview project={POPULATED} />);
      if (!roomy) fireEvent.click(toggle());

      expect(toggle().getAttribute("aria-expanded")).toBe("true");
      fireEvent.keyDown(document, { key: "Escape" });
      expect(toggle().getAttribute("aria-expanded")).toBe("false");

      cleanup();
    }
  });

  it("re-defaults when the window crosses the breakpoint, until the owner has said otherwise", () => {
    viewport.set(false);
    mount(<Preview project={POPULATED} />);
    expect(toggle().getAttribute("aria-expanded")).toBe("false");

    viewport.resize(true);
    expect(toggle().getAttribute("aria-expanded")).toBe("true");
  });

  it("keeps the owner's choice when the window crosses the breakpoint", () => {
    viewport.set(true);
    mount(<Preview project={POPULATED} />);

    fireEvent.click(toggle()); // "I want the question, not the page."
    viewport.resize(false);
    viewport.resize(true);

    expect(toggle().getAttribute("aria-expanded")).toBe("false");
  });
});

/**
 * **The bare `<button>` below is a deliberate stand-in, and this is the note saying so (#213).**
 *
 * `action` is a slot, and that is #186's decision rather than an accident: label, weight and
 * unavailable-state stay on the screen that owns the errand, so `Preview` is supposed to be
 * unable to tell what it has been handed. Every claim here is about *placement* — in the header,
 * last in the row, gone once the page is put away — and a real `Button` would answer each of them
 * identically. Standing one in would move code without moving a guarantee.
 *
 * **What the stand-in cannot see is asserted where the real one is rendered.** That Download
 * travels into the drawer *still filled*, and steps down when it should, is `list.test.tsx`'s —
 * mounted through the real `List`, which is the only place that pairing exists. This file is why
 * a slot is safe to test with a placeholder: the component under test genuinely has no opinion.
 */
describe("what the screen hands the drawer to carry (#186)", () => {
  const carried = () => screen.queryByRole("button", { name: "Download" });

  it("says when it has gone over the screen, and when it has come off it", () => {
    const covering: boolean[] = [];
    viewport.set(false);
    mount(<Preview project={POPULATED} onList onCover={(next) => covering.push(next)} />);

    // A phone, on the list: open by default, and there is no room beside the question — so the
    // drawer *is* the screen and whatever was behind it is not on screen any more.
    expect(covering.at(-1)).toBe(true);

    fireEvent.click(toggle()); // "Edit your page" — the list is back.
    expect(covering.at(-1)).toBe(false);
  });

  it("is beside the question rather than over it wherever there is room", () => {
    const covering: boolean[] = [];
    viewport.set(true);
    mount(<Preview project={POPULATED} onList onCover={(next) => covering.push(next)} />);

    // Open, and the page is sitting next to the list rather than on top of it. Nothing is
    // covered, so the list keeps its own primary action where §7.4 puts it.
    expect(toggle().getAttribute("aria-expanded")).toBe("true");
    expect(covering.at(-1)).toBe(false);
  });

  it("follows the window across the breakpoint", () => {
    const covering: boolean[] = [];
    viewport.set(true);
    mount(<Preview project={POPULATED} onList onCover={(next) => covering.push(next)} />);
    expect(covering.at(-1)).toBe(false);

    viewport.resize(false);
    expect(covering.at(-1)).toBe(true);
  });

  it("carries the action in the header while the page is up", () => {
    viewport.set(false);
    mount(<Preview project={POPULATED} onList action={<button type="button">Download</button>} />);

    // In the header, beside the drawer's own control and the sentence that names it — not
    // somewhere under the page.
    const header = document.querySelector("[data-drawer-header]") as HTMLElement;
    expect(header.contains(carried())).toBe(true);
    expect(header.textContent).toContain("download the file and put it online");
  });

  it("carries nothing once the page is put away", () => {
    viewport.set(false);
    mount(
      <Preview
        project={POPULATED}
        onList
        action={<button type="button">Download</button>}
        onCover={() => {}}
      />,
    );
    expect(carried()).not.toBeNull();

    // A closed drawer has covered nothing and is owed nothing: the screen behind it can show
    // its own action again, and two copies of it would be one too many.
    fireEvent.click(screen.getByRole("button", { name: "Edit your page" }));
    expect(carried()).toBeNull();
  });
});

describe("one design, not two", () => {
  it("offers one control at either size — there is no laptop toggle", () => {
    // §7.6: a "see it on a laptop" control would show the identical page with more whitespace.
    // The frame is phone-shaped and that is the only shape there is. Counted with no `action`
    // supplied, because a carried control is the *screen's* and this is about the drawer's own.
    for (const roomy of [false, true]) {
      viewport = installViewport();
      viewport.set(roomy);
      mount(<Preview project={POPULATED} />);

      expect(screen.getAllByRole("button")).toHaveLength(1);
      cleanup();
    }
  });

  it("puts the same markup on the screen at either size", () => {
    // The two sizes differ in CSS placement only, so the open drawer's DOM has to be identical.
    // If a width ever grows a branch in the component, this is what notices.
    const shapes = [false, true].map((roomy) => {
      viewport = installViewport();
      viewport.set(roomy);
      const view = mount(<Preview project={POPULATED} />);
      if (!roomy) fireEvent.click(toggle());

      // `useId` differs per root, so compare the structure rather than the ids.
      const html = view.container.innerHTML.replaceAll(/(id|aria-controls)="[^"]*"/g, "$1=…");
      cleanup();
      return html;
    });

    expect(shapes[0]).toBe(shapes[1]);
  });
});

describe("the list lands on the page (§7.6, #147)", () => {
  it("defaults open on a phone when it is the list's drawer, and names the way out of it", () => {
    viewport.set(false);
    mount(<Preview project={POPULATED} onList />);

    expect(frame()).not.toBeNull();
    expect(toggle().textContent).toBe("Edit your page");
  });

  it("keeps the choice a default: hiding is one tap and the words follow", () => {
    viewport.set(false);
    mount(<Preview project={POPULATED} onList />);

    fireEvent.click(toggle());
    expect(frame()).toBeNull();
    expect(toggle().textContent).toBe("See the page");

    fireEvent.click(toggle());
    expect(frame()).not.toBeNull();
    expect(toggle().textContent).toBe("Edit your page");
  });

  it("leaves the flow's drawer exactly as it was", () => {
    viewport.set(false);
    mount(<Preview project={POPULATED} />);

    expect(frame()).toBeNull();
    expect(toggle().textContent).toBe("See the page");
    fireEvent.click(toggle());
    expect(toggle().textContent).toBe("Hide the page");
  });
});

describe("the landing says it is not live yet (#169)", () => {
  const notice = (): Element | null => document.querySelector("[data-open] p");

  it("sits in the header beside the one control, on the list's open drawer", () => {
    viewport.set(false);
    mount(<Preview project={POPULATED} onList />);
    expect(notice()?.textContent).toBe(
      "Only you can see this. To share it, download the file and put it online.",
    );
  });

  it("goes with the page: a hidden drawer needs no warning about it", () => {
    viewport.set(false);
    mount(<Preview project={POPULATED} onList />);
    fireEvent.click(toggle());
    expect(notice()).toBeNull();
  });

  it("says nothing mid-flow, where the page is visibly being made", () => {
    viewport.set(true);
    mount(<Preview project={POPULATED} />);
    expect(notice()).toBeNull();
  });
});

/**
 * The control starts where everything else starts (#196, finding B-54).
 *
 * Mid-flow this row holds one thing, and it was the only right-aligned element in the builder —
 * on a screen whose heading, fields, Continue, escape and Back all share one left margin. On a
 * laptop it was aligned to nothing at all: the row is the 32rem column's width and the page
 * frame inside it is 27.5rem, centred, so the button's right edge and the page's right edge were
 * 36px apart. `justify-start` is the alignment the rest of the screen already uses.
 *
 * On the list the row is a different shape and does not move: the sentence takes `mr-auto`, so
 * it absorbs the free space and the controls stay where #186 put them wherever there is room for
 * one line. Where there is not, they now sit under the *start* of the sentence that names them.
 */
describe("the drawer's control shares the screen's margin (#196)", () => {
  const header = (): HTMLElement => document.querySelector("[data-drawer-header]") as HTMLElement;

  it("starts its row rather than ending it, at either size", () => {
    viewport.set(false);
    mount(<Preview project={POPULATED} />);
    expect(header().className).toContain("justify-start");
    expect(header().className).not.toContain("justify-end");

    cleanup();
    viewport.set(true);
    mount(<Preview project={POPULATED} />);
    expect(header().className).toContain("justify-start");
  });

  it("still puts the screen's own action last in the row (#186)", () => {
    viewport.set(false);
    mount(<Preview project={POPULATED} onList action={<button type="button">Download</button>} />);

    // The alignment moved; the order did not. Download is still the last thing in the row,
    // directly under the sentence that names it.
    const buttons = [...header().querySelectorAll("button")].map((each) => each.textContent);
    expect(buttons).toEqual(["Edit your page", "Download"]);
  });
});

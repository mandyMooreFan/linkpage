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

describe("one design, not two", () => {
  it("offers one control at either size — there is no laptop toggle", () => {
    // §7.6: a "see it on a laptop" control would show the identical page with more whitespace.
    // The frame is phone-shaped and that is the only shape there is.
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

// @vitest-environment jsdom

import { cleanup, fireEvent, render as mount, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FileDownload } from "../download/index.js";
import { readProjectFile, type Refusal } from "../project/index.js";
import { WEIGHT } from "../ui/Button.js";
import { widthClasses, widthDisagreements } from "../ui/fill.testing.js";
import { ProjectPicker } from "./ProjectPicker.js";
import { RefusalNotice } from "./RefusalNotice.js";
import { ReplaceConfirm } from "./ReplaceConfirm.js";

/**
 * The two surfaces §7.8 and §7.9 ask for, and the picker behind both. `SPEC.md` §7.8, §7.9, §4.6.
 *
 * What is worth a DOM here is what only exists once somebody is using it: that the confirmation
 * says the owner's own name back to them, that the escape and the replacement are two separate
 * presses, and that a refusal is a sentence with the jargon shut away behind it. Where each of
 * these appears is the host screen's decision and is asserted in `App.test.tsx`, against the real
 * controls.
 */

afterEach(cleanup);

const refusalFor = (text: string): Refusal => {
  const result = readProjectFile(text);
  if (result.ok) throw new Error("expected a refusal");
  return result.refusal;
};

describe("naming what would go (§7.8)", () => {
  const outgoing = (): FileDownload => ({ filename: "adas-bakery.linkpage.json", save: vi.fn() });

  it("says the owner's own name back to them", () => {
    mount(
      <ReplaceConfirm
        name="Ada's Bakery"
        outgoing={outgoing()}
        onOpen={() => {}}
        onCancel={() => {}}
      />,
    );

    // "Are you sure?" is a sentence owners have learned to press through. The name of their own
    // shop is what makes this informative rather than a reflex.
    expect(document.body.textContent).toContain(
      "You’re working on Ada's Bakery. Opening this file will replace it.",
    );
  });

  it("stands without a name rather than inventing one", () => {
    mount(<ReplaceConfirm outgoing={outgoing()} onOpen={() => {}} onCancel={() => {}} />);

    // A project holding only a typed tagline is still something to lose (§7.8), so the
    // confirmation is not skipped — it just cannot name it.
    expect(document.body.textContent).toContain("a project you haven’t named yet");
    expect(document.body.textContent).toContain("Opening this file will replace it.");
  });

  it("offers the escape before the replacement, and lands the keyboard on it", () => {
    mount(
      <ReplaceConfirm name="Ada" outgoing={outgoing()} onOpen={() => {}} onCancel={() => {}} />,
    );

    const labels = screen.getAllByRole("button").map((node) => node.textContent);
    expect(labels).toEqual(["Download my work first", "Open the file", "Cancel"]);
    // The OS picker has just closed, so focus lands on the branch that loses nothing.
    expect(document.activeElement?.textContent).toBe("Download my work first");
  });

  /**
   * The fork's weighting, and the guarantee it is easy to think it broke.
   *
   * The design audit found the escape wearing the solid fill while _Open the file_ — the errand
   * the owner arrived on — was merely outlined, and `Cancel` written by hand in a fourth weight
   * nobody had named. The fix is a swap, and the thing worth holding in a test is that **the swap
   * did not move the keyboard**: focus order and visual weight are separate decisions, so the
   * safe-focus argument survives it. That argument lives in a docblock, which cannot fail; this
   * can.
   *
   * Weights are compared against `WEIGHT` rather than against a spelled-out class string, for
   * `controls.test.ts`'s reason — a second copy of the recipe is exactly what the component layer
   * exists to prevent, and a test is not exempt from that.
   */
  it("puts the fill on the errand and the keyboard on the escape", () => {
    mount(
      <ReplaceConfirm name="Ada" outgoing={outgoing()} onOpen={() => {}} onCancel={() => {}} />,
    );
    const button = (name: string): HTMLElement => screen.getByRole("button", { name });

    // The one filled thing here is the replacement, because that is what the owner came to do.
    expect(button("Open the file").className).toBe(WEIGHT.primary);
    // The escape is a real branch of the fork, not a footnote — a hairline outline, same box.
    expect(button("Download my work first").className).toBe(WEIGHT.secondary);
    // And the third choice routes through a named weight rather than a hand-written string.
    expect(button("Cancel").className).toBe(WEIGHT.quiet);

    // Independent of all of that: an unaimed press still cannot be the one that replaces.
    expect(document.activeElement).toBe(button("Download my work first"));
  });

  /**
   * **The stack no longer says how wide its three choices are** (B-72, #230).
   *
   * #200 gave it `items-start` because the fill stretched while the outline and the quiet one
   * did not, so a fork of three choices sat at two left-to-right shapes at once — a container
   * put there to countermand the weights. The weights say `w-fit` now, so the container went
   * back to being a container, and this is the assertion that keeps it honest: no alignment on
   * the stack, and three buttons that are nonetheless one width.
   */
  it("leaves the fork's three widths to the weights (B-72)", () => {
    mount(
      <ReplaceConfirm name="Ada" outgoing={outgoing()} onOpen={() => {}} onCancel={() => {}} />,
    );

    const stack = screen.getByRole("button", { name: "Cancel" }).parentElement as HTMLElement;
    expect(
      stack.className.split(/\s+/).filter((one) => one.startsWith("items-")),
      "the stack aligns nothing; the weights are the width",
    ).toEqual([]);

    expect(widthDisagreements()).toEqual([]);
    const widths = new Set(screen.getAllByRole("button").map((one) => widthClasses(one).join(" ")));
    expect([...widths], "one box for all three choices").toEqual(["w-fit"]);
  });

  it("writes the outgoing project on the escape, and does not open anything", () => {
    const file = outgoing();
    const onOpen = vi.fn();
    mount(<ReplaceConfirm name="Ada" outgoing={file} onOpen={onOpen} onCancel={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: "Download my work first" }));

    expect(file.save).toHaveBeenCalledTimes(1);
    // Two presses, because the escape can fail — a blocked download, a full disk — and an import
    // that fired itself off the back of one would be the auto-download §7.8 rules out.
    expect(onOpen).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain("Saved as adas-bakery.linkpage.json.");
  });

  it("replaces only when the owner says so, and cancels without touching a thing", () => {
    const onOpen = vi.fn();
    const onCancel = vi.fn();
    const file = outgoing();
    mount(<ReplaceConfirm name="Ada" outgoing={file} onOpen={onOpen} onCancel={onCancel} />);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onOpen).not.toHaveBeenCalled();
    // No silent auto-download either: same preservation without consent (§7.8).
    expect(file.save).not.toHaveBeenCalled();
  });

  it("opens on the press that says open", () => {
    const onOpen = vi.fn();
    mount(<ReplaceConfirm name="Ada" outgoing={outgoing()} onOpen={onOpen} onCancel={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: "Open the file" }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("says nothing about downloads until one happens, and forgets when it goes", () => {
    // §7.7's rule is about the editing screen carrying a badge that goes stale. This
    // acknowledgement lives for the length of one decision and dies with it.
    mount(
      <ReplaceConfirm name="Ada" outgoing={outgoing()} onOpen={() => {}} onCancel={() => {}} />,
    );
    expect(document.body.textContent).not.toContain("Saved as");

    fireEvent.click(screen.getByRole("button", { name: "Download my work first" }));
    expect(document.body.textContent).toContain("Saved as");

    cleanup();
    mount(
      <ReplaceConfirm name="Ada" outgoing={outgoing()} onOpen={() => {}} onCancel={() => {}} />,
    );
    expect(document.body.textContent).not.toContain("Saved as");
  });
});

describe("a refused file, said out loud (§7.9, §4.6)", () => {
  it("carries each of §4.6's messages, and names no JSON path", () => {
    for (const [text, message] of [
      ["{ this is not a file", "This file appears to be damaged."],
      ["[1, 2, 3]", "This doesn't look like a linkpage file."],
      ['{"version":99}', "This page was made with a newer version of linkpage"],
    ] as const) {
      cleanup();
      const refusal = refusalFor(text);
      mount(<RefusalNotice refusal={refusal} />);

      const said = document.querySelector("[data-refusal-message]")?.textContent ?? "";
      expect(said).toContain(message);
      // Neither names a JSON path, and none of them leaks the disclosure's text upward: the
      // sentence is the owner's, the detail is for whoever hand-edited the file (§4.6).
      expect(said).not.toContain(refusal.detail);
      expect(said).not.toMatch(/\btop level\b|\bkey\b|\bfield\b|["[\]{}]/);
    }
  });

  it("puts the technical half behind a closed disclosure", () => {
    mount(<RefusalNotice refusal={refusalFor("{ this is not a file")} />);

    const disclosure = document.querySelector("details");
    expect(disclosure).not.toBeNull();
    // Invisible to the owner, one click away for whoever hand-edited the file (§4.6).
    expect((disclosure as HTMLDetailsElement).open).toBe(false);
    expect(disclosure?.textContent).toContain("Technical detail");
    expect(document.querySelector("[data-refusal-text]")?.textContent).toBeTruthy();
  });

  it("links to the canonical builder on the one refusal the owner can act on", () => {
    mount(<RefusalNotice refusal={refusalFor('{"version":99}')} />);

    // Refusing forwards is only affordable because the canonical builder is a static site and is
    // always current, so the fix is following a link (§4.3).
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("https://mandymoorefan.github.io/linkpage/");
  });

  it("carries no link on the two that are about the file itself", () => {
    mount(<RefusalNotice refusal={refusalFor("[1, 2, 3]")} />);
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("is a notice in place, not a dialog", () => {
    mount(<RefusalNotice refusal={refusalFor("[1, 2, 3]")} />);

    // §7.9: never a modal, never a navigation. There is nothing here to dismiss, because the
    // recovery is picking again.
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.querySelector("[aria-modal]")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("the picker (§7.7)", () => {
  it("hands the file over and clears itself, so the same one can be picked again", () => {
    const onPick = vi.fn();
    mount(<ProjectPicker onPick={onPick} />);

    const input = document.querySelector("[data-file-picker]") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(["{}"], "project.json")] } });

    expect(onPick).toHaveBeenCalledTimes(1);
    // A file input fires no `change` for the same path twice, and after a refusal that path is
    // exactly what an owner who mis-tapped is about to choose again (§7.9).
    expect(input.value).toBe("");
  });

  it("hints at .json without deciding anything by it", () => {
    mount(<ProjectPicker onPick={() => {}} />);

    const input = document.querySelector("[data-file-picker]") as HTMLInputElement;
    expect(input.getAttribute("accept")).toBe(".json,application/json");
  });

  it("is reachable through a ref, because the control that opens it is elsewhere", () => {
    const ref = createRef<HTMLInputElement>();
    const onPick = vi.fn();
    mount(<ProjectPicker ref={ref} onPick={onPick} />);

    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });
});

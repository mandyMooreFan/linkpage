// @vitest-environment jsdom

import { cleanup, fireEvent, render as mount, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SocialQuestion } from "./SectionQuestions.js";
import { ROW_LIST_FIELDS, ROW_STACK_PADDING } from "../../ui/row.js";
import { SOCIAL_PLATFORMS } from "@linkpage/renderer";

/**
 * *Where else are you online?* — the screen the beta map's walk (#359, moments 17 and 18) and its
 * spec pass (#358, finding 8) both stopped on, built by #376.
 *
 * **Two things are guarded here and they pull against each other.** The pair reads as a pair, and
 * the *Where* box still takes anything typed into it. The first is why the row joins the list
 * family; the second is why the suggestions are a list the owner may ignore rather than a
 * `<select>` — §2.4 draws ten marks and §4.4 keeps any platform outside them, LinkedIn being the
 * live case. A test that only checked the ten would pass on a control that had quietly become
 * closed, so `keeps a platform that is not one of the ten` is the load-bearing one.
 */

function render(initial?: Parameters<typeof SocialQuestion>[0]["initial"]) {
  const onAnswer = vi.fn();
  const result = mount(<SocialQuestion initial={initial} onAnswer={onAnswer} onSkip={vi.fn()} />);
  return { onAnswer, ...result };
}

/** Every *Where* box on the screen, in the order the rows are in. */
const whereBoxes = (): HTMLInputElement[] =>
  screen.getAllByLabelText("Where") as HTMLInputElement[];

const rows = (): HTMLElement[] => Array.from(document.querySelectorAll("[data-social-row]"));

afterEach(cleanup);

describe("the pair is one row, in the list family the link buttons already use (#376)", () => {
  /**
   * The screen wrote `border-b border-rule py-2` by hand — the fourth spelling of the row B-43
   * wrote once in `ui/row.ts`, and the one `LinkButtons` names in its own comment as the shape it
   * replaced. That is the whole of both findings: 8px of padding under a 32px gap inverts the
   * grouping the walk said was missing, and the per-row `border-b` is the second rule it saw,
   * sitting under the address field's own line.
   */
  it("separates the rows with the list's hairlines rather than a rule per row", () => {
    render([
      { platform: "instagram", url: "https://instagram.test/ada" },
      { platform: "facebook", url: "https://facebook.test/ada" },
    ]);

    const list = document.querySelector("[data-social-rows]");
    expect(list?.className).toContain(ROW_LIST_FIELDS);

    /*
     * **The point of the whole finding, stated as the thing it is.** *Your page there* is an
     * underlined field at the foot of every row, so any rule the list draws at its own edge lands
     * a few pixels under that underline and *is* the doubled line the walk saw. `border-y` moved
     * it from 10px to 14px rather than mending it; the rules go between the rows and nowhere else.
     */
    expect(list?.className).not.toContain("border-y");
    expect(list?.className).toContain("divide-y");

    // Named, not implied: without it the loop below is vacuous and passes on a screen that has
    // no rows at all — which is exactly how it passed before this was built.
    expect(rows()).toHaveLength(2);
    for (const row of rows()) {
      expect(row.className).not.toContain("border-b");
    }
  });

  it("gives the row the section padding, so the boundary is wider than the gap inside it", () => {
    render();
    expect(rows()).toHaveLength(1);
    for (const row of rows()) {
      expect(row.className).toContain(ROW_STACK_PADDING.className);
    }
  });
});

describe("the Where box says it has suggestions, and still takes anything (#376)", () => {
  it("offers a control that opens the suggestions", () => {
    render();
    const open = screen.getByRole("button", { name: /show the sites we know/i });
    expect(open.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(open);
    expect(open.getAttribute("aria-expanded")).toBe("true");

    const listbox = screen.getByRole("listbox");
    const offered = within(listbox)
      .getAllByRole("option")
      .map((option) => option.textContent?.toLowerCase());
    for (const platform of SOCIAL_PLATFORMS) {
      expect(offered).toContain(platform);
    }
  });

  it("writes the chosen site into the box and closes the list", () => {
    render();
    fireEvent.click(screen.getByRole("button", { name: /show the sites we know/i }));
    fireEvent.click(
      within(screen.getByRole("listbox")).getByRole("option", { name: /instagram/i }),
    );

    expect(whereBoxes()[0]?.value.toLowerCase()).toBe("instagram");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("narrows the suggestions to what has been typed", () => {
    render();
    fireEvent.change(whereBoxes()[0] as HTMLInputElement, { target: { value: "face" } });

    const named = within(screen.getByRole("listbox"))
      .getAllByRole("option")
      .map((option) => option.textContent?.toLowerCase());
    expect(named).toEqual(["facebook"]);
  });

  /**
   * The one that has to hold. A `<select>` would have made this impossible, and LinkedIn is the
   * case the product actually meets: Simple Icons withdrew the mark at LinkedIn's request, so the
   * platform has no glyph and renders with §4.4's generic one — which only works if the owner can
   * name it in the first place.
   */
  it("keeps a platform that is not one of the ten", () => {
    const { onAnswer } = render();
    fireEvent.change(whereBoxes()[0] as HTMLInputElement, { target: { value: "LinkedIn" } });
    fireEvent.change(screen.getByLabelText("Your page there"), {
      target: { value: "linkedin.test/ada" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(onAnswer).toHaveBeenCalledWith([
      { platform: "LinkedIn", url: "https://linkedin.test/ada" },
    ]);
  });

  it("closes the list on Escape without taking the typed answer away", () => {
    render();
    const box = whereBoxes()[0] as HTMLInputElement;
    fireEvent.change(box, { target: { value: "face" } });
    expect(screen.getByRole("listbox")).toBeDefined();

    fireEvent.keyDown(box, { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(box.value).toBe("face");
  });

  /** Each row suggests into its own box; a second row must not write into the first. */
  it("gives every row its own suggestions", () => {
    render([
      { platform: "", url: "" },
      { platform: "", url: "" },
    ]);
    const opens = screen.getAllByRole("button", { name: /show the sites we know/i });
    expect(opens).toHaveLength(2);

    fireEvent.click(opens[1] as HTMLElement);
    fireEvent.click(within(screen.getByRole("listbox")).getByRole("option", { name: /^x$/i }));

    expect(whereBoxes()[0]?.value).toBe("");
    expect(whereBoxes()[1]?.value.toLowerCase()).toBe("x");
  });
});

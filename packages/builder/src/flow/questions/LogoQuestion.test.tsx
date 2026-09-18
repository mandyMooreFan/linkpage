// @vitest-environment jsdom

import type { Logo } from "@linkpage/renderer";
import { cleanup, fireEvent, render as mount, screen, waitFor } from "@testing-library/react";
import { useState, type JSX } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  LOGO_ACCEPT,
  LOGO_MESSAGES,
  SOFT_RESULT_MESSAGE,
  type LogoIntake,
} from "../../logo/index.js";
import { LogoQuestion } from "./LogoQuestion.js";

/**
 * The logo screen — four lines calling #31's pipeline, and the three rules of §6.6 that show
 * up at the surface.
 *
 * The pipeline itself is tested in `../../logo`; what is tested here is the seam. In
 * particular that **a failed input never damages what is already there**: the screen hands the
 * whole result to the flow, the flow hands it to `applyIntake`, and the rejected branch of the
 * union has no logo on it to apply.
 */

afterEach(cleanup);

const LOGO: Logo = { src: "data:image/png;base64,iVBORw0KGgo=", width: 1200, height: 400 };

/**
 * Reached by its §7.4 hook rather than by role or by name, because #254 took both away from
 * it: the input is `aria-hidden` and out of the tab order, and the button above it is the
 * control. `pickers.test.tsx` is what holds that.
 */
const picker = (): HTMLInputElement =>
  document.querySelector("[data-file-picker]") as HTMLInputElement;
const pick = (): boolean =>
  fireEvent.change(picker(), { target: { files: [new File(["x"], "logo.png")] } });

/** The chosen-file state on the form (#374): the thumbnail and the words beside it. */
const chosen = (): HTMLElement | null => document.querySelector("[data-chosen]");
const zone = (): HTMLButtonElement =>
  document.querySelector("[data-drop-zone]") as HTMLButtonElement;

function view(logo: Logo | null, result: LogoIntake) {
  const onPick = vi.fn();
  const onContinue = vi.fn();
  const onSkip = vi.fn();
  mount(
    <LogoQuestion
      logo={logo}
      onPick={onPick}
      onContinue={onContinue}
      onSkip={onSkip}
      intake={() => Promise.resolve(result)}
    />,
  );
  return { onPick, onContinue, onSkip };
}

describe("the logo step", () => {
  it("greys designer files out of the picker rather than failing on them (§6.6)", () => {
    view(null, { ok: true, logo: LOGO, encoding: "image/png", notice: null });
    expect(picker().getAttribute("accept")).toBe(LOGO_ACCEPT);
    expect(LOGO_ACCEPT).not.toContain("image/*");
  });

  it("carries the escape, like every optional step (§7.2)", () => {
    const { onSkip } = view(null, { ok: true, logo: LOGO, encoding: "image/png", notice: null });

    fireEvent.click(document.querySelector("[data-escape]") as Element);
    expect(onSkip).toHaveBeenCalled();
  });

  it("hands the whole result over, and says nothing in the common case", async () => {
    // "In the common case there is no message at all — the logo appears in the preview, and
    // that is the feedback."
    const result: LogoIntake = { ok: true, logo: LOGO, encoding: "image/png", notice: null };
    const { onPick } = view(null, result);

    pick();
    await waitFor(() => expect(onPick).toHaveBeenCalledWith(result));
    expect(document.querySelector("[data-notice]")).toBeNull();
  });

  it("speaks only when the result is visibly worse (§6.6)", async () => {
    const { onPick } = view(null, {
      ok: true,
      logo: LOGO,
      encoding: "image/jpeg",
      notice: SOFT_RESULT_MESSAGE,
    });

    pick();
    await waitFor(() =>
      expect(document.querySelector("[data-notice]")?.textContent).toBe(SOFT_RESULT_MESSAGE),
    );
    expect(onPick).toHaveBeenCalled();
  });

  it("puts a refusal in place beside the control, with no logo on it (§7.9)", async () => {
    const refusal: LogoIntake = {
      ok: false,
      reason: "undecodable",
      message: LOGO_MESSAGES.undecodable,
    };
    const { onPick } = view(LOGO, refusal);

    pick();
    await waitFor(() =>
      expect(document.querySelector("[data-notice]")?.textContent).toBe(LOGO_MESSAGES.undecodable),
    );
    // The existing logo is still what the screen is holding: nothing on the failing branch of
    // the union can replace it, so "a failed input never damages what is already there" is a
    // property of the type rather than of this component.
    expect(onPick).toHaveBeenCalledWith(refusal);
    expect(
      screen.getByRole("button", { name: "Choose a different file or drop one here" }),
    ).toBeTruthy();
    // And the picture that was already there is still the one the form says is on the page.
    expect(chosen()?.textContent).toContain("Your logo is on your page");
  });

  it("will not continue past a screen with nothing on it — and says so (§7.9 decision 1, #368)", () => {
    const { onContinue } = view(null, {
      ok: true,
      logo: LOGO,
      encoding: "image/png",
      notice: null,
    });
    const submit = document.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submit.disabled).toBe(false);

    fireEvent.click(submit);
    expect(document.querySelector("[data-message]")?.textContent).toBe(
      "No picture chosen yet — choose a file, or say you don't have one.",
    );
    expect(onContinue).not.toHaveBeenCalled();
  });
});

/**
 * The drop zone, and the chosen-file state on the form (#374; §6.6, §7.12 commitment 6).
 *
 * The desktop walk's moments 9 and 10: *Choose a file* was a small outlined button, and once a
 * file was chosen the form said nothing about it — the picture reached the page beside it, and
 * that was the only sign. Now the control is a large region the owner can press or drop a
 * picture on, and the form shows the picture's name beside a thumbnail of it once it is on the
 * page. One control, one name, still: `pickers.test.tsx` holds that.
 */
describe("the drop zone and the chosen-file state (#374)", () => {
  const accepted: LogoIntake = { ok: true, logo: LOGO, encoding: "image/png", notice: null };

  /**
   * The screen as the flow mounts it: a pick that succeeds comes back as the `logo` prop, the
   * way `applyIntake` hands it back in `Flow.tsx`. `view` above holds the prop still, which is
   * right for the seam tests and wrong for a state that only exists once the picture is there.
   */
  function live(initial: Logo | null, read: () => LogoIntake) {
    const onPick = vi.fn();
    function Harness(): JSX.Element {
      const [logo, setLogo] = useState<Logo | null>(initial);
      return (
        <LogoQuestion
          logo={logo}
          onPick={(result) => {
            onPick(result);
            if (result.ok) setLogo(result.logo);
          }}
          onContinue={vi.fn()}
          onSkip={vi.fn()}
          intake={() => Promise.resolve(read())}
        />
      );
    }
    mount(<Harness />);
    return { onPick };
  }

  it("offers one large region to press, whose words say a picture can be dropped on it", () => {
    view(null, accepted);
    const control = screen.getByRole("button", { name: "Choose a file or drop a picture here" });
    expect(control).toBe(zone());
    // As wide as the column, not as wide as its words: this is a region, not a button weight.
    expect(zone().className).toContain("w-full");
    expect(zone().className).toContain("border-dashed");
  });

  it("says nothing about a file before there is one", () => {
    view(null, accepted);
    expect(chosen()).toBeNull();
  });

  it("shows the file's name and a thumbnail once the picture is on the page", async () => {
    live(null, () => accepted);
    pick();
    await waitFor(() => expect(chosen()).not.toBeNull());
    expect(chosen()?.textContent).toContain("logo.png");
    const thumb = chosen()?.querySelector("img");
    expect(thumb?.getAttribute("src")).toBe(LOGO.src);
    // Decorative beside its own name, as the page's logo is beside the business name (§6.6).
    expect(thumb?.getAttribute("alt")).toBe("");
  });

  it("names the picture it already has when the screen opens with one", () => {
    view(LOGO, accepted);
    expect(chosen()?.textContent).toContain("Your logo is on your page");
    expect(chosen()?.querySelector("img")?.getAttribute("src")).toBe(LOGO.src);
  });

  it("keeps the earlier name when a later file is refused (§6.6)", async () => {
    let result: LogoIntake = accepted;
    live(null, () => result);
    pick();
    await waitFor(() => expect(chosen()?.textContent).toContain("logo.png"));

    result = { ok: false, reason: "undecodable", message: LOGO_MESSAGES.undecodable };
    fireEvent.change(picker(), { target: { files: [new File(["x"], "brochure.pdf")] } });
    await waitFor(() =>
      expect(document.querySelector("[data-notice]")?.textContent).toBe(LOGO_MESSAGES.undecodable),
    );
    expect(chosen()?.textContent).toContain("logo.png");
    expect(chosen()?.textContent).not.toContain("brochure.pdf");
  });

  it("takes a dropped file through the same door as a chosen one", async () => {
    const { onPick } = live(null, () => accepted);
    const file = new File(["x"], "dropped.png");
    fireEvent.dragOver(zone(), { dataTransfer: { files: [file], types: ["Files"] } });
    expect(zone().getAttribute("data-over")).toBe("true");
    fireEvent.drop(zone(), { dataTransfer: { files: [file], types: ["Files"] } });
    expect(zone().getAttribute("data-over")).toBe("false");
    await waitFor(() => expect(onPick).toHaveBeenCalledWith(accepted));
    expect(chosen()?.textContent).toContain("dropped.png");
  });

  it("is unavailable while a file is being read, and says so the way every button does", () => {
    view(null, { ok: true, logo: LOGO, encoding: "image/png", notice: null });
    expect(zone().className).toContain("disabled:border-rule");
    expect(zone().className).toContain("disabled:text-ink-quiet");
  });
});

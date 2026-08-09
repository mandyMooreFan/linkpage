// @vitest-environment jsdom

import type { Logo } from "@linkpage/renderer";
import { cleanup, fireEvent, render as mount, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  LOGO_ACCEPT,
  LOGO_MESSAGES,
  SOFT_RESULT_MESSAGE,
  type LogoIntake,
} from "../../logo/index.js";
import { LogoQuestion } from "./LogoQuestion.js";

/**
 * The logo screen — four lines calling #31's pipeline, and the three rules of §6.5 that show
 * up at the surface.
 *
 * The pipeline itself is tested in `../../logo`; what is tested here is the seam. In
 * particular that **a failed input never damages what is already there**: the screen hands the
 * whole result to the flow, the flow hands it to `applyIntake`, and the rejected branch of the
 * union has no logo on it to apply.
 */

afterEach(cleanup);

const LOGO: Logo = { src: "data:image/png;base64,iVBORw0KGgo=", width: 1200, height: 400 };

const picker = (): HTMLInputElement => screen.getByLabelText("Choose a logo file");
const pick = (): boolean =>
  fireEvent.change(picker(), { target: { files: [new File(["x"], "logo.png")] } });

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
  it("greys designer files out of the picker rather than failing on them (§6.5)", () => {
    view(null, { ok: true, logo: LOGO, encoding: "image/png", notice: null });
    expect(picker().getAttribute("accept")).toBe(LOGO_ACCEPT);
    expect(LOGO_ACCEPT).not.toContain("image/*");
  });

  it("carries the escape, like every optional step (§7.2)", () => {
    const { onSkip } = view(null, { ok: true, logo: LOGO, encoding: "image/png", notice: null });

    fireEvent.click(document.querySelector(".question__escape") as Element);
    expect(onSkip).toHaveBeenCalled();
  });

  it("hands the whole result over, and says nothing in the common case", async () => {
    // "In the common case there is no message at all — the logo appears in the preview, and
    // that is the feedback."
    const result: LogoIntake = { ok: true, logo: LOGO, encoding: "image/png", notice: null };
    const { onPick } = view(null, result);

    pick();
    await waitFor(() => expect(onPick).toHaveBeenCalledWith(result));
    expect(document.querySelector(".notice")).toBeNull();
  });

  it("speaks only when the result is visibly worse (§6.5)", async () => {
    const { onPick } = view(null, {
      ok: true,
      logo: LOGO,
      encoding: "image/jpeg",
      notice: SOFT_RESULT_MESSAGE,
    });

    pick();
    await waitFor(() =>
      expect(document.querySelector(".notice")?.textContent).toBe(SOFT_RESULT_MESSAGE),
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
      expect(document.querySelector(".notice")?.textContent).toBe(LOGO_MESSAGES.undecodable),
    );
    // The existing logo is still what the screen is holding: nothing on the failing branch of
    // the union can replace it, so "a failed input never damages what is already there" is a
    // property of the type rather than of this component.
    expect(onPick).toHaveBeenCalledWith(refusal);
    expect(screen.getByRole("button", { name: "Choose a different file" })).toBeTruthy();
  });

  it("will not continue past a screen with nothing on it", () => {
    view(null, { ok: true, logo: LOGO, encoding: "image/png", notice: null });
    expect((document.querySelector(".question__submit") as HTMLButtonElement).disabled).toBe(true);
  });
});

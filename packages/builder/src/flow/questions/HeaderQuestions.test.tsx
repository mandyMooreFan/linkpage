// @vitest-environment jsdom
import { cleanup, fireEvent, render as mount, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NameQuestion, TaglineQuestion } from "./HeaderQuestions.js";

afterEach(cleanup);

/**
 * The two header questions (`SPEC.md` §2.3, §7.2). What is held here is #382's split: the
 * tagline's line wraps, the name's does not — the finding named the tagline box, and the name
 * is left as it stands.
 */
describe("the tagline's line wraps (#382)", () => {
  it("is the line that grows to its words", () => {
    mount(<TaglineQuestion initial="" onAnswer={() => {}} onSkip={() => {}} />);
    const box = screen.getByLabelText("Tagline");
    expect(box.tagName).toBe("TEXTAREA");
    expect(box.hasAttribute("data-wraps")).toBe(true);
  });

  it("still answers on Enter", () => {
    const onAnswer = vi.fn();
    mount(<TaglineQuestion initial="" onAnswer={onAnswer} onSkip={() => {}} />);
    const box = screen.getByLabelText("Tagline");
    fireEvent.change(box, { target: { value: "Sourdough since 1902" } });
    fireEvent.keyDown(box, { key: "Enter" });
    expect(onAnswer).toHaveBeenCalledWith("Sourdough since 1902");
  });

  /**
   * **This said `INPUT` until #399**, and was right to: #382's finding named the tagline, and the
   * scope line is worth a test rather than a comment. #399 is the ticket it was waiting for — a
   * 72-character trading name hid 242px of itself at 390 — so the claim is inverted rather than
   * deleted, and the two boxes §7.4 names as the single long answers are now one shape.
   */
  it("and the name's line, which waited for #399", () => {
    mount(<NameQuestion initial="" onAnswer={() => {}} />);
    const box = screen.getByLabelText("Business name");
    expect(box.tagName).toBe("TEXTAREA");
    expect(box.hasAttribute("data-wraps")).toBe(true);
  });

  /**
   * The check #399's ticket asked for before this was turned on. `organization` is valid on a
   * `<textarea>` — WHATWG's autofill table puts it in the Text control group, *"input (Hidden,
   * Text, Search), textarea, select"* — and what could still have gone wrong is the attribute
   * being dropped on the way through `wrappingInput`, which is what this reads.
   */
  it("keeps the name box's autofill hint through the change", () => {
    mount(<NameQuestion initial="" onAnswer={() => {}} />);
    expect(screen.getByLabelText("Business name").getAttribute("autocomplete")).toBe(
      "organization",
    );
  });
});

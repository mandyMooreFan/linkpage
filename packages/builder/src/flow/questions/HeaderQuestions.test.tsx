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

  it("leaves the name's line as it was", () => {
    mount(<NameQuestion initial="" onAnswer={() => {}} />);
    expect(screen.getByLabelText("Business name").tagName).toBe("INPUT");
  });
});

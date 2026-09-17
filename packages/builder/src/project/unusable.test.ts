import { describe, expect, it } from "vitest";
import { buttonJudge, emailJudge, linkJudge } from "./unusable.js";

/**
 * The screen's judges. `SPEC.md` §7.9 decisions 1 and 6, #368.
 *
 * Each is the renderer's own floor asked the screen's question — *can the page make a target
 * from this?* — so the table below is a table of what the page does, not of what a format
 * looks like. Blank is never unusable: whether blank is an answer is the screen's own question.
 */
describe("the screen's judges (§7.9, #368)", () => {
  const BUTTON = "This button won't work — paste the address from your browser.";
  const LINK = "This link won't work — paste the address from your browser.";
  const EMAIL = "Tapping this won't open an email — check the address.";

  it.each([
    ["", true],
    ["   ", true],
    ["https://ada.example/menu", true],
    ["ada.example/menu", true],
    ["  ada.example  ", true],
    ["a", BUTTON],
    ["menu", BUTTON],
    ["not a url", BUTTON],
  ])("a link button's address %j → %j", (url, verdict) => {
    expect(buttonJudge(url)).toBe(verdict);
  });

  it("says *link*, not *button*, for directions and social — one noun of variation", () => {
    expect(linkJudge("a")).toBe(LINK);
    expect(linkJudge("maps.example/ada")).toBe(true);
    expect(linkJudge("")).toBe(true);
  });

  it.each([
    ["", true],
    ["hello@ada.example", true],
    ["josé@café.fr", true],
    ["hello @ada.example", true], // the mend strips the space, so the page can dial it
    ["hello@", EMAIL],
    ["hello", EMAIL],
    ["hello@ada", EMAIL],
    ["he@llo@ada.example", EMAIL],
  ])("an email %j → %j", (email, verdict) => {
    expect(emailJudge(email)).toBe(verdict);
  });
});

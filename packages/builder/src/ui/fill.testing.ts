import { WEIGHT } from "./Button.js";

/**
 * The filled buttons on a surface — test support for §4's one-per-screen rule.
 *
 * **Test support, not shipped code**, the same standing as `fixtures.ts` and
 * `download/downloads.testing.ts`, and here rather than in one test file because three of them
 * need it: `flow.test.tsx` for every wizard step, `list.test.tsx` for the review list's two
 * placements, and `download/download.test.tsx` for the sheet.
 *
 * **Why a rendered check rather than another source guard.** `controls.test.ts` can say the solid
 * fill is written in exactly one place — and it does, below the button rules — but *how many of
 * that one thing land on a screen at once* is not a fact about the source at all. It is a fact
 * about state: the review list grew its second fill only when a row was open, and the Download
 * sheet's two were in different sections of one component. Both read perfectly in the source.
 *
 * **Derived from `WEIGHT`, never re-typed.** `Button` renders `${WEIGHT[weight]} ${className}`, so
 * a filled button's class attribute contains that whole string verbatim; matching on it means the
 * day someone renames the fill this helper follows rather than silently finding nothing. A
 * hand-written fill that never went through `Button` would slip past it, which is the half
 * `controls.test.ts` holds: `bg-ink` is written in `Button.tsx` and nowhere else.
 */
export function filledButtons(root: ParentNode = document): HTMLButtonElement[] {
  return [...root.querySelectorAll("button")].filter((button) =>
    button.className.includes(WEIGHT.primary),
  );
}

/** The names of the filled buttons on a surface, for an assertion that says what it found. */
export function filledLabels(root: ParentNode = document): string[] {
  return filledButtons(root).map((button) => button.textContent?.trim() ?? "");
}

/**
 * The small text-only buttons on a surface — test support for B-21's one ink (#234).
 *
 * Found the same way and for the same reason as `filledButtons`: `WEIGHT.quiet` verbatim, so a
 * rename follows rather than quietly matching nothing. What it is for is the other half of the
 * ink rule — `controls.test.ts` can say no call site *spells* a colour on a `<Button>`, and only
 * a rendered screen can say what the buttons a person is actually looking at came out as.
 */
export function quietButtons(root: ParentNode = document): HTMLButtonElement[] {
  return [...root.querySelectorAll("button")].filter((button) =>
    button.className.includes(WEIGHT.quiet),
  );
}

/**
 * The `text-*` classes a rendered element carries, in the order they were written.
 *
 * `Button` renders `${WEIGHT[weight]} ${className}`, so the weight's own type and ink come first
 * and anything a call site adds lands after them — which is what lets an assertion say *this
 * size and this ink, with nothing laid over them* rather than merely *this ink is present
 * somewhere*.
 */
export function textClasses(element: Element): string[] {
  return element.className.split(/\s+/).filter((one) => one.startsWith("text-"));
}

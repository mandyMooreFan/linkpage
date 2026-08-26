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

import { WEIGHT, type ButtonWeight } from "./Button.js";

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

/**
 * Which weight a rendered `<button>` came out of, or `undefined` if it never went through
 * `Button` at all — the reorder arrows, the swatches, the topic rows, a preset tile.
 *
 * Matched on `WEIGHT[name]` verbatim, the way `filledButtons` and `quietButtons` are and for the
 * same reason: a rename follows the record rather than quietly matching nothing. Nothing in
 * `WEIGHT` is a substring of anything else in it — the boxes are `py-2` and `inline` is `p-0` —
 * so the first name that matches is the one, and this is checked in `controls.test.ts`.
 */
export function weightOf(element: Element): ButtonWeight | undefined {
  return (Object.keys(WEIGHT) as ButtonWeight[]).find((name) =>
    element.className.includes(WEIGHT[name]),
  );
}

/**
 * The classes a rendered element uses to decide how wide it is, in the order they were written.
 *
 * **`self-*` counts as one of them**, which is the finding rather than an over-reach (B-72, #230):
 * `align-self` is how `secondary` and `quiet` used to reach their width, and `align-items` on a
 * parent is how `primary` got its. Both are the cross axis deciding a width, so a rule about
 * width has to be able to see them. `shrink-*` is here for the same reason from the other axis —
 * it is what `primary` carried *instead* of saying a width.
 */
export function widthsIn(classes: string): string[] {
  return classes
    .split(/\s+/)
    .filter((one) => /^(w-|min-w-|max-w-|self-|shrink-|grow|flex-1)/.test(one));
}

/** The same question asked of something on the glass. */
export function widthClasses(element: Element): string[] {
  return widthsIn(element.className);
}

/**
 * The width a weight is supposed to resolve to on every screen in the tool.
 *
 * Read off `WEIGHT` rather than typed here, so the rendered assertions and the source rule in
 * `controls.test.ts` cannot disagree about what they are both holding.
 */
export function declaredWidth(weight: ButtonWeight): string[] {
  return widthsIn(WEIGHT[weight]);
}

/**
 * Every button on the glass whose width is not the one its own weight names — B-72's rendered
 * half (#230), and empty is the passing answer.
 *
 * **Why this is the rendered check and not a measurement.** jsdom lays nothing out, so no test in
 * this suite can read a pixel. What it can read is the class list, and `w-fit` is a *definite*
 * width: a flex parent's `align-items: stretch` has nothing left to stretch once it is there. So
 * "the weight's width is on the button, with nothing laid over it" is the same claim as "no
 * container widened it", made in the one place a unit test can stand. What the pictures are for
 * is the other direction — that the width the weight chose is the right one.
 *
 * Raw `<button>`s are skipped rather than failed: the reorder arrows, the swatches, the topic
 * rows and the preset tiles never went through `Button` and are not weights.
 */
export function widthDisagreements(root: ParentNode = document): string[] {
  return [...root.querySelectorAll("button")].flatMap((button) => {
    const weight = weightOf(button);
    if (weight === undefined) return [];
    const wanted = declaredWidth(weight).join(" ");
    const found = widthClasses(button).join(" ");
    if (found === wanted) return [];
    const label = button.textContent?.trim() ?? "";
    return [`"${label}" (${weight}) is ${found || "unwidthed"}, not ${wanted || "unwidthed"}`];
  });
}

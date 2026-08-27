/**
 * **What the run meant to photograph, and what it did not get.** `SPEC.md` §7.4.
 *
 * A run leaves two kinds of gap in a folder and they were being said in one voice.
 *
 * - **An exclusion is a decision.** [#209](https://github.com/mandyMooreFan/linkpage/issues/209)
 *   built the ledger for those — printed when the run finishes and written into `README.txt` —
 *   because "a cap nobody is told about reads as complete coverage". *The confirmation's Download
 *   my work first branch* is not missing; it was ruled out, with a reason, on purpose.
 * - **A screen the run meant to reach and could not is a defect in the instrument.** That is
 *   [#208](https://github.com/mandyMooreFan/linkpage/issues/208)'s principle, not #209's: the
 *   ritual's failure mode is being *confidently wrong rather than broken, so nobody goes
 *   looking*. #208 refuses outright when it cannot tell whose server it is photographing. This is
 *   the same class of failure one screen at a time.
 *
 * **What went wrong when the two shared a voice** (#270). #254 correctly took an `aria-label`
 * off the import picker, the walk still looked for it, and from `be7aaff` every run printed
 *
 *     ! no project picker on the list — skipping the import screens.
 *
 * and finished with exit 0, a cheerful `70 shots →` and a ledger of deliberate cuts that did not
 * mention it. §7.8's replace confirmation and §7.9's refusal — the two frames #209 went to
 * trouble to reach and #200 could not evidence at all — were absent from every set taken for
 * three months, and several tickets ran `pnpm shots`, read past the line and reported a pair as a
 * before and after. **The machinery worked and the voice was wrong.**
 *
 * ## Two halves, because one of them cannot see the other
 *
 * **The reasons** are the `!` sites in the walk: places that know *why* they gave up. They are
 * recorded rather than logged, so they survive into the folder.
 *
 * **The census** is this file: the run declares the frames it means to produce *before* it walks,
 * and anything declared that never arrived is named at the end. It exists because the reasons
 * cannot cover the silent case — a walk full of `if (await thing.count())` guards skips a screen
 * without a word when the thing is not there, and #270 is exactly what that looks like from
 * outside. **A guard that only reports what some other line already noticed is not a guard.**
 *
 * **`missing` refuses to work on an empty list**, which is the map's standing rule in one line: a
 * check over nothing reports "nothing wrong" forever. Breaking one corpus read on the last map
 * left 94 of 119 tests green, so the census proves it was given something to look for before it
 * is allowed to say everything is here.
 *
 * ## What this is not
 *
 * **Not an assertion about what a picture looks like.** Nothing here opens a PNG. It compares two
 * lists of names — the line `port.mjs` and `stability.mjs` both draw — so it can be checked red
 * without a browser, a server or a screenshot. §7.4's terms are untouched: still hand-run, still
 * never wired to CI, still no opinion about pixels.
 */

/**
 * A heading or a row id, as it appears in a filename.
 *
 * **It lives here rather than in the walk because the census has to spell a frame's name exactly
 * as the walk does.** Two copies of this would be §7.4's own warning about a repeated decision,
 * with the failure showing up as a phantom missing screen.
 */
export function slug(s) {
  return String(s)
    .toLowerCase()
    .replace(/[“”'?]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

/**
 * The wizard's frames, derived from `ANSWERS` rather than listed again.
 *
 * Every step is photographed on arrival; a step that is *answered* is photographed again once it
 * is. A declined one is not — `skip` presses the escape and there is nothing filled in to show —
 * which is why this reads the spec's `kind` instead of assuming two frames a step.
 */
export function flowFrames(answers) {
  return Object.entries(answers).flatMap(([heading, spec], index) => {
    const name = `${String(index + 1).padStart(2, "0")}-${slug(heading)}`;
    return spec.kind === "skip" ? [`${name}-arrive`] : [`${name}-arrive`, `${name}-filled`];
  });
}

/**
 * The screens that are not the wizard and whose names do not depend on the project.
 *
 * **The review list's rows are deliberately not here.** How many rows there are and what they are
 * called comes from the answers the walk gave, so the walk declares those as it meets them (see
 * `expect` in the ritual). What is listed here is fixed: the list arrives, the rows come forward,
 * the sheet, the menu, and the menu's two import surfaces.
 */
export const LIST_FRAMES = [
  "50-arrive",
  "51-list-rows",
  "60-download-sheet",
  "61-menu",
  "62-menu-file-refused",
  "63-menu-replace-confirm",
];

/** The exported page's frames: one per combination, plus the hovered ones. */
export function pageFrames(variants, hovered) {
  return [...variants.map((c) => `pages/${c}`), ...hovered.map((c) => `pages/${c}-hover`)];
}

/**
 * Everything this run means to produce, as paths relative to the run folder and without the
 * `.png` — the same identifiers the walk records when it takes a shot.
 *
 * **It answers for the run's own flags, not for the ritual in general.** `--only page` does not
 * mean to photograph the builder and `--variant` narrows the page set, so neither is a miss.
 * That is the whole distinction this file exists to draw: a narrowing somebody asked for is not
 * a screen that went missing.
 */
export function intended({ answers, sizes, only, pageSize, variants, hovered }) {
  const frames = [];
  for (const dir of sizes) {
    if (only === "page" && dir !== pageSize) continue;
    if (only !== "page") {
      for (const name of [...flowFrames(answers), ...LIST_FRAMES]) frames.push(`${dir}/${name}`);
    }
    if (only !== "builder" && dir === pageSize) {
      for (const name of pageFrames(variants, hovered)) frames.push(`${dir}/${name}`);
    }
  }
  return frames;
}

/**
 * The declared frames that never arrived, named.
 *
 * **Identify, don't count** — the map's rule, and the reason this returns the names rather than a
 * number. A run that says "4 screens missing" sends nobody anywhere.
 *
 * **It throws on an empty declaration** rather than returning "nothing missing". A census over
 * nothing is the shape of guard this repo has been bitten by twice, and the ritual's own docblock
 * already reserves exit 1 for *there are no pictures at all* — a run that declared no screens is
 * that failure, discovered from the other end.
 */
export function missing(intended, taken) {
  if (intended.length === 0) {
    throw new Error(
      "the census was handed no screens to look for, so it could not have found one missing",
    );
  }
  const took = new Set(taken);
  return intended.filter((name) => !took.has(name)).sort((a, b) => (a < b ? -1 : 1));
}

/**
 * The section the run prints and writes into `README.txt` when it could not reach a screen.
 *
 * **The last line is the point of the whole section.** The failure #270 records is not that a
 * frame was absent — it is that somebody put two folders side by side, found them identical, and
 * read that as *nothing moved*. A set with a hole in it cannot say that, and it has to say so
 * where the reading happens.
 */
export function unreached(frames, reasons) {
  if (frames.length === 0 && reasons.length === 0) return [];
  return [
    "COULD NOT PHOTOGRAPH — this set is incomplete:",
    ...frames.map((name) => `  · ${name}.png — meant to reach it, did not`),
    ...(reasons.length === 0
      ? []
      : ["  Why:", ...reasons.flatMap(({ what, why }) => [`    · ${what}`, `        ${why}`])]),
    "  A screen that is missing is not a screen that did not move. Until this is fixed, two",
    "  folders being identical here proves nothing, and neither does a difference.",
  ];
}

/**
 * The other half of the same sentence, said when there is no hole.
 *
 * **A run that only speaks up on failure teaches nobody that it was looking.** #242's steadiness
 * verdict says the camera held still even when it did; this says the set is whole even when it
 * is, so a reviewer knows the claim is being made rather than assumed.
 */
export function covered(intended) {
  return [
    `Every screen this run meant to reach is here: all ${intended.length} of them, the review`,
    "list's rows included. So what is not in this folder was left out on purpose, below.",
  ];
}

/**
 * **Driving the wizard from empty to the review list.** `SPEC.md` §7.1, §7.9.
 *
 * **This was `review-shots.mjs`'s and is now shared**, because a second hand-run script needs the
 * same 60-odd driven steps: the accessibility sweep (`a11y-sweep.mjs`, change list item **CL-9**
 * of issue #272). The two want different things *at* each step — one photographs it, the other
 * runs a checker over it — and exactly the same walk to reach it.
 *
 * **What made this worth a module rather than a copy is `ANSWERS`.** It is keyed by the wizard's
 * own headings, which are product copy: they change, and a second copy would keep answering the
 * questions the flow used to ask. The ritual's own history is the argument — #270 is three months
 * of a walk holding on to an `aria-label` that had correctly moved, printing one `!` and carrying
 * on. A duplicate of this table is the same failure with the volume turned down.
 *
 * **It drives by `data-*` hooks and roles, never by utility classes.** §7.4: "Utilities are
 * styling and may change with the design; a hook is a contract and does not." And per #270, an
 * `aria-label` is closer to a class than to a hook — it is part of a control's accessibility
 * contract, so it moves when the accessibility is *corrected*.
 *
 * **Nothing here judges the product or writes anything.** It walks, and it tells its caller what
 * it met through the hooks. Both callers are hand-run and neither is wired to CI.
 *
 * **It does check that its own driving took, and that is not the same thing** (#302). A step that
 * *asks* nothing of the screen it reached is not the same as a step that cannot tell whether it
 * answered it: the hours step spent an unknown stretch pressing a control that landed on nothing
 * under some scroll positions, and both callers went on reporting — 76 shots, 76 audited screens
 * — with no way to say so. Where a step can read back that its own answer took, it does, and it
 * throws rather than handing on a screen it only believes it answered. That is the map's rule
 * about a guard proving it found something, applied to the instrument rather than the product.
 */

import { slug } from "./census.mjs";

/**
 * One answer per wizard step, keyed by the question's own heading.
 *
 * Keyed by heading rather than by index so a reordered flow does not silently photograph the
 * wrong thing: an unrecognised heading stops the walk and says so, which is the failure you want.
 */
/*
 * **The answering half lives in `wizard.mjs` now** (#332). `e2e/walk.ts` drives the same wizard
 * and had its own copy of all of this; the two had drifted five times. What stays here is the
 * *route* — which step comes next, and what this walker does at each one — because the gated
 * walker's route visits different things for different reasons and #315 settled that they stay
 * apart.
 *
 * Re-exported rather than merely imported: `review-shots.mjs` and `a11y-sweep.mjs` read `ANSWERS`
 * from here, and moving the file under them would be churn for its own sake.
 */
export { ANSWERS, TEXTISH, answer, heading } from "./wizard.mjs";

import { ANSWERS, TEXTISH, answer, heading } from "./wizard.mjs";

export async function settle(page) {
  await page.waitForTimeout(400);
}

/** A step's name, as both callers spell it: its place in the flow and its own heading. */
export const stepName = (n, title) => `${String(n).padStart(2, "0")}-${slug(title)}`;

/**
 * Walk the flow from empty, handing each state to the caller as it is reached.
 *
 * `page` must already be at the app with storage cleared — the two callers differ in how they get
 * there, and one of them clears storage twice for reasons of its own.
 *
 * The hooks are all optional and all awaited:
 *
 * - `onArrive(page, name, title)` — the step as it comes up, unanswered.
 * - `onRefused(page, name, title, spec)` — the step holding something the tool cannot use.
 * - `onAnswered(page, name, title, spec)` — the step with a good answer in it, before Continue.
 * - `onMiss(what, why)` — the walk gave up, in the ritual's own two-part voice.
 *
 * **`onMiss` is the important one and it is not optional in spirit.** Every place this loop stops
 * short knows *why*, and a caller that drops those reports a short walk as a complete one — which
 * is #270 exactly. Both callers record them.
 */
export async function walkFlow(page, hooks = {}) {
  const { onArrive, onRefused, onAnswered, onMiss = () => {} } = hooks;

  let n = 0;
  const seen = new Set();
  for (;;) {
    if (!(await page.locator('[data-screen="flow"]').count())) break; // left the flow: the list
    const title = await heading(page);
    if (!title) {
      onMiss("the rest of the wizard", "the flow is on screen but has no heading to name it by");
      break;
    }
    if (seen.has(title) && seen.size > 1) {
      onMiss(
        "the rest of the wizard",
        `“${title}” came round again, so the walk stopped making progress`,
      );
      break;
    }
    seen.add(title);

    n += 1;
    const name = stepName(n, title);
    if (onArrive) await onArrive(page, name, title);

    const spec = ANSWERS[title];
    if (!spec) {
      onMiss(
        "the rest of the wizard",
        `no answer known for “${title}” — add it to ANSWERS in scripts/flow.mjs`,
      );
      break;
    }

    /*
     * §7.9's sentence, before the step is answered properly (CL-1).
     *
     * The walk answers every question correctly, so the one surface in the flow where the tool
     * says *this will not work* was in no set — the ritual's standing failure for the sixth time,
     * and the one that made CL-1's before-and-after pair come back identical. Type what cannot be
     * used, press `Continue`, hand it to the caller, then clear and carry on.
     *
     * **The press is the whole point and it must not advance the flow.** Judgement holds the
     * screen (§7.9 decision 2), so if the heading moves, the walk is looking at the wrong thing
     * and says so rather than carrying a mislabelled state into a review.
     */
    if (spec.refused !== undefined) {
      const box = page.locator(TEXTISH).first();
      await box.fill(spec.refused);
      const judge = page.getByRole("button", { name: /^(Continue|Save)$/ });
      if ((await judge.count()) && (await judge.first().isEnabled())) await judge.first().click();
      await settle(page);
      if ((await heading(page)) !== title) {
        onMiss(
          `“${title}” with something the tool cannot use`,
          `pressing Continue on “${spec.refused}” advanced the flow instead of holding it`,
        );
        break;
      }
      if (onRefused) await onRefused(page, name, title, spec);
      await box.fill("");
      await settle(page);
    }

    const needsContinue = await answer(page, spec);
    if (onAnswered) await onAnswered(page, name, title, spec);

    if (needsContinue) {
      const escape = page.locator("[data-escape]");
      const cont = page.getByRole("button", { name: /^(Continue|Save)$/ });
      if (spec.kind === "skip" && (await escape.count())) await escape.first().click();
      else if ((await cont.count()) && (await cont.first().isEnabled())) await cont.first().click();
      else if (await escape.count()) await escape.first().click();
      else {
        onMiss(
          "the rest of the wizard",
          `nothing to press on “${title}” — no enabled Continue and no escape`,
        );
        break;
      }
    }
    await settle(page);
    if (n > 20) break; // a walk this long means something is wrong, not that the flow grew
  }
  return page;
}

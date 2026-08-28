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
 * **Nothing here asserts anything or writes anything.** It walks, and it tells its caller what it
 * met through the hooks. Both callers are hand-run and neither is wired to CI.
 */

import { slug } from "./census.mjs";

/**
 * One answer per wizard step, keyed by the question's own heading.
 *
 * Keyed by heading rather than by index so a reordered flow does not silently photograph the
 * wrong thing: an unrecognised heading stops the walk and says so, which is the failure you want.
 */
export const ANSWERS = {
  "What kind of business is this?": { kind: "preset", choose: "Food & drink" },
  "What's it called?": { kind: "type", value: "Ada & Sons Bakers" },
  "One line about what you do?": {
    kind: "type",
    value: "Sourdough, pastries, and the best cheese scone in town",
  },
  "Do you have a logo?": { kind: "skip" },
  /**
   * **`refused` is what the owner types that we cannot use** (CL-1), reached before the step is
   * answered properly. The exact-colour box is the only field in the wizard that judges on screen
   * (§7.9 decision 2), so this is the one state in the whole walk showing the sentence — and
   * until CL-1 there was nothing to show, which was the finding.
   */
  "What's your colour?": { kind: "swatch", refused: "zzzzzz" },
  "Which of these do you have?": { kind: "check", labels: ["See the menu", "Order for pickup"] },
  "Where does “See the menu” go?": { kind: "type", value: "https://example.com/menu" },
  "Where does “Order for pickup” go?": { kind: "type", value: "https://example.com/order" },
  "When are you open?": { kind: "hours" },
  "How do people reach you?": { kind: "contact" },
  "Where are you?": { kind: "address" },
  "Where else are you online?": { kind: "skip" },
};

/** The wizard's text-ish fields — everything a step types into. */
export const TEXTISH =
  '[data-screen="flow"] input:not([type="checkbox"]):not([type="radio"]):not([type="file"])';

/**
 * Settle the frame's own fade (§7.11) before the caller looks at the screen.
 *
 * Shared so the two callers look at the same moment: a shot caught mid-transition and an audit
 * run mid-transition are the same mistake.
 */
export async function settle(page) {
  await page.waitForTimeout(400);
}

/** The question currently on screen, by its own heading. */
export async function heading(page) {
  const h = page.locator('[data-screen="flow"] h1').first();
  return (await h.count()) ? ((await h.textContent()) ?? "").trim() : null;
}

/**
 * Answer one step. Returns false when the step advances itself (the preset picker does).
 *
 * Everything is blurred afterwards. Fields normalise what you typed on blur — "2pm" becomes
 * "2:00 PM" — so a screen read with the caret still in the box is a half-committed value, and
 * §7.9's judgement would hold the screen when the walk tried to move on. It also keeps the walk
 * free of an arbitrary focus ring, which would be noise in a before-and-after.
 */
export async function answer(page, spec) {
  const result = await fill(page, spec);
  await page.evaluate(() =>
    document.activeElement instanceof HTMLElement ? document.activeElement.blur() : undefined,
  );
  return result;
}

async function fill(page, spec) {
  switch (spec.kind) {
    case "preset":
      await page.getByRole("button", { name: spec.choose }).first().click();
      return false;
    case "type":
      await page.locator(TEXTISH).first().fill(spec.value);
      return true;
    case "swatch":
      await page.locator("[data-swatch], .av, button[aria-pressed]").first().click();
      return true;
    case "check":
      for (const l of spec.labels) await page.getByLabel(l, { exact: false }).first().check();
      return true;
    case "hours": {
      // The day modes are `sr-only` radios driven by their labels, so the label intercepts the
      // pointer. `force` is right here rather than a workaround: the control is the radio.
      await page.getByRole("radio", { name: "Open", exact: true }).first().check({ force: true });
      const times = page.locator(TEXTISH);
      await times.nth(0).fill("7am");
      await times.nth(1).fill("2pm");
      return true;
    }
    case "contact": {
      const f = page.locator(TEXTISH);
      await f.nth(0).fill("020 7946 0100");
      await f.nth(1).fill("hello@adasbakery.example");
      return true;
    }
    case "address": {
      await page
        .locator('[data-screen="flow"] textarea')
        .first()
        .fill("12 Mill Lane\nHebden Bridge\nHX7 8AA");
      /*
       * **And the directions link, which the walk used to leave empty** (#244). It is optional,
       * so skipping it looked harmless — but it is the field that decides what the address row
       * says (§7.4) *and* whether the exported page turns the address into a link at all (§2.3),
       * so two decisions had no picture anywhere in the set. The fifth instance of the ritual's
       * standing failure: a screen that exists only once something optional has been answered.
       */
      await page.getByLabel("A link to directions").fill("maps.example/?q=12+Mill+Lane");
      return true;
    }
    case "skip":
      return true;
    default:
      return true;
  }
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

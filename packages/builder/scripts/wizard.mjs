/**
 * **The wizard's answering half, written once.** `SPEC.md` §5.3.
 *
 * Two things drive this builder's wizard through the same `data-*` hooks: `e2e/walk.ts`, which is
 * gated and measures focus, reach and rendered boxes, and `scripts/flow.mjs`, which is hand-run
 * and drives the appearance ritual and the accessibility sweep. **They cannot be one file** — the
 * hand-run half cannot be an `*.e2e.ts` without `playwright.config.ts` collecting it into CI —
 * and until #332 they were two copies of the same knowledge instead.
 *
 * **The bill, measured on #315 rather than predicted.** Eighteen strings appeared verbatim in
 * both files, `TEXTISH` was byte-identical, and the two had already drifted five times:
 *
 * 1. the twelve wizard headings, duplicated
 * 2. the hours step's scroll position (#302) — the bug was found by the gated walker and filed
 *    against the ungated one
 * 3. `refused` existed only in `flow.mjs` — now #333, because it lives in the *route*
 * 4. the swatch selector — see below
 * 5. `slug` — `walk.ts` had its own, and it disagreed with `census.mjs`'s on **2 of 12** headings
 *
 * **This is the seam `tsconfig.e2e.json` already cut for `scripts/axe.mjs`**, and for the same
 * reason in the same words: *the shared part is plain ESM in `scripts/`, typed by JSDoc, and read
 * from* the end-to-end side. `checkJs` stays off — this file is inferred from, not typechecked.
 *
 * **What is deliberately NOT here: the route.** `walkFlow` in `flow.mjs` and `walkScreens` in
 * `walk.ts` visit different things for different reasons, and #315 settled that they stay apart.
 * This file answers a step it is handed; it never decides which step comes next.
 */

/**
 * @typedef {object} Spec
 * @property {string} kind        one of preset, type, swatch, check, hours, contact, address, skip
 * @property {string} [value]     what a `type` step types
 * @property {string} [choose]    the preset a `preset` step picks, by its accessible name
 * @property {string[]} [labels]  the boxes a `check` step ticks, by label
 * @property {string} [refused]   what the owner types that the tool cannot use (§7.9, CL-1).
 *   **Read by the route, not by this file** — `walkFlow` handles it; `walkScreens` does not, which
 *   is #333.
 */

export { slug } from "./census.mjs";

/**
 * One answer per wizard step, keyed by the question's own heading.
 *
 * **Typed as a `Record` rather than left to inference on purpose.** `e2e/walk.ts` looks a step up
 * by a heading it read off the page, so the index is a `string`; inferred as an object literal
 * this is unindexable from TypeScript and the import does not compile. That is the JSDoc half of
 * the seam `tsconfig.e2e.json` describes — the file is not typechecked, it is *inferred from*, so
 * what it is inferred as is this file's responsibility.
 *
 * @type {Record<string, Spec>}
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

/**
 * **A step that did not take says so, rather than handing on a screen it only answered in
 * theory.** #345, generalising the read-back [#302](../../issues/302) added to the hours step.
 *
 * That one was found working **by luck of scroll position**, with a comment above it asserting
 * the opposite — it was one scroll away from photographing an unanswered screen for everybody,
 * and both callers would have reported on it without a word. The other five steps fired and
 * moved on in exactly the same way; this is the shape, written once.
 *
 * **What it must not be is strict rather than correct.** Fields normalise what was typed on blur
 * — `"2pm"` becomes `"2:00 PM"` — and `answer` blurs everything on purpose, so a read-back
 * comparing a box to the string handed in would be wrong on the fields that matter most. **These
 * ask whether the answer landed at all, never whether it survived unchanged.**
 */
async function landed(ok, what) {
  if (!ok) throw new Error(`${what}, so the step was left unanswered`);
}

/** Whether a box holds anything after the tool has had its say about what was typed. */
async function holds(locator) {
  return (await locator.inputValue()).trim() !== "";
}

async function fill(page, spec) {
  switch (spec.kind) {
    case "preset": {
      // **The read-back is the screen moving on, because that is all this step leaves behind.**
      // The preset picker advances by itself, so there is no control left in a pressed state to
      // interrogate — and a click that missed looks exactly like one that landed until the next
      // heading fails to arrive.
      const was = await heading(page);
      await page.getByRole("button", { name: spec.choose }).first().click();
      let moved = false;
      for (let tries = 0; tries < 20 && !moved; tries += 1) {
        await page.waitForTimeout(100);
        moved = (await heading(page)) !== was;
      }
      await landed(moved, `pressing “${spec.choose}” did not move the flow off “${was}”`);
      return false;
    }
    case "type": {
      const box = page.locator(TEXTISH).first();
      await box.fill(spec.value);
      await landed(await holds(box), `the box on this step is empty after typing into it`);
      return true;
    }
    case "swatch":
      /*
       * **`[data-swatch]` alone, which is the narrower of the two selectors that met here** and
       * the fourth of #315's five drifts. `flow.mjs` read
       * `[data-swatch], .av, button[aria-pressed]`; `walk.ts` read `[data-swatch]`.
       *
       * Checked rather than merged by taking the wider one: **`.av` matches nothing in `src/` at
       * all**, and `button[aria-pressed]` matches the preset buttons, the review list's rows and
       * this screen's own controls — so on a screen where a swatch is not first in the document,
       * `.first()` would quietly press something that is not a swatch and the walk would carry on.
       * The only two `data-swatch` sites are `ColourQuestion.tsx` and `StyleStep.tsx`, which are
       * the two screens with swatches on them.
       */
      await page.locator("[data-swatch]").first().click();
      // `ColourQuestion.tsx` sets `aria-pressed` from the answer itself, so a swatch reporting
      // pressed is the tool agreeing it took the colour — not merely that a click was dispatched.
      await landed(
        (await page.locator("[data-swatch][aria-pressed='true']").count()) > 0,
        "no swatch reports itself chosen after pressing one",
      );
      return true;
    case "check":
      for (const l of spec.labels) await page.getByLabel(l, { exact: false }).first().check();
      return true;
    case "hours": {
      /*
       * **Found by the role, pressed by the label** — the same shape `e2e/walk.ts` uses, and for
       * a measured reason (#302). The day modes are `sr-only` radios inside their labels (§7.10),
       * so the control is a 1×1 clipped box and the label is the segment a person presses.
       *
       * **This used to be `check({ force: true })` on the radio, with a comment saying `force`
       * was right here rather than a workaround. It was not.** `force` skips Playwright's
       * actionability sequence, and scrolling the element into view is *part of* that sequence —
       * so the click goes to the 1×1 box's current viewport coordinate whether or not that
       * coordinate is on screen. On this screen it is a coin toss decided by scroll position:
       * arrive at the hours step unscrolled and the point is over the label and it works;
       * arrive with the page scrolled down — which is what happens to anything that has already
       * walked the seven day rows — and Monday's radio sits ~123px *above* the viewport,
       * `elementFromPoint` there returns `null`, and the click lands on nothing.
       *
       * All three candidates were measured on `main`, at both of §7.6's widths, on a scrolled
       * screen and an unscrolled one:
       *
       * - `check({ force: true })` — works unscrolled, **fails scrolled** ("Clicking the checkbox
       *   did not change its state"). Which is why CL-11 saw it fail and this ritual did not.
       * - `check()` without `force` — **times out at both widths, always**: the radio is clipped
       *   under its own label, so the hit-target check can never pass. That half of the old
       *   comment was true; only the conclusion drawn from it was wrong.
       * - **pressing the label** — lands in every case. `click()` scrolls it into view and hit-
       *   tests honestly, so it does not depend on where the screen happens to be sitting.
       *
       * **And it says so when it does not take**, because this is the failure that made the
       * ticket: a driver that silently answers nothing hands its caller a screen nobody meant to
       * look at, and both callers here — 76 shots and 76 audited screens — would have reported
       * on it without a word. Both turn a throw from the walk into their own loud "could not
       * run", which is the right voice for it.
       */
      const open = page.getByRole("radio", { name: "Open", exact: true }).first();
      await open.locator("xpath=ancestor::label[1]").click();
      if (!(await open.isChecked()))
        throw new Error(
          "pressing “Open” on Monday did not open the day, so the hours screen was left unanswered",
        );
      const times = page.locator(TEXTISH);
      await times.nth(0).fill("7am");
      await times.nth(1).fill("2pm");
      return true;
    }
    case "contact": {
      const f = page.locator(TEXTISH);
      await f.nth(0).fill("020 7946 0100");
      await f.nth(1).fill("hello@adasbakery.example");
      await landed(await holds(f.nth(0)), "the phone box is empty after typing into it");
      await landed(await holds(f.nth(1)), "the email box is empty after typing into it");
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
      const directions = page.getByLabel("A link to directions");
      await directions.fill("maps.example/?q=12+Mill+Lane");
      await landed(
        (await page.locator('[data-screen="flow"] textarea').first().inputValue()).trim() !== "",
        "the address box is empty after typing into it",
      );
      await landed(await holds(directions), "the directions box is empty after typing into it");
      return true;
    }
    case "skip":
      return true;
    default:
      return true;
  }
}

/**
 * Leave the current step the way the answer implies: Continue if it can, else the escape.
 *
 * Lifted from `e2e/walk.ts` on #332. `walkFlow` does not call it — it inlines the same choice
 * with its own reporting around it — but it is the same decision, and a second copy of it is how
 * this file's other five drifts started.
 */
export async function leave(page, spec, title) {
  const escape = page.locator("[data-escape]");
  const next = page.getByRole("button", { name: /^(Continue|Save)$/ });
  if (spec.kind === "skip" && (await escape.count())) await escape.first().click();
  else if ((await next.count()) && (await next.first().isEnabled())) await next.first().click();
  else if (await escape.count()) await escape.first().click();
  else throw new Error(`nothing to press on “${title}”: no enabled Continue and no escape`);
}

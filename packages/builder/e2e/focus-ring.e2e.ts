import { expect, test } from "@playwright/test";
import { tabStops, walkScreens, WIDTHS, type Stop } from "./walk.js";

/**
 * §7.12's commitment 2, measured rather than read off the stylesheet.
 *
 * > **A focus ring is painted on every tab stop.**
 *
 * **What this replaces.** `theme.css`'s `:focus-visible` rule had a jsdom test that read the
 * stylesheet and asserted the rule was present. That is a true fact about a file and says
 * nothing about a screen: jsdom can never match `:focus-visible`, which is a live judgement
 * about how focus arrived, so the only instrument that can answer this is a browser with a
 * keyboard. #263 walked the wizard by hand and found the ring on every stop of every screen at
 * both widths, `outline 2px`, zero failures. This is that walk, standing.
 *
 * **It measures a change, not a state.** A control with a 2px border is not a control with a
 * focus ring; a control that *grew* one when focus arrived is. So every stop is read twice —
 * once holding focus, once after focus has left — and a ring counts only where the two differ.
 * Without the second read, a static hairline would pass this test on every element in the tool.
 *
 * **The ring is not always an outline, and that is by design.** `theme.css` draws it two ways:
 * an `outline: 2px solid` for everything that is not a line, and for the fields that *are* a
 * line, a deliberately transparent outline with the bottom border thickened to 2px of ink
 * instead — because a rectangle around a control that has no rectangle is the defect #227 fixed.
 * A test that only knew about outlines would fail every text field in the builder and be wrong
 * to. Both treatments are looked for, on the stop and on up to three ancestors, because the ring
 * is forwarded to a visible stand-in where the control itself is `sr-only` (§7.10's hours step:
 * a 1×1 radio, a 98×44 label, and the outline drawn on the label).
 *
 * **A ring on a 1px box is not a visible ring** — #263's own instrument nearly reported one. An
 * indicator is only counted on a box of at least 8×8 CSS pixels.
 *
 * **Chromium's own fallback does not count, deliberately.** Delete the rule from `theme.css` and
 * the browser paints `outline: auto 1px` on every button anyway, so a test that asked "is
 * *anything* painted" would go green on a stylesheet with the promise taken out of it. §7.12
 * commits to the tool's ring — 2px, defined once, and the line owning its own — so 2px is the
 * floor. Measured with that rule removed: **120 of 133 stops go bare at 390**, and the 13 that
 * do not are the text fields, whose indicator is the other mechanism and is still there.
 *
 * **The stop count is asserted before the rings are.** A walk that reaches nothing reports
 * nothing wrong, and the last build map watched three mechanisms return empty and pass. The
 * control at the foot of this file is the other half of that: the ring is taken away and the
 * same instrument is required to notice.
 *
 * **What it does not claim.** Only what the browser paints and exposes — not what a screen
 * reader announces (§7.12's bound), not that the ring is legible against the owner's colour
 * (§7.12's exclusions; `controls.test.ts` holds the offset that argument rests on), and nothing
 * at all about the preview iframe, which is CL-14 and out of scope.
 */

/** One rung of the ladder: what is painted on an element, and how big it is. */
interface Paint {
  readonly tag: string;
  readonly outlineStyle: string;
  readonly outlineWidth: number;
  readonly outlineColour: string;
  readonly borderBottomWidth: number;
  readonly borderBottomColour: string;
  readonly width: number;
  readonly height: number;
}

/** A stop and its ancestors, nearest first. Evaluated in the page; must close over nothing. */
function paint(element: Element): Paint[] {
  const ladder: Paint[] = [];
  let node: Element | null = element;
  for (let up = 0; node !== null && up <= 3; up += 1) {
    const style = getComputedStyle(node);
    const box = node.getBoundingClientRect();
    ladder.push({
      tag: node.tagName.toLowerCase(),
      outlineStyle: style.outlineStyle,
      outlineWidth: parseFloat(style.outlineWidth) || 0,
      outlineColour: style.outlineColor,
      borderBottomWidth: parseFloat(style.borderBottomWidth) || 0,
      borderBottomColour: style.borderBottomColor,
      width: box.width,
      height: box.height,
    });
    node = node.parentElement;
  }
  return ladder;
}

/** §7.12's ring is 2px. Anything thinner is not the thing the stylesheet promises. */
const THICK = 2;

/** Below this the indicator is drawn around something nobody can see (#263's clipped radio). */
const VISIBLE = 8;

/** `rgba(0, 0, 0, 0)` is what a transparent outline computes to — the line's deliberate one. */
function opaque(colour: string): boolean {
  const alpha = /rgba?\([^)]*,\s*([\d.]+)\s*\)/.exec(colour);
  return alpha?.[1] === undefined || parseFloat(alpha[1]) > 0;
}

function seen(rung: Paint): boolean {
  return rung.width >= VISIBLE && rung.height >= VISIBLE;
}

/**
 * What focus painted on this stop, if anything — and on which of its elements.
 *
 * Two indicators are recognised, both of them `theme.css`'s: an outline that was not there
 * before, and a bottom border that got thicker than it was before. Everything else is `none`.
 */
function ring(stop: Stop<Paint[]>): string {
  const before = stop.resting;
  if (before === null) return "the element went away before it could be read at rest";

  for (let up = 0; up < stop.focused.length; up += 1) {
    const now = stop.focused[up];
    const then = before[up];
    if (now === undefined || then === undefined || !seen(now)) continue;
    const where = up === 0 ? `on the <${now.tag}> itself` : `forwarded to a <${now.tag}> above it`;

    const outlined =
      now.outlineStyle !== "none" && now.outlineWidth >= THICK && opaque(now.outlineColour);
    const wasOutlined =
      then.outlineStyle !== "none" && then.outlineWidth >= THICK && opaque(then.outlineColour);
    if (outlined && !wasOutlined)
      return `outline ${now.outlineWidth}px ${now.outlineColour} ${where}`;

    const lined =
      now.borderBottomWidth >= THICK &&
      now.borderBottomWidth > then.borderBottomWidth &&
      opaque(now.borderBottomColour);
    if (lined) return `line ${now.borderBottomWidth}px ${now.borderBottomColour} ${where}`;
  }
  return "";
}

/** A stop with no ring, said in one line: where it was, what it was, and what it did paint. */
function bare(stop: Stop<Paint[]>): string {
  const self = stop.focused[0];
  if (self === undefined) return `${stop.screen} stop ${stop.order}: ${stop.what} — nothing read`;
  const outline = `outline ${self.outlineStyle} ${self.outlineWidth}px ${self.outlineColour}`;
  const line = `border-bottom ${self.borderBottomWidth}px ${self.borderBottomColour}`;
  const at = `${Math.round(self.width)}×${Math.round(self.height)}`;
  return `${stop.screen} stop ${stop.order}: ${stop.what} — ${at}, ${outline}, ${line}`;
}

/**
 * The route is walked twice, once per width, because the layout branches once and the two sides
 * of that branch are different screens: at 390 the preview drawer covers everything, at 1440 it
 * sits beside the question and every screen has one stop more.
 */
for (const width of WIDTHS) {
  test(`a focus ring is painted on every tab stop at ${width.label}`, async ({ page }) => {
    await page.setViewportSize(width.viewport);

    const stops: Stop<Paint[]>[] = [];
    const screens = await walkScreens(page, async (screen) => {
      const reached = await tabStops(page, screen.id, { focused: paint, resting: paint });
      expect(reached.length, `${screen.what} has tab stops on it at all`).toBeGreaterThan(0);
      stops.push(...reached);
    });

    /*
     * **Liveness before judgement.** Zero stops is zero failures, and these two lines are what
     * make the one below evidence rather than an empty set congratulating itself. Measured on
     * `main`: **17 screens, 133 stops at 390 and 144 at 1440** — the two differ only on the
     * review list, which is 2 stops behind the drawer at 390 and 13 beside the preview at 1440.
     *
     * The floors sit under those numbers rather than on them: this is here to catch a walk that
     * fell over, not to pin the flow's shape, which `plan.test.ts` owns and would fail twice.
     */
    expect(screens.length, "screens the walk reached").toBeGreaterThanOrEqual(28);
    expect(stops.length, "tab stops the walk reached").toBeGreaterThanOrEqual(220);

    expect(stops.filter((stop) => ring(stop) === "").map(bare), "stops with no focus ring").toEqual(
      [],
    );

    // What was reached, in the run's own log — so a green tick is readable as a number of stops
    // rather than as an absence of complaints.
    console.log(
      `§7.12(2) at ${width.label}: ${screens.length} screens, ${stops.length} tab stops, ` +
        "a focus ring painted on every one",
    );
  });
}

/**
 * The control: take the ring away, and the same instrument must go red.
 *
 * **This is the half that makes the two tests above worth reading.** A measurement that cannot
 * detect the absence of what it measures reports a clean screen when its own driver is broken —
 * #265 measured an empty document coming back with 0 violations and 4 passes, and #263's walk
 * produced four near-miss findings from its own instrument. One screen at one width is enough
 * to prove the instrument sees, and it costs a second.
 *
 * The mutant is applied as CSS rather than by editing `theme.css`, so the build under test is
 * the shipped one: `!important` in an unlayered rule beats `@layer base`, and the second rule
 * pins the field's line to the width it rests at so the *change* this test looks for cannot
 * happen there either.
 */
test("the walk goes red when the ring is taken away", async ({ page }) => {
  await page.setViewportSize(WIDTHS[0].viewport);
  await page.goto("/linkpage/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/linkpage/");
  await page.addStyleTag({
    content: `
      :focus-visible, label:has(> .sr-only:focus-visible) { outline: none !important; }
      *:focus-visible, *:has(:focus-visible) { border-bottom-width: 1px !important; }
    `,
  });

  const stops = await tabStops(page, "no-ring", { focused: paint, resting: paint });

  expect(stops.length, "the control found tab stops to strip the ring from").toBeGreaterThan(3);
  expect(
    stops.filter((stop) => ring(stop) !== "").map((stop) => `${bare(stop)} — ${ring(stop)}`),
    "stops still reporting a ring with the rule overridden",
  ).toEqual([]);
});

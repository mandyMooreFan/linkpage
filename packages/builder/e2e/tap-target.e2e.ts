import { expect, test } from "@playwright/test";
import { tabStops, walkScreens, WIDTHS, type Stop } from "./walk.js";

/**
 * §7.12's commitment 5, measured rather than read off a class string.
 *
 * > **Every control the keyboard reaches clears the tap floor**, except the deliberate inline
 * > weight and §7.2's progress bar header.
 *
 * **What this replaces.** `controls.test.ts` asserted `expect(classes).toContain("tap")` over
 * `Button.tsx`'s four weights. That is a true fact about four strings and says two things it was
 * never entitled to say. It cannot see the *size* of anything — `tap` is a `min-height` and a
 * rendered box is a layout result — and it cannot see any control whose class string it does not
 * read: the bar header below is a hand-written `<button>` that was never in the set, and it has
 * been 8px short the whole time.
 *
 * **A control is not always its own target, and this is the trap the check exists to avoid.**
 * `Checkbox.tsx` is a 20×20 box on purpose — a 20×44 tick box is a stretched rectangle in every
 * engine that paints the native control — and the whole 350×44 `<label>` around it is what a
 * finger actually hits. §7.10's day modes are the same shape at 1×1, and the web-address field
 * is a third: a 24px box standing on the 44px ruled line that forwards the press to it. **A
 * measurement that only read the control itself would fail fourteen honest controls at each
 * width and be wrong to** — so what is measured is the effective target, and both halves of that
 * are asserted below rather than assumed.
 *
 * **What counts as forwarding is deliberately narrow.** Walking up the ancestors and taking the
 * biggest box would pass everything, because every control in this tool sits inside a full-width
 * column. Two mechanisms are recognised and no others: a `<label>` whose `control` **is** this
 * stop, which is the browser's own forwarding and is asked of the browser rather than guessed;
 * and `[data-url-field]`, the one place the product forwards a press by hand (`TextInput.tsx`'s
 * `onPointerDown`, *"clicking the prefix focuses the box"*). A third mechanism arriving without
 * declaring itself goes red here, which is the right way round.
 *
 * **Height is the axis, because `tap` is a `min-height`.** `theme.css` says why at length: most
 * controls in this tool must *not* take a width floor — a button is as wide as its words (§4,
 * §6) and `Back` is 39px of type — and the two-axis `tap-square` is the one you have to ask for,
 * for glyph buttons. This walk reaches none of them, so it measures the floor that is promised
 * and says so rather than inventing a second one.
 *
 * **The stop count is asserted before the sizes are.** A walk that reaches nothing finds nothing
 * undersized. The two controls at the foot of this file are the other half: the floor is taken
 * away from a whole screen — the control *and* the label that forwards for it — and the same
 * instrument is required to notice.
 *
 * **What it does not claim.** Only what the browser lays out and exposes — not what a screen
 * reader announces (§7.12's bound), and nothing about controls the keyboard does not reach: a
 * roving `radiogroup` is 7 stops for 21 radios, so the fourteen day modes Tab steps over are not
 * in these numbers. Nothing about the preview iframe either, which is CL-14 and out of scope.
 */

/** §7.6's floor in CSS pixels — `theme.css`'s `tap` is `min-height: 2.75rem`, held once. */
const FLOOR = 44;

/**
 * Sub-pixel slack. A box that lays out at 43.99 is the floor doing its job, not a control 0.01px
 * short of it; the misses this check is for are whole pixels out (the bar header is eight).
 */
const SLACK = 0.5;

/** One rung of the ancestor ladder: how big it is, and whether pressing it presses the stop. */
interface Rung {
  readonly tag: string;
  readonly width: number;
  readonly height: number;
  readonly forwards: boolean;
}

/** A stop's own box, its ladder, and the one thing here identified by a hook rather than words. */
interface Target {
  readonly ladder: Rung[];
  /** §7.2's whole-bar toggle. Named by `data-progress-bar`, as `walk.ts` names everything. */
  readonly bar: boolean;
}

/**
 * The stop and up to three ancestors, nearest first. Evaluated in the page; closes over nothing.
 *
 * The same ancestor walk `focus-ring.e2e.ts` uses, asking a different question of each rung: not
 * *did focus paint anything here* but *would a press here reach the control*.
 */
function hit(element: Element): Target {
  const ladder: Rung[] = [];
  let node: Element | null = element;
  for (let up = 0; node !== null && up <= 3; up += 1) {
    const box = node.getBoundingClientRect();
    ladder.push({
      tag: node.tagName.toLowerCase(),
      width: box.width,
      height: box.height,
      forwards:
        up > 0 &&
        ((node instanceof HTMLLabelElement && node.control === element) ||
          node.hasAttribute("data-url-field")),
    });
    node = node.parentElement;
  }
  return { ladder, bar: element.matches("[data-progress-bar] > button") };
}

/** The stop's own box — what a check that stopped at the control would have measured. */
function self(stop: Stop<Target>): Rung | undefined {
  return stop.focused.ladder[0];
}

/** The tallest thing a press on this stop can land on: itself, or whatever forwards for it. */
function target(stop: Stop<Target>): Rung | undefined {
  let best = self(stop);
  for (const rung of stop.focused.ladder)
    if (rung.forwards && (best === undefined || rung.height > best.height)) best = rung;
  return best;
}

function clears(rung: Rung | undefined): boolean {
  return rung !== undefined && rung.height + SLACK >= FLOOR;
}

/**
 * Why this stop is allowed under the floor, or `""` if it is not.
 *
 * **Two entries, and the list is asserted exactly** — every excuse below has to be *used* on
 * every run, so neither can quietly outlive the thing it excuses. Fixing #305 turns this file
 * red until its line is deleted, which is the point of writing it down here rather than shrugging
 * at it in a filter.
 */
function excused(stop: Stop<Target>): string {
  if (stop.focused.bar) return "§7.2's bar header, 8px short and a real miss — #305";
  if (/^(button|link) "Open it\./.test(stop.what))
    return "the `inline` weight, a word inside a sentence — Button.tsx";
  return "";
}

/** One undersized stop, said in a line: where it was, what it was, and what it measured. */
function say(stop: Stop<Target>): string {
  const own = self(stop);
  const box = target(stop);
  const at = (rung: Rung | undefined): string =>
    rung === undefined ? "?" : `${Math.round(rung.width)}×${Math.round(rung.height)}`;
  const via = box === own ? "" : ` (target ${at(box)} on a <${box?.tag ?? "?"}>)`;
  return `${stop.screen} stop ${stop.order}: ${stop.what} — ${at(own)}${via}`;
}

/**
 * The route is walked twice, once per width, because the layout branches once and the boxes on
 * either side of that branch are different sizes — a 350-wide field at 390 and a 512-wide one at
 * 1440, and a review list that is two stops at one and thirteen at the other.
 */
for (const width of WIDTHS) {
  test(`every control the keyboard reaches clears the tap floor at ${width.label}`, async ({
    page,
  }) => {
    await page.setViewportSize(width.viewport);

    const stops: Stop<Target>[] = [];
    const screens = await walkScreens(page, async (screen) => {
      const reached = await tabStops(page, screen.id, { focused: hit });
      expect(reached.length, `${screen.what} has tab stops on it at all`).toBeGreaterThan(0);
      stops.push(...reached);
    });

    /*
     * **Liveness before judgement.** Zero stops is zero undersized stops, and the last build map
     * watched three mechanisms return empty and pass. The floors sit under CL-11's measured
     * numbers — 17 screens, 133 stops at 390 and 144 at 1440 — rather than on them: this is here
     * to catch a walk that fell over, not to pin the flow's shape, which `plan.test.ts` owns.
     */
    expect(screens.length, "screens the walk reached").toBeGreaterThanOrEqual(16);
    expect(stops.length, "tab stops the walk reached").toBeGreaterThanOrEqual(100);

    const short = stops.filter((stop) => !clears(target(stop)));

    // The measurement itself.
    expect(
      short.filter((stop) => excused(stop) === "").map(say),
      `stops whose effective target is under ${FLOOR}px`,
    ).toEqual([]);

    /*
     * **The other direction, asserted rather than trusted.** Every excuse has to be earning its
     * keep — an exception nobody meets is a promise quietly widened — and the `inline` weight
     * doubles as the cheapest possible proof that this instrument can see a small target at all:
     * it is 84×24, it is deliberate, and the check reports it every run.
     */
    expect(
      [...new Set(short.map(excused))].sort(),
      "the excuses, every one of them met on this run",
    ).toEqual([
      "the `inline` weight, a word inside a sentence — Button.tsx",
      "§7.2's bar header, 8px short and a real miss — #305",
    ]);

    /*
     * **And the trap this check exists to avoid.** These are the controls a measurement that
     * stopped at the control itself would have failed: the 20×20 checkboxes, §7.10's 1×1 day
     * modes, and the 24px web-address boxes. Fourteen of them at each width, and every one is
     * pressed through something that clears the floor. The floor sits under that number rather
     * than on it — a thirteenth field is a change to the flow, not to this promise — but the
     * checkbox the change list was written about is pinned to the pixel, because it is the
     * evidence.
     */
    const forwarded = stops.filter((stop) => !clears(self(stop)) && clears(target(stop)));
    expect(
      forwarded.length,
      "controls smaller than the floor, pressed through something that clears it",
    ).toBeGreaterThanOrEqual(14);
    expect(
      forwarded.filter((stop) => /checkbox "See the menu"/.test(stop.what)).map(say),
      "the checkbox the change list was written about",
    ).toEqual([
      `flow/06-which-of-these-do-you-have stop 2: checkbox "See the menu" — 20×20 ` +
        `(target ${width.label === "390" ? "350" : "512"}×44 on a <label>)`,
    ]);

    const tally = [...new Set(short.map(excused))]
      .sort()
      .map((why) => `${short.filter((stop) => excused(stop) === why).length}× ${why}`);
    console.log(
      `§7.12(5) at ${width.label}: ${screens.length} screens, ${stops.length} tab stops, ` +
        `${forwarded.length} of them pressed through a label or a line, ` +
        `${short.length} under the ${FLOOR}px floor — ${tally.join("; ")}`,
    );
  });
}

/**
 * The control: take the floor away, and the same instrument must go red.
 *
 * **This is the half that makes the two tests above worth reading.** A measurement that cannot
 * detect the absence of what it measures reports a clean screen when its own driver is broken —
 * #265 measured an empty document coming back with 0 violations and 4 passes, and #263's walk
 * produced four near-miss findings from its own instrument.
 *
 * It is done on the link-buttons screen because that is the one screen carrying both shapes at
 * once: plain buttons whose own box is the target, and checkboxes whose target is a `<label>`
 * above them. The mutant shrinks **both** — a control that only squashed the input would leave
 * the label at 44 and the check would rightly stay green, which is a different experiment.
 *
 * Applied as a style tag inside the walk and taken away again, so the build under test is the
 * shipped one and the walk carries on to the screens after it unchanged.
 */
test("the walk goes red when the floor is taken away", async ({ page }) => {
  await page.setViewportSize(WIDTHS[0].viewport);

  const shrunk: Stop<Target>[] = [];
  const screens = await walkScreens(page, async (screen) => {
    if (!screen.id.endsWith("which-of-these-do-you-have")) return;
    const mutant = await page.addStyleTag({
      content: `
        :is(button, input, textarea, select, label, [data-url-field]) {
          min-height: 0 !important;
          height: 20px !important;
        }
      `,
    });
    shrunk.push(...(await tabStops(page, screen.id, { focused: hit })));
    await mutant.evaluate((node: HTMLStyleElement) => node.remove());
  });

  expect(screens.length, "the control walked the route").toBeGreaterThanOrEqual(16);
  expect(shrunk.length, "the control found stops to take the floor away from").toBeGreaterThan(5);
  expect(
    shrunk.filter((stop) => clears(target(stop))).map(say),
    `stops still clearing ${FLOOR}px with the floor overridden`,
  ).toEqual([]);
  expect(
    shrunk.filter((stop) => /^checkbox/.test(stop.what)).length,
    "and the checkboxes — whose target is a <label> — were among them",
  ).toBeGreaterThan(0);
});

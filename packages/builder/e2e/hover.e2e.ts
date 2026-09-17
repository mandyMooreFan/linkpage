import { expect, test } from "@playwright/test";
import { walkScreens, WIDTHS } from "./walk.js";

/**
 * **Every clickable thing says so under the pointer** (`SPEC.md` §7.4; #370, walk moment 8).
 *
 * The desktop walk found the outlined escape — *We don't need one* and its siblings — giving
 * nothing on hover: no change of paint, and an arrow for a cursor. It read as not clickable. The
 * class-string guard in `controls.test.ts` can say a weight *declares* a hover rule; only a
 * browser can say the rule paints, because `:hover` is a judgement about where the mouse is.
 *
 * So this is the measurement: every screen the ritual reaches, every `<button>` on it that is
 * enabled and can be hit at its centre, hovered by the mouse and read twice — at rest and under
 * the pointer. Two facts per button: the cursor is a hand, and at least one of the things a
 * weight is allowed to change (fill, hairline, ink, underline) is different. A disabled button
 * is read the same way and held to the opposite: it draws nothing new and offers no hand.
 *
 * **At 1440 only, and on purpose.** Hover is a pointer's question; a phone has no hover state,
 * and the ticket says so. Chromium under Playwright's `Desktop Chrome` answers `(hover: hover)`
 * true at any viewport, so a 390 run would measure the desktop rule twice, not the phone once.
 */

const WIDE = WIDTHS[1];

/** `walk.ts`'s own settle, for the same reason it has one. */
const SETTLE = 400;

interface Paint {
  readonly cursor: string;
  readonly fill: string;
  readonly hairline: string;
  readonly ink: string;
  readonly underline: string;
}

interface Read {
  readonly screen: string;
  readonly what: string;
  readonly enabled: boolean;
  readonly resting: Paint;
  readonly hovered: Paint;
}

const paint = (element: Element): Paint => {
  const style = getComputedStyle(element);
  return {
    cursor: style.cursor,
    fill: style.backgroundColor,
    hairline: style.borderTopColor,
    ink: style.color,
    underline: `${style.textDecorationLine} ${style.textDecorationThickness}`,
  };
};

/** The four things a weight may change under the pointer, and whether any of them did. */
function changed(read: Read): string[] {
  const keys = ["fill", "hairline", "ink", "underline"] as const;
  return keys.filter((key) => read.resting[key] !== read.hovered[key]);
}

const say = (read: Read): string => `${read.screen}: “${read.what}”`;

async function readButtons(page: import("@playwright/test").Page, screen: string): Promise<Read[]> {
  // Let the screen finish arriving (§7.11's fade, and the view transition that carries a step
  // change): under a transition `elementFromPoint` answers the root, and nothing reads as hittable.
  await page.waitForTimeout(SETTLE);
  // Park the mouse off every control first, so "at rest" is not a leftover hover.
  await page.mouse.move(0, 0);

  const buttons = page.locator("button");
  const reads: Read[] = [];
  for (let index = 0; index < (await buttons.count()); index += 1) {
    const button = buttons.nth(index);
    if (!(await button.isVisible())) continue;
    const box = await button.boundingBox();
    if (box === null || box.width === 0 || box.height === 0) continue;
    const centre = { x: box.x + box.width / 2, y: box.y + box.height / 2 };

    // A button behind the download sheet's backdrop, or under the drawer, cannot be hovered by
    // an owner either; the reachability walk is where that is judged, not here.
    const hittable = await button.evaluate((element, point) => {
      const hit = document.elementFromPoint(point.x, point.y);
      return hit !== null && (hit === element || element.contains(hit));
    }, centre);
    if (!hittable) continue;

    const what = (
      await button.evaluate(
        (element) => element.getAttribute("aria-label") ?? element.textContent ?? "",
      )
    )
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 40);
    const enabled = await button.isEnabled();
    const resting = await button.evaluate(paint);
    await page.mouse.move(centre.x, centre.y);
    const hovered = await button.evaluate(paint);
    await page.mouse.move(0, 0);
    reads.push({ screen, what: what === "" ? "(unnamed)" : what, enabled, resting, hovered });
  }
  return reads;
}

test(`every button says it is clickable under the pointer at ${WIDE.label}`, async ({ page }) => {
  // Twice the tier's usual budget: this walk reads every button twice rather than every tab stop
  // once, and lets each screen settle before it starts.
  test.setTimeout(90_000);
  await page.setViewportSize(WIDE.viewport);

  const reads: Read[] = [];
  const screens = await walkScreens(page, async (screen) => {
    reads.push(...(await readButtons(page, screen.id)));
  });

  // The walk has to have walked: an empty run proves nothing.
  expect(screens.length, "screens the walk reached").toBeGreaterThanOrEqual(28);
  const enabled = reads.filter((read) => read.enabled);
  const disabled = reads.filter((read) => !read.enabled);
  expect(enabled.length, "enabled buttons hovered").toBeGreaterThanOrEqual(120);
  expect(disabled.length, "disabled buttons hovered").toBeGreaterThanOrEqual(1);

  // The measurement itself: a hand, and a mark.
  expect(
    enabled.filter((read) => read.hovered.cursor !== "pointer").map(say),
    "enabled buttons that offer no hand under the pointer",
  ).toEqual([]);
  expect(
    enabled.filter((read) => changed(read).length === 0).map(say),
    "enabled buttons that draw nothing new under the pointer",
  ).toEqual([]);

  // And the opposite for a button that is unavailable: no hand, nothing new.
  expect(
    disabled.filter((read) => read.hovered.cursor === "pointer").map(say),
    "disabled buttons that offer a hand",
  ).toEqual([]);
  expect(
    disabled.filter((read) => changed(read).length > 0).map(say),
    "disabled buttons that change under the pointer",
  ).toEqual([]);

  const tally = (["fill", "hairline", "ink", "underline"] as const).map(
    (key) => `${enabled.filter((read) => changed(read).includes(key)).length}× ${key}`,
  );
  console.log(
    `§7.4 hover at ${WIDE.label}: ${screens.length} screens, ${enabled.length} enabled buttons ` +
      `and ${disabled.length} disabled ones read at rest and under the pointer — ${tally.join("; ")}`,
  );
});

test("the walk goes red when the hand is taken away", async ({ page }) => {
  await page.setViewportSize(WIDE.viewport);

  const reads: Read[] = [];
  const screens = await walkScreens(page, async (screen) => {
    if (!screen.id.endsWith("which-of-these-do-you-have")) return;
    const mutant = await page.addStyleTag({
      content: `button { cursor: default !important; }`,
    });
    reads.push(...(await readButtons(page, screen.id)));
    await mutant.evaluate((node: HTMLStyleElement) => node.remove());
  });

  expect(screens.length, "the control walked the route").toBeGreaterThanOrEqual(28);
  const enabled = reads.filter((read) => read.enabled);
  expect(enabled.length, "enabled buttons on the mutated screen").toBeGreaterThanOrEqual(3);
  expect(
    enabled.filter((read) => read.hovered.cursor !== "pointer").length,
    "buttons the mutant took the hand from",
  ).toBe(enabled.length);
});

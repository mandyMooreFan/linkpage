import { expect, test, type Page } from "@playwright/test";
import { tabStops, walkScreens, WIDTHS, type Screen } from "./walk.js";

/**
 * §7.12's commitment 3, measured rather than read off an attribute.
 *
 * > **What the tool covers, it puts out of reach.**
 *
 * **What this replaces.** The commitment was _guarded at the attribute_: `list.test.tsx` asserts
 * that `[inert]` is in the DOM and that it sits on the right region — which is a true fact about
 * a tree and says nothing about a keyboard. **jsdom does not implement `inert` at all.** It
 * neither blocks focus nor prunes the accessibility tree, which is why every other test in that
 * file goes on driving a column a real phone can no longer touch (#255 says so in its own
 * docblock). So the attribute was the most its instrument could see, and reachability — the thing
 * a keyboard user actually feels — was inferred from it. Those tests stay: where the statement is
 * and what it covers is still worth holding. This is the other half, and it is the half #272
 * called the most valuable of its three upgrades.
 *
 * **The question is asked by pressing Tab.** Every control the page is showing is counted, then
 * the keyboard is walked round the screen, and the two lists are compared. Nothing here reads
 * `inert`, and nothing here hit-tests: `document.elementFromPoint` over a covered row comes back
 * empty, because Chromium takes an inert subtree out of hit testing too — a geometric instrument
 * would be the same attribute wearing a different hat.
 *
 * **The rule being checked is #255's, in its own words: _what is on the glass is in reach, and
 * what is not, is not._** So the check is symmetric and both halves can fail. A control the tool
 * has covered and left reachable is the defect #255 fixed. A control on the glass that the
 * keyboard cannot get to is #254's, and is the worse of the two.
 *
 * **The numbers, measured on `main`.** 17 screens at each of §7.6's widths, **159 controls**, of
 * which **133 are reachable at 390 and 144 at 1440** — the same totals `focus-ring.e2e.ts` counts
 * as tab stops, arrived at from the other end. Two screens account for every one of the
 * differences:
 *
 * | screen | controls | in reach at 390 | in reach at 1440 |
 * | --- | --- | --- | --- |
 * | the review list as it lands | 13 | **2** — _Edit your page_, _Download_ | **13** — all of them |
 * | §7.7's download sheet | 18 | 3 | 3 |
 * | every other screen | 128 | all | all |
 *
 * **2 of 13 at 390 is the correct answer, and 0 would be the wrong one.** The two still in reach
 * are the two the drawer put on its own glass — the way out and the primary action, which #255
 * moved there precisely so the page it comes down over is not a dead end. [#264](https://github.com/mandyMooreFan/linkpage/issues/264)
 * measured **2 of 15** by hand and this reproduces the 2 exactly; the denominator differs because
 * that census counted two things this one does not call controls — `FilePicker`'s `sr-only`,
 * `aria-hidden`, `tabIndex={-1}` input (#254's, deliberately not a stop) and the preview iframe
 * (CL-14, out of scope). Every stop the keyboard finds is in this census: nothing is reachable
 * here that was not counted, which is asserted on every screen.
 *
 * **The two mechanisms are not converged, and this does not ask them to be.** The drawer holds
 * the keyboard out with `inert`; §7.7's sheet holds it in with a focus trap, and the content
 * behind the sheet is not inert — programmatic focus lands on a row behind it (#264). Those are
 * different guarantees and #272 recorded the divergence as **CL-16, out of scope**. This measures
 * the one question both of them answer: does Tab get there.
 *
 * **What it does not claim.** Only what the browser lets a keyboard reach — not what a screen
 * reader announces, which is §7.12's bound, and not what a pointer can press.
 */

/**
 * Everything the browser might put in the tab order, before asking whether it did.
 *
 * Deliberately **not** filtered by `inert`, which is the attribute this file exists to stop
 * trusting, and deliberately not by opacity: a control fading in under §7.11's transition is
 * still a control, and reading `checkVisibility({ opacityProperty: true })` mid-fade reported an
 * empty screen while the walk was measuring it.
 */
const SHOWING =
  'a[href], button, input, select, textarea, summary, [tabindex], [contenteditable="true"]';

/** One control the page is showing, and whether the keyboard got to it. */
interface Control {
  readonly name: string;
  readonly tag: string;
  readonly reached: boolean;
  /** Role and accessible name as the browser computes them, for the ones Tab landed on. */
  readonly stop: string | null;
}

/** A screen, measured. */
interface Reading {
  readonly screen: Screen;
  readonly controls: Control[];
  /** Tab stops that were not in the census — the census is blind to something. */
  readonly strangers: string[];
}

/**
 * Tag every control on the screen and describe it. Evaluated in the page; closes over nothing.
 *
 * `data-reach` is how a stop is matched back to its control: `tabStops`' probe reads the
 * attribute off whatever has focus, so the two lists are joined by identity rather than by name.
 * It is removed again before the walk moves on.
 */
function census(selector: string): { name: string; tag: string }[] {
  const showing = [...document.querySelectorAll(selector)].filter((element) => {
    if (element.tagName === "IFRAME") return false; // CL-14, and §6.8's page inside it
    if (element.closest('[aria-hidden="true"]') !== null) return false; // not a control it offers
    if (element.getAttribute("tabindex") === "-1") return false; // deliberately not a stop (#254)
    if ((element as HTMLElement & { disabled?: boolean }).disabled === true) return false;
    if ((element as HTMLElement).checkVisibility?.({ visibilityProperty: true }) === false)
      return false;
    /*
     * One radio of a group is in the tab order and its siblings are reached with the arrow keys —
     * §7.10's day modes are eight such groups. Counting all of them would report the other seven
     * as unreachable, which is the browser's roving tab order working, not a defect.
     */
    const radio = element as HTMLInputElement;
    if (radio.type === "radio" && radio.name !== "") {
      const group = [...document.querySelectorAll<HTMLInputElement>("input[type=radio]")].filter(
        (other) => other.name === radio.name && other.form === radio.form,
      );
      if ((group.find((other) => other.checked) ?? group[0]) !== radio) return false;
    }
    return true;
  });

  return showing.map((element, index) => {
    element.setAttribute("data-reach", String(index));
    return {
      name: (element.getAttribute("aria-label") ?? (element as HTMLElement).innerText ?? "")
        .replace(/\s+/g, " ")
        .trim(),
      tag: element.tagName.toLowerCase(),
    };
  });
}

/** What has focus, said in the terms the census was written in. In the page; closes over nothing. */
function tagged(element: Element): string | null {
  return element.getAttribute("data-reach");
}

/** Count what is on the screen, then walk the keyboard round it and see what it reached. */
async function measure(page: Page, screen: Screen): Promise<Reading> {
  const showing = await page.evaluate(census, SHOWING);
  // `tabStops` owns the pressing — including `start()`, without which a screen arrived at by
  // clicking a control near the end of the tab order reports no stops at all (#284).
  const stops = await tabStops(page, screen.id, { focused: tagged });
  await page.evaluate(() => {
    for (const element of document.querySelectorAll("[data-reach]"))
      element.removeAttribute("data-reach");
  });

  const landed = new Map<string, string>();
  const strangers: string[] = [];
  for (const stop of stops)
    if (stop.focused === null) strangers.push(`${stop.screen} stop ${stop.order}: ${stop.what}`);
    else landed.set(stop.focused, stop.what);

  return {
    screen,
    strangers,
    controls: showing.map((control, index) => ({
      ...control,
      reached: landed.has(String(index)),
      stop: landed.get(String(index)) ?? null,
    })),
  };
}

/** A screen with something over something else, and what the tool left on the glass. */
interface Covering {
  /** What came down, in a sentence a failure message can end with. */
  readonly what: string;
  /** The controls that are on the glass and must stay in reach, by their own words. */
  readonly glass: readonly (string | RegExp)[];
}

/**
 * What is covering what, on the two screens where anything is.
 *
 * Both are named rather than derived, because *"is this covered"* is the question — deriving it
 * from `inert` would make the test agree with the product by construction, and deriving it from
 * geometry does not work here (see the docblock). Every other screen of the route covers nothing
 * and every control on it must be in reach; that is the half of this check that would catch a
 * dead tab stop anywhere in the builder, which is #254's defect and not #255's.
 */
function covering(screen: string, width: string): Covering | null {
  if (screen === "list" && width === "390")
    return {
      what: "the preview page, down over the list (#255, §7.6)",
      // The way out and the primary action, both moved into the drawer's own header by #255 and
      // #186 so that what the page covers is not a dead end.
      glass: ["Edit your page", "Download"],
    };
  if (screen === "list+download-sheet")
    return {
      what: "§7.7's download sheet, which holds the keyboard with a trap rather than `inert`",
      glass: ["Close", /^Download .+\.(html|json)$/],
    };
  return null;
}

function onGlass(name: string, cover: Covering | null): boolean {
  if (cover === null) return true; // nothing is over anything: the whole screen is on the glass
  return cover.glass.some((match) =>
    typeof match === "string" ? name === match : match.test(name),
  );
}

/**
 * Where the screen disagrees with #255's rule, one line each. Empty is the passing answer.
 *
 * Both directions are reported, because both are defects and they are not the same defect: a
 * covered control still in reach is what #255 fixed, and a control on the glass the keyboard
 * cannot get to is #254's.
 */
function verdict(reading: Reading, cover: Covering | null): string[] {
  const lines: string[] = [];
  for (const control of reading.controls) {
    const expected = onGlass(control.name, cover);
    const said = `<${control.tag}> “${control.name}”`;
    if (expected && !control.reached)
      lines.push(`${reading.screen.id}: ${said} is on the glass and out of reach`);
    if (!expected && control.reached)
      lines.push(
        `${reading.screen.id}: ${said} is behind ${cover?.what ?? "nothing"} and still in reach ` +
          `— the keyboard landed on ${control.stop ?? "it"}`,
      );
  }
  return lines;
}

/**
 * The route is walked twice, once per width, because the layout branches once and the branch is
 * about exactly this: at 390 the preview page comes down over the list, at 1440 the two sit side
 * by side and nothing covers anything. No width is consulted about what the owner may do — which
 * is `Preview`'s standing rule, and is why the same rule is checked at both sizes rather than one
 * expectation per size.
 */
for (const width of WIDTHS) {
  test(`what is covered is out of reach, and what is not, is not, at ${width.label}`, async ({
    page,
  }) => {
    await page.setViewportSize(width.viewport);

    const problems: string[] = [];
    let counted = 0;
    let reached = 0;
    let list: Reading | null = null;

    const screens = await walkScreens(page, async (screen) => {
      const reading = await measure(page, screen);
      /*
       * **Liveness, screen by screen, before any judgement.** A screen with nothing on it has
       * nothing unreachable on it, and a walk that quietly stopped arriving would pass this file
       * from end to end. The strangers line is the other half: every stop the keyboard finds must
       * be a control the census counted, or the census is blind to something and its silence is
       * worth nothing. Measured on `main`: zero strangers on all 34 screen-visits.
       */
      expect(reading.controls.length, `${screen.what} has controls on it at all`).toBeGreaterThan(
        0,
      );
      expect(reading.strangers, `tab stops ${screen.what} was not counted as showing`).toEqual([]);

      counted += reading.controls.length;
      reached += reading.controls.filter((control) => control.reached).length;
      if (screen.id === "list") list = reading;
      problems.push(...verdict(reading, covering(screen.id, width.label)));
    });

    /*
     * The floors sit under the measured numbers rather than on them — 17 screens, 159 controls,
     * 133 reached at 390 and 144 at 1440 — because this is here to catch a walk that fell over,
     * not to pin the shape of the flow, which `plan.test.ts` owns and would fail twice.
     */
    expect(screens.length, "screens the walk reached").toBeGreaterThanOrEqual(28);
    expect(counted, "controls the walk counted").toBeGreaterThanOrEqual(250);
    expect(reached, "controls the keyboard reached").toBeGreaterThanOrEqual(220);

    /*
     * The screen the commitment is about, held by name as well as by the rule above: the list is
     * **still there** behind the page — thirteen controls, counted off the live DOM — and at 390
     * eleven of them are out of reach. A list that had been unmounted rather than covered would
     * satisfy "nothing covered is reachable" and fail here, which is the difference between the
     * two ways of making a screen quiet.
     */
    const reading = list as Reading | null;
    expect(reading, "the walk reached the review list as it lands").not.toBeNull();
    expect(reading!.controls.length, "controls on the review list").toBeGreaterThanOrEqual(12);

    // Named first, so that a screen in the wrong half of the rule says which controls and why
    // rather than reporting a number that came out one short.
    expect(problems, "controls in the wrong half of #255's rule").toEqual([]);

    expect(
      reading!.controls.filter((control) => !control.reached).length,
      width.label === "390"
        ? "controls of the covered list out of reach at 390"
        : "controls out of reach at 1440, where nothing covers anything",
    ).toBe(width.label === "390" ? reading!.controls.length - 2 : 0);

    console.log(
      `§7.12(3) at ${width.label}: ${screens.length} screens, ${counted} controls, ` +
        `${reached} reachable — the review list ${
          width.label === "390"
            ? `2 of ${reading!.controls.length}, both on the drawer's glass`
            : `${reading!.controls.length} of ${reading!.controls.length}, nothing covering anything`
        }`,
    );
  });
}

/**
 * The control: break reachability both ways, and the same instrument must say so.
 *
 * **This is the half that makes the two tests above worth reading**, and it is #255's own defect
 * put back rather than an invented one. The map's first Note is why: a guard must prove it found
 * something before it can report nothing wrong, and three mechanisms on the last build map
 * returned empty and passed.
 *
 * Both directions are mutated, because the rule has two halves and an instrument that could only
 * see one of them would be silent about #254's defect while looking busy about #255's:
 *
 * 1. **The tool covers a control it left on its own glass.** `inert` on _Edit your page_ — the
 *    way out of the covered screen — and the verdict must report it out of reach.
 * 2. **What the tool covers comes back into reach.** Every `inert` in the document removed,
 *    which is `List.tsx` before #255, and the eleven controls behind the page must all be
 *    reported reachable.
 *
 * The mutations are applied in the page rather than by editing `List.tsx`, so the build under
 * test is the shipped one. Verified against the product too, by hand: with `inert={covered}`
 * deleted from `List.tsx` and the builder rebuilt, the 390 test fails with all eleven leaks and
 * the 1440 test still passes — which is the shape a lost `inert` really has.
 */
test("the walk goes red when what is covered comes back into reach", async ({ page }) => {
  await page.setViewportSize(WIDTHS[0].viewport);

  let onGlassButOutOfReach: string[] = [];
  let coveredButInReach: string[] = [];
  let counted = 0;

  const screens = await walkScreens(page, async (screen) => {
    if (screen.id !== "list") return;
    const cover = covering(screen.id, "390");

    // 1. The drawer covers the one control that hands the screen back.
    await page.evaluate(() => {
      const out = [...document.querySelectorAll("button")].find(
        (button) => button.innerText.trim() === "Edit your page",
      );
      out?.setAttribute("inert", "");
    });
    onGlassButOutOfReach = verdict(await measure(page, screen), cover);

    // 2. Nothing is out of reach any more — `List.tsx` as it was before #255.
    await page.evaluate(() => {
      for (const element of document.querySelectorAll("[inert]")) element.removeAttribute("inert");
    });
    const leaking = await measure(page, screen);
    counted = leaking.controls.length;
    coveredButInReach = verdict(leaking, cover);
  });

  expect(screens.length, "screens the control walked").toBeGreaterThanOrEqual(28);
  expect(counted, "controls on the list the control mutated").toBeGreaterThanOrEqual(12);

  expect(onGlassButOutOfReach, "what the instrument said about the covered way out").toEqual([
    expect.stringContaining("“Edit your page” is on the glass and out of reach"),
  ]);

  expect(
    coveredButInReach.filter((line) => !line.includes("still in reach")),
    "leaks reported as anything but a leak",
  ).toEqual([]);
  expect(coveredButInReach.length, "controls reported back in reach behind the page").toBe(
    counted - 2,
  );
});

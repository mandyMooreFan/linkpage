import { expect, type JSHandle, type Page } from "@playwright/test";

/**
 * The browser walk the standing accessibility measurements ride on. `SPEC.md` §7.12, §7.6.
 *
 * **Not a test.** It is `walk.ts` rather than `*.e2e.ts` on purpose — `playwright.config.ts`
 * matches `**\/*.e2e.ts`, so this file is a library the specs beside it import and never a spec
 * the runner collects. Three of §7.12's six commitments are checked here rather than in jsdom,
 * and they ask three different questions of the same route: is a ring painted on this stop
 * (`focus-ring.e2e.ts`), can this control be reached at all, is its hit area big enough. **The
 * route is the expensive part and the question is the cheap one**, so the route lives once.
 *
 * **It drives by `data-*` hooks and roles, never by utility classes** — `scripts/review-shots.mjs`
 * makes the argument at length and this is the same argument at higher stakes: a walk that steers
 * by `tap` or `focus-line` breaks on exactly the changes it exists to check.
 *
 * **Two widths, §7.6's two** — 390 and 1440. The builder's layout branches once, at `wide:`, and
 * both sides of that branch are walked because the interesting difference between them is what
 * covers what: at 390 the preview drawer covers the screen, at 1440 nothing covers anything.
 *
 * **The preview iframe is not a stop here.** It is the one place in either hand walk where
 * `:focus-visible` did not match, Chromium owns that behaviour, and #272 recorded it as CL-14 and
 * ruled it out of scope. `tabStops` steps over it — and over anything focus reaches *inside* it,
 * which is the exported page and answers to §6.8, not to §7.12.
 */

/** §7.6's two sizes, the pair every hand walk of this builder has used. */
export const WIDTHS = [
  { label: "390", viewport: { width: 390, height: 844 } },
  { label: "1440", viewport: { width: 1440, height: 900 } },
] as const;

/** One screen of the builder, as the walk met it. */
export interface Screen {
  /** Stable and sortable: `flow/04-whats-your-colour`, `list`, `list/download-sheet`. */
  readonly id: string;
  /** What it is, in a sentence a failure message can end with. */
  readonly what: string;
}

/** One tab stop, with whatever the caller's probe made of it. */
export interface Stop<T> {
  /** The screen it was reached on. */
  readonly screen: string;
  /** Its place in that screen's tab order, from 1. */
  readonly order: number;
  /**
   * Role and accessible name as **the browser** computes them, via Playwright's own snapshot —
   * `button "Continue"`. Never `innerText`: a text field named by its `<label>` reads as
   * unnamed through `innerText`, and #263 nearly published a finding on the strength of it.
   */
  readonly what: string;
  /** What the probe returned while the stop had focus. */
  readonly focused: T;
  /** The same probe on the same element once focus had left, or `null` if it went away. */
  readonly resting: T | null;
}

/**
 * A pair of probes, both evaluated **in the page** on the same element.
 *
 * `resting` is what turns "this control has a 2px border" into "this control *grew* one when
 * focus arrived". Omit it when the question does not need a before (a tap target is the same
 * size focused or not); supply it when the answer is a change rather than a state.
 */
export interface Probes<T> {
  readonly focused: (element: Element) => T;
  readonly resting?: (element: Element) => T;
}

/** One answer per wizard step, keyed by the question's own heading — as `review-shots.mjs`. */
const ANSWERS: Record<
  string,
  { kind: string; value?: string; choose?: string; labels?: string[] }
> = {
  "What kind of business is this?": { kind: "preset", choose: "Food & drink" },
  "What's it called?": { kind: "type", value: "Ada & Sons Bakers" },
  "One line about what you do?": {
    kind: "type",
    value: "Sourdough, pastries, and the best cheese scone in town",
  },
  "Do you have a logo?": { kind: "skip" },
  "What's your colour?": { kind: "swatch" },
  "Which of these do you have?": {
    kind: "check",
    labels: ["See the menu", "Order for pickup"],
  },
  "Where does “See the menu” go?": { kind: "type", value: "https://example.com/menu" },
  "Where does “Order for pickup” go?": { kind: "type", value: "https://example.com/order" },
  "When are you open?": { kind: "hours" },
  "How do people reach you?": { kind: "contact" },
  "Where are you?": { kind: "address" },
  "Where else are you online?": { kind: "skip" },
};

const TEXTISH =
  '[data-screen="flow"] input:not([type="checkbox"]):not([type="radio"]):not([type="file"])';

/** A walk this long means something is wrong, not that the flow grew. */
const MOST_STEPS = 20;

/** Likewise: no screen in this builder has forty controls on it. */
const MOST_STOPS = 60;

const slug = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);

/** The question on screen, by its own heading, or `null` once the flow is behind us. */
async function heading(page: Page): Promise<string | null> {
  const h = page.locator('[data-screen="flow"] h1').first();
  return (await h.count()) ? ((await h.textContent()) ?? "").trim() : null;
}

/**
 * Fill one step in. Returns false when the step advances itself, as the preset picker does.
 *
 * Everything is blurred afterwards, for the reason `review-shots.mjs` gives — fields normalise
 * on blur — and for one more that matters here: a walk that starts tabbing with a caret already
 * in a box starts from the middle of the tab order.
 */
async function answer(page: Page, spec: (typeof ANSWERS)[string]): Promise<boolean> {
  let again = true;
  switch (spec.kind) {
    case "preset":
      await page.getByRole("button", { name: spec.choose }).first().click();
      again = false;
      break;
    case "type":
      await page
        .locator(TEXTISH)
        .first()
        .fill(spec.value ?? "");
      break;
    case "swatch":
      await page.locator("[data-swatch]").first().click();
      break;
    case "check":
      for (const label of spec.labels ?? [])
        await page.getByLabel(label, { exact: false }).first().check();
      break;
    case "hours": {
      /*
       * The day modes are `sr-only` radios inside their labels (§7.10), so the segment a person
       * presses is the label and the radio is a 1×1 box hidden inside it. Found by the role and
       * pressed by the label, which scrolls it into view and hit-tests honestly.
       *
       * **`check({ force: true })` on the radio itself is the wrong instrument here, and this
       * walk is where that was first seen** — but the report it prompted was narrower than the
       * claim. `force` skips the scroll-into-view, so the click goes to the box's current
       * viewport coordinate: unscrolled it is over the label and works, and *this* walk arrives
       * at the hours step having already tabbed the seven day rows, ~367px down at 390, with
       * Monday's radio above the top of the viewport and nothing under the point at all. So it
       * failed here and went on working in the hand-run ritual, which arrives unscrolled.
       * Measured, both ways, on `main`; `scripts/flow.mjs` now presses the label too (#302).
       */
      const open = page.getByRole("radio", { name: "Open", exact: true }).first();
      await open.locator("xpath=ancestor::label[1]").click();
      await expect(open).toBeChecked();
      const times = page.locator(TEXTISH);
      await times.nth(0).fill("7am");
      await times.nth(1).fill("2pm");
      break;
    }
    case "contact": {
      const fields = page.locator(TEXTISH);
      await fields.nth(0).fill("020 7946 0100");
      await fields.nth(1).fill("hello@adasbakery.example");
      break;
    }
    case "address":
      await page
        .locator('[data-screen="flow"] textarea')
        .first()
        .fill("12 Mill Lane\nHebden Bridge\nHX7 8AA");
      await page.getByLabel("A link to directions").fill("maps.example/?q=12+Mill+Lane");
      break;
    default:
      break;
  }
  await page.evaluate(() =>
    document.activeElement instanceof HTMLElement ? document.activeElement.blur() : undefined,
  );
  return again;
}

/** Leave the current step the way the walk's answer implies: Continue if it can, else the escape. */
async function leave(page: Page, spec: (typeof ANSWERS)[string], title: string): Promise<void> {
  const escape = page.locator("[data-escape]");
  const next = page.getByRole("button", { name: /^(Continue|Save)$/ });
  if (spec.kind === "skip" && (await escape.count())) await escape.first().click();
  else if ((await next.count()) && (await next.first().isEnabled())) await next.first().click();
  else if (await escape.count()) await escape.first().click();
  else throw new Error(`nothing to press on “${title}”: no enabled Continue and no escape`);
}

/**
 * Every screen of the builder, from an empty start, with `visit` called on each.
 *
 * The route: the preset screen, every wizard step as it arrives, the progress bar with its topic
 * list open, the review list as it lands, the list with the drawer put away, the download sheet,
 * and one row's editor. **Returns the screens it reached** — the caller asserts on that count
 * before it asserts anything about what was on them, because a walk that reached nothing finds
 * nothing wrong with it.
 *
 * **A question that is not about the tab order asks it from here.** `tabStops` below is one way to
 * interrogate a screen and not the only one: a check about what is *reachable* rather than what is
 * next, or about the size of every hit area on screen rather than every stop, takes this route and
 * asks its own question inside `visit`.
 */
export async function walkScreens(
  page: Page,
  visit: (screen: Screen) => Promise<void>,
): Promise<Screen[]> {
  const seen: Screen[] = [];
  const call = async (id: string, what: string): Promise<void> => {
    const screen = { id, what };
    seen.push(screen);
    await visit(screen);
  };

  await page.goto("/linkpage/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/linkpage/");

  const met = new Set<string>();
  for (let step = 1; step <= MOST_STEPS; step += 1) {
    if (!(await page.locator('[data-screen="flow"]').count())) break; // out of the flow: the list
    const title = await heading(page);
    if (title === null) throw new Error("the flow is on screen with no heading to name it by");
    if (met.has(title)) throw new Error(`“${title}” came round again: the walk stopped advancing`);
    met.add(title);

    const spec = ANSWERS[title];
    if (spec === undefined) throw new Error(`no answer known for “${title}” — add it to ANSWERS`);

    const id = `flow/${String(step).padStart(2, "0")}-${slug(title)}`;
    await call(id, `the “${title}” step`);

    // The bar's topic list, once, on the first screen that has a bar — it is static chrome and
    // is the same disclosure on every step after this one (§7.2), so opening it on each would
    // buy the same nine stops a dozen times over.
    const bar = page.locator("[data-progress-bar] button[aria-expanded]").first();
    if (met.size === 2 && (await bar.count())) {
      await bar.click();
      await page.locator("[data-topic-list]").first().waitFor();
      await call(`${id}+topics`, "the progress bar's topic list, open");
      await bar.click();
    }

    if (await answer(page, spec)) await leave(page, spec, title);
    /*
     * Wait for the screen to *change*, not for a heading to exist: the old one is still on the
     * page for a frame or two after the press (§7.11's view transition), and a walk that reads it
     * then answers the same question twice and stops making progress. Watched rather than slept
     * through — `review-shots.mjs` can afford 400ms a screen and a CI job bounded at ten minutes
     * cannot.
     */
    await page.waitForFunction((last) => {
      const h = document.querySelector('[data-screen="flow"] h1');
      return h === null || (h.textContent ?? "").trim() !== last;
    }, title);
  }

  const list = page.locator('[data-screen="list"]');
  if (!(await list.count())) throw new Error("the walk never reached the review list");

  // As it lands: page-first at 390, where the drawer covers the rows (#147, §7.6), and beside
  // them at 1440. This is the screen CL-12's numbers were measured on.
  await call("list", "the review list as it lands");

  /*
   * The preview put away, and left away for the rest of the walk. At 390 this is the difference
   * between two stops and thirteen — the rows are *behind* the drawer, so a walk that reopened it
   * would find every row it wants to press next covered by glass (§7.6, #147).
   */
  const drawer = page.getByRole("button", { name: /(the|your) page$/ }).first();
  if (await drawer.count()) {
    await drawer.click();
    await call("list+drawer-shut", "the review list with the preview put away");
  }

  const row = page.locator("[data-row] button").first();
  if (await row.count()) {
    await row.click();
    await page.locator("[data-row-body]").first().waitFor();
    await call("list+row", "the review list with a row open for editing");
    const shut = page.locator("[data-row-body]").first().getByRole("button", { name: "Done" });
    if (await shut.count()) await shut.click();
    else await page.keyboard.press("Escape");
  }

  const download = page.getByRole("button", { name: "Download", exact: true }).first();
  if (await download.count()) {
    await download.click();
    await page.getByRole("dialog", { name: "Download" }).waitFor();
    await call("list+download-sheet", "the download sheet");
    await page.keyboard.press("Escape");
  }

  return seen;
}

/** What one Tab press landed on, as the page sees it. Not the caller's business. */
interface Landing {
  /** Its index among `document.querySelectorAll("*")` — identity, so a wrap can be spotted. */
  readonly at: number;
  readonly tag: string;
}

/**
 * Every tab stop of the screen that is on the page right now, with `probes` applied to each.
 *
 * **Tab is pressed for real.** `:focus-visible` is a live match on how focus arrived, so there is
 * no way to ask this question without a browser and a keyboard — which is the whole reason three
 * of §7.12's lines were guarded at their source until now.
 *
 * The walk ends when focus leaves the document or comes back to a stop already counted. **The
 * preview iframe is stepped over**, along with anything focus reaches inside it: `document
 * .activeElement` stays the `<iframe>` while focus is in its content, so a repeat of it is a
 * "keep going", not a wrap.
 */
export async function tabStops<T>(
  page: Page,
  screen: string,
  probes: Probes<T>,
): Promise<Stop<T>[]> {
  await start(page);

  const stops: Stop<T>[] = [];
  const elements: JSHandle<Element>[] = [];
  const counted = new Set<number>();

  for (let press = 0; press < MOST_STOPS * 2; press += 1) {
    await page.keyboard.press("Tab");
    const landing = await page.evaluate((): Landing | null => {
      const element = document.activeElement;
      if (element === null || element === document.body || element === document.documentElement)
        return null;
      const all = document.querySelectorAll("*");
      let at = -1;
      for (let index = 0; index < all.length; index += 1)
        if (all[index] === element) {
          at = index;
          break;
        }
      return { at, tag: element.tagName };
    });

    if (landing === null) break; // focus left the document: the tab order has come round
    if (landing.tag === "IFRAME") continue; // CL-14, and the exported page behind it (§6.8)
    if (counted.has(landing.at)) break;
    counted.add(landing.at);

    const element = await page.evaluateHandle(() => document.activeElement as Element);
    elements.push(element);
    stops.push({
      screen,
      order: stops.length + 1,
      what: await describe(page),
      focused: await element.evaluate(probes.focused),
      resting: null,
    });
    if (stops.length >= MOST_STOPS)
      throw new Error(`${screen}: ${MOST_STOPS} tab stops and still going — the walk is looping`);
  }

  if (probes.resting === undefined) return stops;

  // The after half. Focus has to be *out* of the document for this to mean anything, and it is
  // not enough to have tabbed past the last control: on a screen the walk left early, focus is
  // still on a stop.
  await start(page);
  const at = probes.resting;
  const rested = await Promise.all(
    elements.map(async (element) => {
      try {
        return await element.evaluate(at);
      } catch {
        return null; // it went away between the two reads; the caller decides what that means
      }
    }),
  );
  await Promise.all(elements.map((element) => element.dispose()));
  return stops.map((stop, index) => ({ ...stop, resting: rested[index] ?? null }));
}

/**
 * Put the keyboard back at the top of the document, with nothing focused.
 *
 * **Blurring is not enough, and this is the trap that made the walk's first list screen report
 * zero stops.** Tab does not resume from the start of the document; it resumes from the
 * *sequential focus navigation starting point*, which a click leaves on whatever was clicked —
 * so a screen the walk arrived at by pressing a control near the end of the tab order gave one
 * Tab press, one exit, and no stops at all. That is exactly the shape of failure §7.12's liveness
 * rule exists to catch, and it was the instrument rather than the product. Focusing `<body>`
 * moves the starting point back to the top; blurring it leaves nothing focused, which is where
 * the walk has to begin or the first stop is not a first stop.
 */
async function start(page: Page): Promise<void> {
  await page.evaluate(() => {
    const body = document.body;
    const had = body.getAttribute("tabindex");
    body.setAttribute("tabindex", "-1");
    body.focus();
    body.blur();
    if (had === null) body.removeAttribute("tabindex");
    else body.setAttribute("tabindex", had);
  });
}

/**
 * Role and accessible name for whatever has focus, computed by the browser rather than guessed.
 *
 * `ariaSnapshot` is Playwright's own name computation, which is the point — and it is wrapped
 * because it is only ever used to write a sentence. A stop that cannot be described is still a
 * stop, and a walk that threw here would be a walk that failed for the wrong reason.
 */
async function describe(page: Page): Promise<string> {
  try {
    const snapshot = await page.locator(":focus").ariaSnapshot({ timeout: 2_000 });
    return snapshot
      .replace(/^\s*-\s*/, "")
      .replace(/\s*\n\s*/g, " · ")
      .slice(0, 120);
  } catch {
    return "(unnamed)";
  }
}

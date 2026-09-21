import { expect, test, type Page } from "@playwright/test";
import { POPULATED } from "../src/fixtures.js";
import { walkScreens, WIDTHS } from "./walk.js";

/**
 * **What stands where on screen one** (`SPEC.md` §7.6, §7.8; #371, walk moments 1 and 2).
 *
 * Two things the desktop walk saw that no class string can answer for, because both are about
 * where a rendered box landed: the drawer's control sat flush with the right column's left edge
 * while the page frame under it was centred, so the two shared no edge; and *Already have a
 * project file? Open it.* hung under the last preset, when the owner wanted the column to carry
 * it to the foot of the viewport as a footer. Both are wide-only — on a phone the columns stack
 * and the drawer's control is the footer already (#148) — so the phone is measured too, to hold
 * that nothing moved there.
 *
 * **And where the language picker opens** (§7.4; #379, spec-pass findings 6 and 7). A scroll
 * box is the one place in the builder where what is on screen depends on a scroll position, and
 * jsdom has none: whether the chosen language is inside the box when the row opens, and whether
 * the box's foot lands on a row's edge or a few pixels past a divider, are both answered here.
 *
 * **And how tall the tagline's line stands** (§7.2; #382, spec-pass finding 11). Whether a box
 * grew to hold its words or scrolled them out of sight is a rendered height against a scroll
 * height, which only a browser has.
 */

const NARROW = WIDTHS[0];
const WIDE = WIDTHS[1];

/** The root's `wide:py-12`, which is the foot the footer sits on. */
const ROOT_PADDING_WIDE = 48;

interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

const bottom = (box: Box): number => box.y + box.height;

async function screenOne(page: Page): Promise<void> {
  await page.goto("/linkpage/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/linkpage/");
  await page.getByRole("heading", { name: "What kind of business is this?" }).waitFor();
  await page.waitForTimeout(400); // §7.11's arrival fade
}

async function boxOf(page: Page, selector: string): Promise<Box> {
  const box = await page.locator(selector).first().boundingBox();
  if (box === null) throw new Error(`${selector} has no box on screen`);
  return box;
}

/** §7.8's quiet line, found by its words: the footer is the block that holds them. */
async function footerOf(page: Page): Promise<Box> {
  return page.getByText("Already have a project file?").evaluate((element) => {
    const rect = (element.closest("div") as HTMLElement).getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  });
}

test(`the drawer's control and the page frame share a left edge at ${WIDE.label}`, async ({
  page,
}) => {
  await page.setViewportSize(WIDE.viewport);
  await screenOne(page);

  const control = await boxOf(page, 'button[aria-controls][aria-expanded="true"]');
  const frame = await boxOf(page, "[data-preview-frame]");
  expect(Math.round(control.x), "the control's left edge is the frame's").toBe(Math.round(frame.x));
});

test(`"Open it." sits at the foot of the viewport at ${WIDE.label}`, async ({ page }) => {
  await page.setViewportSize(WIDE.viewport);
  await screenOne(page);

  const footer = await footerOf(page);
  const gap = WIDE.viewport.height - bottom(footer);
  expect(Math.round(gap), "air under the footer, which should be the root's own padding").toBe(
    ROOT_PADDING_WIDE,
  );
  // And it is the column that carries it there, not a viewport that happens to be short: the
  // presets end well above it.
  const presets = await boxOf(page, '[data-screen="flow"] ul');
  expect(
    footer.y - bottom(presets),
    "the slack lands between the presets and the footer",
  ).toBeGreaterThan(100);
});

test(`the phone stacks, and nothing moved there at ${NARROW.label}`, async ({ page }) => {
  await page.setViewportSize(NARROW.viewport);
  await screenOne(page);

  // The footer follows the presets at the inter-section rung — the column does not carry it
  // away, because on a phone the drawer's control is the footer (#148).
  const presets = await boxOf(page, '[data-screen="flow"] ul');
  const footer = await footerOf(page);
  expect(Math.round(footer.y - bottom(presets)), "the footer hangs under the presets").toBe(32);
});

test("the measurement goes red when the frame is pushed off the edge", async ({ page }) => {
  await page.setViewportSize(WIDE.viewport);
  await screenOne(page);

  await page.addStyleTag({ content: `[data-preview-frame] { margin-left: 36px !important; }` });
  const control = await boxOf(page, 'button[aria-controls][aria-expanded="true"]');
  const frame = await boxOf(page, "[data-preview-frame]");
  expect(Math.round(frame.x - control.x), "the mutant moved the frame off the edge").toBe(36);
});

/** Where the store keeps the project (`src/project/store.ts`); seeding it lands on the list. */
const PROJECT_STORAGE_KEY = "linkpage.project";

/** The review list on a seeded project, with one row opened by its name (#379's pattern). */
async function rowOpen(page: Page, project: unknown, row: RegExp, opened: string): Promise<void> {
  await page.addInitScript(
    ([key, text]: [string, string]) => window.localStorage.setItem(key, text),
    [PROJECT_STORAGE_KEY, JSON.stringify(project)] as [string, string],
  );
  await page.goto("/linkpage/");
  await page.getByRole("heading", { level: 1 }).waitFor();
  // The drawer covers the rows at 390 (§7.6); put it away wherever it is open.
  const drawer = page.getByRole("button", { name: /(the|your) page$/ }).first();
  if ((await drawer.getAttribute("aria-expanded")) === "true") await drawer.click();
  await page.getByRole("button", { name: row, expanded: false }).click();
  await page.locator(opened).waitFor();
  await page.waitForTimeout(400); // §7.11's fade
}

/**
 * The review list with the language row open, on a project whose language is English — which
 * is the eleventh row of forty-two and so below the fold of a box that opens at its top.
 */
async function languageRowOpen(page: Page, lang: string): Promise<void> {
  await rowOpen(page, { ...POPULATED, lang }, /^Page language/, "[data-languages]");
}

/** The scroll box's inside — its border excluded — and every row's box, in page coordinates. */
async function pickerBoxes(page: Page): Promise<{
  readonly inside: { top: number; bottom: number; height: number };
  readonly rows: readonly { top: number; bottom: number; pressed: boolean }[];
}> {
  return page.locator("[data-languages]").evaluate((list) => {
    const rect = list.getBoundingClientRect();
    const inside = {
      top: rect.top + list.clientTop,
      bottom: rect.top + list.clientTop + list.clientHeight,
      height: list.clientHeight,
    };
    const rows = [...list.querySelectorAll("li")].map((li) => {
      const r = li.getBoundingClientRect();
      const button = li.querySelector("button");
      // The row's words, not its hairline: `divide-y` gives every row but one a 1px border —
      // on the bottom in Tailwind v4, on the top in v3 — and a row ends where its words end.
      const ruleBelow = parseFloat(getComputedStyle(li).borderBottomWidth) || 0;
      return {
        top: r.top + li.clientTop,
        bottom: r.bottom - ruleBelow,
        pressed: button?.getAttribute("aria-pressed") === "true",
      };
    });
    return { inside, rows };
  });
}

for (const width of [NARROW, WIDE]) {
  test(`the language picker opens with the chosen language in view at ${width.label}`, async ({
    page,
  }) => {
    await page.setViewportSize(width.viewport);
    await languageRowOpen(page, "en-US");

    const { inside, rows } = await pickerBoxes(page);
    const chosen = rows.find((row) => row.pressed);
    expect(chosen, "one row carries the mark").toBeDefined();
    if (chosen === undefined) return;
    expect(chosen.top, "the chosen row starts inside the box").toBeGreaterThanOrEqual(inside.top);
    expect(chosen.bottom, "and ends inside it").toBeLessThanOrEqual(inside.bottom);
    // With the row before it above, so it reads as a place in the list rather than its start.
    const before = rows[rows.indexOf(chosen) - 1];
    expect(before?.top, "the row before it is in view too").toBeGreaterThanOrEqual(inside.top);
  });

  test(`the picker's box shows whole rows, so its edge never doubles a hairline at ${width.label}`, async ({
    page,
  }) => {
    await page.setViewportSize(width.viewport);
    await languageRowOpen(page, "en-US");

    const { inside, rows } = await pickerBoxes(page);
    const visible = rows.filter((row) => row.bottom > inside.top && row.top < inside.bottom);
    expect(visible.length, "four rows in the box").toBe(4);
    const first = visible[0];
    const last = visible[visible.length - 1];
    // The first visible row's words start at the box's top and the last one's words end at its
    // foot: no sliver of a fifth row, and no divider a few pixels inside the box's own rule.
    expect(Math.round((first?.top ?? NaN) - inside.top), "no sliver above the first row").toBe(0);
    expect(Math.round(inside.bottom - (last?.bottom ?? NaN)), "no sliver under the last").toBe(0);
  });
}

test("the whole-rows measurement goes red when the box is a sliver taller", async ({ page }) => {
  await page.setViewportSize(WIDE.viewport);
  await languageRowOpen(page, "en-US");

  // 320px is the `max-h-80` the box wore before #379: four rows, a divider and 2px of the fifth.
  await page.addStyleTag({ content: `[data-languages] { max-height: 320px !important; }` });
  const { inside, rows } = await pickerBoxes(page);
  const visible = rows.filter((row) => row.bottom > inside.top && row.top < inside.bottom);
  const last = visible[visible.length - 1];
  expect(visible.length, "the mutant shows a fifth row's sliver").toBe(5);
  expect(inside.bottom - (last?.top ?? NaN), "of a few pixels").toBeLessThan(8);
});

/**
 * The tagline row open — the flow's own question, in the row (§7.4) — on a project whose
 * tagline is longer than the line at either width. `POPULATED`'s fits a laptop's column.
 */
const LONG_TAGLINE =
  "Sourdough, pastries, and the best cheese scone in town, with very good coffee from seven";
/** And one that fits a phone's line, so the box at rest can be measured against the floor. */
const SHORT_TAGLINE = "Sourdough since 1902";

async function taglineRowOpen(page: Page, tagline: string): Promise<void> {
  await rowOpen(
    page,
    { ...POPULATED, header: { ...POPULATED.header, tagline } },
    /^A line about what you do/,
    "[data-wraps]",
  );
}

/**
 * The line's own box and what it holds, as the browser laid them out: `box` is the whole box,
 * rule included, which is what `tap` floors; `inside` and `words` both leave the rule out, so
 * they compare like with like.
 */
async function taglineLine(page: Page): Promise<{
  readonly box: number;
  readonly inside: number;
  readonly words: number;
  readonly lines: number;
}> {
  return page.locator("[data-wraps]").evaluate((element: HTMLTextAreaElement) => {
    const lineHeight = parseFloat(getComputedStyle(element).lineHeight);
    return {
      box: element.offsetHeight,
      inside: element.clientHeight,
      words: element.scrollHeight,
      lines: Math.round(
        (element.scrollHeight -
          parseFloat(getComputedStyle(element).paddingTop) -
          parseFloat(getComputedStyle(element).paddingBottom)) /
          lineHeight,
      ),
    };
  });
}

/** §7.6's `tap` floor, which is what an empty or one-line box rests on. */
const TAP_FLOOR = 44;

for (const width of [NARROW, WIDE]) {
  test(`the tagline's line grows to its words instead of hiding their end at ${width.label}`, async ({
    page,
  }) => {
    await page.setViewportSize(width.viewport);
    await taglineRowOpen(page, LONG_TAGLINE);

    const line = await taglineLine(page);
    expect(line.lines, "the tagline really is longer than the line here").toBeGreaterThan(1);
    expect(line.words, "nothing is scrolled out of sight").toBeLessThanOrEqual(line.inside);
    expect(line.box, "so the box stands taller than the floor").toBeGreaterThan(TAP_FLOOR);
  });

  test(`and a tagline that fits leaves the box on the floor at ${width.label}`, async ({
    page,
  }) => {
    await page.setViewportSize(width.viewport);
    await taglineRowOpen(page, SHORT_TAGLINE);

    const line = await taglineLine(page);
    expect(line.lines).toBe(1);
    expect(line.box, "one row, held at `tap` like the one-line box it replaced").toBe(TAP_FLOOR);
  });
}

/**
 * The name's box, the same way (#399, filed to wait from #382).
 *
 * **Its own fixtures, not the tagline's.** A business name and a line about what you do are
 * different lengths of thing — the name that overflows is a real long trading name, not a
 * sentence — and a shared constant would quietly make one of the two tests about the other.
 */
const LONG_NAME = "Ada & Sons Bakers and Wholesale Confectioners of Great Titchfield Street";
/** And one that fits a phone's line, so the box at rest can be measured against the floor. */
const SHORT_NAME = "Ada & Sons Bakers";

async function nameRowOpen(page: Page, name: string): Promise<void> {
  await rowOpen(
    page,
    { ...POPULATED, header: { ...POPULATED.header, name } },
    /^Business name/,
    "[data-wraps]",
  );
}

for (const width of [NARROW, WIDE]) {
  test(`the name's line grows to its words instead of hiding their end at ${width.label}`, async ({
    page,
  }) => {
    await page.setViewportSize(width.viewport);
    await nameRowOpen(page, LONG_NAME);

    const line = await taglineLine(page);
    expect(line.lines, "the name really is longer than the line here").toBeGreaterThan(1);
    expect(line.words, "nothing is scrolled out of sight").toBeLessThanOrEqual(line.inside);
    expect(line.box, "so the box stands taller than the floor").toBeGreaterThan(TAP_FLOOR);
  });

  test(`and a name that fits leaves the box on the floor at ${width.label}`, async ({ page }) => {
    await page.setViewportSize(width.viewport);
    await nameRowOpen(page, SHORT_NAME);

    const line = await taglineLine(page);
    expect(line.lines).toBe(1);
    expect(line.box, "one row, held at `tap` like the one-line box it replaced").toBe(TAP_FLOOR);
  });
}

/**
 * **The second half of #399's ticket, measured rather than reasoned.** The name box and the
 * tagline box are the same box at rest, and the ticket asked whether turning the name's wrapping
 * on kept that true. Both rest on `tap`, so the answer should be yes — and "should be" is what
 * this test exists to replace.
 *
 * **At rest here means one line, not empty.** The ticket said *empty*; the business name is the
 * one answer the tool refuses to go on without — `NameQuestion` carries no escape and judges the
 * value non-empty (§7.9 decision 1) — and a walk that seeded a nameless project did not reach an
 * open row within the timeout. Rather than chase that, the measurement is taken where it is
 * plainly reachable and says the same thing: a box on the floor with one row in it.
 */
test("a one-line name box and a one-line tagline box are the same box", async ({ page }) => {
  await page.setViewportSize(NARROW.viewport);

  await nameRowOpen(page, SHORT_NAME);
  const name = await taglineLine(page);

  await taglineRowOpen(page, SHORT_TAGLINE);
  const tagline = await taglineLine(page);

  expect(name.box, "the same height at rest").toBe(tagline.box);
  expect(name.inside, "and the same room inside").toBe(tagline.inside);
  expect(name.box, "both on the floor").toBe(TAP_FLOOR);
});

/**
 * **The first half, as far as a browser can be asked.** `organization` on a `<textarea>` is
 * valid — WHATWG's autofill table puts it in the Text control group, which is *"input (Hidden,
 * Text, Search), textarea, select"* — so the attribute must survive the change to a wrapping
 * box. Whether a given browser's heuristic then offers a saved company name is that browser's
 * to decide and cannot be measured from a page, which is why this asserts what it can: the
 * attribute is on the control the owner types into, and it is a textarea.
 */
test("the name box keeps its autofill hint when it becomes a line that wraps", async ({ page }) => {
  await page.setViewportSize(NARROW.viewport);
  await nameRowOpen(page, SHORT_NAME);

  const box = page.locator("[data-wraps]");
  await expect(box).toHaveAttribute("autocomplete", "organization");
  expect(await box.evaluate((element) => element.tagName.toLowerCase())).toBe("textarea");
});

test("the growth measurement goes red when the line is held to one row", async ({ page }) => {
  await page.setViewportSize(NARROW.viewport);
  await taglineRowOpen(page, LONG_TAGLINE);

  // `fixed` is the property's initial value: the box the finding photographed.
  await page.addStyleTag({ content: `[data-wraps] { field-sizing: fixed !important; }` });
  const line = await taglineLine(page);
  expect(line.words, "the mutant scrolls the end out of sight").toBeGreaterThan(line.inside);
});

/**
 * **And where the ways off a tall screen stand** (§7.4, §7.10; #383, spec-pass finding 10).
 *
 * The hours screen is seven day rows, a note and the exits, and at either width the exits
 * arrived a screenful below the fold: nothing an owner saw on landing said the step could be
 * skipped, or where to go on. The row now stays in view — stuck to the foot of the viewport while
 * the form runs on below it, back in its own place once the form's end scrolls up to meet it —
 * and whether a box *is* in view is a rendered position against a viewport, which only a browser
 * has. A screen that fits is not measured here: its row was never stuck, and the ritual's
 * byte-stable frames hold that it did not move.
 */
class Reached extends Error {}

/** The flow's hours screen on arrival, by the walk the tap-target gate takes (#375's pattern). */
async function hoursScreen(page: Page): Promise<void> {
  try {
    await walkScreens(page, async (screen) => {
      if (screen.id === "flow/09-when-are-you-open") throw new Reached();
    });
  } catch (error) {
    if (!(error instanceof Reached)) throw error;
  }
  await page.getByRole("heading", { name: "When are you open?" }).waitFor();
  await page.waitForTimeout(400); // §7.11's arrival fade
}

const exitsRow = (page: Page): Box | Promise<Box> => boxOf(page, "[data-question-exits]");

for (const width of WIDTHS) {
  test(`Continue and the escape are on the hours screen's first screenful at ${width.label}`, async ({
    page,
  }) => {
    await page.setViewportSize(width.viewport);
    await hoursScreen(page);

    const scrolled = await page.evaluate(() => window.scrollY);
    expect(scrolled, "nothing has scrolled yet").toBe(0);
    const form = await boxOf(page, "form");
    expect(bottom(form), "the form itself still runs past the fold").toBeGreaterThan(
      width.viewport.height,
    );

    for (const name of ["Continue", "We don't have set hours", "Back"]) {
      const button = await page.getByRole("button", { name, exact: true }).boundingBox();
      if (button === null) throw new Error(`${name} has no box on screen`);
      expect(bottom(button), `${name} is inside the viewport`).toBeLessThanOrEqual(
        width.viewport.height,
      );
      expect(button.y, `${name} is inside the viewport`).toBeGreaterThanOrEqual(0);
    }
  });

  test(`and the row stands in its own place once the screen is scrolled to its end at ${width.label}`, async ({
    page,
  }) => {
    await page.setViewportSize(width.viewport);
    await hoursScreen(page);

    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(100);
    const note = await boxOf(page, 'input[type="text"]');
    const row = await exitsRow(page);
    expect(row.y, "the row is below the note's box, not over it").toBeGreaterThanOrEqual(
      bottom(note),
    );
    expect(bottom(row), "and inside the viewport").toBeLessThanOrEqual(width.viewport.height);
  });

  test(`a keyboard reaching the note lands it clear of the row at ${width.label}`, async ({
    page,
  }) => {
    await page.setViewportSize(width.viewport);
    await hoursScreen(page);

    // Straight to the last control above the row, the way a Tab would land there.
    await page.locator('input[type="text"]').focus();
    await page.waitForTimeout(100);
    const note = await boxOf(page, 'input[type="text"]');
    const row = await exitsRow(page);
    expect(bottom(note), "the note's box is above the row").toBeLessThanOrEqual(row.y);
    expect(note.y, "and inside the viewport").toBeGreaterThanOrEqual(0);
  });
}

test("the fold measurement goes red when the row is left to scroll with the form", async ({
  page,
}) => {
  await page.setViewportSize(NARROW.viewport);
  await hoursScreen(page);
  await page.addStyleTag({ content: "[data-question-exits] { position: static }" });
  await page.waitForTimeout(50);

  const button = await page.getByRole("button", { name: "Continue", exact: true }).boundingBox();
  if (button === null) throw new Error("Continue has no box on screen");
  expect(bottom(button), "the mutant's Continue is below the fold").toBeGreaterThan(
    NARROW.viewport.height,
  );
});

/**
 * **Where the ways off a screen stand, and what each is made of** (§7.4; #409, the owner's word
 * after the tag).
 *
 * The button clean-up (#370) put `Continue`, the escape and `Back` in one row, and the owner read
 * the row on a laptop and said it was still not right: three shapes bunched at the left of the
 * column, `Back` an underlined word among boxes. What they asked for is a row *spread across the
 * column* — `Back` on the left edge, the escape and `Continue` together on the right, `Continue`
 * last — with all three the same box and `Continue` in the tool's own accent. Where a box's edge
 * landed, how tall it is and what colour it painted are rendered facts, so they are measured here
 * rather than read off a class string; and the order the keyboard meets them in is the order the
 * eye does, which is a fact about focus.
 */
async function taglineScreen(page: Page): Promise<void> {
  try {
    await walkScreens(page, async (screen) => {
      if (screen.id === "flow/03-one-line-about-what-you-do") throw new Reached();
    });
  } catch (error) {
    if (!(error instanceof Reached)) throw error;
  }
  await page.getByRole("heading", { name: "One line about what you do?" }).waitFor();
  await page.waitForTimeout(400); // §7.11's arrival fade
}

const GAP = 16; // the row's `gap-x-4`

/** The tool's accent as Chromium reports it: `--color-accent` in `theme.css`, `#3730a3`. */
const ACCENT = "rgb(55, 48, 163)";

async function paintOf(page: Page, name: string): Promise<{ fill: string; border: string }> {
  // Park the mouse first: the walk arrives by pressing Continue, and leaves the pointer over
  // the next screen's Continue, whose fill would then read as its hover shade (`hover.e2e.ts`
  // parks for the same reason).
  await page.mouse.move(0, 0);
  await page.waitForTimeout(50);
  return page.getByRole("button", { name, exact: true }).evaluate((element) => {
    const style = getComputedStyle(element);
    return { fill: style.backgroundColor, border: style.borderTopWidth };
  });
}

test(`Back stands on the column's left edge and Continue on its right at ${WIDE.label}`, async ({
  page,
}) => {
  await page.setViewportSize(WIDE.viewport);
  await taglineScreen(page);
  const row = await exitsRow(page);
  const back = await boxOf(page, "[data-question-exits] button:has-text('Back')");
  const escape = await boxOf(page, "[data-question-exits] [data-escape]");
  const go = await boxOf(page, "[data-question-exits] button[type='submit']");

  expect(back.x, "Back on the left edge").toBeCloseTo(row.x, 0);
  expect(go.x + go.width, "Continue on the right edge").toBeCloseTo(row.x + row.width, 0);
  expect(escape.x + escape.width + GAP, "the escape beside Continue").toBeCloseTo(go.x, 0);
  expect(back.x + back.width, "and air between Back and the pair").toBeLessThan(escape.x - GAP);
});

test(`the three exits are one box, and Continue wears the accent at ${WIDE.label}`, async ({
  page,
}) => {
  await page.setViewportSize(WIDE.viewport);
  await taglineScreen(page);
  const back = await boxOf(page, "[data-question-exits] button:has-text('Back')");
  const escape = await boxOf(page, "[data-question-exits] [data-escape]");
  const go = await boxOf(page, "[data-question-exits] button[type='submit']");

  expect(back.height, "Back is as tall as the escape").toBe(escape.height);
  expect(go.height, "and so is Continue").toBe(escape.height);
  expect(
    back.height,
    "taller than the tap floor: a proper button, not a tag",
  ).toBeGreaterThanOrEqual(48);

  const backPaint = await paintOf(page, "Back");
  const escapePaint = await paintOf(page, "We don't need one");
  const goPaint = await paintOf(page, "Continue");
  expect(backPaint.border, "Back has the escape's hairline").toBe(escapePaint.border);
  expect(backPaint.border).not.toBe("0px");
  expect(goPaint.fill, "Continue is the tool's accent, not the ink").toBe(ACCENT);
});

test(`the Tab key follows the eye across the row: Back, the escape, then Continue at ${WIDE.label}`, async ({
  page,
}) => {
  await page.setViewportSize(WIDE.viewport);
  await taglineScreen(page);
  await page.getByLabel("Tagline").focus();
  const names: string[] = [];
  for (let stop = 0; stop < 3; stop += 1) {
    await page.keyboard.press("Tab");
    names.push(await page.evaluate(() => document.activeElement?.textContent?.trim() ?? ""));
  }
  expect(names).toEqual(["Back", "We don't need one", "Continue"]);
});

test(`the row keeps inside the phone's column at ${NARROW.label}`, async ({ page }) => {
  await page.setViewportSize(NARROW.viewport);
  await taglineScreen(page);
  const row = await exitsRow(page);
  for (const selector of [
    "[data-question-exits] button:has-text('Back')",
    "[data-question-exits] [data-escape]",
    "[data-question-exits] button[type='submit']",
  ]) {
    const box = await boxOf(page, selector);
    expect(box.x, `${selector} starts inside the column`).toBeGreaterThanOrEqual(row.x);
    expect(box.x + box.width, `${selector} ends inside the column`).toBeLessThanOrEqual(
      row.x + row.width + 0.5,
    );
  }
  // Back still on the left edge, Continue still on the right, whatever line each wrapped to.
  const back = await boxOf(page, "[data-question-exits] button:has-text('Back')");
  const go = await boxOf(page, "[data-question-exits] button[type='submit']");
  expect(back.x).toBeCloseTo(row.x, 0);
  expect(go.x + go.width).toBeCloseTo(row.x + row.width, 0);
});

test("the edge measurement goes red when the row packs to the left again", async ({ page }) => {
  await page.setViewportSize(WIDE.viewport);
  await taglineScreen(page);
  // After the walk, not before: the walk navigates, and a style tag does not survive a `goto`.
  await page.addStyleTag({
    content:
      "[data-question-exits] { justify-content: flex-start } " +
      "[data-question-exits] > button { margin-right: 0 }",
  });
  await page.waitForTimeout(50);
  const row = await exitsRow(page);
  const go = await boxOf(page, "[data-question-exits] button[type='submit']");
  expect(go.x + go.width, "the control: Continue is off the right edge").toBeLessThan(
    row.x + row.width - GAP,
  );
});

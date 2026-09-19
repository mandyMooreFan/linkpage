import { expect, test, type Page } from "@playwright/test";
import { POPULATED } from "../src/fixtures.js";
import { WIDTHS } from "./walk.js";

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

/**
 * The review list with the language row open, on a project whose language is English — which
 * is the eleventh row of forty-two and so below the fold of a box that opens at its top.
 */
async function languageRowOpen(page: Page, lang: string): Promise<void> {
  await page.addInitScript(
    ([key, text]: [string, string]) => window.localStorage.setItem(key, text),
    [PROJECT_STORAGE_KEY, JSON.stringify({ ...POPULATED, lang })] as [string, string],
  );
  await page.goto("/linkpage/");
  await page.getByRole("heading", { level: 1 }).waitFor();
  // The drawer covers the rows at 390 (§7.6); put it away wherever it is open.
  const drawer = page.getByRole("button", { name: /(the|your) page$/ }).first();
  if ((await drawer.getAttribute("aria-expanded")) === "true") await drawer.click();
  await page.getByRole("button", { name: /^Page language/, expanded: false }).click();
  await page.locator("[data-languages]").waitFor();
  await page.waitForTimeout(400); // §7.11's fade
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

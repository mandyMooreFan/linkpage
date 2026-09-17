import { expect, test, type Page } from "@playwright/test";
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

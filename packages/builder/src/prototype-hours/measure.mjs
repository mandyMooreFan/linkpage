/* eslint-disable no-undef -- throwaway measuring scripts: Node globals here, page globals inside page.evaluate. */
/**
 * PROTOTYPE — throwaway. Ticket #80's measuring tape.
 *
 * Drives each variant through the same errand the walk (#78) used as its yardstick — **Mon–Fri
 * 9–5, weekend closed** — at a phone viewport, and prints three numbers per variant: the height
 * of the screen when it opens, the height once the errand is done, and the interactions the
 * errand cost. The walk measured today's screen at **1516px** and **15 interactions**, and both
 * are reproduced here rather than quoted, so a variant is compared against a number this script
 * also produced.
 *
 * Run: `node src/prototype-hours/measure.mjs` from `packages/builder`, with `pnpm dev` up.
 */

import { chromium } from "@playwright/test";

const BASE = process.env.BASE ?? "http://localhost:5173/linkpage/";
const PHONE = { width: 390, height: 844 };

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: PHONE });

/** Interactions, counted the way the prototype's bar counts them: commits plus button presses. */
async function taps(page) {
  return page.evaluate(() => {
    const bar = document.querySelector(".proto-bar__count");
    return bar ? Number(bar.textContent.trim().split(" ")[0]) : null;
  });
}

async function height(page) {
  return page.evaluate(() => Math.round(document.querySelector(".flow__question").scrollHeight));
}

async function measure(key, errand) {
  const page = await context.newPage();
  await page.goto(`${BASE}?prototype=hours&variant=${key}`);
  await page.waitForSelector(".question");
  const opening = await height(page);
  await errand(page);
  const done = await height(page);
  const count = await taps(page);
  const readout = await page
    .locator(".proto-readout__list li")
    .allTextContents()
    .catch(() => []);
  await page.screenshot({ path: `/tmp/hours-${key}.png`, fullPage: true });
  await page.close();
  return { key, opening, done, count, readout };
}

const WEEKDAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const WEEKEND_LABELS = ["Saturday", "Sunday"];

/** Today's screen: seven selects, then ten time boxes. */
async function errandToday(page) {
  for (const day of WEEKDAY_LABELS) {
    await page.getByLabel(day, { exact: true }).selectOption("open");
    await page.getByLabel(`${day} opens`).fill("09:00");
    await page.getByLabel(`${day} closes`).fill("17:00");
  }
  for (const day of WEEKEND_LABELS) {
    await page.getByLabel(day, { exact: true }).selectOption("closed");
  }
}

async function errandA(page) {
  await page.getByRole("button", { name: "Weekdays", exact: true }).click();
  await page.getByLabel("Opening time").fill("09:00");
  await page.getByLabel("Closing time").fill("17:00");
  await page.getByText("Say we’re closed").click();
}

async function errandB(page) {
  await page.getByRole("button", { name: "Add opening times" }).click();
  await page.getByRole("button", { name: "Weekdays", exact: true }).click();
  await page.getByLabel("Opening time").fill("09:00");
  await page.getByLabel("Closing time").fill("17:00");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByText("Say we’re closed").click();
}

async function errandC(page) {
  await page.getByRole("button", { name: "Open", exact: true }).click();
  await page.getByLabel("Monday opens").fill("09:00");
  await page.getByLabel("Monday closes").fill("17:00");
  for (const day of ["Tuesday", "Wednesday", "Thursday", "Friday"]) {
    await page
      .locator(".days__day", { hasText: day })
      .getByRole("button", { name: "Same as Monday" })
      .click();
  }
  for (const day of WEEKEND_LABELS) {
    await page
      .locator(".days__day", { hasText: day })
      .getByRole("button", { name: "Closed" })
      .click();
  }
}

async function errandD(page) {
  const monday = page.locator(".proto-table__row").first();
  await monday.getByRole("button", { name: "Open", exact: true }).click();
  await page.getByLabel("Monday opens").fill("09:00");
  await page.getByLabel("Monday closes").fill("17:00");
  await monday.getByRole("button", { name: "Copy these times…" }).click();
  await monday.getByRole("button", { name: "to weekdays" }).click();
  for (const day of ["Sat", "Sun"]) {
    await page
      .locator(".proto-table__row", { hasText: day })
      .getByRole("button", { name: "Closed" })
      .click();
  }
}

const results = [];
results.push(await measure("T", errandToday));
results.push(await measure("A", errandA));
results.push(await measure("B", errandB));
results.push(await measure("C", errandC));
results.push(await measure("D", errandD));

console.log(`viewport ${PHONE.width}x${PHONE.height} — errand: Mon–Fri 9–5, weekend closed\n`);
for (const r of results) {
  console.log(
    `${r.key}  opens ${String(r.opening).padStart(5)}px   done ${String(r.done).padStart(5)}px   ${String(r.count).padStart(3)} interactions`,
  );
  if (r.readout.length) console.log(`    page says: ${r.readout.join(" | ")}`);
}

await browser.close();

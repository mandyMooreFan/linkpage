/* eslint-disable no-undef -- throwaway measuring script: Node globals here, page globals inside page.evaluate. */
/**
 * PROTOTYPE — throwaway. Ticket #80's third errand, for D against E and F.
 *
 * The first two errands are weeks a *copy* handles: every open day is identical, so one
 * "to weekdays" does the work and carrying down saves nothing. This one is the week carry-down
 * exists for — **a shop whose days mostly agree and sometimes don't**: Mon–Thu 9–5, Fri 9–9,
 * Sat 10–4, Sunday closed. Nothing here can be copied in one go, so every open day costs times
 * unless the previous day's come with it.
 *
 * It also measures the cost E and F are trying to remove but the tap counter cannot see: a
 * `fill` counts as one interaction, where a person typing into a native picker touches hour,
 * minute and meridiem. `keystrokes` counts what a person would actually press.
 *
 * Run: `node src/prototype-hours/measure-carry.mjs` from `packages/builder`, with `pnpm dev` up.
 */

import { chromium } from "@playwright/test";

const BASE = process.env.BASE ?? "http://localhost:5173/linkpage/";
const PHONE = { width: 390, height: 844 };

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: PHONE });

/** Mon–Thu 9–5, Fri 9–9, Sat 10–4, Sun closed. */
const WEEK = [
  { day: "Monday", short: "Mon", open: "09:00", close: "17:00" },
  { day: "Tuesday", short: "Tue", open: "09:00", close: "17:00" },
  { day: "Wednesday", short: "Wed", open: "09:00", close: "17:00" },
  { day: "Thursday", short: "Thu", open: "09:00", close: "17:00" },
  { day: "Friday", short: "Fri", open: "09:00", close: "21:00" },
  { day: "Saturday", short: "Sat", open: "10:00", close: "16:00" },
];

async function run(key) {
  const page = await context.newPage();
  await page.goto(`${BASE}?prototype=hours&variant=${key}`);
  await page.waitForSelector(".question");

  let keystrokes = 0;

  for (const { day, short, open, close } of WEEK) {
    // T is today's screen and has none of the dense table's markup, so it opens a day the way
    // it actually does: a `<select>`. Everything after this line is identical for all four.
    if (key === "T") await page.getByLabel(day, { exact: true }).selectOption("open");
    else
      await page
        .locator(".proto-table__row", { hasText: short })
        .getByRole("button", { name: "Open", exact: true })
        .click();

    // Only type a time the day does not already show. That is the whole of what carrying buys.
    const opens = page.getByLabel(`${day} opens`);
    const closes = page.getByLabel(`${day} closes`);
    if ((await opens.inputValue()) !== open) {
      await opens.fill(open);
      keystrokes += 5; // hh mm meridiem, as a person presses them
    }
    if ((await closes.inputValue()) !== close) {
      await closes.fill(close);
      keystrokes += 5;
    }
  }
  if (key === "T") await page.getByLabel("Sunday", { exact: true }).selectOption("closed");
  else
    await page
      .locator(".proto-table__row", { hasText: "Sun" })
      .getByRole("button", { name: "Closed" })
      .click();

  const done = await page.evaluate(() =>
    Math.round(document.querySelector(".flow__question").scrollHeight),
  );
  const count = await page.evaluate(() =>
    Number(document.querySelector(".proto-bar__count")?.textContent.trim().split(" ")[0] ?? -1),
  );
  const readout = await page.locator(".proto-readout__list li").allTextContents();
  await page.screenshot({ path: `/tmp/hours-carry-${key}.png`, fullPage: true });
  await page.close();
  return { key, done, count, keystrokes, readout };
}

const results = [];
for (const key of ["T", "D", "E", "F"]) results.push(await run(key));

console.log(
  `viewport ${PHONE.width}x${PHONE.height} — errand: Mon–Thu 9–5, Fri 9–9, Sat 10–4, Sun closed\n`,
);
for (const r of results) {
  console.log(
    `${r.key}  done ${String(r.done).padStart(5)}px   ${String(r.count).padStart(3)} interactions   ~${String(r.keystrokes).padStart(3)} keystrokes into time boxes`,
  );
  console.log(`    page says: ${r.readout.join(" | ")}`);
}

await browser.close();

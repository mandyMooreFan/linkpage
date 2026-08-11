/* eslint-disable no-undef -- throwaway measuring scripts: Node globals here, page globals inside page.evaluate. */
/**
 * PROTOTYPE — throwaway. Ticket #80's second errand.
 *
 * The first errand (`measure.mjs`) is the easy week every variant is built for. This one is the
 * week §2.3 says the model exists for: **Mon–Fri 11–2 and 5–9, weekend closed** — a restaurant
 * that shuts for lunch. It is where a shape that made the simple case cheap either holds up or
 * shows what it traded away.
 *
 * Run: `node src/prototype-hours/measure-split.mjs` from `packages/builder`, with `pnpm dev` up.
 */

import { chromium } from "@playwright/test";

const BASE = process.env.BASE ?? "http://localhost:5173/linkpage/";
const PHONE = { width: 390, height: 844 };
const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: PHONE });

async function run(key, errand) {
  const page = await context.newPage();
  await page.goto(`${BASE}?prototype=hours&variant=${key}`);
  await page.waitForSelector(".question");
  let note = "";
  try {
    await errand(page);
  } catch (error) {
    note = ` — errand could not be completed: ${String(error).split("\n")[0]}`;
  }
  const done = await page.evaluate(() =>
    Math.round(document.querySelector(".flow__question").scrollHeight),
  );
  const count = await page.evaluate(() =>
    Number(document.querySelector(".proto-bar__count")?.textContent.trim().split(" ")[0] ?? -1),
  );
  const readout = await page
    .locator(".proto-readout__list li")
    .allTextContents()
    .catch(() => []);
  await page.screenshot({ path: `/tmp/hours-split-${key}.png`, fullPage: true });
  await page.close();
  return { key, done, count, readout, note };
}

async function today(page) {
  for (const day of WEEKDAYS) {
    await page.getByLabel(day, { exact: true }).selectOption("open");
    await page.locator(".days__day", { hasText: day }).getByRole("button").click();
    const opens = page.getByLabel(`${day} opens`);
    const closes = page.getByLabel(`${day} closes`);
    await opens.nth(0).fill("11:00");
    await closes.nth(0).fill("14:00");
    await opens.nth(1).fill("17:00");
    await closes.nth(1).fill("21:00");
  }
  for (const day of ["Saturday", "Sunday"]) {
    await page.getByLabel(day, { exact: true }).selectOption("closed");
  }
}

async function variantA(page) {
  await page.getByRole("button", { name: "Weekdays", exact: true }).click();
  await page.getByLabel("Opening time").fill("11:00");
  await page.getByLabel("Closing time").fill("14:00");
  await page.getByText("Say we’re closed").click();
  // The second interval only exists per-day: A has to be opened up and each weekday given its own.
  await page.getByRole("button", { name: "One of those days is different" }).click();
  for (const day of WEEKDAYS) {
    const row = page.locator(".days__day", { hasText: day });
    await row.getByRole("button", { name: `Add another time` }).click();
    await page.getByLabel(`${day} opens`).nth(1).fill("17:00");
    await page.getByLabel(`${day} closes`).nth(1).fill("21:00");
  }
}

async function variantB(page) {
  for (const [open, close] of [
    ["11:00", "14:00"],
    ["17:00", "21:00"],
  ]) {
    await page.getByRole("button", { name: /Add (opening times|more times)/ }).click();
    await page.getByRole("button", { name: "Weekdays", exact: true }).click();
    await page.getByLabel("Opening time").fill(open);
    await page.getByLabel("Closing time").fill(close);
    await page.getByRole("button", { name: "Add", exact: true }).click();
  }
  await page.getByText("Say we’re closed").click();
}

async function variantC(page) {
  await page.getByRole("button", { name: "Open", exact: true }).click();
  await page.getByLabel("Monday opens").nth(0).fill("11:00");
  await page.getByLabel("Monday closes").nth(0).fill("14:00");
  await page.locator(".proto-first").getByRole("button", { name: "Add another time" }).click();
  await page.getByLabel("Monday opens").nth(1).fill("17:00");
  await page.getByLabel("Monday closes").nth(1).fill("21:00");
  for (const day of ["Tuesday", "Wednesday", "Thursday", "Friday"]) {
    await page
      .locator(".days__day", { hasText: day })
      .getByRole("button", { name: "Same as Monday" })
      .click();
  }
  for (const day of ["Saturday", "Sunday"]) {
    await page
      .locator(".days__day", { hasText: day })
      .getByRole("button", { name: "Closed" })
      .click();
  }
}

async function variantD(page) {
  const monday = page.locator(".proto-table__row").first();
  await monday.getByRole("button", { name: "Open", exact: true }).click();
  await page.getByLabel("Monday opens").nth(0).fill("11:00");
  await page.getByLabel("Monday closes").nth(0).fill("14:00");
  await monday.getByRole("button", { name: "Add another time" }).click();
  await page.getByLabel("Monday opens").nth(1).fill("17:00");
  await page.getByLabel("Monday closes").nth(1).fill("21:00");
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
results.push(await run("T", today));
results.push(await run("A", variantA));
results.push(await run("B", variantB));
results.push(await run("C", variantC));
results.push(await run("D", variantD));

console.log(
  `viewport ${PHONE.width}x${PHONE.height} — errand: Mon–Fri 11–2 and 5–9, weekend closed\n`,
);
for (const r of results) {
  console.log(
    `${r.key}  done ${String(r.done).padStart(5)}px   ${String(r.count).padStart(3)} interactions${r.note}`,
  );
  if (r.readout.length) console.log(`    page says: ${r.readout.join(" | ")}`);
}

await browser.close();

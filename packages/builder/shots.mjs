/* eslint-disable no-undef */
import { chromium } from "@playwright/test";
const BASE = "http://localhost:5173/linkpage/?prototype=tailwind";
const b = await chromium.launch();
for (const [w, h, tag] of [
  [390, 844, "phone"],
  [1280, 900, "wide"],
]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h } });
  for (const v of ["paper", "card", "editorial"]) {
    for (const s of ["question", "list"]) {
      const p = await ctx.newPage();
      await p.goto(`${BASE}&variant=${v}&screen=${s}`);
      await p.waitForTimeout(350);
      await p.screenshot({ path: `/tmp/tw-${tag}-${v}-${s}.png`, fullPage: true });
      await p.close();
    }
  }
  await ctx.close();
}
// One dark shot per variant, on the list, to judge the dark-mode question.
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
for (const v of ["paper", "card", "editorial"]) {
  const p = await ctx.newPage();
  await p.goto(`${BASE}&variant=${v}&screen=list`);
  await p.getByRole("button", { name: "light", exact: true }).click();
  await p.waitForTimeout(250);
  await p.screenshot({ path: `/tmp/tw-dark-${v}.png`, fullPage: true });
  await p.close();
}
await b.close();
console.log("shot");

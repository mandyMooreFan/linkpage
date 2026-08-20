import { expect, test, type Page, type Request } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

/**
 * One smoke test against the **deployed** builder. `SPEC.md` §5.3, §7.3.
 *
 * **This is not the end-to-end.** `e2e/download.e2e.ts` builds the app, serves it locally and
 * proves the downloaded bytes are the preview's `srcdoc` — a guarantee about the *code*. This
 * proves something the local one structurally cannot: that the thing published at a URL is a
 * working application. Those fail for different reasons, which is why they are separate files
 * run by separate configs.
 *
 * The failures only this can catch:
 *
 * - **A wrong `base`.** `vite.config.ts` pins `/linkpage/` for a project page. Rename the repo,
 *   or move to a user page, and every hashed asset 404s while `index.html` still returns 200 —
 *   a blank screen that no local run reproduces, because locally the base is whatever the dev
 *   server says it is.
 * - **A deploy that published the wrong thing**, or nothing, or a stale artifact.
 * - **The app failing to boot in a real browser** on a real origin, rather than in jsdom.
 *
 * So it asserts shape rather than copy, and deliberately does not re-check byte-identity: that
 * is the local end-to-end's job, and a smoke test that duplicates it would fail twice for one
 * cause and tell you nothing extra.
 *
 * **If this goes red and nothing was deployed, suspect the world rather than your diff** — a
 * host change, a browser change, an expired token. That is the opposite of the usual advice,
 * and it is the right advice here.
 */

/** The deployed builder. Overridable so a fork, a branch preview or a local build can be smoked. */
const BASE = process.env.SMOKE_URL || "https://mandymoorefan.github.io/linkpage/";

/**
 * `We come to you`, deliberately.
 *
 * §7.3 says this preset is the one that justifies the whole feature: it never asks for an
 * address, so a sole trader working from home does not publish their home address because the
 * flow asked and they answered. That is a *decision*, not a default, and it is the one thing in
 * the flow whose absence is the point — so the smoke test picks the preset whose correct
 * behaviour is something not happening.
 */
const PRESET = "We come to you";
const BUSINESS = "Ada & Sons <Plumbing>";

/** Every preset in §7.3's table. All six present is how we know React mounted, not just that HTML served. */
const PRESETS = [
  "Food & drink",
  "Shop or venue",
  "Appointments",
  "We come to you",
  "Online only",
  "Something else",
];

async function heading(page: Page): Promise<string> {
  return ((await page.locator("h1, h2").first().textContent()) ?? "").trim();
}

/**
 * Advance one screen: **answer exactly the two required inputs, escape everything else.**
 *
 * That is not a shortcut, it is §7.2's rule executed. The business name and the brand colour are
 * the only steps with no escape, because §4.6 forbids inventing either — so a walk that answers
 * those two and takes every other exit is the shortest legal path through the flow, and a step
 * that turns out to have no escape and is not one of those two is a bug this will catch.
 *
 * Note the name field's *label* is "Business name" while its heading reads "What's it called?".
 * Targeting the label is deliberate: it is the accessible name, so this also fails if that
 * association is ever broken.
 *
 * The two controls are selected by their data hooks rather than by name — `[data-escape]` and the
 * form's own `type="submit"`, the same handles `flow.test.tsx` uses. Escapes are worded four different ways
 * ("We don't need one", "We don't have one", "No buttons for now", "Not on my page"), and a smoke
 * test that matched on those would go red the day someone improved a sentence. Class over copy
 * also rules out clicking a repeatable sub-form's `Add`, which is how a walker loops forever.
 */
async function advance(page: Page): Promise<"moved" | "arrived" | "stuck"> {
  if (await page.getByRole("button", { name: /^Download$/ }).count()) return "arrived";

  const swatch = page.locator("button[data-swatch]").first();
  if (await swatch.count()) await swatch.click();

  const name = page.getByLabel(/business name/i).first();
  if (await name.count()) await name.fill(BUSINESS);

  const forward = page.locator('button[type="submit"]').first();
  const escape = page.locator("button[data-escape]").first();

  if ((await forward.count()) && (await forward.isEnabled())) await forward.click();
  else if (await escape.count()) await escape.click();
  else return "stuck";

  await page.waitForLoadState("networkidle");
  return "moved";
}

/** Whether this step offers a way past. §7.2: everything except the two required inputs does. */
async function hasEscape(page: Page): Promise<boolean> {
  return (await page.locator("button[data-escape]").count()) > 0;
}

test("the deployed builder boots, walks a first run, and exports a self-contained page", async ({
  page,
  browser,
}) => {
  const failed: Request[] = [];
  const errors: string[] = [];
  page.on("requestfailed", (r) => failed.push(r));
  page.on("pageerror", (e) => errors.push(e.message));

  // --- 1. it is there, and it booted -------------------------------------------------------
  const response = await page.goto(BASE, { waitUntil: "networkidle" });
  expect(response?.status(), `${BASE} did not serve`).toBe(200);

  // All six presets means React mounted and rendered, not merely that a shell was served.
  for (const preset of PRESETS) {
    await expect(
      page.getByRole("button", { name: new RegExp(`^${preset}`) }),
      `preset "${preset}" missing — the app did not render`,
    ).toBeVisible();
  }

  // --- 2. every asset resolved under the base path -------------------------------------------
  // The failure this exists for: index.html 200s, the hashed bundle 404s, the screen is blank.
  expect(
    failed.map((r) => r.url()),
    "a subresource failed to load — suspect `base` in vite.config.ts against the deployed path",
  ).toEqual([]);

  // --- 3. a first run completes ---------------------------------------------------------------
  await page.getByRole("button", { name: new RegExp(`^${PRESET}`) }).click();
  await page.waitForLoadState("networkidle");

  const seen: string[] = [];
  const unescapable: string[] = [];
  for (let step = 0; step < 25; step += 1) {
    // Arrival first: the review list is not a question, so its lack of an escape is not a finding.
    if (await page.getByRole("button", { name: /^Download$/ }).count()) break;
    const where = await heading(page);
    if (!(await hasEscape(page))) unescapable.push(where);
    const result = await advance(page);
    expect(result, `stuck on "${where}" with no way forward`).toBe("moved");
    seen.push(where);
  }

  await expect(
    page.getByRole("button", { name: /^Download$/ }),
    `never reached the review list; saw ${JSON.stringify(seen)}`,
  ).toBeVisible();

  // §7.2, executed rather than quoted: the *only* steps without a way past are the two required
  // inputs, because §4.6 forbids inventing either. A third would mean someone shipped a step an
  // owner cannot get past — which is a trap, not a question.
  expect(unescapable.length, `steps with no escape: ${JSON.stringify(unescapable)}`).toBe(2);

  // §7.3's reason for this preset existing: it must not have asked.
  expect(
    seen.filter((s) => /where are you|address/i.test(s)),
    `"${PRESET}" asked for an address — §7.3 says it must not`,
  ).toEqual([]);

  // --- 4. the export is self-contained and opens with the network off -------------------------
  await page.getByRole("button", { name: /^Download$/ }).click();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: /download index\.html/i }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("index.html");

  const file = join(tmpdir(), `linkpage-smoke-${Date.now()}.html`);
  await download.saveAs(file);
  const html = await readFile(file, "utf-8");

  expect(html.length, "the downloaded page is empty").toBeGreaterThan(500);
  expect(html, "invariant 1: the export ships zero JavaScript").not.toMatch(/<script/i);
  // Navigational hrefs are the point of a link page; a *subresource* that is not inlined is not.
  expect(
    [...html.matchAll(/\bsrc\s*=\s*"([^"]*)"/gi)]
      .map((m) => m[1])
      .filter((u) => !u?.startsWith("data:")),
    "invariant 2: a subresource is not inlined",
  ).toEqual([]);

  const offline = await browser.newContext({ offline: true });
  const opened = await offline.newPage();
  await opened.goto(pathToFileURL(file).href);
  await expect(opened.getByRole("heading", { name: BUSINESS })).toBeVisible();
  await offline.close();

  expect(errors, "the deployed app threw").toEqual([]);
});

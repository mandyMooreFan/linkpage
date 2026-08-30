/**
 * **The route through the review list, written once.** `SPEC.md` §7.4, §7.12; issue #352.
 *
 * `review-shots.mjs` and `a11y-sweep.mjs` both had `listScreens`, `rowScreens` and
 * `importScreens`, and nothing kept them in step. This is the same seam `wizard.mjs` cut for the
 * wizard's answering half on [#332](../../issues/332): plain ESM in `scripts/`, JSDoc-typed, read
 * by both hand-run instruments. **The gated `e2e/walk.ts` keeps its own route** — it visits to
 * *measure* rather than to photograph or audit, which [#315](../../issues/315) settled and
 * [#343](../../issues/343) confirmed by changing `walkScreens` alone.
 *
 * ## ⚠️ Neither file was the base, and that is the whole reason this was worth doing
 *
 * [#350](../../issues/350) read the two side by side. The route was the same; **the knowledge was
 * two things, each missing half**:
 *
 * - **The sweep recorded failures the ritual did not.** It had `else { miss(…) }` on all three
 *   optional steps; the ritual's `if (await x.count())` guards skipped in silence. That is
 *   [#270](../../issues/270)'s exact shape — *"a walk full of `if (await thing.count())` guards
 *   skips a screen without a word"* — **and #270 was a ritual failure.** The sweep had learned
 *   the lesson from the ritual's own accident.
 * - **The ritual recorded exclusions the sweep did not.** Two `omit()` entries closing the import
 *   fork. The sweep did not cover them either; **it simply did not say so.**
 *
 * **So taking either file as the starting point would have silently dropped the other's
 * knowledge.** Both halves are here, and the sweep gained an omissions ledger to receive the
 * second.
 *
 * ## What the caller supplies, and why the split falls here
 *
 * The route decides **where to go**. The caller decides **what to do there** — one photographs,
 * one audits — and that includes any framing it needs. ⚠️ **The ritual's `scrollIntoView` before
 * a row shot lives in its `visit`, not here**: it is a requirement of photography, not of the
 * route, and [#302](../../issues/302) was two walkers differing on scroll position at a cost of
 * one real bug. **Deciding where it belongs is how that does not happen again.**
 *
 * @typedef {object} ListHooks
 * @property {(name: string, at?: {row?: unknown}) => Promise<void>} visit  what to do on a screen
 * @property {(name: string) => void} declare  name a frame the run means to produce
 * @property {(what: string, why: string) => void} miss  a screen it meant to reach and could not
 * @property {(what: string, why: string) => void} omit  a screen deliberately not reached
 */

import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { slug } from "./census.mjs";

/**
 * Every screen behind the review list, in order.
 *
 * @param {any} page
 * @param {{dir: string}} size
 * @param {ListHooks} hooks
 */
export async function walkList(page, size, hooks) {
  const { visit, miss } = hooks;

  if (!(await page.locator('[data-screen="list"]').count())) {
    miss("the review list and everything behind it", "the walk never reached the list at all");
    return;
  }

  // On a phone the run ends page-first: the preview covers the viewport and the rows are behind
  // "Edit your page" (§7.6, #147). That landing is a screen of its own — it is where §7.12's
  // commitment 3, what the tool covers it puts out of reach, is actually visible.
  await visit("50-arrive");

  const toRows = page.getByRole("button", { name: /Edit your page/i });
  if (await toRows.count()) {
    await toRows.first().click();
    await visit("51-list-rows");
  } else {
    miss("51-list-rows", "there is no “Edit your page” control on the list");
  }

  await rowScreens(page, size, hooks);
  await page.evaluate(() => window.scrollTo(0, 0));

  const download = page.getByRole("button", { name: /^Download$/ });
  if (await download.count()) {
    await download.first().click();
    await visit("60-download-sheet");
    const close = page.getByRole("button", { name: /^Close$/ });
    if (await close.count()) await close.first().click();
  } else {
    miss("60-download-sheet", "there is no Download control on the list");
  }

  const menu = page.locator("[data-menu] button, button[data-menu]").first();
  if (await menu.count()) {
    await menu.click();
    await visit("61-menu");
    await importScreens(page, size, hooks);
    await page.keyboard.press("Escape");
  } else {
    miss("61-menu and the import fork", "there is no [data-menu] control on the list");
  }
}

/**
 * Every row of the review list, opened, and the style row's advanced disclosure.
 *
 * ⚠️ **The bound on this loop, stated because a reader will assume otherwise** (#351). The frames
 * are declared from `[data-row]` **as the walk meets them**, not ahead of it. `declare` is called
 * *before* the press on purpose, so **a shot that fails is caught** — the census names the row
 * that went missing without this loop having to notice. What it cannot do is notice a row that
 * **should** be there and is not: **a declaration read from the DOM cannot see something absent
 * from the DOM.** The flow's frames and `LIST_FRAMES` are declared ahead of the walk and do not
 * have this bound; these do.
 *
 * **What it would take to close it, since a bound that does not say that is half a statement.**
 * The expected rows are computable — the product computes them in `listRows`
 * (`src/list/rows.ts`) from the draft. But that is TypeScript and this is a plain-ESM module run
 * by `node`, which cannot import it ([#330](../../issues/330)), so closing it means **mirroring a
 * product rule in a second language** — the *list that means two things* trap, and a product rule
 * is a worse thing to duplicate than the two literal arrays #330 refused to duplicate.
 * **`rows.test.ts` already covers that rule**, so what is uncovered here is narrow: a row whose
 * logic is right and whose rendering is wrong.
 *
 * @param {any} page
 * @param {{dir: string}} size
 * @param {ListHooks} hooks
 */
async function rowScreens(page, size, hooks) {
  const { visit, declare, miss } = hooks;
  const rows = page.locator("[data-row]");
  const count = await rows.count();
  if (count === 0) {
    miss("every review-list row", "the list came up with no [data-row] on it");
    return;
  }

  for (let index = 0; index < count; index += 1) {
    const row = rows.nth(index);
    const id = (await row.getAttribute("data-row")) ?? String(index);
    const header = row.locator("button").first();
    const name = `52-${String(index + 1).padStart(2, "0")}-${slug(id)}`;

    declare(`${size.dir}/${name}`);
    // §7.4 puts the advanced disclosure at the foot of the style row, so a run that comes back
    // without a picture of it has lost a screen rather than skipped an optional one.
    if (id === "style") declare(`${size.dir}/${name}-advanced`);

    await header.click();
    await visit(name, { row });

    const advanced = row.locator("[data-advanced] button").first();
    if (await advanced.count()) {
      await advanced.click();
      await visit(`${name}-advanced`, { row });
      await advanced.click();
    }
    await header.click();
  }
}

/**
 * The import fork: §7.9's refusal on a file the tool cannot use, and §7.8's replace confirmation.
 *
 * @param {any} page
 * @param {{dir: string}} size
 * @param {ListHooks} hooks
 */
async function importScreens(page, size, hooks) {
  const { visit, miss, omit } = hooks;

  const opener = page.getByRole("button", { name: /^Open a project file/ });
  if (!(await opener.count())) {
    miss(
      "§7.9's refusal and §7.8's replace confirmation",
      "the menu has no “Open a project file…” item to press",
    );
    return;
  }

  const bytes = await page.evaluate(() => localStorage.getItem("linkpage.project"));
  if (bytes === null) {
    miss(
      "§7.9's refusal and §7.8's replace confirmation",
      "there is no project in storage to hand back to the tool as a file",
    );
    return;
  }

  const dir = await mkdtemp(join(tmpdir(), "list-route-"));
  const refused = join(dir, "index.html");
  const real = join(dir, "ada-and-sons-bakers.linkpage.json");
  await writeFile(refused, "<!doctype html>\n<p>not a project file</p>\n", "utf8");
  await writeFile(real, bytes, "utf8");

  const choose = async (what) => {
    const [chooser] = await Promise.all([
      page.waitForEvent("filechooser", { timeout: 5_000 }),
      opener.first().click(),
    ]);
    await chooser.setFiles(what);
  };

  try {
    await choose(refused);
    await page.locator("[data-refusal]").first().waitFor({ timeout: 5_000 });
    await visit("62-menu-file-refused");
    await choose(real);
    await page.locator("[data-replace]").first().waitFor({ timeout: 5_000 });
    await visit("63-menu-replace-confirm");
    const cancel = page.locator("[data-replace]").getByRole("button", { name: /^Cancel$/ });
    if (await cancel.count()) await cancel.first().click();
  } catch (error) {
    miss(
      "§7.9's refusal and §7.8's replace confirmation",
      `the import fork did not come up: ${error.message.split("\n")[0]}`,
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }

  // Both instruments now carry these. The ritual has always stated them; the sweep did not cover
  // them either and simply did not say so (#350).
  omit(
    "the confirmation's “Download my work first” branch",
    "pressing it writes a file, and these walks touch nothing outside their own output folder",
  );
  omit(
    "§7.9's refusal on the first screen (under the quiet line)",
    "the same message, in the other of its two places; reaching it needs a second walk from empty",
  );
}

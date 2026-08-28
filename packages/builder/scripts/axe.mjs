/**
 * **`axe-core`, injected into a page and run.** `SPEC.md` §7.12. Change list items **CL-8** and
 * **CL-9** (issue #272), from the tooling study in [#265](https://github.com/mandyMooreFan/linkpage/issues/265).
 *
 * **Why this is a module and not two copies.** §7.12 records the tag set as a *decision* — WCAG
 * 2.2 A + AA **plus** `best-practice` — and there are now two checks under that one sentence: the
 * exported page's, gated in CI (`e2e/exported-page-a11y.e2e.ts`), and the builder's, hand-run and
 * ungated (`scripts/a11y-sweep.mjs`). A promise that names one tag set and is served by two
 * divergent arrays is a promise nobody can maintain, and the divergence would be silent — both
 * checks would still be green.
 *
 * **Why plain ESM here rather than TypeScript.** The hand-run half must stay out of CI, and
 * `playwright.config.ts` runs every `e2e/**\/*.e2e.ts` in the End-to-end job. Putting the shared
 * part in `scripts/` — beside `census.mjs`, `port.mjs`, `variants.mjs` and `stability.mjs`, which
 * is already where this repo keeps plain-ESM helpers with `.test.mjs` siblings — is what lets the
 * gated check and the ungated one share it without one dragging the other into CI. The e2e reads
 * it through `allowJs` and the JSDoc types below; see `tsconfig.e2e.json`.
 *
 * **Nothing here decides what is audited.** The two callers choose their own subject: one
 * `setContent`s a page it rendered, the other drives the live builder. What is shared is the
 * bundle, the tags, and the shape of the answer.
 */

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

/**
 * axe's own bundle, ready to inject into the page under test.
 *
 * Read off disk and injected as script *text* rather than fetched from a CDN: the exported page
 * fetches nothing by design, and a check that needs the network could not audit it from `file://`
 * or offline. The builder's sweep runs against a local preview server for the same reason.
 *
 * @type {string}
 */
export const AXE_SOURCE = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

/**
 * **WCAG 2.2 A + AA.**
 *
 * WCAG 2.2 is cumulative, so all five tags are needed to reach it: axe tags a rule with the
 * version that introduced its criterion, not with every version that carries it forward.
 * `wcag2aaa` is deliberately absent — AAA is not what §6.8 claims.
 *
 * @type {readonly string[]}
 */
export const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/**
 * **What both checks actually run: the WCAG tags plus `best-practice`.**
 *
 * The WCAG tags alone silently drop 30 of axe's 105 rules, `tabindex` and `heading-order` among
 * them — measured in #265 and re-measured by the exported page's controls, which assert those two
 * rules are silent under WCAG-only tags and loud under these. **The tag choice is a decision and
 * §7.12 records it**, which is the whole reason this array has one home.
 *
 * @type {readonly string[]}
 */
export const TAGS = [...WCAG_TAGS, "best-practice"];

/**
 * Run axe over whatever `page` currently has loaded.
 *
 * `context` is axe's own context argument — pass `undefined` for the whole document, or an
 * include/exclude object to narrow it. The bundle is injected fresh on every call because the
 * callers navigate and reload between runs, and an injected script does not survive that.
 *
 * @param {import("@playwright/test").Page} page
 * @param {{ tags?: readonly string[], context?: unknown }} [options]
 * @returns {Promise<import("axe-core").AxeResults>}
 */
export async function audit(page, options = {}) {
  const tags = options.tags ?? TAGS;
  await page.addScriptTag({ content: AXE_SOURCE });
  return page.evaluate(
    ([values, context]) =>
      /** @type {any} */ (window).axe.run(context ?? document, {
        runOnly: { type: "tag", values },
      }),
    /** @type {[string[], unknown]} */ ([[...tags], options.context ?? null]),
  );
}

/**
 * The rule ids that failed, sorted — which is what an assertion should read as when it goes red,
 * and what a hand-run report groups by.
 *
 * @param {import("axe-core").AxeResults} results
 * @returns {string[]}
 */
export function failed(results) {
  return results.violations.map((v) => v.id).sort();
}

/**
 * Every rule the tag set `all` reaches that `narrow` does not, by id.
 *
 * Counted from axe's own metadata **in the browser that will run it**, so the number cannot drift
 * away from the version in use. Both checks use it to show their tag choice is load-bearing
 * rather than a default.
 *
 * @param {import("@playwright/test").Page} page
 * @param {readonly string[]} narrow
 * @param {readonly string[]} all
 * @returns {Promise<string[]>}
 */
export async function droppedBy(page, narrow, all) {
  await page.addScriptTag({ content: AXE_SOURCE });
  return page.evaluate(
    ([narrowTags, allTags]) => {
      const rules = /** @type {any} */ (window).axe.getRules();
      /** @param {string[]} tags */
      const under = (tags) =>
        new Set(
          rules
            .filter((/** @type {any} */ r) =>
              r.tags.some((/** @type {string} */ t) => tags.includes(t)),
            )
            .map((/** @type {any} */ r) => r.ruleId),
        );
      const narrowSet = under(narrowTags);
      return [...under(allTags)].filter((id) => !narrowSet.has(id)).sort();
    },
    /** @type {[string[], string[]]} */ ([[...narrow], [...all]]),
  );
}

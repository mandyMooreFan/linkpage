/**
 * **`axe-core` over the builder, by hand.** `SPEC.md` §7.12. Change list item **CL-9** (issue
 * #272), from the tooling study in [#265](https://github.com/mandyMooreFan/linkpage/issues/265).
 *
 * **Run by hand. Never by CI**, and that is the decision rather than an omission. The root
 * `package.json` says so out loud beside `shots`, in the same `//`-prefixed key §7.4's appearance
 * ritual already uses, and §5.3 keeps browsers off the critical path. The builder is a live app
 * with layers: reaching the review list takes **60-odd driven steps**, twice over for the two
 * sizes, and #265 measured that the check **would not have caught** #254's dead tab stop, #255's
 * reachable list, #244's sideways scroll or #246's motion. A gate that cannot see the defects the
 * project actually finds is not worth a minute on every push. **The exported page's check is the
 * gated tier** (`e2e/exported-page-a11y.e2e.ts`); this is the other one.
 *
 * **It is one half of a tier, not a promise.** §7.12's six commitments do not rest on this, and
 * nothing here may be read as a conformance claim: 23 of 55 A+AA criteria have any rule at all,
 * and every accessibility defect this project has found except contrast sat in the other 32.
 *
 * ---
 *
 * **The rule this file exists to obey: a guard must prove it found something before it can report
 * nothing wrong.** #265 measured an *empty document* reporting **0 violations and 4 passes**, so a
 * run that never loaded the app is indistinguishable from a clean one and `passes > 0` is no help
 * at all. So the run does two things before it is allowed to report anything:
 *
 * 1. **It measures the empty document itself**, under this tag set, rather than quoting #265 —
 *    which is right, because CL-8 found the figure does not survive the tag choice. The numbers
 *    are printed with the report.
 * 2. **It breaks the real builder in known ways and watches the checker notice.** Each control
 *    asserts three things, and it is the three together that make it a proof:
 *    - the mutation **changed the document** — #265's own trap, where two mutants matched nothing
 *      and first read as *"axe missed this"*, so a control that breaks nothing fails as a broken
 *      control rather than as a missing rule;
 *    - the **unmutated** screen reports that rule clean, so the edit is the only difference;
 *    - the **mutated** screen reports that rule as a violation.
 *
 *    **If a single control does not fire, the run refuses to report a clean sweep** and exits 2.
 *
 * The controls run in their own browser context, which is then thrown away — nothing the sweep
 * proper audits has been touched.
 *
 * ---
 *
 * **What it walks.** The same 60-odd steps the appearance ritual walks, from `flow.mjs`, at both
 * of §7.6's sizes: every wizard step on arrival and once answered, §7.9's refusal, the page-first
 * landing, the review list, **every row opened** and the style row's advanced disclosure, the
 * download sheet, the menu, and the import fork's two surfaces. It declares that set through
 * `census.mjs` before it walks, so a screen it meant to reach and could not is named rather than
 * silently absent (#270).
 *
 * **What it does not reach: the preview's contents.** The preview iframe is the exported page
 * (§5.2), axe is injected into the top frame only, and the exported page has a check of its own
 * that is stricter than this one because it is in CI. Its rules come back as *incomplete* here,
 * which is reported and is not a finding.
 *
 * **Exit codes.**
 *
 *     0  swept, every control fired, nothing found
 *     1  could not run at all — no browser, no server, no app
 *     2  the report cannot be believed: a control did not fire, or a screen this run meant to
 *        reach is missing
 *     3  swept, every control fired, and axe found something
 *
 * **3 is where this parts company with `pnpm shots`**, whose exit codes are about the instrument
 * and never about a picture — because a picture is for a person to judge and a violation is not.
 * It still gates nothing: no workflow runs this file.
 *
 * **Through the `pnpm a11y` alias pnpm reports its own 1 for any non-zero child**, exactly as
 * `review-shots.mjs` records for `pnpm shots`, so the four are told apart by running the script
 * directly. The sections above are what a person reads either way; the code is for the shell.
 */

import { audit, TAGS, WCAG_TAGS, droppedBy, failed } from "./axe.mjs";
import { flowFrames, LIST_FRAMES, missing } from "./census.mjs";
import { walkList } from "./list-route.mjs";
import { ANSWERS, settle, walkFlow } from "./flow.mjs";
import { portFor } from "./port.mjs";
import { serve } from "./serve.mjs";
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** `packages/builder` — where the app is built and served from. */
const BUILDER = resolve(fileURLToPath(new URL("..", import.meta.url)));
const ROOT = resolve(fileURLToPath(new URL("../../../", import.meta.url)));
const HOST = "127.0.0.1";

/** §7.6's two sizes, the same pair the appearance ritual and the exported page's check both use. */
const SIZES = [
  { dir: "desktop", viewport: { width: 1440, height: 900 } },
  { dir: "mobile", viewport: { width: 390, height: 844 }, isMobile: true },
];

const args = process.argv.slice(2);
const has = (name) => args.includes(`--${name}`);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};

if (has("help")) {
  process.stdout.write(
    [
      "",
      "  pnpm a11y [options]        (or: pnpm --filter @linkpage/builder exec node scripts/a11y-sweep.mjs)",
      "",
      "    --size desktop|mobile   sweep one of §7.6's two sizes (default: both)",
      "    --port <n>              override the port (default: derived from the branch, so",
      "                            concurrent runs cannot audit each other's build)",
      "    --keep-server           leave the preview server up when finished",
      "    --help                  this",
      "",
      "  Hand-run, never wired to CI (SPEC.md §7.12). The exported page's check is the gated",
      "  tier and lives in e2e/exported-page-a11y.e2e.ts.",
      "",
      "  Exit codes:",
      "    0  swept, every known-bad control fired, nothing found",
      "    1  could not run at all — no browser, no server, no app",
      "    2  the report cannot be believed: a control did not fire, or a screen this run",
      "       meant to reach is missing",
      "    3  swept, every control fired, and axe found something",
      "  (`pnpm a11y` reports pnpm's own 1 for any of them; run the script directly to tell",
      "  them apart. The sections above are there whichever way you ran it.)",
      "",
    ].join("\n"),
  );
  process.exit(0);
}

const label = (() => {
  try {
    const branch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: ROOT })
      .toString()
      .trim();
    return branch.replace(/[^\w.-]+/g, "-");
  } catch {
    return "run";
  }
})();

const PORT = Number(flag("port")) || portFor(`a11y-${label}`);
const APP = `http://${HOST}:${PORT}/linkpage/`;
const sizes = SIZES.filter((size) => flag("size") === undefined || size.dir === flag("size"));

const log = (...m) => process.stdout.write(`${m.join(" ")}\n`);

// ---------------------------------------------------------------------------
// The known-bad controls
// ---------------------------------------------------------------------------

/**
 * Five ways to break a real builder screen, each caught by one named rule.
 *
 * **Each `breaks` runs in the page and returns a sentence, or `null` when it found nothing to
 * break** — which is #265's trap made into a failure of the control rather than a silence from
 * the checker. They are self-contained on purpose: Playwright serialises the function, so a
 * closure over anything in this file would arrive at the browser undefined.
 *
 * **Two of the five answer only to `best-practice`**, and the run proves it rather than repeating
 * it: they are audited a second time under the WCAG tags alone and must come back clean there.
 * That is the case for the tag set §7.12 records, measured on the builder rather than copied from
 * the exported page's file.
 *
 * **`color-contrast` is here because it is the one rule class axe covers well** — and because it
 * is the only one of the five that cannot be answered by reading markup. A run where it fires is
 * a run that is looking at rendered colour, which is the whole reason this is a browser and not
 * jsdom.
 */
const CONTROLS = [
  {
    what: "the document loses its language",
    rule: "html-has-lang",
    wcagOnlySilent: false,
    breaks: () => {
      const html = document.documentElement;
      const was = html.getAttribute("lang");
      if (was === null) return null;
      html.removeAttribute("lang");
      return html.hasAttribute("lang") ? null : `<html lang="${was}"> became <html>`;
    },
  },
  {
    what: "an image arrives with no alt attribute",
    rule: "image-alt",
    wcagOnlySilent: false,
    breaks: () => {
      const host = document.querySelector("[data-screen]");
      if (!host) return null;
      const before = document.querySelectorAll("img").length;
      const img = document.createElement("img");
      // A *decodable* 1×1 PNG, not a truncated signature: a browser that never made this into an
      // image would make the control prove less than it says.
      img.src =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
      host.prepend(img);
      const after = document.querySelectorAll("img:not([alt])").length;
      return after > 0 && document.querySelectorAll("img").length === before + 1
        ? "an <img> with no alt was put on the screen"
        : null;
    },
  },
  {
    what: "a control is given a positive tabindex",
    rule: "tabindex",
    wcagOnlySilent: true,
    breaks: () => {
      const button = [...document.querySelectorAll("button")].find(
        (b) => !b.hasAttribute("tabindex"),
      );
      if (!button) return null;
      button.setAttribute("tabindex", "3");
      return button.getAttribute("tabindex") === "3" ? `a <button> was given tabindex="3"` : null;
    },
  },
  {
    what: "a heading level is skipped",
    rule: "heading-order",
    wcagOnlySilent: true,
    breaks: () => {
      const h1 = document.querySelector("h1");
      if (!h1 || !h1.parentElement) return null;
      const before = document.querySelectorAll("h3").length;
      const h3 = document.createElement("h3");
      h3.textContent = "Today's specials";
      h1.insertAdjacentElement("afterend", h3);
      return document.querySelectorAll("h3").length === before + 1
        ? "an <h3> was put straight after the <h1>"
        : null;
    },
  },
  {
    what: "text is painted almost the colour of what is behind it",
    rule: "color-contrast",
    wcagOnlySilent: false,
    breaks: () => {
      const h1 = document.querySelector("h1");
      if (!h1) return null;
      const was = getComputedStyle(h1).color;
      // **Both halves of the pair, on the element itself.** The first attempt at this control
      // read the ground off `document.body` and painted the heading *that* — and the body has no
      // background of its own, so the heading was painted `rgba(0, 0, 0, 0)` and axe returned
      // `color-contrast` as **incomplete**: it could not tell, which is not the same as finding
      // it. That is #265's no-op trap wearing a third face — a control that leaves the checker
      // undecided proves as little as one that changes nothing — and it is why this asserts on
      // the computed values rather than on having set them.
      h1.style.backgroundColor = "rgb(255, 255, 255)";
      h1.style.color = "rgb(252, 252, 252)";
      const now = getComputedStyle(h1);
      return now.color === "rgb(252, 252, 252)" &&
        now.backgroundColor === "rgb(255, 255, 255)" &&
        now.color !== was
        ? `the <h1> was repainted ${was} → ${now.color} on ${now.backgroundColor}`
        : null;
    },
  },
];

/**
 * Run the controls on a real builder screen and report which of them the checker saw.
 *
 * Each control gets a page of its own, so one mutation cannot mask or manufacture another's
 * result, and the whole context is discarded before the sweep proper starts.
 */
async function proveLive(browser) {
  const context = await browser.newContext({ viewport: SIZES[0].viewport });
  const outcomes = [];

  for (const control of CONTROLS) {
    const page = await context.newPage();
    await page.goto(APP);
    await page.evaluate(() => localStorage.clear());
    await page.goto(APP);
    await settle(page);

    // 2. The unmutated screen is clean on this rule, so whatever step 3 sees is the edit's doing
    //    and not something that was already there.
    const cleanBefore = !failed(await audit(page)).includes(control.rule);

    // 1. The control actually broke something.
    const changed = await page.evaluate(control.breaks);

    // 3. And the checker sees it.
    const seen = changed === null ? false : failed(await audit(page)).includes(control.rule);

    // The whole case for `best-practice`, measured on a real broken builder screen.
    const wcagSilent =
      changed !== null && control.wcagOnlySilent
        ? !failed(await audit(page, { tags: WCAG_TAGS })).includes(control.rule)
        : null;

    outcomes.push({ ...control, changed, cleanBefore, seen, wcagSilent });
    await page.close();
  }

  await context.close();
  return outcomes;
}

/**
 * What an empty document reports under this tag set.
 *
 * **Measured here rather than quoted.** #265 recorded `violations=0 passes=4`; CL-8 found that
 * figure does not survive the tag choice, because `best-practice` adds page-level rules that fire
 * on a document with nothing in it. Either way `passes > 0` holds, which is the point: the passes
 * count is not a liveness check and never was.
 */
async function emptyRun(browser) {
  const context = await browser.newContext({ viewport: SIZES[0].viewport });
  const page = await context.newPage();
  await page.setContent("<!doctype html><html><head></head><body></body></html>");
  const results = await audit(page);
  const dropped = await droppedBy(page, WCAG_TAGS, TAGS);
  await context.close();
  return { violations: failed(results), passes: results.passes.length, dropped: dropped.length };
}

// ---------------------------------------------------------------------------
// The sweep
// ---------------------------------------------------------------------------

/** Everything the run found, one entry per screen it looked at. */
const findings = [];
/** The frames this run declared it was going for, and the ones it reached. */
let wanted = [];
const reached = new Set();
/** Where the walk gave up, in the ritual's own two-part voice (#270). */
/**
 * **Screens this sweep deliberately does not reach**, and why (#352).
 *
 * ⚠️ **This file had no such ledger until the route was shared.** It did not cover the import
 * fork's two excluded branches either — [#350](../../issues/350) found that it simply did not say
 * so, while `review-shots.mjs` had stated them all along. A sweep that is silent about what it
 * skipped reads as one that reached everything, which is the failure this whole tier is about.
 *
 * Not a kind of `miss`: an omission is a decision, a miss is a defect in the instrument.
 */
const omissions = [];
const omit = (what, why) => {
  if (!omissions.some((noted) => noted.what === what)) omissions.push({ what, why });
};

const reasons = [];
const miss = (what, why) => {
  log(`  ! ${what} — ${why}`);
  if (!reasons.some((noted) => noted.what === what)) reasons.push({ what, why });
};

/** Audit whatever is on the glass, and record it under a name. */
async function look(page, size, name) {
  await settle(page);
  const results = await audit(page);
  reached.add(`${size.dir}/${name}`);
  findings.push({
    screen: `${size.dir}/${name}`,
    violations: results.violations,
    incomplete: results.incomplete.map((r) => r.id),
    passes: results.passes.length,
  });
  const bad = failed(results);
  log(`  ${size.dir}/${name}${bad.length === 0 ? "" : `  ← ${bad.join(", ")}`}`);
}

/** One size, walked end to end. */
async function sweep(browser, size) {
  log(`· ${size.dir}`);
  const context = await browser.newContext({
    viewport: size.viewport,
    isMobile: size.isMobile ?? false,
    hasTouch: size.isMobile ?? false,
    // §7.11's fades are not what is being audited, and a document caught mid-transition is a
    // document with an arbitrary opacity on it — which `color-contrast` would then report on.
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto(APP);
  await page.evaluate(() => localStorage.clear());
  await page.goto(APP);

  await walkFlow(page, {
    onArrive: (p, name) => look(p, size, `${name}-arrive`),
    onRefused: (p, name) => look(p, size, `${name}-refused`),
    onAnswered: (p, name, title, spec) =>
      spec.kind === "skip" ? undefined : look(p, size, `${name}-filled`),
    onMiss: miss,
  });

  await walkList(page, size, {
    visit: async (name) => look(page, size, name),
    declare: (name) => wanted.push(name),
    miss,
    omit,
  });
  await context.close();
}

// ---------------------------------------------------------------------------
// The report
// ---------------------------------------------------------------------------

/**
 * One line per node, so a finding is something you can go and look at.
 *
 * **Deduplicated by selector and capped.** The same rule fires on the same element on every
 * screen it is on, and a page-level rule can name two dozen elements at once: printed in full it
 * is a wall nobody reads, which is the same failure as printing nothing.
 */
const NODE_CAP = 8;
function nodeLines(nodes) {
  const seen = new Map();
  for (const node of nodes) {
    const target = node.target.join(" ");
    if (!seen.has(target)) seen.set(target, node.html.replace(/\s+/g, " ").slice(0, 110));
  }
  const shown = [...seen].slice(0, NODE_CAP);
  return [
    ...shown.map(([target, html]) => [`      ${target}`, `        ${html}`]).flat(),
    ...(seen.size > NODE_CAP ? [`      … and ${seen.size - NODE_CAP} more elements`] : []),
  ];
}

function report({ controls, empty, gone }) {
  const believable = controls.every((c) => c.changed !== null && c.cleanBefore && c.seen);

  log("");
  log("Whether this report can be believed:");
  for (const c of controls) {
    const ok = c.changed !== null && c.cleanBefore && c.seen;
    log(`  ${ok ? "✓" : "✗"} ${c.rule} — ${c.what}`);
    if (c.changed === null) {
      log(`      the control broke nothing, so it proves nothing about the checker`);
    } else {
      log(`      ${c.changed}`);
      if (!c.cleanBefore) log(`      but the unbroken screen already failed ${c.rule}`);
      if (!c.seen) log(`      and the checker did not report ${c.rule}`);
      if (c.wcagSilent === true) log(`      and it is invisible under the WCAG tags alone`);
      if (c.wcagSilent === false) log(`      but the WCAG tags alone caught it too`);
    }
  }
  log("");
  const one = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
  log(
    `  An empty document under these tags: ${one(empty.violations.length, "violation")}` +
      ` (${empty.violations.join(", ") || "none"}), ${one(empty.passes, "pass")}.`,
  );
  log(
    "  So the passes count is not a liveness check — a run over nothing still has" +
      ` ${empty.passes > 0 ? "one" : "none"}.`,
  );
  log(`  The tag set adds ${empty.dropped} rules the WCAG tags alone would drop.`);

  log("");
  if (gone.length > 0) {
    log("COULD NOT REACH — this sweep is incomplete:");
    for (const name of gone) log(`  · ${name} — meant to reach it, did not`);
    if (reasons.length > 0) {
      log("  Why:");
      for (const { what, why } of reasons) {
        log(`    · ${what}`);
        log(`        ${why}`);
      }
    }
    log("  A screen that was not swept is not a screen that came back clean.");
  }
  if (omissions.length > 0) {
    log("");
    log("NOT REACHED ON PURPOSE — a decision, not a gap:");
    for (const { what, why } of omissions) {
      log(`  · ${what}`);
      log(`      ${why}`);
    }
  } else {
    log(
      `Every screen this run meant to reach was swept: all ${wanted.length} of them,` +
        " the review list's rows included.",
    );
  }

  // Grouped by rule, because that is how a person decides what to do about it — and with the
  // screens named, because "somewhere in the builder" sends nobody anywhere.
  const byRule = new Map();
  for (const { screen, violations } of findings) {
    for (const v of violations) {
      const entry = byRule.get(v.id) ?? { rule: v, screens: [], nodes: [] };
      entry.screens.push(screen);
      entry.nodes.push(...v.nodes);
      byRule.set(v.id, entry);
    }
  }

  log("");
  if (byRule.size === 0) {
    log(`· ${findings.length} screens swept, nothing found.`);
  } else {
    log(`· ${findings.length} screens swept, ${byRule.size} rules violated:`);
    for (const [id, entry] of [...byRule].sort()) {
      log("");
      log(`  ${id} (${entry.rule.impact}) — ${entry.rule.help}`);
      log(`    on ${entry.screens.length} of ${findings.length} screens, e.g. ${entry.screens[0]}`);
      log(`    ${entry.rule.helpUrl}`);
      for (const line of nodeLines(entry.nodes)) log(line);
    }
  }

  // **Undecided is not a finding and must not be printed as one.** `frame-tested` is the preview
  // iframe, which is the exported page and has a check of its own. The rest is what a hand-run
  // tier is *for*: axe saying it could not tell, in a report a person is already reading.
  const incomplete = new Map();
  for (const { incomplete: ids } of findings) {
    for (const id of ids) incomplete.set(id, (incomplete.get(id) ?? 0) + 1);
  }
  if (incomplete.size > 0) {
    log("");
    log("  Undecided — axe could not tell either way. Not findings, and not clean either:");
    for (const [id, n] of [...incomplete].sort()) log(`    ${id} — on ${n} of ${findings.length}`);
  }

  log("");
  log("  This is the hand-run tier of two (SPEC.md §7.12). Nothing here gates anything, and a");
  log("  clean sweep is not a conformance claim: 23 of 55 A+AA criteria have any rule at all,");
  log("  and every defect this project has found except contrast sat in the other 32.");
  log("");

  return { believable, findings: byRule.size };
}

async function main() {
  let server;
  let browser;
  try {
    server = await serve({ builder: BUILDER, host: HOST, port: PORT, log });
    browser = await chromium.launch();

    // Before anything is swept, so a run that cannot prove the checker is live never gets as far
    // as printing a clean report.
    log("· proving the checker is live against known-bad controls");
    const controls = await proveLive(browser);
    const empty = await emptyRun(browser);

    wanted = sizes.flatMap((size) =>
      [...flowFrames(ANSWERS), ...LIST_FRAMES].map((name) => `${size.dir}/${name}`),
    );
    for (const size of sizes) await sweep(browser, size);

    // Throws when it was handed nothing to look for — a sweep that declared no screens is exit
    // 1's failure discovered from the other end.
    const gone = missing(wanted, reached);
    const { believable, findings: rules } = report({ controls, empty, gone });

    if (!believable || gone.length > 0) {
      process.stderr.write(
        "a11y-sweep: this report cannot be believed — see the sections above. A checker that" +
          " cannot prove it found something has not reported that nothing is wrong.\n\n",
      );
      process.exitCode = 2;
    } else if (rules > 0) {
      process.stderr.write(`a11y-sweep: ${rules} rule${rules === 1 ? "" : "s"} violated.\n\n`);
      process.exitCode = 3;
    }
  } finally {
    if (browser) await browser.close();
    if (server && !has("keep-server")) server.kill();
  }
}

main().catch((error) => {
  process.stderr.write(`\na11y-sweep could not run:\n  ${error.message}\n\n`);
  process.exit(1);
});

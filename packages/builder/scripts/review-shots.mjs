/**
 * The appearance ritual. `SPEC.md` §7.4.
 *
 * **This file already existed and this is a widening of it, not a new thing.** What was here
 * reached seven screens at 390 and 1180, from a hardcoded project fixture, and photographed the
 * builder only. The design audit needed more than that and had to improvise a throwaway script to
 * get it, which is the gap this closes: every wizard step rather than three of them, the sizes the
 * audit actually used so old sets stay comparable, named runs so before and after sit side by
 * side, and the exported page itself — where the audit found a contrast failure the builder's own
 * screens could never have shown.
 *
 * > **The builder's appearance has no standing regression suite, deliberately.** … The builder's
 * > look is checked by people, on purpose, with a deliberate before-and-after set captured for
 * > the review of any change that moves it — `scripts/review-shots.mjs` produces it, every screen
 * > at both of §7.6's sizes, and **nothing it writes fails a build**.
 *
 * **Run by hand. Never by CI.** There is no assertion in this file and no exit code that depends
 * on what a page looks like. §7.4 rejected screenshot-diffing as "precisely the flaky instrument
 * this repo already refuses by setting `retries: 0`" — a dozen images diffed per push, failing on
 * font hinting and antialiasing, is that test a dozen times over. This script writes pictures for
 * a person to look at. It exits non-zero only when it could not do that at all.
 *
 * **Runs are named, so before and after sit side by side.** The label defaults to the current
 * branch, which is the shape the ritual actually takes:
 *
 *     git switch main    && node scripts/review-shots.mjs     # → review-shots/main/
 *     git switch my-work && node scripts/review-shots.mjs     # → review-shots/my-work/
 *
 * Then open the two folders next to each other, or drag the pair into the PR. Output is
 * gitignored: a PR links these by uploading them to the comment, not by committing a megabyte of
 * PNG to a repo whose whole pitch is smallness. Committing a set deliberately — the way the design
 * audit did under `docs/audit/` — is still open to you; it just is not the default.
 *
 * **The generated page comes out of the preview, not out of a second render.** §5.2 makes the
 * preview *be* the export, so the iframe's `srcdoc` is the shipped bytes. Pulling the variants
 * from there rather than importing the renderer keeps this script honest about what it is
 * photographing, and means it cannot drift from what the builder actually produces.
 *
 * **It drives by `data-*` hooks and roles, never by utility classes.** §7.4: "Utilities are
 * styling and may change with the design; a hook is a contract and does not." A script that
 * reviews design changes must not break when the design changes.
 */

import { chromium } from "@playwright/test";
import { execFileSync, spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** `packages/builder` — where the app is built and served from. */
const BUILDER = resolve(fileURLToPath(new URL("..", import.meta.url)));
/** The repo root — where runs are written, so both packages' shots land in one place. */
const ROOT = resolve(fileURLToPath(new URL("../../../", import.meta.url)));

const HOST = "127.0.0.1";
const PORT = 4318; // not 4173 — the e2e owns that one, so both can run at once
const ORIGIN = `http://${HOST}:${PORT}`;
const APP = `${ORIGIN}/linkpage/`;

/** §7.6's two sizes, matching the design audit's baseline so old sets stay comparable. */
const SIZES = [
  { dir: "desktop", viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  { dir: "mobile", viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true },
];

/**
 * The four style combinations the design audit captured, kept as the default set so a later run
 * can be laid beside it. `--variant shape-type-mode` overrides this with a single one — the audit
 * found a contrast failure in a combination nobody had ever rendered, which is the whole reason
 * this takes an argument instead of a fixed list.
 */
const DEFAULT_VARIANTS = [
  "centred-classic-light",
  "colourBlock-modern-dark",
  "floatingCard-friendly-light",
  "ruledLeft-classic-dark",
];

/**
 * One answer per wizard step, keyed by the question's own heading.
 *
 * Keyed by heading rather than by index so a reordered flow does not silently photograph the
 * wrong thing: an unrecognised heading stops the walk and says so, which is the failure you want.
 */
const ANSWERS = {
  "What kind of business is this?": { kind: "preset", choose: "Food & drink" },
  "What's it called?": { kind: "type", value: "Ada & Sons Bakers" },
  "One line about what you do?": {
    kind: "type",
    value: "Sourdough, pastries, and the best cheese scone in town",
  },
  "Do you have a logo?": { kind: "skip" },
  "What's your colour?": { kind: "swatch" },
  "Which of these do you have?": { kind: "check", labels: ["See the menu", "Order for pickup"] },
  "Where does “See the menu” go?": { kind: "type", value: "https://example.com/menu" },
  "Where does “Order for pickup” go?": { kind: "type", value: "https://example.com/order" },
  "When are you open?": { kind: "hours" },
  "How do people reach you?": { kind: "contact" },
  "Where are you?": { kind: "address" },
  "Where else are you online?": { kind: "skip" },
};

const TEXTISH =
  '[data-screen="flow"] input:not([type="checkbox"]):not([type="radio"]):not([type="file"])';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const has = (name) => args.includes(`--${name}`);

if (has("help")) {
  process.stdout.write(
    [
      "",
      "  pnpm shots [options]        (or: pnpm --filter @linkpage/builder exec node scripts/review-shots.mjs)",
      "",
      "    --label <name>      name this run (default: the current branch)",
      "    --out <dir>         where to write (default: review-shots/)",
      "    --only builder|page capture just one half",
      "    --variant <combo>   one page combination, e.g. floatingCard-friendly-dark",
      "    --keep-server       leave the preview server up when finished",
      "    --help              this",
      "",
      "  Run it once on the trunk and once on your branch, then look at the two folders.",
      "",
    ].join("\n"),
  );
  process.exit(0);
}

const label =
  flag("label") ??
  (() => {
    try {
      return execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: ROOT })
        .toString()
        .trim()
        .replace(/[^\w.-]+/g, "-");
    } catch {
      return "run";
    }
  })();

const outRoot = resolve(ROOT, flag("out", "review-shots"), label);
const only = flag("only");
const variants = flag("variant") ? [flag("variant")] : DEFAULT_VARIANTS;

const log = (...m) => process.stdout.write(`${m.join(" ")}\n`);
let shots = 0;

/** Build the app and serve it the way Pages does — under `/linkpage/`, from `dist`. */
async function serve() {
  log("· building the builder");
  execFileSync("pnpm", ["exec", "vite", "build"], { cwd: BUILDER, stdio: "inherit" });

  log("· serving it");
  const server = spawn(
    "pnpm",
    ["exec", "vite", "preview", "--host", HOST, "--port", String(PORT), "--strictPort"],
    { cwd: BUILDER, stdio: "ignore" },
  );

  const deadline = Date.now() + 60_000;
  for (;;) {
    try {
      const res = await fetch(APP);
      if (res.ok) break;
    } catch {
      /* not up yet */
    }
    if (Date.now() > deadline) {
      server.kill();
      throw new Error(`the preview server never came up on ${APP}`);
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return server;
}

/** Settle the frame's own fade (§7.11) before the shutter, so shots are not caught mid-transition. */
async function settle(page) {
  await page.waitForTimeout(400);
}

async function shoot(page, size, name) {
  const file = join(outRoot, size.dir, `${name}.png`);
  await mkdir(join(outRoot, size.dir), { recursive: true });
  await settle(page);
  await page.screenshot({ path: file, fullPage: false });
  shots += 1;
  log(`  ${size.dir}/${name}.png`);
}

/** The question currently on screen, by its own heading. */
async function heading(page) {
  const h = page.locator('[data-screen="flow"] h1').first();
  return (await h.count()) ? ((await h.textContent()) ?? "").trim() : null;
}

const slug = (s) =>
  s
    .toLowerCase()
    .replace(/[“”'?]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

/**
 * Answer one step. Returns false when the step advances itself (the preset picker does).
 *
 * Everything is blurred afterwards. Fields normalise what you typed on blur — "2pm" becomes
 * "2:00 PM" — so a shot taken with the caret still in the box photographs a half-committed value,
 * and §7.9's judgement would hold the screen when the walk tried to move on. It also keeps the
 * shots free of an arbitrary focus ring, which would be noise in a before-and-after.
 */
async function answer(page, spec) {
  const result = await fill(page, spec);
  await page.evaluate(() =>
    document.activeElement instanceof HTMLElement ? document.activeElement.blur() : undefined,
  );
  return result;
}

async function fill(page, spec) {
  switch (spec.kind) {
    case "preset":
      await page.getByRole("button", { name: spec.choose }).first().click();
      return false;
    case "type":
      await page.locator(TEXTISH).first().fill(spec.value);
      return true;
    case "swatch":
      await page.locator("[data-swatch], .av, button[aria-pressed]").first().click();
      return true;
    case "check":
      for (const l of spec.labels) await page.getByLabel(l, { exact: false }).first().check();
      return true;
    case "hours": {
      // The day modes are `sr-only` radios driven by their labels, so the label intercepts the
      // pointer. `force` is right here rather than a workaround: the control is the radio.
      await page.getByRole("radio", { name: "Open", exact: true }).first().check({ force: true });
      const times = page.locator(TEXTISH);
      await times.nth(0).fill("7am");
      await times.nth(1).fill("2pm");
      return true;
    }
    case "contact": {
      const f = page.locator(TEXTISH);
      await f.nth(0).fill("020 7946 0100");
      await f.nth(1).fill("hello@adasbakery.example");
      return true;
    }
    case "address":
      await page
        .locator('[data-screen="flow"] textarea')
        .first()
        .fill("12 Mill Lane\nHebden Bridge\nHX7 8AA");
      return true;
    case "skip":
      return true;
    default:
      return true;
  }
}

/**
 * Walk the flow from empty, photographing each step on arrival and once answered.
 *
 * **The walk always runs, even under `--only page`** — it is what puts a real project in
 * `localStorage`, and the page variants are that project restyled. Seeding a hand-written fixture
 * instead would photograph a project the flow could not actually produce. `capture` only decides
 * whether the walk's own screens are written.
 */
async function walkFlow(context, size, capture) {
  const page = await context.newPage();
  await page.goto(APP);
  await page.evaluate(() => localStorage.clear());
  await page.goto(APP);

  let n = 0;
  const seen = new Set();
  for (;;) {
    if (!(await page.locator('[data-screen="flow"]').count())) break; // left the flow: the list
    const title = await heading(page);
    if (!title) {
      log("  ! the flow is on screen but has no heading — stopping the walk.");
      break;
    }
    if (seen.has(title) && seen.size > 1) {
      log(`  ! “${title}” came round again — the walk stopped making progress, stopping here.`);
      break;
    }
    seen.add(title);

    n += 1;
    const name = `${String(n).padStart(2, "0")}-${slug(title)}`;
    if (capture) await shoot(page, size, `${name}-arrive`);

    const spec = ANSWERS[title];
    if (!spec) {
      log(`  ! no answer known for “${title}” — stopping the walk here.`);
      log(`    Add it to ANSWERS in this script.`);
      break;
    }

    const needsContinue = await answer(page, spec);
    if (capture && spec.kind !== "skip") await shoot(page, size, `${name}-filled`);

    if (needsContinue) {
      const escape = page.locator("[data-escape]");
      const cont = page.getByRole("button", { name: /^(Continue|Save)$/ });
      if (spec.kind === "skip" && (await escape.count())) await escape.first().click();
      else if ((await cont.count()) && (await cont.first().isEnabled())) await cont.first().click();
      else if (await escape.count()) await escape.first().click();
      else {
        log(`  ! nothing to press on “${title}” — no enabled Continue and no escape.`);
        break;
      }
    }
    await settle(page);
    if (n > 20) break; // a walk this long means something is wrong, not that the flow grew
  }
  return page;
}

/** The screens that are not the wizard: the list, an opened row, the sheet, the menu. */
async function listScreens(page, size) {
  if (!(await page.locator('[data-screen="list"]').count())) {
    log("  ! never reached the review list — skipping the list screens.");
    return;
  }
  // On a phone the run ends page-first: the preview covers the viewport and the rows are behind
  // "Edit your page". That landing is itself a screen worth reviewing, so photograph it before
  // stepping through it.
  await shoot(page, size, "50-arrive");
  const toRows = page.getByRole("button", { name: /Edit your page/i });
  if (await toRows.count()) {
    await toRows.first().click();
    await shoot(page, size, "51-list-rows");
  }

  const row = page.locator("[data-row] button").first();
  if (await row.count()) {
    await row.click();
    await shoot(page, size, "52-list-row-open");
    await row.click();
  }

  const download = page.getByRole("button", { name: /^Download$/ });
  if (await download.count()) {
    await download.first().click();
    await shoot(page, size, "53-download-sheet");
    const close = page.getByRole("button", { name: /^Close$/ });
    if (await close.count()) await close.first().click();
  }

  const menu = page.locator("[data-menu] button, button[data-menu]").first();
  if (await menu.count()) {
    await menu.click();
    await shoot(page, size, "54-menu");
    await page.keyboard.press("Escape");
  }
}

/**
 * The generated page, per style combination.
 *
 * The style is patched straight into the stored project and the page reloaded, so every variant
 * is the same content under a different chrome — which is the comparison a reviewer wants. The
 * bytes come out of the preview's `srcdoc`, which §5.2 makes the export itself.
 */
async function pageVariants(context, size, browser) {
  const page = await context.newPage();
  await page.goto(APP);

  for (const combo of variants) {
    const [shape, type, mode] = combo.split("-");
    await page.evaluate(
      ({ shape, type, mode }) => {
        const key = "linkpage.project";
        const raw = localStorage.getItem(key);
        if (!raw) throw new Error("no project in storage — the walk did not complete");
        const doc = JSON.parse(raw);
        const target = doc.project ?? doc;
        target.style = { ...(target.style ?? {}), shape, type, mode };
        localStorage.setItem(key, JSON.stringify(doc));
      },
      { shape, type, mode },
    );
    await page.reload();
    await settle(page);

    const frame = page.locator("[data-preview-frame]").first();
    if (!(await frame.count())) {
      log("  ! no preview frame on screen — skipping the page variants.");
      return;
    }
    const html = await frame.getAttribute("srcdoc");
    if (!html) {
      log(`  ! ${combo}: the preview frame had no srcdoc`);
      continue;
    }

    await mkdir(join(outRoot, "pages"), { recursive: true });
    await writeFile(join(outRoot, "pages", `${combo}.html`), html, "utf8");

    // Photograph the exported bytes on their own, at full height — this is the visitor's view,
    // not the builder's preview pane.
    const shot = await browser.newPage({ ...size });
    await shot.setContent(html, { waitUntil: "load" });
    await shot.waitForTimeout(300);
    await mkdir(join(outRoot, size.dir, "pages"), { recursive: true });
    await shot.screenshot({
      path: join(outRoot, size.dir, "pages", `${combo}.png`),
      fullPage: true,
    });
    await shot.close();
    shots += 1;
    log(`  ${size.dir}/pages/${combo}.png`);
  }
}

async function main() {
  let server;
  let browser;
  try {
    server = await serve();
    await rm(outRoot, { recursive: true, force: true });
    browser = await chromium.launch();

    for (const size of SIZES) {
      log(`· ${size.dir}`);
      const context = await browser.newContext({
        viewport: size.viewport,
        deviceScaleFactor: size.deviceScaleFactor,
        isMobile: size.isMobile ?? false,
        hasTouch: size.isMobile ?? false,
        // The fade is §7.11's language, not something a still can show. Photographing mid-fade
        // is just noise in a before-and-after.
        reducedMotion: "reduce",
      });

      const capture = only !== "page";
      if (!capture) log("  · walking the flow to build a project (not photographing it)");
      const page = await walkFlow(context, size, capture);
      if (capture) await listScreens(page, size);
      if (only !== "builder") await pageVariants(context, size, browser);
      await context.close();
    }

    log("");
    log(`· ${shots} shots → ${outRoot}`);
    log("");
    log("  Run this on the trunk too, then put the two folders side by side:");
    log(`    git switch main && pnpm shots`);
    log("");
  } finally {
    if (browser) await browser.close();
    if (server && !has("keep-server")) server.kill();
  }
}

main().catch((error) => {
  // A hard failure — no browser, no server, no app — is worth an exit code, because it means
  // there are no pictures at all. Nothing about what the pictures *look like* ever gets one.
  process.stderr.write(`\nreview-shots could not run:\n  ${error.message}\n\n`);
  process.exit(1);
});

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
 * a person to look at.
 *
 * **Its two non-zero exits are both about the instrument and neither is about a picture.**
 * **1** is *there are no pictures at all* — no browser, no server, no app (#208 added the two
 * pre-flight checks that reach it deliberately). **2** is *the pictures are here and the set has
 * a hole in it*: a screen this run meant to reach and could not. See `census.mjs` for why that is
 * worth an exit code of its own rather than a line in the ledger, and #270 for the three months
 * it cost to have said it in the ledger's voice.
 *
 * **Nothing it writes fails a build**, and §7.4's sentence still holds: this is hand-run, it is
 * never wired to CI, and neither code says anything about what a picture looks like. Measured
 * while adding it: through the `pnpm shots` alias pnpm reports its own **1** for any non-zero
 * child, so the two are told apart by running the script directly. The loud section in the run
 * and in `README.txt` is what a person reads either way; the code is for the shell.
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
 *
 * ## What this owes a reviewer, and what it does not
 *
 * **One picture of every screen the tool can put on the glass, at both of §7.6's sizes, without
 * anyone having to know a flag.** That is the whole rule, and it is what three tickets in one
 * wave found this script failing at from three directions: only the first review-list row was
 * ever opened, so #189's pair of list escapes could be evidenced with a source guard and never
 * with a picture; the default page set had no `floatingCard` + `dark`, which is precisely the
 * pairing carrying the failure #184 fixed; and the replace confirmation could not be reached at
 * all, because §7.8 only shows it after a file comes back from an OS picker and the walk never
 * opened one — so #200's before and after were identical and contained no picture of the surface
 * it changed. A fourth arrived while this was being written: #194 gave the exported page a hover
 * state, which **no resting screen can show** — so that ticket did not run the ritual at all,
 * because a before/after pair of resting screens comes back identical, which since #208 is
 * indistinguishable from a run that photographed the wrong server. All four are now walked.
 *
 * **What it does not owe is every combination of everything.** Screens multiply by size, rows,
 * shape, type pairing, mode and now interaction state, and a run nobody opens is as useless as a
 * run that missed the screen. So the crossing is deliberate and uneven: **screens are crossed
 * with size** (§7.4 asks for both), **the exported page is crossed with shape and mode** (the two
 * axes that decide what colour lands on what — see `variants.mjs`), **one link button is hovered
 * once per mode**, and **nothing is crossed with anything else**.
 *
 * **Every cut is printed at the end of the run and written into `README.txt` beside the
 * pictures**, because a silent cap reads as "covered everything" when it did not — which is the
 * mistake the old default variant set made, quietly, for as long as it stood.
 *
 * **And a cut is not the same thing as a miss** (#270). A screen left out on purpose is a
 * decision with a reason; a screen this run meant to photograph and could not is a broken
 * instrument, and for three months the two were printed in the same voice with the same `!` and
 * the same exit 0. They are now two sections, the second one loud and worth an exit code — see
 * `census.mjs`, which declares what the run is going for before it walks so that a screen going
 * missing does not depend on some other line having noticed.
 *
 * ## Two runs of one commit come back byte for byte the same
 *
 * **That sentence is the ritual's whole method, and it was quietly false for three frames of
 * eighty-four** (#242). Since #208 an identical pair carries meaning — *these shots did not move,
 * and that is the result* — and #190, #194, #213 and #234 all read it that way. Three frames
 * that differ when nothing changed can say neither "this moved" nor "this did not", and nothing
 * in the run said which three. See `RASTER` for what it actually was, and `stability.mjs` for
 * `--twice`, which takes the whole set again and reports whether the camera held still.
 */

import { chromium } from "@playwright/test";

import { covered, intended, missing, unreached } from "./census.mjs";
import { walkList } from "./list-route.mjs";
import { ANSWERS, settle, walkFlow as walk } from "./flow.mjs";
import { portFor } from "./port.mjs";
import { serve } from "./serve.mjs";
import { compare, digest, verdict } from "./stability.mjs";
import { DEFAULT_VARIANTS, MODES, parseVariant, SHAPES, TYPES } from "./variants.mjs";
import { execFileSync } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** `packages/builder` — where the app is built and served from. */
const BUILDER = resolve(fileURLToPath(new URL("..", import.meta.url)));
/** The repo root — where runs are written, so both packages' shots land in one place. */
const ROOT = resolve(fileURLToPath(new URL("../../../", import.meta.url)));

const HOST = "127.0.0.1";

/**
 * **What made three frames in eighty-four come out with different bytes and the same picture.**
 * [#242](https://github.com/mandyMooreFan/linkpage/issues/242).
 *
 * Chromium rasters a layer in tiles, and by default it *partially* rasters: when only part of a
 * layer is dirty it redraws the damaged rectangle into the tile it already has, rather than the
 * whole tile. Skia's analytic antialiasing of an edge that lands on the damage boundary then
 * resolves to a coverage one greylevel off what a full-tile raster gives, so **a rounded corner
 * comes out ±1/255 depending on what happened to be dirty just before the shutter**. That is
 * timing, so it moves from run to run.
 *
 * Measured rather than assumed, because two earlier tickets guessed "preview-iframe sub-pixel
 * noise" (#228, #230) and neither was right. A pair of runs differed in **4 pixels of 1,296,000**
 * — the top-left corner arc of the drawer's own button — and, in another pair, 19 pixels on the
 * chosen swatch's selection mark. The three named frames were not special: with the flow's view
 * transitions disabled the same 4 pixels flipped on a *different* screen instead, which is what
 * ruled the transition out. At the moment of every shutter `document.getAnimations()` held
 * nothing unfinished, the button's `getBoundingClientRect()` was identical to the sub-pixel
 * across contexts that disagreed, and forcing a full repaint before the shutter did not move it.
 * With partial raster off, three consecutive full runs came back byte for byte identical.
 *
 * **It is a flag on the camera, not a change to the product.** Nothing about what is on the
 * screen differs; what differs is only whether Chromium is allowed to reuse the undamaged part
 * of a tile while photographing it. Confirm any time with `--twice`.
 */
const RASTER = ["--disable-partial-raster"];

/** §7.6's two sizes, matching the design audit's baseline so old sets stay comparable. */
const SIZES = [
  { dir: "desktop", viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  { dir: "mobile", viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true },
];

/**
 * The one size the exported page is photographed at.
 *
 * **Not a cap on coverage — a duplicate removed.** The renderer has no width media query at all
 * and its column is `min(100%, 25rem)` centred, so a 1440-wide capture is the identical column
 * with more whitespace either side. §7.6 makes exactly that argument in dropping the "see it on
 * a laptop" preview control, and §5.2 makes the preview *be* the export, so it holds here too.
 * The bytes are written to `pages/*.html` regardless, so anyone who wants the wide surround is
 * one double-click from it.
 */
const PAGE_SIZE = "mobile";

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
      "                        (the default set is every shape in both modes)",
      "    --port <n>          override the port (default: derived from the label, so",
      "                        concurrent runs cannot photograph each other)",
      "    --keep-server       leave the preview server up when finished",
      "    --twice             take the whole set twice and report whether the two came back",
      "                        byte for byte the same — a check on the camera, not the design",
      "    --help              this",
      "",
      "  Run it once on the trunk and once on your branch, then look at the two folders.",
      "",
      "  Exit codes, both about the instrument and neither about a picture:",
      "    0  every screen this run meant to reach is in the folder",
      "    1  no pictures at all — no browser, no server, or someone else's server",
      "    2  the pictures are here and a screen the run meant to reach is not, so the set",
      "       cannot be read as a before-and-after until it is fixed",
      "  (`pnpm shots` reports pnpm's own 1 for either; run the script directly to tell them",
      "  apart. The COULD NOT PHOTOGRAPH section is there whichever way you ran it.)",
      "",
    ].join("\n"),
  );
  process.exit(0);
}

const git = (...a) => execFileSync("git", a, { cwd: ROOT }).toString().trim();

const label =
  flag("label") ??
  (() => {
    try {
      const branch = git("rev-parse", "--abbrev-ref", "HEAD");
      // A detached checkout answers "HEAD", which is not a name: it labels every detached
      // run identically, so two of them would share an output folder *and* a port. The
      // short sha is the thing that actually distinguishes them — and a trunk run taken
      // for comparison is usually detached, which is exactly when you want to know which
      // commit you photographed.
      const name = branch === "HEAD" ? git("rev-parse", "--short", "HEAD") : branch;
      return name.replace(/[^\w.-]+/g, "-");
    } catch {
      return "run";
    }
  })();

/**
 * This run's own port. See `port.mjs` for why it is derived from the label rather than
 * pinned, and why a `--port` flag on its own would not have been enough.
 */
const PORT = Number(flag("port")) || portFor(label);
const ORIGIN = `http://${HOST}:${PORT}`;
const APP = `${ORIGIN}/linkpage/`;

/** Where this run's pictures go. `--twice` points it at a scratch folder for the second pass. */
const runRoot = resolve(ROOT, flag("out", "review-shots"), label);
let outRoot = runRoot;
const only = flag("only");
const variants = flag("variant") ? [flag("variant")] : DEFAULT_VARIANTS;

/**
 * The variants a link button is hovered on: one per mode, on a shape whose buttons are filled.
 * See `hoverShot` for why one per mode and why never `colourBlock`.
 */
const hovered = MODES.map((mode) =>
  variants.find((combo) => {
    const parsed = parseVariant(combo);
    return parsed !== null && parsed.mode === mode && parsed.shape !== "colourBlock";
  }),
).filter((combo) => combo !== undefined);

const log = (...m) => process.stdout.write(`${m.join(" ")}\n`);
let shots = 0;

/**
 * What this run deliberately did not photograph.
 *
 * **A cap nobody is told about reads as complete coverage.** The set of screens is bigger than
 * any run should be, so this script makes choices — and every one of them is recorded here,
 * printed when the run finishes and written into `README.txt` beside the pictures, where it is
 * still there when somebody opens the folder a week later.
 */
const omissions = [];
/** Recorded once, however many sizes the walk hits it at. */
const omit = (what, why) => {
  if (!omissions.some((noted) => noted.what === what)) omissions.push({ what, why });
};

/**
 * **Why the run gave up on a screen it was going for.** The other list, and not a kind of
 * omission — see `census.mjs`.
 *
 * Every place the walk used to print `!` and carry on records here instead. It still prints,
 * because somebody is watching the run — but printing was never the problem: the line scrolled
 * past, the run exited 0, and the folder said nothing about it a week later (#270).
 */
const reasons = [];
const miss = (what, why) => {
  log(`  ! ${what} — ${why}`);
  if (!reasons.some((noted) => noted.what === what)) reasons.push({ what, why });
};

/**
 * What this run declared it was going for, and what it actually wrote.
 *
 * `wanted` is seeded from the run's own flags before the walk starts and grows as the walk meets
 * things it can only name once it has seen them — the review list's rows. `taken` is appended by
 * every shutter. The difference is the census.
 */
let wanted = [];
const taken = new Set();
/** Declare a frame the run means to produce. */
const expect = (name) => wanted.push(name);
/** Record one that arrived. */
const got = (name) => taken.add(name);

/**
 * One picture. `of` narrows it to a single element rather than the viewport.
 *
 * **An element shot captures the whole element, past the fold if it has to.** That is the point
 * of it: a row's editor is taller than a phone screen, and a viewport shot of one cuts the
 * bottom off — which for the review list means cutting off the escape at the foot of the row,
 * the very thing #189 could not photograph and this widening exists to reach.
 */
async function shoot(page, size, name, of) {
  const file = join(outRoot, size.dir, `${name}.png`);
  await mkdir(join(outRoot, size.dir), { recursive: true });
  await settle(page);
  if (of) await of.screenshot({ path: file });
  else await page.screenshot({ path: file, fullPage: false });
  shots += 1;
  got(`${size.dir}/${name}`);
  log(`  ${size.dir}/${name}.png`);
}

/**
 * Walk the flow from empty, photographing each step on arrival and once answered.
 *
 * **The walk itself lives in `flow.mjs`** — it is shared with the accessibility sweep (CL-9),
 * which needs exactly these 60-odd driven steps and wants to run a checker at each of them rather
 * than a shutter. What is left here is what the *ritual* does with each state it is handed.
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

  return walk(page, {
    onArrive: async (p, name) => {
      if (capture) await shoot(p, size, `${name}-arrive`);
    },
    onRefused: async (p, name) => {
      if (capture) await shoot(p, size, `${name}-refused`);
    },
    onAnswered: async (p, name, title, spec) => {
      if (capture && spec.kind !== "skip") await shoot(p, size, `${name}-filled`);
      // A declined question is a tick-on on the list rather than a row (§7.1), so there is no row
      // screen for it and there cannot be. Said out loud rather than left as a gap in the numbers.
      if (spec.kind === "skip") {
        omit(
          `a list row for “${title}”`,
          "this walk declines it, and a declined topic is a tick-on rather than a row — the" +
            " question itself is photographed in the flow above",
        );
      }
    },
    onMiss: miss,
  });
}

/**
 * **The route through the review list comes from `scripts/list-route.mjs`** (#352).
 *
 * `listScreens`, `rowScreens` and `importScreens` lived here and in `a11y-sweep.mjs`, and nothing
 * kept the copies in step. [#350](../../issues/350) read them side by side: the route was the
 * same, but **the sweep recorded failures this file did not** — `else { miss(…) }` on all three
 * optional steps, where this one's `if (await x.count())` guards skipped in silence, which is
 * [#270](../../issues/270)'s own shape — while **this file recorded exclusions the sweep did
 * not.** Neither was the base; both halves went into the shared route.
 *
 * **What stays here is the shutter**, which is the only part that was ever this file's:
 * `scrollIntoView` before a row shot is a requirement of photography, not of the route, and it
 * lives in `visit` for exactly that reason (#302).
 */
const listHooks = (page, size) => ({
  visit: async (name, at) => {
    if (at?.row) {
      await at.row.evaluate((el) => el.scrollIntoView({ block: "start", behavior: "instant" }));
      await shoot(page, size, name, at.row);
    } else {
      await shoot(page, size, name);
    }
  },
  declare: expect,
  miss,
  omit,
});

/**
 * The generated page, per style combination.
 *
 * The style is patched straight into the stored project and the page reloaded, so every variant
 * is the same content under a different chrome — which is the comparison a reviewer wants. The
 * bytes come out of the preview's `srcdoc`, which §5.2 makes the export itself.
 *
 * **The set is every shape in both modes** — see `variants.mjs` for why that crossing and not a
 * bigger one, and for the hole the set this replaced had in it. **At one size**, per `PAGE_SIZE`.
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
      miss("the exported page, in every combination", "there is no preview frame on the screen");
      return;
    }
    const html = await frame.getAttribute("srcdoc");
    if (!html) {
      miss(`the exported page as ${combo}`, "the preview frame had no srcdoc to photograph");
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
    shots += 1;
    got(`${size.dir}/pages/${combo}`);
    log(`  ${size.dir}/pages/${combo}.png`);

    await hoverShot(shot, size, combo);
    await shot.close();
  }
}

/**
 * **One hovered link button.** The page's `:hover`/`:active` rule, which no resting screen shows.
 *
 * [#194](https://github.com/mandyMooreFan/linkpage/issues/194) gave the exported page a hover
 * state and could not run this ritual over it at all: a walk of resting screens produced two
 * identical sets, which since [#208](https://github.com/mandyMooreFan/linkpage/issues/208) is
 * indistinguishable from a run that photographed the wrong server. Same failure, fourth
 * direction — so it gets an instrument.
 *
 * **One button, one variant per mode, and no state machine.** The rule is
 * `.lp-link:hover,.lp-link:active` — one declaration block — so a hovered button is a picture of
 * the pressed state too, and the second and third link buttons are the first one again. **The
 * mode is the axis that matters**, for #184's reason: the hover fill is derived, the derivation
 * runs against the mode's backdrops, and a dark-mode fill already stepped back to 3:1 has almost
 * no step left. So it is taken once in each mode.
 *
 * **Never on `colourBlock`**, which draws its buttons as outlines with page ink on them: the
 * hover rule sets fill *and* ink together precisely so that shape does not end up with page ink
 * on a filled button, and a hover shot there would be a picture of the exception rather than of
 * the rule.
 */
async function hoverShot(shot, size, combo) {
  if (!hovered.includes(combo)) return;

  const first = ANSWERS["Which of these do you have?"]?.labels?.[0];
  const link =
    first === undefined
      ? shot.getByRole("link").first()
      : shot.getByRole("link", { name: first, exact: false }).first();
  if (!(await link.count())) {
    miss(`the hovered link button on ${combo}`, "the exported page has no link button on it");
    return;
  }

  await link.hover();
  await shot.waitForTimeout(300);
  await shot.screenshot({
    path: join(outRoot, size.dir, "pages", `${combo}-hover.png`),
    fullPage: true,
  });
  shots += 1;
  got(`${size.dir}/pages/${combo}-hover`);
  log(`  ${size.dir}/pages/${combo}-hover.png`);
}

/**
 * What was taken, and what was not.
 *
 * **Printed and also written into the folder.** The run's stdout is gone by the time somebody
 * opens the pictures — and the whole reason this exists is that a cap nobody can see reads as
 * complete coverage, which is how the missing `floatingCard` + `dark` sat there unnoticed
 * through the ticket that most needed it.
 */
async function report(steadiness, gone) {
  const coverage = gone.length === 0 ? covered(wanted) : unreached(gone, reasons);
  const ledger = [
    // First, because it is the thing that changes how everything under it should be read, and
    // because `README.txt` is opened by somebody who is about to compare two folders (#270).
    ...coverage,
    "",
    "Deliberately not photographed:",
    ...omissions.flatMap(({ what, why }) => [`  · ${what}`, `      ${why}`]),
    ...(steadiness.length === 0 ? [] : ["", "The instrument:", ...steadiness.map((l) => `  ${l}`)]),
  ];

  log("");
  log(`· ${shots} shots → ${outRoot}`);
  log("");
  for (const line of ledger) log(`  ${line}`);
  log("");

  await mkdir(outRoot, { recursive: true });
  await writeFile(
    join(outRoot, "README.txt"),
    [
      `review-shots — ${label}`,
      `${shots} shots, ${new Date().toISOString()}`,
      "",
      ...ledger,
      "",
      "Nothing here asserts anything about what the pictures look like (SPEC.md §7.4).",
      "",
    ].join("\n"),
    "utf8",
  );
}

/**
 * One complete set, into `into`.
 *
 * Pulled out of `main` so `--twice` can ask for a second one without a second process, a second
 * build or a second server — everything that could differ between two runs for an honest reason
 * is held still, which is what leaves the camera as the only variable.
 */
async function takeAll(browser, into) {
  outRoot = into;
  shots = 0;
  omissions.length = 0;
  reasons.length = 0;
  taken.clear();
  // Declared before a single shutter, so the run is committed to a set it can then be held to.
  // The rows are added as the walk meets them — see `rowScreens`.
  wanted = intended({
    answers: ANSWERS,
    sizes: SIZES.map((size) => size.dir),
    only,
    pageSize: PAGE_SIZE,
    variants,
    hovered,
  });
  await rm(outRoot, { recursive: true, force: true });

  for (const size of SIZES) {
    // `--only page` has no reason to walk the flow twice: the pages are taken at one size.
    if (only === "page" && size.dir !== PAGE_SIZE) continue;
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
    if (capture) await walkList(page, size, listHooks(page, size));
    if (only !== "builder" && size.dir === PAGE_SIZE) await pageVariants(context, size, browser);
    await context.close();
  }

  if (only !== "page") {
    omit(
      "how much of a long row editor fits on one phone screen",
      "the row shots are of the row rather than of the viewport, so nothing is cut off the" +
        " bottom — 51-list-rows and the flow's own shots are where the fold shows",
    );
  }

  if (only !== "builder") {
    omit(
      "the hover state on every button but the first, and on colourBlock",
      "`.lp-link:hover,.lp-link:active` is one rule, so one hovered button is the pressed" +
        " state too; it is taken once per mode because the fill is derived per mode (#184)",
    );
    omit(
      `the exported page at ${SIZES.filter((size) => size.dir !== PAGE_SIZE)
        .map((size) => size.viewport.width)
        .join(" and ")}px wide`,
      "the renderer has no width media query and its column is min(100%, 25rem) centred, so a" +
        " wide capture is the same column with more air (§7.6) — pages/*.html if you want it",
    );
    const combinations = SHAPES.length * TYPES.length * MODES.length;
    if (variants.length < combinations) {
      omit(
        `${combinations - variants.length} of the ${combinations} style combinations`,
        `the ${variants.length} taken cover every shape in both modes; the rest vary only the` +
          " type pairing, which is token-valued (§6.1) — `--variant <combo>` reaches any of them",
      );
    }
  }

  return shots;
}

/**
 * **The camera, checked against itself: the same commit, twice.** `--twice`.
 *
 * §7.4 refuses a screenshot-diffing suite, and this is not one — it compares a run against
 * *itself*, never against a stored baseline, and it still cannot fail a build. What it measures
 * is whether "these two folders are identical" is a sentence worth saying, which is the whole of
 * what #208 bought and what four tickets have since spent (#190, #194, #213, #234).
 *
 * The second set is written beside the first and deleted, so what is left in the folder is one
 * run and one verdict rather than two sets a reviewer then has to tell apart.
 */
async function checkSteady(browser, taken) {
  const again = `${runRoot}--again`;
  log("");
  log("· taking the same set again, to check the camera (--twice)");
  try {
    await takeAll(browser, again);
    const found = compare(await digest(runRoot), await digest(again));
    return verdict(found);
  } finally {
    await rm(again, { recursive: true, force: true });
    outRoot = runRoot;
    shots = taken;
  }
}

async function main() {
  let server;
  let browser;
  try {
    server = await serve({ builder: BUILDER, host: HOST, port: PORT, log });
    browser = await chromium.launch({ args: RASTER });

    const count = await takeAll(browser, runRoot);
    // Read off the run that is actually in the folder, before `--twice` walks a second one over
    // the top of these two lists. It throws if the run declared nothing, which is exit 1's own
    // failure — there are no pictures — discovered from the other end.
    const gone = missing(wanted, taken);
    const steadiness = has("twice") ? await checkSteady(browser, count) : [];
    await report(steadiness, gone);

    log("  Run this on the trunk too, then put the two folders side by side:");
    // Not `git switch main`: the trunk is usually checked out by another worktree, which
    // refuses the switch, and the point of the derived port is that both runs can be up at
    // once anyway. A throwaway worktree gets its own label from the short sha it lands on.
    log(
      `    git worktree add ../linkpage-trunk origin/main && (cd ../linkpage-trunk && pnpm install && pnpm shots)`,
    );
    log("");
    if (!has("twice")) {
      // Said here rather than left to be rediscovered: reading two folders as a before and after
      // rests entirely on this holding, and for three frames it silently did not (#242).
      log("  Two runs of one commit come back byte for byte the same, so a file that differs");
      log("  between the two folders is a change. Check that any time with --twice.");
      log("");
    }
    // Last thing on the screen and the last thing the shell sees. The ledger above is where a
    // reader who scrolled up finds this; the exit code is for the reader who did not (#270).
    if (gone.length > 0) {
      process.stderr.write(
        `review-shots: ${gone.length} screen${gone.length === 1 ? "" : "s"} this run meant to` +
          ` reach ${gone.length === 1 ? "is" : "are"} missing. The set is incomplete —` +
          ` see COULD NOT PHOTOGRAPH above and in README.txt.\n\n`,
      );
      process.exitCode = 2;
    }
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

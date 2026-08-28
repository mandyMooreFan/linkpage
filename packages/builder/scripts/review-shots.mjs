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

import { covered, intended, missing, slug, unreached } from "./census.mjs";
import { portFor } from "./port.mjs";
import { compare, digest, verdict } from "./stability.mjs";
import { DEFAULT_VARIANTS, MODES, parseVariant, SHAPES, TYPES } from "./variants.mjs";
import { execFileSync, spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
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
  /**
   * **`refused` is what the owner types that we cannot use** (CL-1), photographed before the
   * step is answered properly. The exact-colour box is the only field in the wizard that judges
   * on screen (§7.9 decision 2), so this is the one frame in the whole set showing the sentence
   * — and until CL-1 there was nothing to show, which was the finding.
   */
  "What's your colour?": { kind: "swatch", refused: "zzzzzz" },
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

/** Whether anything at all is answering on this run's origin. */
async function answering() {
  try {
    return (await fetch(APP)).ok;
  } catch {
    return false;
  }
}

/**
 * Build the app and serve it the way Pages does — under `/linkpage/`, from `dist`.
 *
 * **Both checks below exist to make one specific failure loud.** A screenshot of the wrong
 * branch is indistinguishable from a screenshot of the right one, so this is the only place
 * that can tell the difference, and it has to refuse rather than carry on. See `portFor`.
 */
async function serve() {
  // Before building anything: if the origin already answers, it is another run — or a stray
  // server a killed one left behind, which `--keep-server` makes easy to do. Continuing
  // would photograph *its* build under *our* label.
  if (await answering()) {
    throw new Error(
      `something is already serving ${ORIGIN}.\n` +
        `  This run would have photographed it instead of your own build.\n` +
        `  Stop it, or pass --port <n>.`,
    );
  }

  log("· building the builder");
  execFileSync("pnpm", ["exec", "vite", "build"], { cwd: BUILDER, stdio: "inherit" });

  log(`· serving it on ${ORIGIN}`);
  const server = spawn(
    "pnpm",
    ["exec", "vite", "preview", "--host", HOST, "--port", String(PORT), "--strictPort"],
    { cwd: BUILDER, stdio: "ignore" },
  );

  const deadline = Date.now() + 60_000;
  for (;;) {
    // The server exiting is the signal, because `stdio: "ignore"` means it is the only one
    // we get. `--strictPort` makes vite exit rather than quietly move to another port, and
    // without this check the loop simply keeps polling and then succeeds the moment
    // *anyone* answers — which is precisely how a run ends up photographing a neighbour.
    if (server.exitCode !== null) {
      throw new Error(
        `the preview server exited (code ${server.exitCode}) before it came up on ${APP}.\n` +
          `  Most likely ${ORIGIN} was taken — pass --port <n>.`,
      );
    }
    if (await answering()) break;
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

/** The question currently on screen, by its own heading. */
async function heading(page) {
  const h = page.locator('[data-screen="flow"] h1').first();
  return (await h.count()) ? ((await h.textContent()) ?? "").trim() : null;
}

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
    case "address": {
      await page
        .locator('[data-screen="flow"] textarea')
        .first()
        .fill("12 Mill Lane\nHebden Bridge\nHX7 8AA");
      /*
       * **And the directions link, which the walk used to leave empty** (#244). It is optional,
       * so skipping it looked harmless — but it is the field that decides what the address row
       * says (§7.4) *and* whether the exported page turns the address into a link at all (§2.3),
       * so two decisions had no picture anywhere in the set. The fifth instance of this script's
       * standing failure: a screen that exists only once something optional has been answered.
       */
      await page.getByLabel("A link to directions").fill("maps.example/?q=12+Mill+Lane");
      return true;
    }
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
      miss("the rest of the wizard", "the flow is on screen but has no heading to name it by");
      break;
    }
    if (seen.has(title) && seen.size > 1) {
      miss(
        "the rest of the wizard",
        `“${title}” came round again, so the walk stopped making progress`,
      );
      break;
    }
    seen.add(title);

    n += 1;
    const name = `${String(n).padStart(2, "0")}-${slug(title)}`;
    if (capture) await shoot(page, size, `${name}-arrive`);

    const spec = ANSWERS[title];
    if (!spec) {
      miss(
        "the rest of the wizard",
        `no answer known for “${title}” — add it to ANSWERS in this script`,
      );
      break;
    }

    /*
     * §7.9's sentence, before the step is answered properly (CL-1).
     *
     * The walk answers every question correctly, so the one surface in the flow where the tool
     * says *this will not work* had no picture in any set — this script's standing failure for
     * the sixth time, and the one that made CL-1's before-and-after pair come back identical.
     * Type what cannot be used, press `Continue`, photograph, then clear and carry on.
     *
     * **The press is the whole point and it must not advance the flow.** Judgement holds the
     * screen (§7.9 decision 2), so if the heading moves, the walk has photographed the wrong
     * thing and says so rather than carrying a mislabelled frame into a review.
     */
    if (spec.refused !== undefined) {
      const box = page.locator(TEXTISH).first();
      await box.fill(spec.refused);
      const judge = page.getByRole("button", { name: /^(Continue|Save)$/ });
      if ((await judge.count()) && (await judge.first().isEnabled())) await judge.first().click();
      await settle(page);
      if ((await heading(page)) !== title) {
        miss(
          `“${title}” with something the tool cannot use`,
          `pressing Continue on “${spec.refused}” advanced the flow instead of holding it`,
        );
        break;
      }
      if (capture) await shoot(page, size, `${name}-refused`);
      await box.fill("");
      await settle(page);
    }

    const needsContinue = await answer(page, spec);
    if (capture && spec.kind !== "skip") await shoot(page, size, `${name}-filled`);
    // A declined question is a tick-on on the list rather than a row (§7.1), so there is no row
    // screen for it and there cannot be. Said out loud rather than left as a gap in the numbers.
    if (spec.kind === "skip") {
      omit(
        `a list row for “${title}”`,
        "this walk declines it, and a declined topic is a tick-on rather than a row — the" +
          " question itself is photographed in the flow above",
      );
    }

    if (needsContinue) {
      const escape = page.locator("[data-escape]");
      const cont = page.getByRole("button", { name: /^(Continue|Save)$/ });
      if (spec.kind === "skip" && (await escape.count())) await escape.first().click();
      else if ((await cont.count()) && (await cont.first().isEnabled())) await cont.first().click();
      else if (await escape.count()) await escape.first().click();
      else {
        miss(
          "the rest of the wizard",
          `nothing to press on “${title}” — no enabled Continue and no escape`,
        );
        break;
      }
    }
    await settle(page);
    if (n > 20) break; // a walk this long means something is wrong, not that the flow grew
  }
  return page;
}

/** The screens that are not the wizard: the list, its rows, the sheet, the menu, the import fork. */
async function listScreens(page, size) {
  if (!(await page.locator('[data-screen="list"]').count())) {
    miss("the review list and everything behind it", "the walk never reached the list at all");
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

  await rowScreens(page, size);
  await top(page);

  const download = page.getByRole("button", { name: /^Download$/ });
  if (await download.count()) {
    await download.first().click();
    await shoot(page, size, "60-download-sheet");
    const close = page.getByRole("button", { name: /^Close$/ });
    if (await close.count()) await close.first().click();
  }

  const menu = page.locator("[data-menu] button, button[data-menu]").first();
  if (await menu.count()) {
    await menu.click();
    await shoot(page, size, "61-menu");
    await importScreens(page, size);
    await page.keyboard.press("Escape");
  }
}

/** Put the list back at the top, so the next screen is photographed from where it starts. */
async function top(page) {
  await page.evaluate(() => window.scrollTo(0, 0));
}

/**
 * **Every row, opened.** §7.4, and the first of the three misses this widening exists for.
 *
 * The walk used to open `[data-row] button` *first* and stop — so the business name was the only
 * row anybody ever saw, and every question the list re-asks (the hours, the link buttons and
 * their editor, the language picker, the six style controls) was behind a row nothing pressed.
 * #189 moved two escapes that live in exactly that blind spot and could evidence the change only
 * with a source guard.
 *
 * **Named by the row's own id, numbered by its place in the list** — the id is the contract
 * `rows.ts` publishes and the number is what keeps a folder listing in reading order. A row that
 * appears or moves therefore shows up as a renamed file rather than as a silently different
 * picture.
 *
 * **Only one row is open at a time**, which is the list's own rule (§7.4) rather than something
 * arranged here: opening the next one closes the last.
 *
 * **The picture is of the row, not of the viewport.** An open row is routinely taller than a
 * phone screen, and the first thing a viewport shot loses off the bottom is the escape at the
 * foot of the question — which is exactly the screen #189 wanted and could not get. What this
 * gives up is *how much of a long row fits on one screen*; that is a real question and it is
 * answered by `51-list-rows` and by the flow's own shots of the same questions.
 */
async function rowScreens(page, size) {
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

    // Declared here rather than in `census.mjs` because this is the first moment the run can
    // name it: which rows the list has, and what they are called, comes from the answers the
    // walk just gave. Declaring it *before* the press is the point — if the shot does not
    // happen the census says which row went missing, without this loop having to notice.
    expect(`${size.dir}/${name}`);
    // §7.4 puts the advanced disclosure at the foot of the style row, so a run that comes back
    // without a picture of it has lost a screen rather than skipped an optional one.
    if (id === "style") expect(`${size.dir}/${name}-advanced`);

    await header.click();
    await row.evaluate((el) => el.scrollIntoView({ block: "start", behavior: "instant" }));
    await shoot(page, size, name, row);

    // §7.4 puts the advanced disclosure and its contrast readout at the foot of the style row.
    // It is a surface with a design of its own — a switch, a set of colour boxes and a readout —
    // and no other screen shows it, so it is worth the one extra press it costs.
    const advanced = row.locator("[data-advanced] button").first();
    if (await advanced.count()) {
      await advanced.click();
      await row.evaluate((el) => el.scrollIntoView({ block: "start", behavior: "instant" }));
      await shoot(page, size, `${name}-advanced`, row);
      await advanced.click();
    }

    await header.click();
  }
}

/**
 * **The import fork: §7.9's refusal and §7.8's replace confirmation.** The third of the misses.
 *
 * §7.8 shows the confirmation only once a valid file has come back from an OS file picker, and
 * nothing in the walk ever opened one — so the surface was unreachable, and #200's before and
 * after were byte-identical with no picture of the thing it rebalanced. It got its pair out of a
 * throwaway script instead, which is the failure mode this ritual exists to remove.
 *
 * **The way in is the menu item, and the file arrives through the file chooser** (#270).
 *
 * This used to reach past the control and call `setInputFiles` on the clipped
 * `input[type=file]`, found by `aria-label="Open a project file"`. #254 removed that label — its
 * whole argument was that the input had stopped being a control, so the accessible name moved to
 * the visible button and the input went `aria-hidden` — and from `be7aaff` this function found
 * nothing, said `!` once, and both frames were absent from every set taken since.
 *
 * **The lesson is about what kind of thing a locator may hold on to.** §7.4's rule is roles and
 * `data-*` hooks, never utilities, "so a script that reviews design changes does not break when
 * the design changes". An `aria-label` looked like it was on the safe side of that line and is
 * not: it is part of the control's accessibility contract, so it moves when the accessibility is
 * *corrected*, which is exactly a change this ritual exists to photograph. **It was closer to a
 * class than to a hook.**
 *
 * So the walk now does what an owner does: it presses **the menu item, by role and by its own
 * visible words**, and takes the file chooser that press raises. Playwright's `filechooser`
 * event is the OS dialog, so the file arrives by the route §7.7 describes rather than beside it.
 * Nothing here names the input at all — and the input is free to change again. What this holds
 * on to is the thing the reviewer would point at.
 *
 * A second thing falls out of it for free: **the press is now part of what is photographed.** If
 * the menu item ever stops opening the dialog, this walk stops, where the old shape would have
 * carried on happily driving an input nobody could reach.
 *
 * **Two files, in the order that leaves nothing behind.** A file the tool refuses first (§7.9's
 * message, in the menu's own surface with the project intact behind it), then the real one,
 * which clears the message and raises the confirmation. Then Cancel: the picked file is dropped
 * and nothing anywhere changed, which is what lets this run in the middle of a walk.
 *
 * **The incoming file is the project's own bytes.** `store.text()` is what Download writes and
 * what the store holds, so this is a real file the tool itself produced — a hand-written fixture
 * here could drift from the schema and start being refused, which would silently turn the
 * confirmation shot back into a refusal shot. §7.8's sentence is about the *outgoing* project
 * either way.
 */
async function importScreens(page, size) {
  // The menu's own item, by role and by the words on it (§7.8). `…` is part of the label, so the
  // match is anchored at the start and left open at the end — the ellipsis is a typographic
  // decision and this should not be the thing that breaks when somebody revisits it.
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

  const dir = await mkdtemp(join(tmpdir(), "review-shots-"));
  const refused = join(dir, "index.html");
  const real = join(dir, "ada-and-sons-bakers.linkpage.json");
  await writeFile(refused, "<!doctype html>\n<p>not a project file</p>\n", "utf8");
  await writeFile(real, bytes, "utf8");

  /** Press the menu item and hand the dialog a file — the owner's own route in (§7.7). */
  const choose = async (what) => {
    const [chooser] = await Promise.all([
      page.waitForEvent("filechooser", { timeout: 5_000 }),
      opener.first().click(),
    ]);
    await chooser.setFiles(what);
  };

  try {
    // The menu opens itself when it has something to say, so these do not depend on it being
    // left open — but it is, and that is the screen being photographed.
    await choose(refused);
    await page.locator("[data-refusal]").first().waitFor({ timeout: 5_000 });
    await shoot(page, size, "62-menu-file-refused");

    await choose(real);
    await page.locator("[data-replace]").first().waitFor({ timeout: 5_000 });
    await shoot(page, size, "63-menu-replace-confirm");

    const cancel = page.locator("[data-replace]").getByRole("button", { name: /^Cancel$/ });
    if (await cancel.count()) await cancel.first().click();
  } catch (error) {
    // A ritual that dies here has thrown away every screen after it, and this is the newest and
    // most fragile part of the walk. Say which screen went missing and carry on — and now the
    // census names the frames whatever this sentence turns out to say.
    miss(
      "§7.9's refusal and §7.8's replace confirmation",
      `the import fork did not come up: ${error.message.split("\n")[0]}`,
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }

  omit(
    "the confirmation's “Download my work first” branch",
    "pressing it writes a file, and this walk touches nothing outside its own output folder",
  );
  omit(
    "§7.9's refusal on the first screen (under the quiet line)",
    "the same message, in the other of its two places; reaching it needs a second walk from empty",
  );
}

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
    if (capture) await listScreens(page, size);
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
    server = await serve();
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

/**
 * The before/after set for a change that moves the builder's look. Run by hand, never by CI.
 *
 * `SPEC.md` §7.4 records the position this exists to serve: **the builder's appearance has no
 * standing regression suite, deliberately** — a screenshot-diffing suite is precisely the flaky
 * instrument `playwright.config.ts` already refuses with `retries: 0`. What replaces it is a
 * person looking, at the moment anyone actually will: review. So this produces a set to look at
 * rather than a set to assert against, and nothing here fails a build.
 *
 *   pnpm --filter @linkpage/builder exec vite build
 *   pnpm --filter @linkpage/builder exec vite preview --host 127.0.0.1 --port 4173 --strictPort &
 *   pnpm --filter @linkpage/builder exec node scripts/review-shots.mjs <out-dir>
 *
 * Every screen at both of §7.6's sizes: the phone it calls primary, and the width at which the
 * preview drawer has room to sit beside the question.
 */
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const ORIGIN = "http://127.0.0.1:4173/linkpage/";
const OUT = process.argv[2];
if (!OUT) throw new Error("usage: node scripts/review-shots.mjs <out-dir>");
mkdirSync(OUT, { recursive: true });

const STORAGE_KEY = "linkpage.project";
const PROJECT = {
  version: 1,
  lang: "en-GB",
  style: {
    brand: "#c2185b",
    accent: "#2e7d32",
    shape: "centred",
    type: "classic",
    corners: 0.6,
    mode: "light",
    advanced: { enabled: false, colors: {} },
  },
  header: { name: "Ada's Bakery", tagline: "Sourdough, pastries and very good coffee" },
  links: [
    { label: "See the menu", url: "https://adasbakery.example/menu", icon: "menu" },
    { label: "Order for pickup", url: "https://adasbakery.example/order", icon: "bag" },
  ],
  hours: {
    clock: "12h",
    weekStart: "mon",
    days: {
      mon: [["07:00", "17:00"]],
      tue: [["07:00", "17:00"]],
      wed: [["07:00", "17:00"]],
      thu: [["07:00", "17:00"]],
      fri: [["07:00", "17:00"]],
      sat: [["08:00", "16:00"]],
      sun: [],
    },
    note: "Closed bank holidays",
  },
  contact: { phone: "+44 1422 000000", email: "hello@adasbakery.example" },
  address: { lines: ["12 Bridge Street", "Hebden Bridge", "HX7 8AA"] },
  social: [{ platform: "instagram", url: "https://instagram.com/adasbakery" }],
};

const SIZES = [
  { name: "phone", viewport: { width: 390, height: 844 } },
  { name: "wide", viewport: { width: 1180, height: 860 } },
];

const browser = await chromium.launch();

/** A screen, named, with the steps that reach it from a fresh or a seeded start. */
const SCREENS = [
  { name: "01-preset", seed: false, reach: async () => {} },
  {
    name: "02-name",
    seed: false,
    reach: async (page) => {
      await page.getByRole("button", { name: /Food & drink/ }).click();
    },
  },
  {
    name: "03-colour",
    seed: false,
    reach: async (page) => {
      await page.getByRole("button", { name: /Food & drink/ }).click();
      await page.getByLabel(/Business name/).fill("Ada's Bakery");
      await page.locator('button[type="submit"]').first().click();
      for (let i = 0; i < 3; i++) {
        const heading = await page.getByRole("heading", { level: 1 }).textContent();
        if (heading?.includes("colour")) break;
        await page.locator("button[data-escape]").first().click();
      }
    },
  },
  { name: "04-list", seed: true, reach: async () => {} },
  {
    name: "05-list-row-open",
    seed: true,
    reach: async (page) => {
      await page
        .getByRole("button", { name: /Opening hours/ })
        .first()
        .click();
    },
  },
  {
    name: "06-how-it-looks",
    seed: true,
    reach: async (page) => {
      await page
        .getByRole("button", { name: /How it looks/ })
        .first()
        .click();
    },
  },
  {
    name: "07-download",
    seed: true,
    reach: async (page) => {
      await page.getByRole("button", { name: "Download", exact: true }).click();
    },
  },
];

for (const size of SIZES) {
  for (const screen of SCREENS) {
    const context = await browser.newContext({ viewport: size.viewport, deviceScaleFactor: 1 });
    const page = await context.newPage();
    if (screen.seed) {
      await page.addInitScript(
        ([key, text]) => window.localStorage.setItem(key, text),
        [STORAGE_KEY, JSON.stringify(PROJECT)],
      );
    }
    await page.goto(ORIGIN);
    await page.waitForLoadState("networkidle");
    try {
      await screen.reach(page);
    } catch (error) {
      console.warn(`  ${screen.name} @ ${size.name}: could not reach — ${error.message}`);
    }
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${OUT}/${screen.name}-${size.name}.png`, fullPage: true });
    console.log(`  wrote ${screen.name}-${size.name}.png`);
    await context.close();
  }
}

await browser.close();

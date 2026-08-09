/**
 * Capture the two README screenshots. Run by hand, never by CI.
 *
 *   pnpm --filter @linkpage/builder exec vite build
 *   pnpm --filter @linkpage/builder exec vite preview --host 127.0.0.1 --port 4173 --strictPort &
 *   pnpm --filter @linkpage/builder exec node scripts/screenshots.mjs
 *
 * Deliberately a script rather than a Playwright test. The one end-to-end this repo has is a
 * guarantee (`SPEC.md` §5.3) and runs on every push; screenshots are neither, and putting them in
 * the same runner would spend CI time on a picture nobody is asserting anything about.
 *
 * It shoots the real built builder and the real exported page — nothing here is a mock-up, so a
 * README image cannot drift from the product without this failing or looking wrong.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const ORIGIN = "http://127.0.0.1:4173";
const OUT = new URL("../../../docs/images/", import.meta.url);
const STORAGE_KEY = "linkpage.project";

/** A generated sample mark — 256×256, transparent, ~1.4 KB. Not a real business's logo. */
const LOGO =
  "data:image/png;base64," +
  "iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAYAAABccqhmAAAFE0lEQVR42u3cQa6cSBRFwVwGe2O3bAzmTJCYJOSJlM64pVe+" +
  "Ud9uy2Ms/o5tP6W3Dc+wJVAYvAQEg5eAYPgSCIxegoHhSyAwfAkExi9BwPAlEBi/1ETAhyhFIfDBSVEEfGBSEAEfkhSFwAcj" +
  "RRHwgUhRBHwQUhQBH4AURcDhpTACji5FAXBwKYqAQ0tRBBxYCiPguFIUAIeVogg4qBRGwDGlKAAOKUURcEApjIDjSVEAHE4K" +
  "I+BoUhQAB5PCCDiWBABJNQAcSgoj4EhSFAAHksIIOI4EAEkAkJQBwGGkMAKOIgFAEgAkZQBwECmMgGNIAJAEAEkAkAQASQCQ" +
  "BABJAJAEAEk/B8AhpDACjiABQBIAJAFAEgAkAUATm/HcHQACgACg2vgBAADFAYAAAAQAAUDF8QMAAIoDAAEAKDx+AABAABAA" +
  "VAUAAgBQePwAAIAAIACoCgAEAKDw+AEAAMUBgAAABAABQMXxAwAAigMAAQAIAAKAiuMHAAAUBwACAFB4/AAAgAAgAKgKAAQA" +
  "oPD4AQAAAUAAUBUACABA4fEDAACKAwABAAgAAoCK4wcAABQHAAIAEAAEABXHDwAAKA4ABACg8PgBAAABQABQFQAIAEDh8QMA" +
  "AAKAAKCvADDrvykA6APjB4AAAAAICABVAPwUIACExw8AAQAAEBAAqgD4KUAACI8fAAJAHAAICACBv/kHAAHAtz8ABAAAQEAA" +
  "8OM/AAQA3/4AEADiAEBAAAiPHwACAAAgIABUAfBTgAAQHj8ABAAAQEAAqALgpwABIDx+AAgAcQAgIAAs/ld/ASAA+PYHgAAA" +
  "AAgIAH78B4AAYEAAEAAMCAIAcIT6cAAAAAEAAgBQ9ZsTAABQeDAAAIAAAAEAqPqNCQAAKDwUAABA8aFAAAAK/14ZAABQeCAA" +
  "AIDiA4EAABT+X2UAAIDCwwAAABQfBgQAoPAgAAAAAQACAFD1GxEAANCkb8Pi82sNAACAgAAAAAAIAMYPAAEAABAQAIwfAAIA" +
  "AACg14O/P0cBAAQWHvjTczTjB0Bk7AAAAADigwcAACAQHjwAjB8A8dEDAAAQCI8eAAAAQHj0ADB+AMSHDwAAQCA8fAAAAADR" +
  "0QPA+AEQHz4AAACB8PABYPwAiI8fAP4BTPeKDh8AfkG7WXj4APBv4AMgPn4A+CZzt+jwAQAAtwsPHwDG737x8QMAAP78JDx+" +
  "AADADaPDB4Dxu2N8/AAAgN8GhMcPAAC4ZXT4dQCM3z3z4wcAAMo3HV4TAH/1FwCWDwDjj97V6gEAgOhtLT4OgB//uwBYOwCM" +
  "P3pfSwcAAKI3tnIAGH/0zhYOAABE/5zFugEAgOitLRsAxh+9t1UDAADR3wZYNAAAEL25NQPA+KN3t2QAACB8e0sGgL/6G72/" +
  "FQPAt3/0/hYMAABEPwPrBYAf/wHgAcC3f+1zsFwIACD6WVgsAIw/+nlYKwAAAAAPAACofSaWCgDjB4AHANWyUgDI+D0ACAAe" +
  "AGT8HgAEAA8CMn4PADJ+DwACgAcAGb8HAQHAA4CM3wOAAOABQADwICDj9wAgAHgQkPF7ABAAACAZPwQkAABAAgAEJOMHgAQA" +
  "CEgAgIBk/ACQAAABCQAQkIwfABIAICABAAISACAg4/cAIAB4EBAAPAgIAB4EZPweBAQADwICgAcCAcCDgADgQUDG74FAAPAg" +
  "IAB4IBAAPAgIAB4IBAAPBAKABwMBwAOBjN8DggDgAUEA8EAhAJTfBfOWbu94EgENAAAAAElFTkSuQmCC";

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
  header: {
    name: "Ada's Bakery",
    tagline: "Sourdough, pastries and very good coffee",
    logo: { src: LOGO, width: 256, height: 256 },
  },
  links: [
    { label: "See the menu", url: "https://adasbakery.example/menu", icon: "menu" },
    { label: "Order for pickup", url: "https://adasbakery.example/order", icon: "bag" },
    { label: "Book a table", url: "https://adasbakery.example/book", icon: "calendar" },
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
  address: {
    lines: ["12 Bridge Street", "Hebden Bridge", "HX7 8AA"],
    directionsUrl: "https://adasbakery.example/directions",
  },
  social: [
    { platform: "instagram", url: "https://instagram.com/adasbakery" },
    { platform: "facebook", url: "https://facebook.com/adasbakery" },
  ],
};

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

// --- the builder, at the width the review list and the preview sit side by side --------------
const desktop = await browser.newContext({
  viewport: { width: 1180, height: 760 },
  deviceScaleFactor: 2,
});
const page = await desktop.newPage();
await page.addInitScript(
  ([key, text]) => window.localStorage.setItem(key, text),
  [STORAGE_KEY, JSON.stringify(PROJECT)],
);
await page.goto(`${ORIGIN}/linkpage/`);
await page.waitForLoadState("networkidle");
await page.screenshot({ path: new URL("builder.png", OUT).pathname });

// --- the exported page itself, phone-shaped ---------------------------------------------------
const srcdoc = await page.locator("iframe").first().getAttribute("srcdoc");
if (!srcdoc) throw new Error("no preview iframe — did the builder render?");
const file = new URL("../.exported-page.html", import.meta.url).pathname;
writeFileSync(file, srcdoc, "utf-8");

const phone = await browser.newContext({
  viewport: { width: 390, height: 760 },
  deviceScaleFactor: 2,
});
const exported = await phone.newPage();
await exported.goto(`file://${file}`);
await exported.screenshot({ path: new URL("page.png", OUT).pathname, fullPage: true });

await browser.close();
console.log("wrote docs/images/builder.png and docs/images/page.png");

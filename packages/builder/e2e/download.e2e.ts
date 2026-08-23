import { expect, test } from "@playwright/test";
import type { Project } from "@linkpage/renderer";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

/**
 * The one Playwright end-to-end. `SPEC.md` §5.3, §5.2, §6.1, §7.7.
 *
 * > **one Playwright E2E proving the downloaded file opens standalone and matches the preview.**
 *
 * **Three things live here and nothing else does**, because they are the three a DOM test cannot
 * reach: a *real download*, written by a real browser to a real disk; the bytes on that disk
 * compared to the `srcdoc` the preview was showing; and that file **opened from `file://` with
 * the network off**. Everything else about the builder is already tested without a browser, and
 * a suite of browser tests over this UI is what makes CI slow and makes agents distrust it.
 *
 * **What this must not duplicate.** `packages/builder/src/page.test.ts` already holds that the
 * builder has exactly one call to `render`, by scanning its own sources. `preview/Preview.test.tsx`
 * already reads `srcdoc` back off the DOM and compares it to `pageHtml(project)`, and again
 * through a `Blob`, over a fixture full of characters that would notice being re-escaped. Both
 * run in jsdom in milliseconds. Neither of them can say whether the browser's *download* path —
 * `Blob` → object URL → anchor click → bytes on disk — preserves those bytes, and neither can
 * say whether the resulting file is a page at all when it is opened with nothing to fetch from.
 *
 * **The offline half is the point of the whole design** (§5.3 invariant 2, §6.1): one
 * `index.html`, CSS in a `<style>` block, images as `data:` URIs, *nothing fetched*. The
 * renderer's `invariants.test.ts` asserts that as a property of the string. This asserts it as a
 * behaviour — the context is offline, the page still renders, and every request the browser made
 * while it did is a `file://` one.
 *
 * **It does not walk the flow.** The project is seeded into `localStorage`, which is where the
 * builder keeps it (#30), so this test starts on the review list with a page that already has
 * all six sections. Driving twelve questions through a real browser to reach the Download button
 * would add a minute of wall clock and a dozen ways to go flaky, and would re-test what
 * `flow.test.tsx` and `list.test.tsx` already hold.
 */

/** Where the store keeps the project (`src/project/store.ts`). Seeding it is how we skip §7.2. */
const PROJECT_STORAGE_KEY = "linkpage.project";

/**
 * A real 240×80 PNG, solid brand pink, 233 bytes.
 *
 * It has to *decode*: step 5 asserts the logo has non-zero rendered dimensions and a non-zero
 * `naturalWidth`, and a broken image with `width`/`height` attributes still lays out a box. The
 * builder's jsdom fixture can afford `iVBORw0KGgo=` — a PNG signature and nothing after it —
 * because nothing there ever decodes it. Here the browser does.
 */
const LOGO_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPAAAABQCAIAAACoK28rAAAAsElEQVR42u3SAQ0AAAjDsMvAG25Rho" +
  "+nSRUsy81CjUiAocHQYGgwNIYGQ4OhwdBgaAwNhgZDg6HB0BgaDA2GBkODoTE0GBoMDYYGQ2NoMDQYGgwNhsbQYGgwNBgaDI2h" +
  "wdBgaDA0hgZDg6HB0GBoDA2GBkODocHQGBoMDYYGQ4OhMTQYGgwNhgZDY2gwNBgaDA2GxtBgaDA0GBoMjaHB0GBoMDQYGkODoc" +
  "HQYGgMDR0eXDOMR3xMnSAAAAAASUVORK5CYII=";

const NAME = "Ada & Sons <Bakers>";
const LINK_LABEL = "See the menu";

/**
 * A complete project: all six sections (§2.1), a logo, and text that would notice being handled.
 *
 * `&`, `<`, a `"` and an apostrophe are here for the same reason they are in `src/fixtures.ts` —
 * they are what makes "byte for byte" a claim about a string that could plausibly be mangled by
 * an escape, a re-encode or a normalisation somewhere between the iframe and the disk.
 *
 * `version` is the literal `1` rather than the renderer's `SCHEMA_VERSION` because this is a
 * *file*, and §4.3 requires that a v1 file keeps loading after the schema bumps. Pinning it means
 * this test keeps asserting what it says it asserts on the day that happens.
 */
const PROJECT: Project = {
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
    name: NAME,
    tagline: 'Sourdough, pastries, and "the best" cheese scone in town',
    logo: { src: LOGO_PNG, width: 240, height: 80 },
  },
  links: [
    { label: LINK_LABEL, url: "https://adasbakery.example/menu", icon: "menu" },
    { label: "Order for pickup", url: "https://adasbakery.example/order?ref=a&b=c", icon: "bag" },
  ],
  hours: {
    clock: "12h",
    weekStart: "mon",
    days: { mon: [["07:00", "14:00"]], sat: [], sun: [] },
    note: "Closed bank holidays",
  },
  contact: { phone: "+44 20 7946 0100", email: "hello@adasbakery.example" },
  address: { lines: ["12 Mill Lane", "Hebden Bridge", "HX7 8AA"] },
  social: [{ platform: "instagram", url: "https://instagram.com/adasbakery" }],
};

/** Where two buffers first disagree, so a failure names a byte rather than saying `false`. */
function firstDifference(actual: Buffer, expected: Buffer): string {
  const limit = Math.min(actual.length, expected.length);
  for (let i = 0; i < limit; i += 1) {
    if (actual[i] !== expected[i]) {
      const from = Math.max(0, i - 40);
      return [
        `first differing byte at offset ${i}`,
        `  downloaded: ${JSON.stringify(actual.subarray(from, i + 40).toString("utf-8"))}`,
        `  srcdoc:     ${JSON.stringify(expected.subarray(from, i + 40).toString("utf-8"))}`,
      ].join("\n");
    }
  }
  return `identical for ${limit} bytes, then one ran out (downloaded ${actual.length}, srcdoc ${expected.length})`;
}

test("the downloaded index.html is the preview's srcdoc, and it opens offline", async ({
  page,
  browser,
}) => {
  // 1. A project with all six sections, put where the builder looks for it (#30), before any
  //    of the builder's own scripts run.
  await page.addInitScript(
    ([key, text]: [string, string]) => window.localStorage.setItem(key, text),
    [PROJECT_STORAGE_KEY, JSON.stringify(PROJECT)] as [string, string],
  );

  await page.goto("/linkpage/");

  // The review list, not the flow — which is the seeding having worked (§7.1).
  await expect(page.getByRole("heading", { level: 1, name: NAME })).toBeVisible();

  // 2. The preview's `srcdoc` — the attribute, not the rendered document inside the frame.
  //    The list lands with the drawer open at every size (§7.6, #147), its control reading
  //    "Edit your page"; the click is for when it somehow does not.
  const toggle = page.getByRole("button", { name: /(the|your) page$/ });
  if ((await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click();

  const frame = page.locator("iframe[data-preview-frame]");
  await expect(frame).toBeAttached();
  const srcdoc = await frame.getAttribute("srcdoc");
  expect(srcdoc, "the preview frame carries a srcdoc").not.toBeNull();
  expect(srcdoc, "a document, not a URL").toContain("<!doctype html>");

  // 3. The Download sheet (§7.7), and the file the browser actually writes.
  await page.getByRole("button", { name: "Download", exact: true }).click();
  const sheet = page.getByRole("dialog", { name: "Download" });
  await expect(sheet).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    sheet.getByRole("button", { name: "Download index.html" }).click(),
  ]);

  // §6.1: the name is fixed and load-bearing — a host serves it at a directory root.
  expect(download.suggestedFilename()).toBe("index.html");

  const directory = await mkdtemp(join(tmpdir(), "linkpage-e2e-"));
  const file = join(directory, "index.html");
  await download.saveAs(file);
  const downloaded = await readFile(file);

  // 4. **The assertion this whole test exists for.** Bytes, not text: comparing decoded strings
  //    would forgive a re-encoding on the way through the Blob, and §5.2's guarantee is that the
  //    owner looked at *the file*, not at something that renders the same.
  const shown = Buffer.from(srcdoc as string, "utf-8");
  expect(downloaded.equals(shown), firstDifference(downloaded, shown)).toBe(true);

  // 5. The file, opened from disk with the network off. A fresh context, so nothing the builder
  //    put in storage or in a cache is available to it.
  const offline = await browser.newContext({ offline: true });
  const requested: string[] = [];
  try {
    const opened = await offline.newPage();
    opened.on("request", (request) => requested.push(request.url()));

    await opened.goto(pathToFileURL(file).href);

    await expect(opened.getByRole("heading", { level: 1 })).toHaveText(NAME);

    const button = opened.getByRole("link", { name: LINK_LABEL });
    await expect(button).toBeVisible();
    // Its glyph is an inline `<svg>` (§2.4) — markup, not a fetch, which is why it is here at all.
    await expect(button.locator("svg")).toBeVisible();

    // The logo is a `data:` URI (§6.6): laid out, *and* decoded. `naturalWidth` is the one that
    // says the bytes survived — a box can be the browser's guess from the `width` and `height`
    // attributes, and whether it collapses a broken image is a rendering-engine detail this test
    // would rather not rest on.
    const logo = opened.locator("img.lp-logo");
    await expect(logo).toBeVisible();
    const box = await logo.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThan(0);
    expect(box?.height ?? 0).toBeGreaterThan(0);
    expect(
      await logo.evaluate((element) => (element as HTMLImageElement).naturalWidth),
      "the logo decoded offline",
    ).toBeGreaterThan(0);
  } finally {
    await offline.close();
  }

  // 6. Nothing was fetched. Every request the browser made while rendering that page was for the
  //    file itself — no origin, no CDN, no font, no analytics (§5.3 invariant 2).
  //
  //    The document's own request is asserted first on purpose: it is what makes the emptiness
  //    below evidence. A listener that never fired would satisfy the second line just as well as
  //    a page that fetched nothing, and those are opposite results.
  expect(requested, "the listener saw the page load at all").toContain(pathToFileURL(file).href);
  expect(requested.filter((url) => !url.startsWith("file://"))).toEqual([]);
});

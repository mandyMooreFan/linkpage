import { defineConfig, devices } from "@playwright/test";

/**
 * The smoke test's runner — a **deployed URL**, not a build.
 *
 * Its own config rather than a second project in `playwright.config.ts`, because the two differ
 * in the one setting that matters: that one starts a `webServer` and this one must not. A shared
 * config would build and serve the app in order to then ignore it and hit the internet.
 *
 * `retries: 1` here, where the end-to-end has `retries: 0`, and the difference is deliberate.
 * The end-to-end tests code on a machine that also compiled it, so a retry only hides a real
 * flake. This one crosses a CDN it does not control, where a single transient 502 is not news.
 * One retry, not three: if it needs three it is telling you something.
 */

// `??` is not enough: a `workflow_dispatch` with the optional input left blank sets SMOKE_URL to
// the empty string, which is defined, which would smoke "". Falsy check, deliberately.
const BASE = process.env.SMOKE_URL || "https://mandymoorefan.github.io/linkpage/";

export default defineConfig({
  testDir: "./smoke",
  testMatch: "**/*.smoke.ts",
  fullyParallel: false,
  workers: 1,
  retries: 1,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],

  use: {
    baseURL: BASE,
    // A failure here is usually about the network or the deploy, and a trace is how you tell
    // "never served" from "served and did not boot".
    trace: "retain-on-failure",
  },

  // One engine. This asks whether the deploy works, not whether the page is cross-browser.
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});

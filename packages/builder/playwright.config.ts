import { defineConfig, devices } from "@playwright/test";

/**
 * The one end-to-end's runner. `SPEC.md` §5.3.
 *
 * **One browser, one worker, no retries, and a build it serves itself.** Everything here is
 * chosen to keep a browser out of the critical path: the Vitest suites the whole repo runs on
 * every push know nothing about this, `pnpm test` does not invoke it, and CI runs it as its own
 * job on one Node version rather than as a step on both matrix lines.
 *
 * **`retries: 0` is deliberate.** A browser test that passes on the second attempt is a browser
 * test nobody will trust the first time it goes red, and the next person to see it will start by
 * suspecting their own diff. If this ever needs a retry to be green, the answer is to fix it or
 * delete it — not to raise the number.
 */

const PORT = 4173;
const HOST = "127.0.0.1";
const ORIGIN = `http://${HOST}:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  /**
   * `*.e2e.ts`, not `*.spec.ts`. Vitest's default glob claims `*.test.*` and `*.spec.*`, and the
   * builder's Vitest run has no browser to launch — so the two runners are kept apart by a name
   * rather than by an exclude list that someone has to remember to keep in step.
   */
  testMatch: "**/*.e2e.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],

  use: {
    baseURL: ORIGIN,
    // On the one flow this repo has, a trace is worth its cost only when something went wrong.
    trace: "retain-on-failure",
  },

  // Chromium alone. §5.3 asks for one end-to-end, not a browser matrix, and every extra engine
  // is another download to cache and another way for CI to be slow.
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  /**
   * The **built** builder, served the way GitHub Pages serves it — under `base: "/linkpage/"`
   * from `dist`. Not `vite dev`: what §5.3 wants proved is the artifact, and the dev server's
   * module graph is not it.
   *
   * The build is part of the command so the test is runnable on its own, from a clean checkout,
   * with one line. `vite build` rather than `pnpm build`, because `pnpm typecheck` owns `tsc`.
   */
  webServer: {
    command: `pnpm exec vite build && pnpm exec vite preview --host ${HOST} --port ${PORT} --strictPort`,
    url: `${ORIGIN}/linkpage/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

/**
 * **Build the builder and serve it the way Pages does** — under `/linkpage/`, from `dist`.
 *
 * **This was `review-shots.mjs`'s and is now shared** with the accessibility sweep (`a11y-sweep.mjs`,
 * change list item **CL-9** of issue #272). Both are hand-run, both drive the *built* app rather
 * than the dev server, and both have the same thing to be afraid of.
 *
 * **Both checks below exist to make one specific failure loud** ([#208](https://github.com/mandyMooreFan/linkpage/issues/208)).
 * A screenshot of the wrong branch is indistinguishable from a screenshot of the right one, and an
 * accessibility report on the wrong branch is worse — it is a green report about somebody else's
 * code. This is the only place that can tell the difference, and it has to refuse rather than
 * carry on. See `portFor`.
 */

import { execFileSync, spawn } from "node:child_process";

/** Whether anything at all is answering on this run's origin. */
export async function answering(app) {
  try {
    return (await fetch(app)).ok;
  } catch {
    return false;
  }
}

/**
 * Build and serve, returning the child process. The caller kills it.
 *
 * @param {{ builder: string, host: string, port: number, log: (...m: string[]) => void }} options
 */
export async function serve({ builder, host, port, log }) {
  const origin = `http://${host}:${port}`;
  const app = `${origin}/linkpage/`;

  // Before building anything: if the origin already answers, it is another run — or a stray
  // server a killed one left behind, which `--keep-server` makes easy to do. Continuing
  // would report on *its* build under *our* label.
  if (await answering(app)) {
    throw new Error(
      `something is already serving ${origin}.\n` +
        `  This run would have used it instead of your own build.\n` +
        `  Stop it, or pass --port <n>.`,
    );
  }

  log("· building the builder");
  execFileSync("pnpm", ["exec", "vite", "build"], { cwd: builder, stdio: "inherit" });

  log(`· serving it on ${origin}`);
  const server = spawn(
    "pnpm",
    ["exec", "vite", "preview", "--host", host, "--port", String(port), "--strictPort"],
    { cwd: builder, stdio: "ignore" },
  );

  const deadline = Date.now() + 60_000;
  for (;;) {
    // The server exiting is the signal, because `stdio: "ignore"` means it is the only one
    // we get. `--strictPort` makes vite exit rather than quietly move to another port, and
    // without this check the loop simply keeps polling and then succeeds the moment
    // *anyone* answers — which is precisely how a run ends up using a neighbour.
    if (server.exitCode !== null) {
      throw new Error(
        `the preview server exited (code ${server.exitCode}) before it came up on ${app}.\n` +
          `  Most likely ${origin} was taken — pass --port <n>.`,
      );
    }
    if (await answering(app)) break;
    if (Date.now() > deadline) {
      server.kill();
      throw new Error(`the preview server never came up on ${app}`);
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return server;
}

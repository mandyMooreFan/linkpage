/**
 * **The control for `serve.mjs`'s refusal.** `SPEC.md` §5.3, issue #336.
 *
 * `serve.mjs` was one of two modules held honest by none of §5.3's four ways. It has always
 * behaved like a controlled thing — its refusal fired during the session that resolved
 * [#325](../../issues/325), when a stray background server made `pnpm a11y` stop rather than
 * photograph a build that was not its own — but nothing could make it fire **on demand**, which
 * is the difference between a guard that works and a guard that is known to work.
 *
 * **Why the refusal is worth a control at all.** [#208](../../issues/208): a screenshot of the
 * wrong branch is indistinguishable from a screenshot of the right one, and an accessibility
 * report on the wrong branch is worse — *a green report about somebody else's code*. This module
 * is the only place that can tell the difference.
 *
 * **The trap this file has to avoid, named on #336 before it was written.** A test that asserts
 * "it refused" passes just as well when nothing could ever have served — the empty-corpus failure
 * in different clothes. So the sensor is proved live **and then proved dead again**: `answering`
 * must say yes while the port is held and no once it is released, or the refusal below is not
 * evidence that occupancy caused it.
 *
 * Nothing here builds anything. The refusal happens before `vite build` is reached, deliberately,
 * which is what makes it cheap enough to control.
 */

import { createServer } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { answering, serve } from "./serve.mjs";

const HOST = "127.0.0.1";

/** A server that answers anything, on a port the OS picks so this never fights a real run. */
async function occupy() {
  const server = createServer((_request, response) => {
    response.writeHead(200, { "content-type": "text/html" });
    response.end("<!doctype html><title>not your build</title>");
  });
  await new Promise((resolve) => server.listen(0, HOST, resolve));
  const { port } = server.address();
  return { port, stop: () => new Promise((resolve) => server.close(resolve)) };
}

let live = null;
afterEach(async () => {
  if (live) await live.stop();
  live = null;
});

describe("serve refuses rather than reporting on somebody else's build (#208)", () => {
  it("says no when the origin is taken, and names the origin it will not use", async () => {
    live = await occupy();
    const app = `http://${HOST}:${live.port}/linkpage/`;

    // The sensor is alive. Without this the assertion below passes for a page that is simply
    // unreachable, which is the opposite result wearing the same colour.
    expect(await answering(app), "something really is serving the port under test").toBe(true);

    await expect(
      serve({ builder: "/nonexistent", host: HOST, port: live.port, log: () => {} }),
      "serve refused the occupied origin",
    ).rejects.toThrow(`something is already serving http://${HOST}:${live.port}`);

    // `builder` points at nothing on purpose: had the refusal not fired, `vite build` would have
    // been reached and failed for an unrelated reason, and a passing test would have been proving
    // the wrong thing. It throws before it looks.
  });

  it("and the sensor goes quiet again once the port is released", async () => {
    const held = await occupy();
    const app = `http://${HOST}:${held.port}/linkpage/`;
    expect(await answering(app)).toBe(true);

    await held.stop();

    // The other half of the control: the refusal above was caused by the occupancy and not by
    // something permanent about this machine, this port, or `answering` itself.
    expect(await answering(app), "nothing is serving it now").toBe(false);
  });
});

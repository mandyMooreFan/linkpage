/**
 * **The control for `flow.mjs`'s route.** `SPEC.md` §5.3, issue #336.
 *
 * The route was the other module held honest by none of §5.3's four ways. It is watched
 * *indirectly* — the census names a frame that never arrived — and that is how
 * [#270](../../issues/270) was caught **in the end, after three months**, during which every run
 * printed a skip line, exited 0, reported a cheerful `70 shots →`, and several tickets read past
 * it and reported a pair as a before and after. **Indirect and slow is the case a control exists
 * for.**
 *
 * **No browser.** `walkFlow` asks a page a small, fixed set of questions, so the known-bad cases
 * are reachable with a stub that answers them — the same move that made `census.mjs` checkable
 * *"without a browser, a server or a screenshot"*. What is under test is the route's own
 * reporting, not Playwright and not the census.
 *
 * **The trap, named on #336 before this was written.** `missing` refuses an empty list precisely
 * so a check over nothing cannot report nothing wrong — so every case here hands it a real
 * declared set, built by `flowFrames` from a real answers table, and the good case asserts the
 * silence as loudly as the bad cases assert the noise. **A control where `onMiss` always fires
 * proves nothing about a route that skips a screen.**
 */

import { describe, expect, it } from "vitest";
import { flowFrames, missing } from "./census.mjs";
import { stepName, walkFlow } from "./flow.mjs";

/** The two steps in the real `ANSWERS` that need nothing typed, so the stub stays a stub. */
const SKIPPABLE = {
  "Do you have a logo?": { kind: "skip" },
  "Where else are you online?": { kind: "skip" },
};

/**
 * A page that serves headings from a script and advances when the walk presses on.
 *
 * `null` in the script means the flow is behind us; `{ h1: null }` means the flow is on screen
 * with nothing naming it, which is one of the four ways `walkFlow` gives up.
 */
function stubPage(script) {
  let at = 0;
  const step = () => script[at] ?? null;
  const generic = {
    count: async () => 1,
    first: () => generic,
    nth: () => generic,
    locator: () => generic,
    fill: async () => {},
    check: async () => {},
    click: async () => {},
    isEnabled: async () => true,
    isChecked: async () => true,
    textContent: async () => null,
  };
  const advancing = { ...generic, first: () => advancing, click: async () => void (at += 1) };
  const h1 = {
    ...generic,
    first: () => h1,
    count: async () => (step()?.h1 ? 1 : 0),
    textContent: async () => step()?.h1 ?? null,
  };
  const flowRoot = { ...generic, first: () => flowRoot, count: async () => (step() ? 1 : 0) };

  return {
    locator: (sel) => {
      if (sel === '[data-screen="flow"]') return flowRoot;
      if (sel === '[data-screen="flow"] h1') return h1;
      if (sel === "[data-escape]") return advancing;
      return generic;
    },
    getByRole: (_role, options) =>
      String(options?.name ?? "").includes("Continue") ? advancing : generic,
    getByLabel: () => generic,
    evaluate: async () => undefined,
    waitForTimeout: async () => undefined,
  };
}

/** Run a script, collecting what the walk reached and what it gave up on. */
async function run(script) {
  const arrived = [];
  const missed = [];
  await walkFlow(stubPage(script), {
    onArrive: (_page, name) => void arrived.push(`${name}-arrive`),
    onMiss: (what, why) => void missed.push({ what, why }),
  });
  return { arrived, missed };
}

const INTENDED = flowFrames(SKIPPABLE);

describe("the route says so when it stops early (#336)", () => {
  it("walks a route that works, and says nothing — which is what makes the rest evidence", async () => {
    const { arrived, missed } = await run([
      { h1: "Do you have a logo?" },
      { h1: "Where else are you online?" },
      null,
    ]);

    expect(missed, "a walk that worked reports no miss").toEqual([]);
    expect(arrived).toEqual(INTENDED);
    expect(missing(INTENDED, arrived), "and the census finds nothing absent").toEqual([]);
  });

  it("skips a screen, and the census names the one that never arrived", async () => {
    const { arrived, missed } = await run([
      { h1: "Do you have a logo?" },
      { h1: "A question nobody wrote an answer for" },
    ]);

    expect(missed).toHaveLength(1);
    expect(missed[0].why).toContain("no answer known for");
    // The point of the whole file: the walk stopping is reported *by name*, not as a count.
    expect(missing(INTENDED, arrived)).toEqual(["02-where-else-are-you-online-arrive"]);
  });

  it("gives up when the flow is on screen with nothing naming it", async () => {
    const { missed } = await run([{ h1: null }]);
    expect(missed).toHaveLength(1);
    expect(missed[0].why).toContain("no heading to name it by");
  });

  it("gives up when the same step comes round again, rather than walking for ever", async () => {
    const { missed } = await run([
      { h1: "Do you have a logo?" },
      { h1: "Where else are you online?" },
      { h1: "Do you have a logo?" },
    ]);
    expect(missed).toHaveLength(1);
    expect(missed[0].why).toContain("came round again");
  });

  it("spells a step the way the census does, or every frame above is a phantom", () => {
    expect(stepName(1, "Do you have a logo?")).toBe("01-do-you-have-a-logo");
    expect(INTENDED).toEqual([
      "01-do-you-have-a-logo-arrive",
      "02-where-else-are-you-online-arrive",
    ]);
  });
});
